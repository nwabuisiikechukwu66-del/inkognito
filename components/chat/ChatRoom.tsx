/**
 * ChatRoom — components/chat/ChatRoom.tsx
 *
 * Omegle-style random stranger chat.
 *
 * States:
 * 1. IDLE        — Mode selection (text / video)
 * 2. SEARCHING   — In queue, waiting for match
 * 3. CONNECTED   — Active chat session
 * 4. ENDED       — Session ended, can start new
 *
 * Text chat: Convex real-time mutations/queries.
 * Video chat: WebRTC peer-to-peer via custom signaling through Convex.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { clsx } from "clsx";
import { Send, Video, MessageSquare, X, SkipForward, Loader } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { Id } from "@/convex/_generated/dataModel";
import { useWebRTC } from "@/hooks/useWebRTC";

type ChatMode = "text" | "video";
type RoomState = "idle" | "searching" | "connected" | "ended";

export function ChatRoom() {
  const { sessionId, country, isLoaded } = useAnonSession();
  const [mode, setMode] = useState<ChatMode>("text");
  const [roomState, setRoomState] = useState<RoomState>("idle");
  const [chatSessionId, setChatSessionId] = useState<Id<"chatSessions"> | null>(null);
  const [myRole, setMyRole] = useState<"A" | "B">("A");
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const joinQueue = useMutation(api.chat.joinQueue);
  const sendMsg = useMutation(api.chat.sendMessage);
  const leaveChat = useMutation(api.chat.leaveChat);

  // Live session state from Convex
  const chatSession = useQuery(
    api.chat.getMyChatSession,
    isLoaded ? { sessionId } : "skip"
  );

  // Live messages
  const messages = useQuery(
    api.chat.getMessages,
    chatSessionId ? { chatSessionId } : "skip"
  );

  // WebRTC hook (only active in video mode)
  const { localVideoRef, remoteVideoRef, startCall, endCall } = useWebRTC({
    sessionId,
    chatSessionId: mode === "video" ? chatSessionId : null,
    myRole,
  });

  /* ── Detect pairing ──────────────────────────────────────── */
  useEffect(() => {
    if (!chatSession) return;

    // Store session ID
    if (chatSession._id !== chatSessionId) {
      setChatSessionId(chatSession._id as Id<"chatSessions">);
      setMyRole((chatSession.myRole as "A" | "B") ?? "A");
    }

    // Detect transition from waiting → active
    if (chatSession.status === "active" && roomState === "searching") {
      setRoomState("connected");
      if (mode === "video") startCall();
    }

    // Detect ended session
    if (chatSession.status === "ended" && roomState === "connected") {
      setRoomState("ended");
      endCall();
    }
  }, [chatSession, roomState, chatSessionId, mode, startCall, endCall]);

  /* ── Auto-scroll messages ────────────────────────────────── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Handlers ────────────────────────────────────────────── */
  async function handleStart() {
    if (!sessionId || !isLoaded) return;
    setRoomState("searching");

    try {
      const result = await joinQueue({
        sessionId,
        mode,
        country: country ?? undefined,
      });

      setChatSessionId(result.sessionId as Id<"chatSessions">);
      setMyRole((result.role as "A" | "B") ?? "A");

      if (result.status === "active") {
        setRoomState("connected");
        if (mode === "video") startCall();
      }
    } catch (err) {
      setRoomState("idle");
      toast.error("Failed to join queue.");
    }
  }

  async function handleLeave() {
    if (!chatSessionId || !sessionId) return;
    try {
      await leaveChat({ chatSessionId, sessionId });
    } catch { /* ignore */ }
    endCall();
    setRoomState("ended");
  }

  async function handleSend() {
    if (!messageText.trim() || !chatSessionId || !sessionId) return;
    try {
      await sendMsg({
        chatSessionId,
        senderSessionId: sessionId,
        content: messageText,
      });
      setMessageText("");
    } catch (err) {
      toast.error("Failed to send.");
    }
  }

  function handleNewChat() {
    setChatSessionId(null);
    setRoomState("idle");
    setMessageText("");
  }

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="max-w-3xl">
      <AnimatePresence mode="wait">

        {/* ── IDLE: Mode selection ──────────────────────────── */}
        {roomState === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="border border-[var(--border)] bg-[var(--surface)] p-10"
          >
            <p className="font-mono text-xs text-[var(--dim)] uppercase tracking-widest mb-8">
              Choose your mode
            </p>

            <div className="grid grid-cols-2 gap-4 mb-10">
              {/* Text mode */}
              <button
                onClick={() => setMode("text")}
                className={clsx(
                  "p-6 border-2 text-left transition-all duration-200",
                  mode === "text"
                    ? "border-[var(--crimson)] bg-[var(--crimson-dim)]"
                    : "border-[var(--border)] hover:border-[var(--muted)]"
                )}
              >
                <MessageSquare
                  size={24}
                  className={mode === "text" ? "text-[var(--crimson)]" : "text-[var(--dim)]"}
                />
                <h3 className="font-display font-bold text-[var(--white)] mt-3 mb-1">
                  Text Chat
                </h3>
                <p className="text-[var(--ash)] text-xs leading-relaxed">
                  Anonymous text with a random stranger. Instant. No traces.
                </p>
              </button>

              {/* Video mode */}
              <button
                onClick={() => setMode("video")}
                className={clsx(
                  "p-6 border-2 text-left transition-all duration-200",
                  mode === "video"
                    ? "border-[var(--crimson)] bg-[var(--crimson-dim)]"
                    : "border-[var(--border)] hover:border-[var(--muted)]"
                )}
              >
                <Video
                  size={24}
                  className={mode === "video" ? "text-[var(--crimson)]" : "text-[var(--dim)]"}
                />
                <h3 className="font-display font-bold text-[var(--white)] mt-3 mb-1">
                  Video Chat
                </h3>
                <p className="text-[var(--ash)] text-xs leading-relaxed">
                  Face-to-face with a stranger. Peer-to-peer. No server sees you.
                </p>
                <p className="text-[var(--crimson)] text-[10px] font-mono uppercase tracking-widest mt-2">
                  Requires camera
                </p>
              </button>
            </div>

            <button
              onClick={handleStart}
              disabled={!isLoaded}
              className="w-full py-4 bg-[var(--crimson)] text-[var(--white)] font-mono text-xs uppercase tracking-widest hover:bg-[var(--crimson-bright)] transition-colors disabled:opacity-50"
            >
              Find a stranger →
            </button>

            <p className="text-[var(--muted)] text-[10px] font-mono text-center mt-4 uppercase tracking-widest">
              Anonymous · Peer-to-peer · No logs
            </p>
          </motion.div>
        )}

        {/* ── SEARCHING ─────────────────────────────────────── */}
        {roomState === "searching" && (
          <motion.div
            key="searching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border border-[var(--border)] bg-[var(--surface)] p-16 text-center"
          >
            <Loader size={32} className="text-[var(--crimson)] animate-spin mx-auto mb-6" />
            <h2 className="heading-editorial text-2xl text-[var(--white)] mb-3">
              Searching the dark...
            </h2>
            <p className="text-[var(--ash)] text-sm mb-8">
              Looking for someone to talk to. Could be seconds, could be a minute.
            </p>
            <button
              onClick={() => setRoomState("idle")}
              className="font-mono text-xs text-[var(--dim)] uppercase tracking-widest hover:text-[var(--ash)] transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {/* ── CONNECTED ─────────────────────────────────────── */}
        {roomState === "connected" && chatSessionId && (
          <motion.div
            key="connected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-[var(--border)] bg-[var(--surface)] flex flex-col"
            style={{ height: "70vh" }}
          >
            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--crimson)] animate-pulse-red" />
                <span className="font-mono text-xs text-[var(--ash)] uppercase tracking-widest">
                  Connected · {mode}
                  {chatSession?.countryA && chatSession?.countryB && (
                    <span className="text-[var(--dim)] ml-2">
                      · {myRole === "A" ? chatSession.countryB : chatSession.countryA}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLeave}
                  title="New stranger"
                  className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--dim)] uppercase tracking-widest hover:text-[var(--crimson)] transition-colors"
                >
                  <SkipForward size={13} />
                  Skip
                </button>
                <button
                  onClick={handleLeave}
                  title="End chat"
                  className="text-[var(--dim)] hover:text-[var(--crimson)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Video panes (video mode only) */}
            {mode === "video" && (
              <div className="grid grid-cols-2 gap-2 p-3 border-b border-[var(--border)] bg-[var(--black)]">
                <div className="relative aspect-video bg-[var(--deep)]">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-2 font-mono text-[9px] text-[var(--dim)] uppercase">
                    Stranger
                  </span>
                </div>
                <div className="relative aspect-video bg-[var(--deep)]">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-2 font-mono text-[9px] text-[var(--dim)] uppercase">
                    You
                  </span>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages?.map((msg) => {
                const isMe = msg.senderSessionId === sessionId;
                const isSystem = msg.type === "system";

                if (isSystem) {
                  return (
                    <div key={msg._id} className="text-center">
                      <span className="font-mono text-[10px] text-[var(--dim)] uppercase tracking-widest">
                        {msg.content}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg._id}
                    className={clsx("flex", isMe ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={clsx(
                        "max-w-[75%] px-4 py-2.5 text-sm leading-relaxed",
                        isMe
                          ? "bg-[var(--crimson-dim)] border border-[var(--crimson-dim)] text-[var(--white)]"
                          : "bg-[var(--card)] border border-[var(--border)] text-[var(--paper)]"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="border-t border-[var(--border)] p-3 flex gap-2">
              <input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Say something..."
                maxLength={1000}
                className="flex-1 bg-[var(--card)] border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--white)] placeholder:text-[var(--muted)] focus:border-[var(--dim)] transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!messageText.trim()}
                className="px-4 py-2.5 bg-[var(--crimson)] text-[var(--white)] hover:bg-[var(--crimson-bright)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={15} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ENDED ─────────────────────────────────────────── */}
        {roomState === "ended" && (
          <motion.div
            key="ended"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-[var(--border)] bg-[var(--surface)] p-16 text-center"
          >
            <h2 className="heading-editorial text-3xl text-[var(--white)] mb-3">
              Gone.
            </h2>
            <p className="text-[var(--ash)] text-sm mb-8">
              The stranger has left. The conversation never happened.
            </p>
            <button
              onClick={handleNewChat}
              className="px-8 py-3 bg-[var(--crimson)] text-[var(--white)] font-mono text-xs uppercase tracking-widest hover:bg-[var(--crimson-bright)] transition-colors"
            >
              Find another stranger
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
