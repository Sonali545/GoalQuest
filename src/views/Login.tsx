import React from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../lib/firebase";
import { motion } from "motion/react";
import { Target, CheckCircle2, TrendingUp, Sparkles, Zap, MessageSquare, User } from "lucide-react";
import { cn } from "../lib/utils";

const FloatingCard = ({ delay = 0, className, children }: { delay?: number; className?: string; children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    animate={{ 
      opacity: 1, 
      y: [0, -15, 0],
    }}
    transition={{
      opacity: { duration: 1, delay },
      y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay }
    }}
    className={cn("absolute glass-card p-4 rounded-2xl shadow-xl border-brand-border/50", className)}
  >
    {children}
  </motion.div>
);

export default function Login() {
  const [showScrollTop, setShowScrollTop] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    setError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Login Error:", err);
      if (err.code === "auth/popup-blocked") {
        setError("Popup blocked by browser. Please enable popups or try opening in a new tab.");
      } else if (err.code === "auth/cancelled-popup-request") {
        setError("Login request was cancelled. Please try again.");
      } else {
        setError("An error occurred during login. Please ensure popups are allowed.");
      }
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-brand-deep transition-colors duration-300 mesh-gradient relative overflow-x-hidden text-brand-navy">
      {/* Navbar overlay */}
      <div className="fixed top-0 left-0 right-0 p-8 flex items-center justify-between z-50 bg-white/40 backdrop-blur-md border-b border-slate-200">
        <div onClick={scrollToTop} className="flex items-center space-x-2 cursor-pointer group">
          <Target className="w-6 h-6 text-brand-violet group-hover:rotate-12 transition-transform" />
          <span className="font-serif font-black text-xl tracking-tight text-slate-900">GoalQuest</span>
        </div>
        <div className="hidden md:flex items-center space-x-8 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          <button onClick={() => scrollToSection("features")} className="hover:text-brand-violet transition-colors cursor-pointer">Features</button>
          <button onClick={() => scrollToSection("showcase")} className="hover:text-brand-violet transition-colors cursor-pointer">Showcase</button>
          <button onClick={() => scrollToSection("pricing")} className="hover:text-brand-violet transition-colors cursor-pointer">Pricing</button>
          <button onClick={handleLogin} className="bg-brand-violet text-white px-6 py-2.5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-violet/20 border-none outline-none">Sign In</button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="min-h-screen flex items-center justify-center p-6 pt-32">
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-10"
          >
            <div className="space-y-6">
              <h1 className="text-7xl xl:text-8xl font-serif font-black tracking-tighter leading-[0.9] text-slate-900">
                Turn <span className="text-brand-violet">ambition</span> into achievement.
              </h1>
              <p className="text-slate-500 text-xl font-medium max-w-lg leading-relaxed">
                GoalQuest is the strategic performance engine where high-performing teams align, execute, and conquer their quarterly targets.
              </p>
            </div>

            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-6">
                <button
                  onClick={handleLogin}
                  className="bg-brand-violet text-white px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:translate-y-[-2px] active:scale-95 transition-all shadow-2xl shadow-brand-violet/20"
                >
                  Start Your Quest
                </button>
                <div className="flex items-center -space-x-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-10 h-10 rounded-xl border-2 border-white bg-brand-lavender flex items-center justify-center shadow-sm overflow-hidden transform hover:-translate-y-1 transition-transform">
                      <User className="w-5 h-5 text-brand-violet/40" />
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-xl border-2 border-white bg-white text-brand-violet flex items-center justify-center text-[10px] font-black shadow-sm">
                    +12
                  </div>
                </div>
              </div>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-bold text-rose-500 bg-rose-50 p-4 rounded-xl border border-rose-100 max-w-sm"
                >
                  {error}
                </motion.p>
              )}
            </div>
          </motion.div>

          {/* Visual Composition */}
          <div className="relative h-[650px] hidden lg:block">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-violet/10 blur-[120px] rounded-full -z-10" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-brand-pink/5 blur-[100px] rounded-full -z-10" />

            <FloatingCard delay={0} className="top-20 right-10 w-72 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-lavender flex items-center justify-center">
                  <Target className="w-5 h-5 text-brand-violet" />
                </div>
                <div>
                  <p className="font-serif font-black text-brand-navy">Project Phoenix</p>
                  <p className="text-[9px] uppercase tracking-widest text-brand-navy/30 font-black">Strategic Goal</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-2 w-full bg-brand-lavender/50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "75%" }}
                    transition={{ duration: 2, delay: 0.5 }}
                    className="h-full bg-brand-violet"
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-black text-brand-navy/30 group">
                  <span className="uppercase tracking-widest group-hover:text-brand-violet transition-colors">Progress Analysis</span>
                  <span>75%</span>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard delay={1.5} className="top-1/2 right-40 translate-x-10 translate-y-20 w-80 p-6 pointer-events-none">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-10 h-10 rounded-full bg-brand-lavender border-2 border-white flex items-center justify-center overflow-hidden shadow-sm">
                  <User className="w-5 h-5 text-brand-violet/40" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-brand-navy">Alex</span>
                    <span className="text-[8px] text-brand-navy/20 font-black">2m ago</span>
                  </div>
                  <div className="mt-1 bg-brand-violet text-white p-4 rounded-2xl rounded-tl-none shadow-lg shadow-brand-violet/10">
                    <p className="text-[12px] font-medium leading-relaxed">Goal alignment complete. AI identified 3 efficiency gains. 🚀</p>
                  </div>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard delay={3} className="top-1/3 left-0 w-64 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-navy/40">KPI Logic</span>
                </div>
                <div className="px-2 py-1 bg-rose-50 border border-rose-100 rounded-lg">
                  <span className="text-[8px] font-black uppercase text-rose-500">Critical</span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex -space-x-2 flex-1">
                  {[1, 2].map(i => (
                    <div key={i} className="w-7 h-7 rounded-full bg-brand-lavender border-2 border-white shadow-sm flex items-center justify-center">
                      <User className="w-3 h-3 text-brand-violet/40" />
                    </div>
                  ))}
                </div>
                <Zap className="w-5 h-5 text-brand-violet" />
              </div>
            </FloatingCard>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="text-center space-y-4">
             <h2 className="text-5xl font-serif font-black text-brand-navy">Mission Critical Features</h2>
             <p className="text-brand-navy/40 font-medium max-w-xl mx-auto italic">Everything you need to lead team execution at scale.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Dynamic OKRs", desc: "Align employee goals with top-level strategic initiatives in real-time.", icon: Target },
              { title: "AI Performance", desc: "Automated progress summaries and health checks powered by Gemini.", icon: Sparkles },
              { title: "Audit Protocols", desc: "Full traceability of goal modifications for enterprise compliance.", icon: MessageSquare }
            ].map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="p-10 rounded-[40px] bg-brand-lavender/30 border border-brand-violet/5 space-y-6"
              >
                <div className="w-14 h-14 bg-brand-violet text-white rounded-2xl flex items-center justify-center shadow-xl shadow-brand-violet/10">
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-serif font-black">{f.title}</h3>
                <p className="text-brand-navy/60 font-medium leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section id="showcase" className="py-32 px-6 bg-brand-deep">
        <div className="max-w-7xl mx-auto flex flex-col items-center space-y-16">
          <div className="text-center space-y-4">
             <h2 className="text-5xl font-serif font-black text-brand-navy leading-none">The Quest Dashboard</h2>
             <p className="text-brand-navy/40 font-medium italic">A unified view of organizational velocity.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="rounded-[48px] overflow-hidden border border-brand-border shadow-2xl relative group bg-white"
            >
              <img 
                src="https://images.unsplash.com/photo-1543286386-71395b9d9b91?auto=format&fit=crop&q=80&w=1600" 
                alt="Strategic Dashboard"
                className="w-full h-[400px] object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-navy/60 to-transparent flex items-end p-10">
                <div className="text-white space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Strategy Matrix</p>
                  <h3 className="text-2xl font-serif font-black">Performance Analytics</h3>
                </div>
              </div>
            </motion.div>

            <div className="space-y-8">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="rounded-[40px] overflow-hidden border border-brand-border shadow-xl relative group bg-white h-[184px]"
              >
                <img 
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop" 
                  alt="Team Collaboration"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-brand-violet/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                  <p className="text-white font-black uppercase tracking-widest text-xs">Team Sync</p>
                </div>
              </motion.div>
 
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="rounded-[40px] overflow-hidden border border-brand-border shadow-xl relative group bg-white h-[184px]"
              >
                <img 
                  src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1600&auto=format&fit=crop" 
                  alt="AI Insights"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-white/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                  <Sparkles className="w-8 h-8 text-brand-violet" />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="text-center space-y-4">
             <h2 className="text-5xl font-serif font-black text-brand-navy">Transparent Tiering</h2>
             <p className="text-brand-navy/40 font-medium">Scale your strategy without the friction.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
             <div className="p-12 rounded-[48px] border border-brand-border space-y-8 hover:border-brand-violet/20 transition-all group">
                <div className="space-y-2">
                   <p className="text-[10px] font-black uppercase tracking-widest text-brand-navy/30">Free Tier</p>
                   <h4 className="text-4xl font-serif font-black">$0 <span className="text-lg text-brand-navy/20">/mo</span></h4>
                </div>
                <ul className="space-y-4 text-sm font-bold text-brand-navy/60">
                   {["Up to 10 Reports", "Standard OKR Tracking", "Weekly AI Summaries"].map(u => (
                     <li key={u} className="flex items-center space-x-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>{u}</span>
                     </li>
                   ))}
                </ul>
                <button onClick={handleLogin} className="w-full py-4 rounded-2xl border-2 border-brand-violet text-brand-violet font-black uppercase tracking-widest text-[10px] hover:bg-brand-violet hover:text-white transition-all">Get Started</button>
             </div>
             <div className="p-12 rounded-[48px] bg-brand-violet text-white space-y-8 shadow-2xl shadow-brand-violet/30 scale-105">
                <div className="space-y-2">
                   <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Enterprise</p>
                   <h4 className="text-4xl font-serif font-black">Custom</h4>
                </div>
                <ul className="space-y-4 text-sm font-bold text-white/80">
                   {["Unlimited Org Hierarchy", "Real-time AI Health Ops", "Custom Audit Retention"].map(u => (
                     <li key={u} className="flex items-center space-x-3">
                        <CheckCircle2 className="w-4 h-4 text-white/40" />
                        <span>{u}</span>
                     </li>
                   ))}
                </ul>
                <button onClick={handleLogin} className="w-full py-4 rounded-2xl bg-white text-brand-violet font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-xl">Contact Sales</button>
             </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 bg-brand-deep border-t border-brand-border">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex items-center space-x-2">
              <Target className="w-6 h-6 text-brand-violet" />
              <span className="font-serif font-black text-xl tracking-tight">GoalQuest</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-navy/20">© 2026 GoalQuest Strategy Systems</p>
         </div>
      </footer>

      {/* Back to Top Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: showScrollTop ? 1 : 0, 
          scale: showScrollTop ? 1 : 0.8,
          pointerEvents: showScrollTop ? "auto" : "none"
        }}
        onClick={scrollToTop}
        className="fixed bottom-10 right-10 w-14 h-14 bg-brand-violet text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-brand-violet/40 z-50 hover:scale-110 active:scale-95 transition-all"
      >
        <TrendingUp className="w-6 h-6 rotate-[-90deg]" />
      </motion.button>
    </div>
  );
}
