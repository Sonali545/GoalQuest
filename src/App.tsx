/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./views/Login";
import EmployeeDashboard from "./views/EmployeeDashboard";
import ManagerDashboard from "./views/ManagerDashboard";
import AdminDashboard from "./views/AdminDashboard";
import SettingsView from "./views/SettingsView";
import { LogOut, User, LayoutDashboard, Target, Settings, Menu, X, ShieldCheck, Sparkles, Users } from "lucide-react";
import { cn } from "./lib/utils";

function AppContent() {
  const { user, profile, loading, error, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-deep">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-violet mx-auto"></div>
          <p className="text-[10px] uppercase font-black tracking-widest text-brand-navy/20">Loading</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-deep p-6">
        <div className="glass-card p-12 rounded-[48px] bg-white max-w-lg w-full text-center space-y-6">
           <div className="w-20 h-20 bg-rose-50 rounded-[32px] flex items-center justify-center mx-auto border border-rose-100">
              <ShieldCheck className="w-10 h-10 text-rose-500" />
           </div>
           <div className="space-y-2">
             <h2 className="text-2xl font-serif font-black text-brand-navy italic uppercase tracking-wider">Access Denied</h2>
             <p className="text-brand-navy/40 font-medium text-sm leading-relaxed">{error}</p>
           </div>
           <button 
             onClick={() => window.location.reload()}
             className="px-8 py-3 bg-brand-violet text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-violet/20"
           >
             Retry
           </button>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  const navItems = profile?.role === "admin" 
    ? [
        { id: "dashboard", label: "Governance", icon: LayoutDashboard },
        { id: "team_pulse", label: "Team Pulse", icon: Users },
        { id: "personal_goals", label: "My Strategy", icon: Target },
        { id: "goals", label: "Goal Audit", icon: ShieldCheck },
        { id: "settings", label: "System Config", icon: Settings },
      ]
    : [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "goals", label: "My Goals", icon: Target },
        { id: "settings", label: "Settings", icon: Settings },
      ];

  const renderContent = () => {
    if (activeView === "settings" && profile?.role !== "admin") {
      return <SettingsView />;
    }

    if (activeView === "personal_goals") {
      return <EmployeeDashboard activeView="goals" />;
    }

    if (activeView === "team_pulse") {
      return <ManagerDashboard activeView="dashboard" />;
    }
    
    switch (profile?.role) {
      case "admin": return <AdminDashboard activeView={activeView} />;
      case "manager": return <ManagerDashboard activeView={activeView} />;
      default: return <EmployeeDashboard activeView={activeView} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-brand-deep transition-colors duration-300 mesh-gradient relative overflow-hidden text-brand-navy font-sans">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-[240px] bg-white border-r border-brand-border/40 transform transition-all duration-500 lg:relative lg:translate-x-0 backdrop-blur-3xl",
        !sidebarOpen ? "-translate-x-full" : "translate-x-0"
      )}>
        <div className="relative h-full flex flex-col p-6">
          <div className="flex items-center space-x-3 mb-12 px-2">
            <div className="w-10 h-10 bg-brand-violet rounded-xl flex items-center justify-center shadow-lg shadow-brand-violet/10">
              <Target className="text-white w-4 h-4" />
            </div>
            <span className="font-serif font-black text-xl text-brand-navy">GoalQuest</span>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <button 
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => {
                  console.log(`Navigating to: ${item.id}`);
                  setActiveView(item.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "flex items-center space-x-3 w-full px-5 py-3.5 rounded-xl transition-all group border",
                  activeView === item.id 
                    ? "bg-brand-violet text-white font-bold border-brand-violet active-item-glow shadow-lg shadow-brand-violet/20" 
                    : "text-slate-600 hover:text-brand-violet hover:bg-brand-violet/5 border-transparent"
                )}
              >
                <item.icon className={cn("w-4 h-4 transition-transform", activeView === item.id ? "text-white" : "group-hover:scale-110")} />
                <span className="text-[10px] uppercase font-bold tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-brand-border/40 space-y-4 font-medium">
            <div className="flex items-center space-x-3 p-3 rounded-2xl bg-brand-lavender/30 border border-brand-border/40">
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center border border-brand-border shadow-sm">
                <User className="w-4 h-4 text-brand-navy/40" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate text-brand-navy tracking-tight">{profile?.name}</p>
                <p className="text-[9px] uppercase font-black text-brand-navy/30 tracking-widest">{profile?.role}</p>
              </div>
            </div>
            <button 
              onClick={signOut}
              className="flex items-center space-x-3 w-full px-5 py-3 rounded-xl text-brand-navy/30 hover:text-rose-500 hover:bg-rose-50 transition-all font-black uppercase text-[9px] tracking-widest"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen relative z-10 overflow-hidden">
        <header className="h-16 lg:h-0 transition-all flex items-center justify-between px-6 bg-white/80 backdrop-blur-md border-b border-brand-border lg:bg-transparent lg:border-none">
          <div className="flex items-center lg:hidden space-x-3">
             <div className="w-9 h-9 bg-brand-violet rounded-xl flex items-center justify-center">
                <Target className="text-white w-5 h-5" />
             </div>
             <span className="font-serif font-black text-lg text-brand-navy">GoalQuest</span>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="p-2 rounded-xl bg-white border border-brand-border shadow-sm lg:hidden text-brand-navy"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="p-6 md:p-10 lg:p-12 max-w-7xl mx-auto w-full">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Mobile Bot Navigation */}
      <div className="lg:hidden fixed bottom-6 left-6 right-6 h-16 bg-white/90 backdrop-blur-xl border border-brand-border shadow-2xl rounded-full flex items-center justify-around px-4 z-[60]">
        <button 
          onClick={() => setActiveView("dashboard")}
          className={cn("p-2 rounded-full transition-all", activeView === "dashboard" ? "text-brand-violet bg-brand-lavender shadow-sm" : "text-brand-navy/30")}
        >
          <LayoutDashboard className="w-5 h-5" />
        </button>
        {profile?.role === "admin" && (
          <button 
            onClick={() => setActiveView("team_pulse")}
            className={cn("p-2 rounded-full transition-all", activeView === "team_pulse" ? "text-brand-violet bg-brand-lavender shadow-sm" : "text-brand-navy/30")}
          >
            <Users className="w-5 h-5" />
          </button>
        )}
        <button 
          onClick={() => setActiveView(profile?.role === "admin" ? "personal_goals" : "goals")}
          className={cn("p-2 rounded-full transition-all", (activeView === "personal_goals" || activeView === "goals") ? "text-brand-violet bg-brand-lavender shadow-sm" : "text-brand-navy/30")}
        >
          <Target className="w-5 h-5" />
        </button>
        <button className="p-4 bg-brand-violet text-white rounded-full -mt-10 shadow-xl shadow-brand-violet/40 active:scale-95 transition-all"><Sparkles className="w-6 h-6" /></button>
        <button 
          onClick={() => setActiveView("settings")}
          className={cn("p-2 rounded-full transition-all", activeView === "settings" ? "text-brand-violet bg-brand-lavender shadow-sm" : "text-brand-navy/30")}
        >
          <Settings className="w-5 h-5" />
        </button>
        <button 
          onClick={() => {
            setSidebarOpen(true);
          }}
          className="p-2 text-brand-navy/30"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

