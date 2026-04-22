"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { Loader2, Crown, ShieldCheck, Zap } from "lucide-react";
import toast from "react-hot-toast";

export function PremiumBanner() {
  const { sessionId, country } = useAnonSession();
  const user = useQuery(api.users.getBySession, { sessionId: sessionId || "" });
  const createCheckout = useAction(api.payments.createCheckoutSession);
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    if (!sessionId) return;
    setLoading(true);
    try {
      const result = await createCheckout({ 
        sessionId, 
        country: country || undefined 
      });
      window.location.href = result.url;
    } catch (err) {
      console.error(err);
      toast.error("Failed to start checkout. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  if (user.isPremium) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--crimson-dim)] rounded-xl p-6 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--crimson-dim)] flex items-center justify-center mb-4">
          <Crown className="text-[var(--crimson)]" size={24} />
        </div>
        <h3 className="text-lg font-display text-[var(--white)] font-bold">Premium Active</h3>
        <p className="text-sm text-[var(--dim)] mt-2">
          You have full access to custom usernames, direct messaging, and unlimited AI companion memory.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Crown size={120} />
      </div>

      <div className="relative z-10 max-w-lg">
        <p className="font-mono text-[10px] text-[var(--crimson)] uppercase tracking-widest mb-2 flex items-center gap-2">
          <Zap size={12} className="fill-[var(--crimson)]" />
          Inkognito Plus
        </p>
        <h3 className="text-2xl font-display text-[var(--white)] font-bold leading-tight mb-4">
          Go Premium for $3/mo
        </h3>
        
        <ul className="space-y-3 mb-8">
          {[
            { icon: Crown, text: "Permanent custom username" },
            { icon: Zap, text: "Initiate direct messages with anyone" },
            { icon: ShieldCheck, text: "Advanced privacy & device sync" },
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-3 text-sm text-[var(--ash)]">
              <item.icon size={16} className="text-[var(--crimson)]" />
              {item.text}
            </li>
          ))}
        </ul>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full py-4 bg-[var(--crimson)] hover:bg-[var(--crimson-bright)] text-[var(--white)] rounded-lg font-mono text-xs uppercase tracking-widest transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : "Upgrade Now"}
        </button>
        <p className="text-[10px] text-[var(--muted)] text-center mt-4">
          Secure payment via Paystack or Polar. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
