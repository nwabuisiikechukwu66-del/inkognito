"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { Loader2, QrCode } from "lucide-react";

export function DeviceSync() {
  const { sessionId } = useAnonSession();
  const [token, setToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const createSyncToken = useMutation(api.sync.createSyncToken);

  async function handleGenerate() {
    if (!sessionId) return;
    setIsGenerating(true);
    try {
      const newToken = await createSyncToken({ sessionId });
      setToken(newToken);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  }

  // The QR code data would be a URL pointing to /sync?token=123
  const syncUrl = typeof window !== "undefined" ? `${window.location.origin}/sync?token=${token}` : "";

  return (
    <div className="bg-[#121215] border border-[var(--border)] rounded-xl p-6">
      <h3 className="text-lg font-display text-[var(--white)] flex items-center gap-2 mb-2">
        <QrCode size={18} className="text-[var(--crimson)]" />
        Link Device
      </h3>
      <p className="text-sm text-[var(--dim)] mb-6">
        Generate a QR code to securely sync your account and premium status to another device.
      </p>

      {!token ? (
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--surface)] hover:bg-[#1a1a1f] border border-[var(--border)] text-[var(--white)] rounded-lg font-mono text-xs uppercase tracking-widest transition-colors"
        >
          {isGenerating && <Loader2 size={14} className="animate-spin" />}
          Generate QR Code
        </button>
      ) : (
        <div className="flex flex-col items-start gap-4">
          <div className="p-4 bg-white rounded-lg inline-block">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(syncUrl)}`} 
              alt="Sync QR Code"
              className="w-48 h-48"
            />
          </div>
          <span className="text-[var(--dim)] font-mono text-xs max-w-[200px] leading-relaxed">
            Scan this on your new device using its camera to log in instantly. Valid for 10 minutes.
          </span>
        </div>
      )}
    </div>
  );
}
