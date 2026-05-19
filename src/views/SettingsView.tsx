import React from "react";
import { useAuth } from "../context/AuthContext";
import { User, Mail, Shield, Bell, Moon, Globe } from "lucide-react";
import { motion } from "motion/react";

export default function SettingsView() {
  const { profile } = useAuth();

  const sections = [
    {
      title: "Profile Information",
      icon: User,
      items: [
        { label: "Full Name", value: profile?.name, type: "text" },
        { label: "Email Address", value: profile?.email, type: "text" },
        { label: "Role", value: profile?.role, type: "badge" },
      ]
    },
    {
      title: "Preferences",
      icon: Bell,
      items: [
        { label: "Email Notifications", value: "Enabled", type: "toggle" },
        { label: "Theme", value: "Light / System", type: "text" },
        { label: "Language", value: "English (US)", type: "text" },
      ]
    }
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="space-y-2">
        <h1 className="text-4xl font-serif font-black tracking-tight text-brand-navy">
          Settings
        </h1>
        <p className="text-brand-navy/30 font-medium">Manage your account preferences and system configuration.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {sections.map((section, idx) => (
          <motion.div 
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-card p-8 rounded-[32px] bg-white border border-brand-border/40 space-y-6"
          >
            <div className="flex items-center gap-3 pb-4 border-b border-brand-border/40">
              <div className="w-10 h-10 bg-brand-lavender rounded-xl flex items-center justify-center">
                <section.icon className="w-5 h-5 text-brand-violet" />
              </div>
              <h2 className="text-xl font-serif font-black">{section.title}</h2>
            </div>

            <div className="space-y-4">
              {section.items.map((item) => (
                <div key={item.label} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-2">
                  <span className="text-[10px] uppercase font-black tracking-widest text-brand-navy/40">{item.label}</span>
                  {item.type === "badge" ? (
                    <span className="px-3 py-1 bg-brand-lavender text-brand-violet rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-violet/10">
                      {item.value}
                    </span>
                  ) : item.type === "toggle" ? (
                    <div className="w-12 h-6 bg-brand-violet rounded-full relative">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-brand-navy">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-8 rounded-[32px] bg-rose-50 border border-rose-100 space-y-4"
        >
          <div className="flex items-center gap-3 text-rose-600">
            <Shield className="w-5 h-5" />
            <h2 className="text-lg font-bold">Privacy & Security</h2>
          </div>
          <p className="text-sm text-rose-600/60 font-medium">Your data is secured with enterprise-grade encryption. Strategic goal data is restricted to authorized managers and admins only.</p>
        </motion.div>
      </div>
    </div>
  );
}
