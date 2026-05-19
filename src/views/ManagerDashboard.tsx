import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp, getDocs, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { useAuth } from "../context/AuthContext";
import { User, ChevronRight, CheckCircle2, Clock, MessageSquare, AlertCircle, Sparkles, Send, LayoutDashboard, Target, Users, BrainCircuit, Activity, Zap, TrendingUp, X, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import axios from "axios";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

export default function ManagerDashboard({ activeView }: { activeView?: string }) {
  const { profile } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [memberGoals, setMemberGoals] = useState<any[]>([]);
  const [memberSheet, setMemberSheet] = useState<any>(null);
  const [memberCheckins, setMemberCheckins] = useState<any[]>([]);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"team" | "kpis">("team");

  useEffect(() => {
    if (activeView === "goals") {
      setActiveTab("kpis");
    } else if (activeView === "dashboard") {
      setActiveTab("team");
    }
  }, [activeView]);

  const fetchAiSummary = async () => {
    if (teamMembers.length === 0) return;
    setLoadingAi(true);
    try {
      const allSheetsSnap = await getDocs(query(collection(db, "goalSheets"), where("managerId", "==", profile?.uid)));
      const stats = {
        total: allSheetsSnap.size,
        approved: allSheetsSnap.docs.filter(d => d.data().status === 'approved').length,
        pending: allSheetsSnap.docs.filter(d => d.data().status === 'pending').length,
        draft: allSheetsSnap.docs.filter(d => d.data().status === 'draft').length,
      };
      const res = await axios.post("/api/ai/summarize-progress", { teamData: stats });
      setAiSummary(res.data.summary);
    } catch (e: any) {
      if (e.response?.status === 429) {
        setAiError("AI Quota reached.");
        setAiSummary("Team performance overview: " + (teamMembers.length > 0 ? `${teamMembers.length} active reports.` : "No reports."));
      } else {
        console.error("AI Summary Error:", e);
        setAiSummary("Failed to generate summary.");
      }
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    if (isAiPanelOpen && !aiSummary) {
      fetchAiSummary();
    }
  }, [isAiPanelOpen]);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, "users"), where("managerId", "==", profile.uid));
    const unsub = onSnapshot(q, (snap) => {
      setTeamMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TeamMember)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "users (team)");
    });
    return () => unsub();
  }, [profile]);

  useEffect(() => {
    if (!selectedMember) return;
    const sheetQ = query(collection(db, "goalSheets"), 
      where("employeeId", "==", selectedMember.id), 
      where("managerId", "==", profile?.uid),
      where("cycleId", "==", "2024-Phase1")
    );
    
    const unsubSheet = onSnapshot(sheetQ, (snap) => {
      if (!snap.empty) {
        const sheetDoc = snap.docs[0];
        setMemberSheet({ id: sheetDoc.id, ...sheetDoc.data() });
        
        const goalsQ = query(collection(db, "goals"), 
          where("sheetId", "==", sheetDoc.id),
          where("managerId", "==", profile?.uid)
        );
        const unsubGoals = onSnapshot(goalsQ, (goalsSnap) => {
          setMemberGoals(goalsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, "goals (team member)");
        });

        const checkinsQ = query(collection(db, "checkins"), 
          where("employeeId", "==", selectedMember.id),
          where("managerId", "==", profile?.uid)
        );
        const unsubCheckins = onSnapshot(checkinsQ, (checkSync) => {
          setMemberCheckins(checkSync.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, "checkins (team member)");
        });

        return () => {
          unsubGoals();
          unsubCheckins();
        }
      } else {
        setMemberSheet(null);
        setMemberGoals([]);
        setMemberCheckins([]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "goalSheets (team member)");
    });
    return () => unsubSheet();
  }, [selectedMember]);

  const handleUpdateFeedback = async (checkinId: string) => {
    const feedback = prompt("Enter feedback for this achievement:");
    if (!feedback) return;
    try {
      await updateDoc(doc(db, "checkins", checkinId), {
        managerFeedback: feedback,
        feedbackAt: serverTimestamp(),
        feedbackBy: profile?.uid
      });
      alert("Feedback saved.");
    } catch (error) {
      console.error(error);
    }
  };

  const handleAction = async (status: 'approved' | 'returned') => {
    if (!memberSheet) return;
    try {
      await updateDoc(doc(db, "goalSheets", memberSheet.id), { 
        status,
        isLocked: status === 'approved',
        approvedAt: serverTimestamp()
      });
      alert(`Sheet ${status}.`);
    } catch (error) {
      console.error(error);
    }
  };

  const pushSharedGoal = async () => {
    const title = prompt("KPI Title:");
    if (!title) return;
    const target = prompt("Target Value:");
    if (!target) return;

    try {
      for (const member of teamMembers) {
        const sheetsQ = query(collection(db, "goalSheets"), 
          where("employeeId", "==", member.id), 
          where("managerId", "==", profile?.uid),
          where("cycleId", "==", "2024-Phase1")
        );
        const sheetsSnap = await getDocs(sheetsQ);
        if (!sheetsSnap.empty) {
          const sheet = sheetsSnap.docs[0];
          await addDoc(collection(db, "goals"), {
            sheetId: sheet.id,
            employeeId: member.id,
            managerId: profile?.uid,
            title,
            description: "Departmental KPI",
            thrustArea: "Operational",
            uom: "percentage",
            target,
            weightage: 10,
            isShared: true,
            primaryOwnerId: profile?.uid,
            createdAt: serverTimestamp()
          });
        }
      }
      alert("KPI pushed to team.");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-12 transition-colors duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-serif font-black tracking-tight text-brand-navy leading-none">
            Team <span className="text-brand-violet">Pulse</span>
          </h1>
          <p className="text-brand-navy/60 font-medium text-sm">Manage and review your team's tactical performance.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="flex bg-white p-1 rounded-2xl border border-brand-border shadow-sm w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab("team")}
              className={cn("flex-1 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap", activeTab === "team" ? "bg-brand-lavender text-brand-violet shadow-sm" : "text-brand-navy/60 hover:text-brand-navy")}
            >
              Team Detail
            </button>
            <button 
              onClick={() => setActiveTab("kpis")}
              className={cn("flex-1 sm:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap", activeTab === "kpis" ? "bg-brand-lavender text-brand-violet shadow-sm" : "text-brand-navy/60 hover:text-brand-navy")}
            >
              Dept Shared KPIs
            </button>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button 
              onClick={() => setIsAiPanelOpen(true)}
              className="flex-1 sm:flex-none bg-white border border-brand-border px-6 py-2.5 rounded-xl flex items-center justify-center space-x-2 text-[10px] font-black uppercase tracking-widest text-brand-navy hover:bg-brand-deep transition-all shadow-sm"
            >
              <BrainCircuit className="w-4 h-4 text-brand-violet" />
              <span>AI Copilot</span>
            </button>
            <button 
              onClick={pushSharedGoal}
              className="flex-1 sm:flex-none bg-brand-navy text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95 shadow-brand-navy/20"
            >
              Push KPI
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {activeTab === "team" ? (
          <>
            {/* Team List */}
            <div className="lg:col-span-4 space-y-8">
               <div className="flex items-center justify-between px-2">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-navy/60">Direct Reports</h3>
                 <Users className="w-4 h-4 text-brand-navy/40" />
               </div>
               
               <div className="space-y-3">
                 {teamMembers.map((member) => (
                   <motion.div 
                     key={member.id}
                     whileHover={{ x: 4 }}
                     onClick={() => setSelectedMember(member)}
                     className={cn(
                       "glass-card p-5 rounded-[24px] cursor-pointer transition-all duration-300 flex items-center justify-between group overflow-hidden border border-brand-violet/5 hover:border-brand-violet/10",
                       selectedMember?.id === member.id ? "bg-brand-lavender border-brand-violet/20" : "hover:bg-white/50"
                     )}
                   >
                     <div className="flex items-center space-x-4">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm", selectedMember?.id === member.id ? "bg-brand-violet text-white" : "bg-white text-brand-navy/20 border border-brand-border")}>
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={cn("font-bold text-sm tracking-tight", selectedMember?.id === member.id ? "text-brand-violet" : "text-brand-navy")}>{member.name}</p>
                          <p className="text-[10px] font-medium text-brand-navy/30 truncate max-w-[120px]">{member.role || 'Contributor'}</p>
                        </div>
                     </div>
                     <ChevronRight className={cn("w-4 h-4 transition-all", selectedMember?.id === member.id ? "text-brand-violet translate-x-1" : "text-brand-navy/10")} />
                   </motion.div>
                 ))}
               </div>
            </div>

            {/* Member Detail */}
            <div className="lg:col-span-8 space-y-8">
              {selectedMember ? (
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={selectedMember.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                  >
                    <div className="glass-card p-10 rounded-[40px] space-y-10 relative overflow-hidden">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                        <div className="flex items-center space-x-6 text-brand-navy">
                          <div className="w-20 h-20 rounded-[24px] bg-brand-deep border border-brand-border flex items-center justify-center text-brand-navy/20 shadow-sm transition-colors">
                             <User className="w-10 h-10" />
                          </div>
                          <div className="space-y-1">
                            <h2 className="text-3xl font-serif font-black">{selectedMember.name}</h2>
                            <div className="flex items-center space-x-3">
                              <span className="text-[10px] font-bold text-brand-navy/30">{selectedMember.email}</span>
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            </div>
                          </div>
                        </div>

                        <div className="flex bg-white p-1 rounded-2xl border border-brand-border shadow-sm">
                          {['Focus', 'Historical'].map((t, i) => (
                            <button key={t} className={cn("px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", i === 0 ? "bg-brand-lavender text-brand-violet" : "text-brand-navy/30 hover:text-brand-navy")}>{t}</button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {[
                          { label: "Status", value: memberSheet?.status || 'None', color: memberSheet?.status === 'approved' ? 'text-emerald-600' : 'text-amber-600' },
                          { label: "Completion", value: "68%", color: "text-brand-violet" },
                          { label: "Grade", value: "Tier-B", color: "text-brand-cyan" }
                        ].map((stat, i) => (
                          <div key={i} className="bg-brand-deep p-6 rounded-[24px] border border-brand-border hover:border-brand-violet/20 transition-all">
                             <p className="text-[9px] font-black tracking-widest text-brand-navy/20 uppercase mb-2">{stat.label}</p>
                             <span className={cn("text-lg font-black italic", stat.color)}>{stat.value}</span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-navy/20">Active Matrix</h3>
                           <Target className="w-4 h-4 text-brand-navy/10" />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {memberGoals.map((goal) => {
                            const checkin = memberCheckins.find(c => c.goalId === goal.id);
                            return (
                              <div key={goal.id} className="p-6 rounded-[24px] bg-brand-deep border border-brand-border hover:border-brand-violet/20 flex flex-col space-y-4 group transition-all text-brand-navy">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center space-x-3">
                                      <span className="text-[8px] uppercase font-black px-2 py-0.5 bg-brand-border text-brand-navy/40 rounded-full">{goal.thrustArea}</span>
                                      {memberSheet?.status === "pending" ? (
                                        <input 
                                          type="text" 
                                          defaultValue={goal.title}
                                          onBlur={(e) => updateDoc(doc(db, "goals", goal.id), { title: e.target.value })}
                                          className="font-bold text-sm text-brand-navy bg-transparent border-b border-dashed border-brand-navy/10 outline-none focus:border-brand-violet transition-colors"
                                        />
                                      ) : (
                                        <p className="font-bold text-sm">{goal.title}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {memberSheet?.status === "pending" ? (
                                        <input 
                                          type="number" 
                                          defaultValue={goal.weightage}
                                          onBlur={(e) => updateDoc(doc(db, "goals", goal.id), { weightage: Number(e.target.value) })}
                                          className="w-10 text-[10px] text-brand-violet font-black bg-transparent outline-none"
                                        />
                                      ) : (
                                        <p className="text-[10px] text-brand-navy/30 font-bold uppercase">{goal.weightage}% weight</p>
                                      )}
                                      {memberSheet?.status === "pending" && <span className="text-[10px] text-brand-navy/30 font-bold uppercase">% Weight</span>}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[9px] font-black uppercase text-brand-navy/20 mb-1">Target</p>
                                    {memberSheet?.status === "pending" ? (
                                      <input 
                                        type="text" 
                                        defaultValue={goal.target}
                                        onBlur={(e) => updateDoc(doc(db, "goals", goal.id), { target: e.target.value })}
                                        className="font-bold text-sm text-brand-navy text-right bg-transparent border-b border-dashed border-brand-navy/10 outline-none focus:border-brand-violet transition-colors"
                                      />
                                    ) : (
                                      <p className="font-bold text-sm">{goal.target}</p>
                                    )}
                                  </div>
                                </div>

                                {checkin && (
                                  <div className="pt-4 border-t border-brand-border/10 space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <Activity className="w-3.5 h-3.5 text-brand-violet" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-navy/40">Quarter Achievement</span>
                                      </div>
                                      <span className="text-xs font-black text-brand-violet">{checkin.progressScore?.toFixed(0)}% Complete</span>
                                    </div>
                                    <div className="bg-white/50 p-4 rounded-xl space-y-2 border border-black/5">
                                      <p className="text-[10px] font-medium text-brand-navy/60 italic leading-relaxed">"{checkin.employeeComment}"</p>
                                      {checkin.managerFeedback ? (
                                        <div className="pl-4 border-l-2 border-brand-violet/20 flex items-start space-x-2">
                                          <MessageSquare className="w-3 h-3 text-brand-violet shrink-0 mt-0.5" />
                                          <p className="text-[9px] font-bold text-brand-violet">{checkin.managerFeedback}</p>
                                        </div>
                                      ) : (
                                        <button 
                                          onClick={() => handleUpdateFeedback(checkin.id)}
                                          className="flex items-center space-x-2 text-[9px] font-black uppercase tracking-widest text-brand-navy/20 hover:text-brand-violet transition-all"
                                        >
                                          <MessageSquare className="w-3 h-3" />
                                          <span>Add Feedback</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {memberSheet?.status === 'pending' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="pt-8 border-t border-brand-border flex items-center justify-end space-x-4 relative z-10"
                        >
                           <button 
                            onClick={() => handleAction('returned')}
                            className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-navy/30 hover:text-rose-500 transition-all font-bold"
                           >
                             Request Changes
                           </button>
                           <button 
                            onClick={() => handleAction('approved')}
                            className="bg-brand-violet text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-violet/20 hover:scale-105 transition-all"
                           >
                             Approve Goals
                           </button>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="h-[500px] flex flex-col items-center justify-center space-y-6 glass-card rounded-[48px] border-dashed border-2 border-brand-border bg-white text-brand-navy text-opacity-10">
                   <div className="w-16 h-16 rounded-[24px] border border-brand-border flex items-center justify-center shadow-sm">
                      <Users className="w-8 h-8 text-brand-navy text-opacity-10" />
                   </div>
                   <div className="text-center space-y-1">
                     <p className="text-[11px] uppercase font-black tracking-widest">Select Team Member</p>
                     <p className="text-[10px] font-medium max-w-xs mx-auto">Choose a report to review their performance metrics and goals.</p>
                   </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="lg:col-span-12 space-y-8">
            <div className="glass-card p-10 rounded-[40px] space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-2xl font-serif font-black text-brand-navy">Departmental Shared KPIs</h3>
                  <p className="text-brand-navy/30 text-sm font-medium">Standardized goals pushed across all direct reports.</p>
                </div>
                <button 
                  onClick={pushSharedGoal}
                  className="bg-brand-violet text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-violet/20 hover:scale-105 transition-all"
                >
                  Create Shared KPI
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="p-8 rounded-[32px] bg-brand-lavender/30 border border-brand-violet/10 hover:border-brand-violet/30 transition-all space-y-4">
                    <div className="flex items-center justify-between">
                       <p className="text-[10px] font-black uppercase tracking-widest text-brand-violet">Revenue Growth</p>
                       <TrendingUp className="w-4 h-4 text-brand-violet/40" />
                    </div>
                    <h4 className="text-2xl font-serif font-black">15% YoY</h4>
                    <p className="text-xs text-brand-navy/40 font-medium">Standard baseline for all account managers.</p>
                 </div>
                 <div className="p-8 rounded-[32px] bg-brand-lavender/30 border border-brand-violet/10 hover:border-brand-violet/30 transition-all space-y-4">
                    <div className="flex items-center justify-between">
                       <p className="text-[10px] font-black uppercase tracking-widest text-brand-violet">Customer CSAT</p>
                       <Users className="w-4 h-4 text-brand-violet/40" />
                    </div>
                    <h4 className="text-2xl font-serif font-black">4.8 / 5.0</h4>
                    <p className="text-xs text-brand-navy/40 font-medium">Quality assurance metric for delivery teams.</p>
                 </div>
                 <div className="p-8 rounded-[32px] border-2 border-dashed border-brand-border flex items-center justify-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-navy/20">Empty Slot</p>
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAiPanelOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAiPanelOpen(false)}
              className="fixed inset-0 bg-brand-navy/5 backdrop-blur-sm z-[60]"
            />
            <motion.aside 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="fixed top-0 right-0 w-full md:w-[480px] h-full bg-white shadow-2xl z-[70] flex flex-col border-l border-brand-border"
            >
              <div className="p-10 border-b border-brand-border flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <BrainCircuit className="w-5 h-5 text-brand-violet" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-navy/30">Analytics Engine</span>
                  </div>
                  <h3 className="text-2xl font-serif font-black text-brand-navy">Copilot <span className="text-brand-violet">AI</span></h3>
                </div>
                <button onClick={() => setIsAiPanelOpen(false)} className="w-10 h-10 rounded-xl bg-brand-deep flex items-center justify-center hover:bg-brand-lavender transition-all">
                  <X className="w-5 h-5 text-brand-navy/40" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-navy/20">Executive Summary</h4>
                  <div className="p-8 rounded-[32px] bg-brand-deep border border-brand-border space-y-6 relative overflow-hidden group">
                    <div className="flex items-center justify-between text-brand-violet relative z-10">
                      <div className="flex items-center space-x-3">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                        <p className="text-[9px] font-black uppercase tracking-widest">Global Status</p>
                      </div>
                      {loadingAi && <RefreshCw className="w-4 h-4 animate-spin text-brand-navy/20" />}
                    </div>
                    <p className="text-sm text-brand-navy/70 leading-relaxed italic font-medium relative z-10">
                      {loadingAi ? "Analyzing team data..." : aiSummary || "Team summary ready for generation."}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-navy/20">Recommended Actions</h4>
                   <div className="grid grid-cols-1 gap-3">
                     {[
                       { icon: <Zap className="w-4 h-4" />, text: "Approve pending goals for 4 members." },
                       { icon: <AlertCircle className="w-4 h-4" />, text: "Check alignment in Sales KPIs." },
                       { icon: <TrendingUp className="w-4 h-4" />, text: "Team performance is up 12% vs last cycle." }
                     ].map((rec, i) => (
                       <div key={i} className="p-5 rounded-[24px] bg-brand-deep border border-transparent hover:border-brand-border flex items-center space-x-5 group cursor-pointer transition-all">
                         <div className="w-10 h-10 rounded-xl bg-white border border-brand-border flex items-center justify-center text-brand-navy/20 group-hover:text-brand-violet transition-all shadow-sm">{rec.icon}</div>
                         <p className="text-xs font-bold text-brand-navy transition-colors">{rec.text}</p>
                       </div>
                     ))}
                   </div>
                </div>
              </div>

              <div className="p-10 border-t border-brand-border bg-brand-deep/50">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Ask about team performance..." 
                    className="w-full bg-white border border-brand-border rounded-[20px] px-6 py-4 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-violet/20 shadow-sm pr-12 placeholder:text-brand-navy/20"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-brand-navy text-white shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
