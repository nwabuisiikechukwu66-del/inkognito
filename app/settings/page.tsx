"use client";

import { useState, useEffect } from "react";
import { Settings, Shield, Trash2, Eye, Info, ChevronRight, Check } from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";


export default function SettingsPage() {
  const [showNSFW, setShowNSFW] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("ink_nsfw");
    if (stored === "true") setShowNSFW(true);
    
    const haptic = localStorage.getItem("ink_haptic");
    if (haptic === "false") setHapticEnabled(false);
  }, []);

  const toggleNSFW = () => {
    const newValue = !showNSFW;
    setShowNSFW(newValue);
    localStorage.setItem("ink_nsfw", String(newValue));
    toast.success(`NSFW content ${newValue ? "revealed" : "hidden"}`);
  };

  const toggleHaptic = () => {
    const newValue = !hapticEnabled;
    setHapticEnabled(newValue);
    localStorage.setItem("ink_haptic", String(newValue));
  };

  const handleResetSession = () => {
    if (confirm("Are you sure? This will delete your current session ID and you will lose access to your confessions and premium status on this device unless you have synced it elsewhere.")) {
      localStorage.clear();
      window.location.href = "/";
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-12">
        <p className="font-mono text-[10px] text-[var(--crimson)] uppercase tracking-[0.3em] mb-3">
          Preferences
        </p>
        <h1 className="text-4xl font-display font-bold text-[var(--white)] flex items-center gap-3">
          <Settings size={32} className="text-[var(--crimson)]" />
          Settings
        </h1>
      </div>

      <div className="space-y-10">
        {/* Privacy Section */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--dim)] mb-6 flex items-center gap-2">
            <Shield size={14} />
            Privacy & Content
          </h2>
          
          <div className="space-y-px">
            {/* NSFW Toggle */}
            <button 
              onClick={toggleNSFW}
              className="w-full flex items-center justify-between p-6 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--dim)] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--black)] border border-[var(--border)] flex items-center justify-center text-[var(--ash)] group-hover:text-[var(--white)]">
                  <Eye size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-[var(--white)]">Show NSFW Content</p>
                  <p className="text-[10px] text-[var(--muted)]">Display sensitive content without blurring</p>
                </div>
              </div>
              <div className={clsx(
                "w-12 h-6 rounded-full transition-colors relative",
                showNSFW ? "bg-[var(--crimson)]" : "bg-[var(--border)]"
              )}>
                <div className={clsx(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                  showNSFW ? "left-7" : "left-1"
                )} />
              </div>
            </button>

            {/* Haptic Toggle */}
            <button 
              onClick={toggleHaptic}
              className="w-full flex items-center justify-between p-6 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--dim)] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--black)] border border-[var(--border)] flex items-center justify-center text-[var(--ash)] group-hover:text-[var(--white)]">
                  <Settings size={18} className="animate-pulse" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-[var(--white)]">Micro-interactions</p>
                  <p className="text-[10px] text-[var(--muted)]">Enable subtle animations and effects</p>
                </div>
              </div>
              <div className={clsx(
                "w-12 h-6 rounded-full transition-colors relative",
                hapticEnabled ? "bg-[var(--crimson)]" : "bg-[var(--border)]"
              )}>
                <div className={clsx(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                  hapticEnabled ? "left-7" : "left-1"
                )} />
              </div>
            </button>
          </div>
        </section>

        {/* Account Section */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--dim)] mb-6 flex items-center gap-2">
            <Trash2 size={14} />
            Data Management
          </h2>
          
          <div className="bg-[var(--surface)] border border-[var(--border)] p-8">
            <p className="text-sm text-[var(--ash)] mb-6 leading-relaxed">
              Inkognito is built on anonymity. Your data is tied to your local session ID. If you lose this ID, your account is gone forever unless you have synced it to another device.
            </p>
            <button 
              onClick={handleResetSession}
              className="flex items-center gap-2 px-6 py-3 border border-[var(--crimson)] text-[var(--crimson)] font-mono text-[10px] uppercase tracking-widest hover:bg-[var(--crimson)] hover:text-white transition-all"
            >
              <Trash2 size={14} />
              Purge Local Identity
            </button>
          </div>
        </section>

        {/* About Section */}
        <section>
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--dim)] mb-6 flex items-center gap-2">
            <Info size={14} />
            About
          </h2>
          
          <div className="space-y-px">
            <LinkItem label="Community Guidelines" href="/terms" />
            <LinkItem label="Privacy Manifesto" href="/privacy" />
            <LinkItem label="Advertise with us" href="/advertise" />
          </div>
        </section>

        {/* Shadow Admin Section (Hidden unless dev or specific action) */}
        <ShadowAdmin />

        <div className="mt-8 text-center">
          <p className="text-[10px] font-mono text-[var(--muted)] uppercase tracking-widest">
            Inkognito v2.0.0 · Made for the shadows
          </p>
        </div>
      </div>
    </div>
  );
}

function ShadowAdmin() {
  const [secret, setSecret] = useState("");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const seedFeed = useMutation(api.admin.seedFeed);

  const handleSeed = async () => {
    if (!secret) return toast.error("Enter secret");
    setLoading(true);
    try {
      await seedFeed({ secret, count });
      toast.success(`Seeding ${count} posts... check feed in a few mins.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to seed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-12 pt-12 border-t border-[var(--border)] border-dashed opacity-30 hover:opacity-100 transition-opacity">
      <h2 className="text-[10px] font-mono uppercase tracking-[0.3em] text-[var(--crimson)] mb-6">
        Shadow Admin
      </h2>
      <div className="bg-[var(--card)] border border-[var(--border)] p-6 space-y-4">
        <input 
          type="password" 
          placeholder="Admin Secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="w-full bg-[var(--black)] border border-[var(--border)] px-4 py-2 text-xs font-mono text-[var(--white)]"
        />
        <div className="flex gap-2">
          <input 
            type="number" 
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value))}
            className="w-20 bg-[var(--black)] border border-[var(--border)] px-4 py-2 text-xs font-mono text-[var(--white)]"
          />
          <button 
            onClick={handleSeed}
            disabled={loading}
            className="flex-1 bg-[var(--crimson-dim)] text-[var(--crimson)] border border-[var(--crimson)] py-2 text-[10px] font-mono uppercase tracking-widest hover:bg-[var(--crimson)] hover:text-white transition-all disabled:opacity-50"
          >
            {loading ? "Generating..." : "Seed Human Stories"}
          </button>
        </div>
        <p className="text-[9px] text-[var(--muted)] font-mono uppercase italic">
          * Caution: This triggers AI generation using Groq. Use sparingly.
        </p>
      </div>
    </section>
  );
}


function LinkItem({ label, href }: { label: string, href: string }) {
  return (
    <a 
      href={href}
      className="w-full flex items-center justify-between p-6 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--dim)] transition-all group"
    >
      <span className="text-sm font-medium text-[var(--white)]">{label}</span>
      <ChevronRight size={16} className="text-[var(--muted)] group-hover:text-[var(--white)] transition-colors" />
    </a>
  );
}
