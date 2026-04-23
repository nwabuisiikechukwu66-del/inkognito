/**
 * DM Chat Page — app/chat/dm/[id]/page.tsx
 * 
 * 1-on-1 private messaging UI.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { Send, ArrowLeft, Loader2, User, ShieldCheck } from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import { Id } from "@/convex/_generated/dataModel";

export default function DMChatPage() {
  const params = useParams();
  const router = useRouter();
  const { sessionId } = useAnonSession();
  const dmId = params.id as Id<"directMessages">;
  
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useQuery(api.dms.getMessages, { dmId });
  const sendMessage = useMutation(api.dms.sendMessage);
  
  // Get thread info to find the other user's name
  const dms = useQuery(api.dms.getMyDMs, { sessionId: sessionId || "" });
  const thread = dms?.find(d => d._id === dmId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!text.trim() || !sessionId) return;
    try {
      await sendMessage({
        dmId,
        senderSessionId: sessionId,
        content: text.trim(),
      });
      setText("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send.");
    }
  }

  if (!sessionId) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="animate-spin text-[var(--crimson)] mb-4" size={32} />
      <p className="text-[var(--ash)] font-mono text-xs uppercase tracking-widest">Connecting to the void...</p>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--black)] sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 -ml-2 text-[var(--dim)] hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--ash)]">
              <User size={18} />
            </div>
            <div>
              <h1 className="text-[var(--white)] font-bold text-sm">
                {thread?.otherUsername || "Anonymous"}
              </h1>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[var(--muted)] font-mono text-[8px] uppercase tracking-widest">Shadow Active</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[var(--crimson-dim)] border border-[var(--crimson-dim)] rounded-full">
          <ShieldCheck size={12} className="text-[var(--crimson)]" />
          <span className="text-[var(--crimson)] font-mono text-[9px] uppercase tracking-tighter font-bold">Encrypted Frequency</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#050505]">
        {!messages ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[var(--dim)]" size={24} />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-[var(--surface)] rounded-full flex items-center justify-center text-[var(--dim)] mx-auto mb-4 opacity-20">
              <MessageSquare size={32} />
            </div>
            <p className="text-[var(--dim)] font-display text-lg italic">The silence is yours to break.</p>
            <p className="text-[var(--muted)] text-xs mt-2 uppercase tracking-widest font-mono">End-to-end anonymity guaranteed</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderSessionId === sessionId;
            return (
              <div
                key={m._id}
                className={clsx("flex flex-col", isMe ? "items-end" : "items-start")}
              >
                <div
                  className={clsx(
                    "max-w-[85%] md:max-w-[70%] px-5 py-3 text-sm leading-relaxed",
                    isMe
                      ? "bg-[var(--crimson)] text-white rounded-2xl rounded-tr-none shadow-[0_4px_15px_rgba(196,30,58,0.2)]"
                      : "bg-[var(--surface)] text-[var(--paper)] border border-[var(--border)] rounded-2xl rounded-tl-none"
                  )}
                >
                  {m.content}
                </div>
                <span className="text-[var(--muted)] font-mono text-[8px] mt-1.5 px-1">
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-[var(--black)] border-t border-[var(--border)]">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-[var(--surface)] border border-[var(--border)] px-5 py-3 text-sm text-[var(--white)] placeholder:text-[var(--muted)] focus:border-[var(--dim)] transition-all rounded-xl"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="w-12 h-12 flex items-center justify-center bg-[var(--crimson)] text-white rounded-xl hover:bg-[var(--crimson-bright)] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_15px_rgba(196,30,58,0.3)]"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-center mt-3 text-[var(--muted)] font-mono text-[8px] uppercase tracking-[0.2em]">
          Anonymous · Encrypted · Instant
        </p>
      </div>
    </div>
  );
}
