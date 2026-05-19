import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, getDocs, doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { Settings, Users, ShieldCheck, Activity, TrendingUp, AlertTriangle, Database, Cloud, FileText, BarChart3, PieChart as PieChartIcon, Lock, Unlock, ChevronRight, X, Sparkles, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { seedDemoData } from "../lib/seed";

const performanceData = [
  { name: 'Jan', value: 45 },
  { name: 'Feb', value: 52 },
  { name: 'Mar', value: 48 },
  { name: 'Apr', value: 61 },
  { name: 'May', value: 75.5 },
  { name: 'Jun', value: 89 }
];

export default function AdminDashboard({ activeView }: { activeView?: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalSheets: 0, approved: 0, pending: 0, draft: 0 });
  const [allSheets, setAllSheets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"analytics" | "audit" | "cycles" | "users">("analytics");
  const [config, setConfig] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedData = async () => {
    if (!confirm("This will populate your database with sample goals, users, and progress. Continue?")) return;
    setIsSeeding(true);
    try {
      await seedDemoData();
      alert("Demo data successfully synchronized with strategic vault.");
    } catch (e) {
      console.error(e);
      alert("Failed to synchronize demo data.");
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    if (activeView === "dashboard") {
      setActiveTab("analytics");
    } else if (activeView === "goals") {
      setActiveTab("audit");
    } else if (activeView === "settings") {
      setActiveTab("cycles");
    }
  }, [activeView]);

  useEffect(() => {
    const unsubLogs = onSnapshot(collection(db, "auditLogs"), (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.timestamp?.seconds - a.timestamp?.seconds));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "auditLogs");
    });

    const unsubSheets = onSnapshot(collection(db, "goalSheets"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllSheets(data);
      setStats({
        totalSheets: data.length,
        approved: data.filter((s: any) => s.status === 'approved').length,
        pending: data.filter((s: any) => s.status === 'pending').length,
        draft: data.filter((s: any) => s.status === 'draft').length,
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "goalSheets");
    });

    const unsubConfig = onSnapshot(doc(db, "config", "global"), (doc) => {
      if (doc.exists()) {
        setConfig(doc.data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "config/global");
    });

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "users");
    });

    return () => {
      unsubLogs();
      unsubSheets();
      unsubConfig();
      unsubUsers();
    };
  }, []);

  const handleUpdateConfig = async (newConfig: any) => {
    try {
      await setDoc(doc(db, "config", "global"), {
        ...newConfig,
        updatedAt: serverTimestamp()
      });
      alert("Configuration updated.");
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateUserRole = async (userId: string, role: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { role });
      alert("User role updated.");
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateStatus = async (sheetId: string, status: "approved" | "returned") => {
    if (!confirm(`Are you sure you want to ${status} this goal sheet?`)) return;
    try {
      await updateDoc(doc(db, "goalSheets", sheetId), {
        status,
        isLocked: status === 'approved',
        [status === 'approved' ? 'approvedAt' : 'returnedAt']: serverTimestamp(),
      });
      await setDoc(doc(collection(db, "auditLogs")), {
        action: status === 'approved' ? "APPROVE_SHEET" : "RETURN_SHEET",
        entityId: sheetId,
        timestamp: serverTimestamp(),
        userId: "admin"
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleUnlock = async (sheetId: string) => {
    if (!confirm("Unlock this sheet for editing?")) return;
    try {
      await updateDoc(doc(db, "goalSheets", sheetId), {
        isLocked: false,
        status: 'draft',
        unlockedAt: serverTimestamp(),
      });
      await setDoc(doc(collection(db, "auditLogs")), {
        action: "UNLOCK_SHEET",
        entityId: sheetId,
        timestamp: serverTimestamp(),
        userId: "admin"
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleExport = () => {
    let dataToExport: any[] = [];
    let filename = "export.csv";

    const getUserName = (id: string) => users.find(u => u.id === id)?.name || id;
    const getManagerName = (mId: string) => users.find(u => u.id === mId)?.name || mId;

    if (activeTab === "audit") {
      dataToExport = allSheets.map(s => ({
        "Sheet ID": s.id,
        "Employee Name": getUserName(s.employeeId),
        "Employee ID": s.employeeId,
        "Status": (s.status || "draft").toUpperCase(),
        "Locked": s.isLocked ? "YES" : "NO",
        "Goal Count": (s.goals || []).length,
        "Total Weight": (s.goals || []).reduce((sum: number, g: any) => sum + (g.weightage || 0), 0) + "%",
        "Submitted At": s.submittedAt ? new Date(s.submittedAt.seconds * 1000).toLocaleString() : "N/A",
        "Finalized At": (s.approvedAt || s.returnedAt) ? new Date((s.approvedAt || s.returnedAt).seconds * 1000).toLocaleString() : "N/A",
        "Cycle ID": s.cycleId || "N/A",
        "Manager Name": getManagerName(s.managerId),
        "Manager UID": s.managerId
      }));
      filename = `strategic_audit_report_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (activeTab === "users") {
      dataToExport = users.map(u => ({
        "Full Name": u.name,
        "Email Alias": u.email,
        "System Role": (u.role || "employee").toUpperCase(),
        "Department": u.department || "General Operations",
        "Direct Manager": u.managerId ? getManagerName(u.managerId) : "None",
        "Manager ID": u.managerId || "N/A",
        "User UID": u.id,
        "Created At": u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleString() : "N/A"
      }));
      filename = `organization_hierarchy_export_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (activeTab === "analytics") {
      const avg = performanceData.reduce((acc, curr) => acc + curr.value, 0) / performanceData.length;
      dataToExport = [
        ...performanceData.map(d => ({
          "Reporting Period": d.name,
          "Index Score": d.value,
          "Metric Category": "Engagement Velocity",
          "Health Classification": d.value > 80 ? "EXCEPTIONAL" : d.value > 60 ? "STABLE" : "MONITOR"
        })),
        {
          "Reporting Period": "--- REPORT SUMMARY ---",
          "Index Score": avg.toFixed(2),
          "Metric Category": "Average Velocity Coefficient",
          "Health Classification": "SYSTEM AGGREGATE"
        }
      ];
      filename = `performance_metrics_detailed_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (activeTab === "cycles") {
      dataToExport = [{
        "Active Cycle ID": config?.activeCycle || "N/A",
        "Current Quarter Identifier": config?.currentQuarter || "N/A",
        "System Status": "OPERATIONAL",
        "Last Configuration Sync": config?.updatedAt ? new Date(config.updatedAt.seconds * 1000).toLocaleString() : "N/A"
      }];
      filename = `global_cycle_parameters_${new Date().toISOString().split('T')[0]}.csv`;
    }

    if (dataToExport.length === 0) {
      alert("No data available to export for the selected context.");
      return;
    }

    const headers = Object.keys(dataToExport[0]);
    const csvContent = [
      headers.join(","),
      ...dataToExport.map(row => headers.map(header => {
        const val = row[header];
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const labs = [
    { label: 'Infrastructure', status: 'Stable', icon: <Cloud className="w-4 h-4 text-brand-violet" /> },
    { label: 'Strategic Revenue', status: 'Optimal', icon: <TrendingUp className="w-4 h-4 text-emerald-500" /> },
    { label: 'Force Growth', status: 'Active', icon: <Activity className="w-4 h-4 text-brand-violet" /> }
  ];

  return (
    <div className="space-y-12 pb-20 transition-colors duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-serif font-black tracking-tight text-brand-navy leading-none">
            Governance <span className="text-brand-violet">Console</span>
          </h1>
          <p className="text-brand-navy/60 font-medium text-sm">Global oversight and infrastructure management.</p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex bg-white p-1 rounded-2xl border border-brand-border shadow-sm overflow-x-auto scrollbar-hide">
            {[
              { id: "analytics", label: "Analytics" },
              { id: "audit", label: "Audit" },
              { id: "cycles", label: "Cycles" },
              { id: "users", label: "Users" }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap", 
                  activeTab === tab.id ? "bg-brand-lavender text-brand-violet shadow-sm" : "text-brand-navy/60 hover:text-brand-navy"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button 
            onClick={handleSeedData}
            disabled={isSeeding}
            className="bg-brand-violet text-white px-6 py-2.5 rounded-xl flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95 shadow-brand-violet/20"
          >
             {isSeeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
             <span>{isSeeding ? "Seeding..." : "Seed Demo"}</span>
          </button>
          <button 
            onClick={handleExport}
            className="bg-brand-navy text-white px-8 py-2.5 rounded-xl flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95 shadow-brand-navy/20"
          >
             <Database className="w-4 h-4 text-brand-violet" />
             <span>Export</span>
          </button>
        </div>
      </div>

      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white border border-brand-border shadow-sm p-10 rounded-[40px] space-y-10 relative overflow-hidden text-brand-navy">
            <div className="flex items-center justify-between">
               <div className="space-y-1">
                 <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Global Performance</p>
                 <h3 className="text-2xl font-serif font-bold text-slate-900">Engagement Velocity</h3>
               </div>
               <div className="flex items-center space-x-2 px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-[10px] uppercase rounded-lg">
                  <TrendingUp className="w-3 h-3" />
                  <span>+12.4%</span>
               </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '16px', 
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                      color: '#0f172a',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#6366f1" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorVal)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 bg-white border border-brand-border shadow-sm p-10 rounded-[40px] space-y-8 flex flex-col justify-center text-brand-navy">
              <div className="text-center">
                 <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4">Stability Index</p>
                 <h4 className="text-6xl font-serif font-black text-slate-900 leading-none">94.2</h4>
              </div>
              <div className="space-y-3">
                 {labs.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-slate-200 transition-all">
                       <div className="flex items-center space-x-3">
                          <div className="">{item.icon}</div>
                          <span className="text-xs font-bold text-slate-600">{item.label}</span>
                       </div>
                       <span className="text-[9px] font-bold uppercase text-slate-400 px-3 py-1 bg-white rounded-full border border-slate-200 shadow-sm">{item.status}</span>
                    </div>
                 ))}
              </div>
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-navy/60">System Audit</h3>
            <div className="text-[9px] font-black text-brand-navy/40 uppercase tracking-widest bg-brand-deep px-3 py-1 rounded-full border border-brand-border">
              {allSheets.length} Active Nodes
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 shadow-sm rounded-[32px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-[9px] uppercase font-bold tracking-widest border-b border-slate-200">
                    <th className="px-8 py-5">Node ID</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5">Protocol</th>
                    <th className="px-8 py-5 text-right">Emergency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {allSheets.map((sheet, idx) => (
                    <motion.tr 
                      key={sheet.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-slate-50/50 transition-all font-semibold"
                    >
                      <td className="px-8 py-6 font-mono text-[10px] text-slate-500">{sheet.employeeId}</td>
                      <td className="px-8 py-6">
                         <span className={cn(
                           "text-[9px] uppercase tracking-widest font-bold px-3 py-1 rounded-full border",
                           sheet.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-brand-lavender text-brand-violet border-brand-violet/20'
                         )}>
                           {sheet.status}
                         </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-3">
                          {sheet.isLocked ? 
                            <Lock className="w-3.5 h-3.5 text-rose-500" /> : 
                            <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                          }
                          <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                            {sheet.isLocked ? "Locked" : "Editable"}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {sheet.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => handleUpdateStatus(sheet.id, 'approved')}
                                className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all outline-none"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleUpdateStatus(sheet.id, 'returned')}
                                className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all outline-none"
                              >
                                Return
                              </button>
                            </>
                          )}
                          {sheet.isLocked && (
                            <button 
                              onClick={() => handleUnlock(sheet.id)}
                              className="text-[9px] font-bold uppercase tracking-widest text-brand-violet hover:text-white hover:bg-brand-violet transition-all bg-brand-lavender px-4 py-2.5 rounded-xl border border-brand-violet/20"
                            >
                              Unlock Protocol
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "cycles" && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="glass-card p-10 rounded-[40px] space-y-8 text-brand-navy">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-serif font-black">Cycle Configuration</h3>
              <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">Active System</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Primary Cycle ID</label>
                <input 
                  type="text" 
                  value={config?.activeCycle || ""} 
                  onChange={(e) => setConfig({ ...config, activeCycle: e.target.value })}
                  placeholder="e.g. 2024-Phase1" 
                  className="w-full bg-brand-deep rounded-2xl px-6 py-4 text-sm font-bold border border-transparent focus:border-brand-violet/20 outline-none transition-colors text-brand-navy" 
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest opacity-60">Active Quarter</label>
                <select 
                  value={config?.currentQuarter || "Q1"}
                  onChange={(e) => setConfig({ ...config, currentQuarter: e.target.value })}
                  className="w-full bg-brand-deep rounded-2xl px-6 py-4 text-sm font-bold border border-transparent focus:border-brand-violet/20 outline-none transition-colors text-brand-navy"
                >
                  {["Q1", "Q2", "Q3", "Q4"].map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
            </div>
            <button 
              onClick={() => handleUpdateConfig(config)}
              className="w-full bg-brand-violet text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-brand-violet/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Update Global Config
            </button>
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-navy/30">Organization Hierarchy</h3>
            <span className="text-[9px] font-black text-brand-navy/20 uppercase tracking-widest">{users.length} Identities</span>
          </div>
          <div className="glass-card rounded-[32px] overflow-hidden border border-brand-border">
             <table className="w-full text-left">
                <thead>
                  <tr className="bg-brand-deep text-brand-navy/30 text-[9px] uppercase font-black tracking-widest border-b border-brand-border">
                    <th className="px-8 py-5">Full Name</th>
                    <th className="px-8 py-5">Email Alias</th>
                    <th className="px-8 py-5">Assigned Role</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border text-brand-navy">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-brand-deep/30 transition-all">
                      <td className="px-8 py-6 font-bold text-sm">{u.name}</td>
                      <td className="px-8 py-6 text-xs opacity-40">{u.email}</td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col space-y-2">
                          <select 
                            value={u.role} 
                            onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                            className="bg-brand-lavender text-brand-violet text-[10px] font-black uppercase tracking-widest rounded-lg px-3 py-1 outline-none border border-brand-violet/10"
                          >
                            {["employee", "manager", "admin"].map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                          <select 
                            value={u.managerId || ""} 
                            onChange={async (e) => {
                              try {
                                await updateDoc(doc(db, "users", u.id), { managerId: e.target.value });
                                alert("Manager assigned.");
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="bg-brand-deep text-brand-navy text-[10px] font-black uppercase tracking-widest rounded-lg px-3 py-1 outline-none border border-brand-border"
                          >
                            <option value="">No Manager</option>
                            {users.filter(user => user.role === 'manager').map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button className="text-[10px] font-black uppercase tracking-widest opacity-20 hover:opacity-100 hover:text-brand-violet transition-all">Audit Identity</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      )}
    </div>
  );
}
