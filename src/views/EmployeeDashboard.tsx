import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDocs, setDoc, serverTimestamp, increment, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { useAuth } from "../context/AuthContext";
import { Plus, Send, CheckCircle2, AlertCircle, Sparkles, ChevronRight, Calculator, Target, X, Zap, Trophy, BrainCircuit, Activity, Ghost, RefreshCw, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import axios from "axios";

interface Goal {
  id: string;
  title: string;
  description: string;
  thrustArea: string;
  uom: "numeric" | "percentage" | "timeline" | "zero";
  target: string;
  weightage: number;
  isShared?: boolean;
}

interface GoalSheet {
  id: string;
  status: "draft" | "pending" | "approved" | "returned";
  isLocked: boolean;
  totalWeightage: number;
}

const HealthIndicator = ({ score }: { score: number }) => (
  <div className="flex items-center space-x-3">
    <div className="flex-1 h-1.5 bg-brand-deep rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        className={cn(
          "h-full rounded-full transition-all duration-1000",
          score > 80 ? "bg-emerald-500" : score > 50 ? "bg-amber-500" : "bg-rose-500"
        )} 
      />
    </div>
    <span className="text-[10px] font-bold text-slate-400">{score}%</span>
  </div>
);

export default function EmployeeDashboard({ activeView }: { activeView?: string }) {
  const { profile } = useAuth();
  const [sheet, setSheet] = useState<GoalSheet | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<"goals" | "checkins">("goals");

  useEffect(() => {
    if (activeView === "goals") {
      setActiveTab("goals");
    } else if (activeView === "dashboard") {
      setActiveTab("checkins");
    }
  }, [activeView]);
  const [selectedGoalForCheckin, setSelectedGoalForCheckin] = useState<Goal | null>(null);
  const [checkinData, setCheckinData] = useState({ actual: "", status: "Not Started", comment: "" });
  
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    title: "",
    description: "",
    thrustArea: "Operational",
    uom: "percentage",
    target: "",
    weightage: 10,
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [healthAnalysis, setHealthAnalysis] = useState<{ score: number; feedback: string; risks: string[] } | null>(null);

  const [aiError, setAiError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (saveStatus === "saved") {
      const timer = setTimeout(() => setSaveStatus("idle"), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const handleSaveDraft = async () => {
    if (!sheet) return;
    setSaveStatus("saving");
    try {
      await updateDoc(doc(db, "goalSheets", sheet.id), {
        lastSavedAt: serverTimestamp(),
      });
      setSaveStatus("saved");
    } catch (e) {
      console.error(e);
      setSaveStatus("idle");
    }
  };

  useEffect(() => {
    if (goals.length > 0) {
      const analyze = async () => {
        try {
          setAiError(null);
          const res = await axios.post("/api/ai/analyze-health", { goals });
          setHealthAnalysis(res.data);
        } catch (e: any) {
          if (e.response?.status === 429) {
            setAiError("AI Quota reached. Switching to local analysis.");
          } else {
            console.error("AI Health Analysis Error:", e);
            setAiError("AI Analysis offline. Using local logic.");
          }
          const score = Math.min(100, Math.max(0, goals.length * 10 + (goals.reduce((s, g) => s + g.weightage, 0) / 2)));
          const totalWeight = goals.reduce((sum, g) => sum + g.weightage, 0);
          setHealthAnalysis({
            score,
            feedback: "Structural integrity assessed via local engine.",
            risks: goals.length < 3 ? ["Insufficient objective volume."] : totalWeight > 100 ? ["Weightage imbalance."] : []
          });
        }
      };
      const timer = setTimeout(analyze, 3000);
      return () => clearTimeout(timer);
    }
  }, [goals]);

  const achievements = [
    { icon: <Zap className="w-3.5 h-3.5" />, label: "3 Day Streak", color: "text-amber-600 bg-amber-50" },
    { icon: <Trophy className="w-3.5 h-3.5" />, label: "SMART Planner", color: "text-brand-violet bg-brand-lavender/50" },
  ];

  useEffect(() => {
    if (!profile) return;

    const q = query(collection(db, "goalSheets"), 
      where("employeeId", "==", profile.uid),
      where("cycleId", "==", "2024-Phase1")
    );

    const unsubSheet = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        const createSheet = async () => {
          const newSheetRef = doc(collection(db, "goalSheets"));
          const newSheet = {
            employeeId: profile.uid,
            managerId: profile.managerId || "demo-manager-id",
            cycleId: "2024-Phase1",
            status: "draft",
            isLocked: false,
            totalWeightage: 0,
            createdAt: serverTimestamp(),
          };
          await setDoc(newSheetRef, newSheet);
        };
        createSheet();
      } else {
        const sheetDoc = snapshot.docs[0];
        setSheet({ id: sheetDoc.id, ...sheetDoc.data() } as GoalSheet);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "goalSheets");
    });

    return () => unsubSheet();
  }, [profile]);

  useEffect(() => {
    if (!sheet) return;
    const goalsQ = query(collection(db, "goals"), 
      where("sheetId", "==", sheet.id),
      where("employeeId", "==", profile?.uid)
    );
    const unsubGoals = onSnapshot(goalsQ, (snapshot) => {
      setGoals(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Goal)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "goals");
    });

    const checkinsQ = query(collection(db, "checkins"), where("employeeId", "==", profile?.uid));
    const unsubCheckins = onSnapshot(checkinsQ, (checkSync) => {
      setCheckins(checkSync.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "checkins");
    });

    return () => {
      unsubGoals();
      unsubCheckins();
    };
  }, [sheet, profile?.uid]);

  const handleDeleteGoal = async (goalId: string, weight: number) => {
    if (!sheet || sheet.isLocked) return;
    if (!confirm("Remove this goal from your strategy?")) return;
    try {
      await deleteDoc(doc(db, "goals", goalId));
      await updateDoc(doc(db, "goalSheets", sheet.id), {
        totalWeightage: increment(-weight)
      });
    } catch (error) {
      console.error(error);
      alert("Failed to delete goal. Please try again.");
    }
  };

  const handleAddGoal = async () => {
    if (!sheet || !profile) return;
    if (goals.length >= 8) {
      alert("Max 8 goals allowed.");
      return;
    }
    
    const weight = Number(newGoal.weightage) || 0;
    const currentTotal = goals.reduce((sum, g) => sum + g.weightage, 0);
    
    if (currentTotal + weight > 100) {
      alert("Total weightage max 100%. Adjust existing goals first.");
      return;
    }

    if (!newGoal.title || !newGoal.target) {
      alert("Please fill in the title and target metric.");
      return;
    }

    try {
      await addDoc(collection(db, "goals"), {
        ...newGoal,
        isShared: false,
        weightage: weight,
        sheetId: sheet.id,
        employeeId: profile.uid,
        managerId: profile.managerId || "demo-manager-id",
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "goalSheets", sheet.id), {
        totalWeightage: increment(weight),
        lastEditedAt: serverTimestamp()
      });
      setIsAdding(false);
      setNewGoal({ title: "", description: "", thrustArea: "Operational", uom: "percentage", target: "", weightage: 10 });
    } catch (error) {
      console.error(error);
      alert("Failed to add goal. Check your connection.");
    }
  };

  const calculateProgress = (uom: string, target: string, actual: string) => {
    const t = parseFloat(target);
    const a = parseFloat(actual);
    if (isNaN(t) || isNaN(a)) return 0;
    switch (uom) {
      case "numeric":
      case "percentage":
        return Math.min(Math.round((a / t) * 100), 100);
      case "zero":
        return a === 0 ? 100 : 0;
      default:
        return 0;
    }
  };

  const handleUpdateCheckin = async () => {
    if (!selectedGoalForCheckin || !profile) return;
    const progress = calculateProgress(selectedGoalForCheckin.uom, selectedGoalForCheckin.target, checkinData.actual);
    try {
      const checkinRef = doc(collection(db, "checkins"));
      await setDoc(checkinRef, {
        goalId: selectedGoalForCheckin.id,
        employeeId: profile.uid,
        managerId: profile.managerId || "demo-manager-id",
        quarter: "Q1",
        actual: checkinData.actual,
        status: checkinData.status,
        progressScore: progress,
        employeeComment: checkinData.comment,
        updatedAt: serverTimestamp(),
      });
      setSelectedGoalForCheckin(null);
      setCheckinData({ actual: "", status: "Not Started", comment: "" });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSuggestDescription = async () => {
    if (!newGoal.title) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await axios.post("/api/ai/suggest-goal", {
          title: newGoal.title,
          department: profile?.department || "General",
          role: profile?.role || "Employee"
        });
        setNewGoal(prev => ({ ...prev, ...response.data }));
      } catch (error: any) {
        if (error.response?.status === 429) {
          setAiError("AI Quota reached. Manual entry required.");
        } else {
          console.error("AI Suggestion Error:", error);
          setAiError("Suggestion service busy. Please define manually.");
        }
      } finally {
        setAiLoading(false);
      }
    };
  
    const handleSubmitSheet = async () => {
      if (!sheet) return;
      const total = goals.reduce((sum, g) => sum + g.weightage, 0);
      if (total !== 100) {
        alert("Weightage must be 100%.");
        return;
      }
      try {
        await updateDoc(doc(db, "goalSheets", sheet.id), {
          status: "pending",
          submittedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error(error);
      }
    };
  
    const totalWeight = goals.reduce((sum, g) => sum + g.weightage, 0);
  
    return (
      <div className="space-y-8 sm:space-y-12 p-4 sm:p-0 transition-colors duration-300">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-2 sm:px-0">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-slate-900">
              Welcome back, <span className="text-brand-violet">{profile?.name.split(' ')[0]}</span>
            </h1>
            <p className="text-slate-500 font-medium text-sm sm:text-base">Strategic alignment dashboard for FY2024 Cycle.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 w-full lg:w-auto">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto overflow-x-auto scrollbar-hide">
              <button 
                onClick={() => setActiveTab("goals")}
                className={cn("flex-1 px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap outline-none", activeTab === "goals" ? "bg-brand-violet text-white shadow-md shadow-brand-violet/20" : "text-slate-400 hover:text-slate-600")}
              >
                Goal Planning
              </button>
              <button 
                onClick={() => setActiveTab("checkins")}
                className={cn("flex-1 px-4 md:px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap outline-none", activeTab === "checkins" ? "bg-brand-violet text-white shadow-md shadow-brand-violet/20" : "text-slate-400 hover:text-slate-600")}
              >
                Execution
              </button>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className={cn(
                "flex-1 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border text-center whitespace-nowrap min-w-[90px]",
                sheet?.status === "draft" && "bg-slate-100 text-slate-600 border-slate-200",
                sheet?.status === "pending" && "bg-amber-50 text-amber-600 border-amber-100",
                sheet?.status === "approved" && "bg-emerald-50 text-emerald-600 border-emerald-100",
                sheet?.status === "returned" && "bg-rose-50 text-rose-600 border-rose-100 animate-pulse",
              )}>
                {sheet?.status || 'Active'}
              </div>
              
              {(sheet?.status === "draft" || sheet?.status === "returned") && (
                <div className="flex gap-2 flex-1 sm:flex-none">
                  <button 
                    onClick={handleSaveDraft}
                    title="Manual Save"
                    className="px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-white border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-slate-600"
                  >
                    {saveStatus === "saving" ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : saveStatus === "saved" ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Calculator className="w-3 h-3 text-slate-300" />
                    )}
                    <span className="hidden sm:inline">{saveStatus === "saved" ? "Saved" : "Save"}</span>
                  </button>
                  <button 
                    onClick={handleSubmitSheet}
                    disabled={totalWeight !== 100}
                    className={cn(
                      "flex-1 sm:flex-none px-6 sm:px-8 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg whitespace-nowrap",
                      totalWeight === 100 ? "bg-brand-violet text-white hover:translate-y-[-1px] active:scale-95 shadow-brand-violet/20" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    )}
                  >
                    {totalWeight === 100 ? "Submit" : `Need 100% (${totalWeight}%)`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
  
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Areas */}
          <div className="lg:col-span-8 space-y-8">
            {activeTab === "goals" ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 shadow-sm p-6 sm:p-8 rounded-[32px] space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Objectives</p>
                      <Target className="w-4 h-4 text-slate-300" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900">{goals.length} <span className="text-lg sm:text-xl font-normal text-slate-200">/ 8</span></h2>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(goals.length / 8) * 100}%` }} className="h-full bg-brand-violet" />
                      </div>
                    </div>
                  </div>
  
                  <div className="bg-white border border-slate-200 shadow-sm p-6 sm:p-8 rounded-[32px] space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Strategic Weight</p>
                      <Calculator className="w-4 h-4 text-slate-300" />
                    </div>
                    <div className="space-y-1">
                      <h2 className={cn("text-3xl sm:text-4xl font-serif font-bold", totalWeight > 100 ? "text-rose-500" : "text-slate-900")}>
                        {totalWeight}% <span className="text-lg sm:text-xl font-normal text-slate-200">/ 100</span>
                      </h2>
                      <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(totalWeight, 100)}%` }} className={cn("h-full", totalWeight > 100 ? "bg-rose-500" : "bg-brand-cyan")} />
                      </div>
                    </div>
                  </div>
                </div>
  
                {/* Goal List */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                     <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-2">Your Strategy</h3>
                     {!sheet?.isLocked && (
                       <button onClick={() => setIsAdding(true)} className="text-brand-violet font-bold text-[10px] uppercase tracking-widest flex items-center space-x-1 hover:translate-x-1 transition-transform">
                         <span>Add Goal</span>
                         <Plus className="w-3 h-3" />
                       </button>
                     )}
                  </div>
  
                  <div className="grid grid-cols-1 gap-4">
                    {goals.map((goal) => (
                      <div key={goal.id} className="bg-white border border-slate-200 shadow-sm p-5 md:p-6 rounded-[24px] hover:border-brand-violet/20 group flex flex-col md:flex-row md:items-center gap-4 md:gap-6 relative overflow-hidden transition-all">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-slate-50 text-brand-violet flex items-center justify-center font-serif font-bold text-lg md:text-xl flex-shrink-0 border border-slate-100 group-hover:bg-brand-violet group-hover:text-white transition-colors">
                          {goal.weightage}%
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center flex-wrap gap-2">
                             <span className="text-[8px] font-bold uppercase text-slate-400 px-2 py-0.5 border border-slate-100 rounded-full whitespace-nowrap">{goal.thrustArea}</span>
                             <h4 className="font-bold text-sm tracking-tight text-slate-800">{goal.title}</h4>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2 md:line-clamp-1">{goal.description}</p>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-4 md:pt-0">
                          <div className="text-right">
                             <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target</p>
                             <p className="font-bold text-xs md:text-sm text-slate-900">{goal.target} {goal.uom}</p>
                          </div>
                          {sheet?.status === "draft" && (
                            <button 
                              onClick={() => handleDeleteGoal(goal.id, goal.weightage)}
                              className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <AlertCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {goals.length === 0 && (
                      <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-[32px] bg-white">
                         <p className="text-slate-300 font-bold uppercase text-[10px] tracking-widest">No goals defined yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-2">Active Objectives</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {goals.map((goal) => {
                    const checkin = checkins.find(c => c.goalId === goal.id);
                    return (
                      <div key={goal.id} onClick={() => setSelectedGoalForCheckin(goal)} className="bg-white border border-slate-200 shadow-sm p-8 rounded-[32px] hover:border-brand-violet/30 cursor-pointer space-y-6 transition-all">
                        <div className="flex items-center justify-between">
                           <h4 className="font-bold text-lg leading-tight text-slate-900">{goal.title}</h4>
                           <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                              <Activity className="w-5 h-5 text-brand-violet" />
                           </div>
                        </div>
                        
                        {checkin ? (
                          <div className="space-y-4">
                            <div className="flex items-end justify-between">
                               <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Update</p>
                                  <p className="text-2xl font-serif font-black text-slate-900">{checkin.actual} <span className="text-sm font-sans font-bold text-brand-violet">({checkin.progressScore?.toFixed(0)}%)</span></p>
                               </div>
                               <button className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all">Update</button>
                            </div>
                            {checkin.managerFeedback && (
                              <div className="p-4 bg-brand-violet/5 rounded-2xl border border-brand-violet/10 flex items-start space-x-3">
                                <MessageSquare className="w-4 h-4 text-brand-violet shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-brand-violet">Manager Feedback</p>
                                  <p className="text-[10px] font-medium text-slate-600 italic">"{checkin.managerFeedback}"</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-end justify-between">
                             <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target</p>
                                <p className="text-2xl font-serif font-black text-slate-900">{goal.target}</p>
                             </div>
                             <button className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all">Submit Progress</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                 </div>
              </div>
            )}
          </div>
  
          {/* Sidebar Info */}
          <aside className="lg:col-span-4 space-y-8">
            <div className="bg-white border border-slate-200 shadow-sm p-8 rounded-[32px] space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI Insights</h3>
                {aiError && (
                  <div className="group relative">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 cursor-help" />
                    <div className="absolute top-0 right-full mr-2 hidden group-hover:block w-48 p-3 bg-slate-900 text-white text-[9px] rounded-xl shadow-xl z-10 font-medium leading-relaxed border border-white/5">
                      {aiError}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <HealthIndicator score={healthAnalysis?.score || 30} />
                <p className="text-xs text-slate-500 leading-relaxed italic">{healthAnalysis?.feedback || "Calculating matrix integrity..."}</p>
                {healthAnalysis?.risks?.map((risk, i) => (
                  <div key={i} className="flex items-center space-x-2 text-rose-500">
                    <AlertCircle className="w-3 h-3" />
                    <p className="text-[10px] font-bold underline decoration-rose-200">{risk}</p>
                  </div>
                ))}
              </div>
            </div>
  
            <div className="bg-white border border-slate-200 shadow-sm p-8 rounded-[32px] space-y-6">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Milestones</h3>
              <div className="space-y-3">
                {achievements.map((ach, i) => (
                  <div key={i} className={cn("p-4 rounded-2xl flex items-center space-x-3", ach.color)}>
                    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">{ach.icon}</div>
                    <span className="text-[11px] font-bold uppercase tracking-widest">{ach.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

      {/* Floating AI */}
      {!sheet?.isLocked && (
        <button onClick={() => setIsAdding(true)} className="fixed bottom-10 right-10 w-16 h-16 bg-brand-violet text-white rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-violet/40 hover:scale-110 active:scale-90 transition-all z-50">
          <Sparkles className="w-7 h-7" />
        </button>
      )}

      {/* Models etc (kept from original logic but updated styles) */}
      <AnimatePresence>
        {selectedGoalForCheckin && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-brand-navy/10 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl space-y-8 border border-brand-border">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif font-black text-brand-navy">Post Update</h2>
                <button onClick={() => setSelectedGoalForCheckin(null)}><X className="w-6 h-6 text-brand-navy/20" /></button>
              </div>
              <div className="space-y-6">
                <input type="text" placeholder="Value reached..." className="w-full bg-brand-deep rounded-2xl px-6 py-4 text-lg font-bold outline-none border border-transparent focus:border-brand-violet/20 text-brand-navy" value={checkinData.actual} onChange={e => setCheckinData({...checkinData, actual: e.target.value})} />
                <textarea placeholder="Comments..." className="w-full bg-brand-deep rounded-2xl px-6 py-4 text-sm font-medium h-32 resize-none outline-none border border-transparent focus:border-brand-violet/20 text-brand-navy" value={checkinData.comment} onChange={e => setCheckinData({...checkinData, comment: e.target.value})} />
                <button onClick={handleUpdateCheckin} className="w-full bg-brand-violet text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-violet/20">Submit Progress</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-brand-navy/10 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              className="bg-white w-full max-w-2xl rounded-[32px] sm:rounded-[40px] shadow-2xl p-6 sm:p-10 space-y-6 sm:space-y-8 border border-brand-border max-h-[90vh] overflow-y-auto scrollbar-hide text-brand-navy"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-black">Strategic Goal</h2>
                  <p className="text-[10px] uppercase font-black tracking-widest text-brand-navy/30">FY2024 Objective Builder</p>
                </div>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-brand-lavender rounded-xl transition-all"><X className="w-6 h-6 text-brand-navy/20" /></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-brand-navy/40 ml-2">Objective Title</label>
                  <input placeholder="e.g. Optimize Revenue Ops" className="w-full bg-brand-deep rounded-2xl px-6 py-4 text-sm font-bold border border-transparent focus:border-brand-violet/20 outline-none transition-all text-brand-navy" value={newGoal.title} onChange={e => setNewGoal({...newGoal, title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-brand-navy/40 ml-2">Weightage (%)</label>
                  <input type="number" placeholder="15" className="w-full bg-brand-deep rounded-2xl px-6 py-4 text-sm font-bold border border-transparent focus:border-brand-violet/20 outline-none transition-all text-brand-navy" value={newGoal.weightage} onChange={e => setNewGoal({...newGoal, weightage: Number(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-brand-navy/40 ml-2">Description & Logic</label>
                <div className="relative">
                  <textarea placeholder="Describe the outcome..." className="w-full bg-brand-deep rounded-2xl px-6 py-4 text-sm font-medium h-32 resize-none border border-transparent focus:border-brand-violet/20 outline-none transition-all text-brand-navy" value={newGoal.description} onChange={e => setNewGoal({...newGoal, description: e.target.value})} />
                  <button onClick={handleSuggestDescription} disabled={aiLoading} className="absolute bottom-4 right-4 p-3 bg-white rounded-xl shadow-lg text-brand-violet hover:scale-110 active:scale-95 transition-all disabled:opacity-50">
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-brand-navy/40 ml-2">Target</label>
                  <input placeholder="Value" className="w-full bg-brand-deep rounded-xl px-4 py-3 text-xs font-bold border border-brand-border outline-none focus:border-brand-violet/20 text-brand-navy" value={newGoal.target} onChange={e => setNewGoal({...newGoal, target: e.target.value})} />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-brand-navy/40 ml-2">Metric Ecosystem</label>
                  <select className="w-full bg-brand-deep rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none border border-brand-border focus:border-brand-violet/20 text-brand-navy" value={newGoal.uom} onChange={e => setNewGoal({...newGoal, uom: e.target.value as any})}>
                    <option value="numeric">Numeric Flow</option>
                    <option value="percentage">Percentage Yield</option>
                    <option value="zero">Binary Logic (0/1)</option>
                  </select>
                </div>
              </div>

              <button onClick={handleAddGoal} className="w-full bg-brand-navy text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-brand-violet transition-all shadow-xl shadow-brand-navy/20 active:translate-y-1">Commit to Strategy</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

