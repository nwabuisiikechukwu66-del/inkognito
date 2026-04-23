/**
 * SubscriptionModal — components/ui/SubscriptionModal.tsx
 * 
 * A premium modal prompting users to subscribe to Shadow Plus.
 * Triggers when non-premium users try to initiate DMs.
 */

"use client";

import { X, CheckCircle2, Zap, Shield, MessageSquare, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ isOpen, onClose }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#0a0a0b] border border-[var(--border)] shadow-[0_0_50px_rgba(196,30,58,0.15)] rounded-2xl overflow-hidden"
          >
            {/* Header / Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--crimson)] to-transparent" />
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-[var(--dim)] hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="p-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-[var(--crimson-dim)] rounded-2xl flex items-center justify-center text-[var(--crimson)] shadow-[0_0_20px_rgba(196,30,58,0.2)]">
                  <Crown size={32} />
                </div>
              </div>

              <div className="text-center mb-8">
                <h2 className="heading-editorial text-3xl text-[var(--white)] mb-2">
                  Shadow Plus
                </h2>
                <p className="text-[var(--ash)] text-sm">
                  The void is deeper for those who seek more.
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <FeatureItem 
                  icon={MessageSquare} 
                  title="Direct Messaging" 
                  desc="Initiate private 1-on-1 shadow frequencies with any author." 
                />
                <FeatureItem 
                  icon={Zap} 
                  title="Priority Feed" 
                  desc="Your confessions stay in the 'Hot' section longer." 
                />
                <FeatureItem 
                  icon={Shield} 
                  title="Verified Badge" 
                  desc="A crimson checkmark next to your shadow name." 
                />
              </div>

              <button
                onClick={() => {
                  // Redirect to payment or subscribe page
                  window.location.href = "/settings";
                }}
                className="w-full py-4 bg-[var(--crimson)] text-white font-mono text-xs uppercase tracking-[0.2em] font-bold hover:bg-[var(--crimson-bright)] transition-all shadow-[0_4px_20px_rgba(196,30,58,0.4)] active:scale-[0.98]"
              >
                Become a Shadow Plus →
              </button>
              
              <p className="text-[var(--muted)] text-[9px] font-mono text-center mt-4 uppercase tracking-widest">
                Cancel anytime · No personal data · Pure shadow
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function FeatureItem({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="flex gap-4 p-3 rounded-xl hover:bg-white/[0.02] transition-colors group">
      <div className="mt-1 text-[var(--crimson)] group-hover:scale-110 transition-transform">
        <Icon size={18} />
      </div>
      <div>
        <h4 className="text-[var(--paper)] text-sm font-bold mb-0.5">{title}</h4>
        <p className="text-[var(--dim)] text-xs leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
