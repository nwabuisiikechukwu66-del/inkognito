/**
 * CompanionChat — components/companion/CompanionChat.tsx
 *
 * AI companion chat powered by Groq (Llama 3.1-8B-Instant).
 *
 * Features:
 * - Streaming responses via SSE from Convex HTTP action
 * - Session-local message history (not stored in DB — intentional)
 * - Typing indicator while AI responds
 * - Warm, non-judgmental persona
 * - Crisis detection prompt in system
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";

/* ── Types ─────────────────────────────────────────────────── */
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  streaming?: boolean;
}

/* ── Companion intro message ───────────────────────────────── */
const INTRO_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hey. I'm here, and I'm listening. This space is just for you — no judgment, no memory beyond this session. Say whatever you need to say.",
  timestamp: Date.now(),
};

export function CompanionChat() {
  const [messages, setMessages] = useState<Message[]>([INTRO_MESSAGE]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* ── Auto-scroll ─────────────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Send message ────────────────────────────────────────── */
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    // Add user message
    const userMsg: Message = {
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    // Placeholder for streaming assistant response
    const assistantMsg: Message = {
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      streaming: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    // Build message history for API (exclude intro, keep last 20)
    const history = [...messages, userMsg]
      .filter((m) => m !== INTRO_MESSAGE)
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      abortRef.current = new AbortController();

      // Call Convex HTTP action → Groq streaming
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!
        .replace(".cloud", ".site") // Convex HTTP actions use .site domain
        .replace("convex.cloud", "convex.site");

      const res = await fetch(`${convexUrl}/companion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error("AI companion unavailable.");
      }

      // Read SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              // Update the streaming message content
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.streaming) {
                  updated[updated.length - 1] = {
                    ...last,
                    content: fullContent,
                  };
                }
                return updated;
              });
            }
          } catch {
            /* Skip malformed SSE lines */
          }
        }
      }

      // Finalize message (remove streaming flag)
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.streaming) {
          updated[updated.length - 1] = {
            ...last,
            content: fullContent || "I'm here. Take your time.",
            streaming: false,
          };
        }
        return updated;
      });
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;

      // Fallback response on error
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.streaming) {
          updated[updated.length - 1] = {
            ...last,
            content:
              "Something went wrong on my end. I'm still here though — try again?",
            streaming: false,
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [input, isStreaming, messages]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleReset() {
    abortRef.current?.abort();
    setMessages([INTRO_MESSAGE]);
    setInput("");
    setIsStreaming(false);
  }

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="max-w-2xl">
      <div
        className="border border-[var(--border)] bg-[var(--surface)] flex flex-col"
        style={{ height: "72vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--crimson)] animate-pulse-red" />
            <span className="font-mono text-xs text-[var(--ash)] uppercase tracking-widest">
              Companion · Session only
            </span>
          </div>
          <button
            onClick={handleReset}
            title="Start fresh"
            className="text-[var(--dim)] hover:text-[var(--ash)] transition-colors"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className={clsx(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={clsx(
                    "max-w-[80%]",
                    msg.role === "user"
                      ? "text-right"
                      : "text-left"
                  )}
                >
                  {/* Role label */}
                  <p className="font-mono text-[9px] text-[var(--muted)] uppercase tracking-widest mb-1.5">
                    {msg.role === "user" ? "You" : "Companion"}
                  </p>

                  {/* Bubble */}
                  <div
                    className={clsx(
                      "px-4 py-3 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-[var(--card)] border border-[var(--border)] text-[var(--paper)]"
                        : "bg-[var(--deep)] border border-[var(--border)] border-l-2 border-l-[var(--crimson)] text-[var(--paper)]"
                    )}
                  >
                    {msg.content}
                    {/* Streaming cursor */}
                    {msg.streaming && (
                      <span className="inline-block w-0.5 h-4 bg-[var(--crimson)] ml-1 animate-pulse align-middle" />
                    )}
                  </div>

                  {/* Timestamp */}
                  {!msg.streaming && (
                    <p className="font-mono text-[9px] text-[var(--muted)] mt-1">
                      {formatDistanceToNow(new Date(msg.timestamp), {
                        addSuffix: true,
                      })}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[var(--border)] p-3">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Say anything. It stays here."
              rows={2}
              maxLength={1000}
              disabled={isStreaming}
              className="flex-1 bg-[var(--card)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--white)] placeholder:text-[var(--muted)] focus:border-[var(--dim)] resize-none transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="px-4 py-3 bg-[var(--crimson)] text-[var(--white)] hover:bg-[var(--crimson-bright)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-stretch flex items-center"
            >
              <Send size={15} />
            </button>
          </div>
          <p className="font-mono text-[9px] text-[var(--muted)] uppercase tracking-widest mt-2 text-center">
            Not stored · Resets on close · Not a crisis line
          </p>
        </div>
      </div>

      {/* Crisis resources note */}
      <div className="mt-4 border border-[var(--border)] border-dashed p-4">
        <p className="text-[var(--dim)] text-xs leading-relaxed">
          <span className="text-[var(--ash)]">Important:</span> This AI is not a substitute for professional help.
          If you&apos;re in crisis, please reach out to a real person.
          International Association for Suicide Prevention:{" "}
          <a
            href="https://www.iasp.info/resources/Crisis_Centres/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--crimson)] hover:underline"
          >
            Find a crisis centre near you
          </a>
          .
        </p>
      </div>
    </div>
  );
}
