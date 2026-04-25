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

type ChatMode = "text" | "video" | "voice";
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

  // WebRTC hook
  const { localVideoRef, remoteVideoRef, startCall, endCall, iceConnectionState } = useWebRTC({
    sessionId,
    chatSessionId: (mode === "video" || mode === "voice") ? chatSessionId : null,
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
      if (mode === "video") startCall(true);
      if (mode === "voice") startCall(false);
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
        if (mode === "video") startCall(true);
        if (mode === "voice") startCall(false);
      }
    } catch (err) {
      setRoomState("idle");
      toast.error("Failed to join queue.");
    }
  }

  async function handleNext() {
    if (!chatSessionId || !sessionId) return;
    try {
      await leaveChat({ chatSessionId, sessionId });
    } catch { /* ignore */ }
    endCall();
    setChatSessionId(null);
    handleStart(); // Immediately find another
  }

  async function handleLeave() {
    if (!chatSessionId || !sessionId) return;
    try {
      await leaveChat({ chatSessionId, sessionId });
    } catch { /* ignore */ }
    endCall();
    setRoomState("idle");
    setChatSessionId(null);
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
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
                <p className="text-[var(--ash)] text-[10px] leading-relaxed">
                  Anonymous text. Instant.
                </p>
              </button>

              {/* Voice mode */}
              <button
                onClick={() => setMode("voice")}
                className={clsx(
                  "p-6 border-2 text-left transition-all duration-200",
                  mode === "voice"
                    ? "border-[var(--crimson)] bg-[var(--crimson-dim)]"
                    : "border-[var(--border)] hover:border-[var(--muted)]"
                )}
              >
                <svg 
                  className={clsx("w-6 h-6", mode === "voice" ? "text-[var(--crimson)]" : "text-[var(--dim)]")}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <h3 className="font-display font-bold text-[var(--white)] mt-3 mb-1">
                  Voice Chat
                </h3>
                <p className="text-[var(--ash)] text-[10px] leading-relaxed">
                  Audio only. Pure voice.
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
                <p className="text-[var(--ash)] text-[10px] leading-relaxed">
                  Face-to-face. Peer-to-peer.
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
                  onClick={handleNext}
                  title="Find another stranger"
                  className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--dim)] uppercase tracking-widest hover:text-[var(--crimson)] transition-colors"
                >
                  <SkipForward size={13} />
                  Next
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

            {/* Video/Voice panes */}
            {mode === "video" && (
              <div className="grid grid-cols-2 gap-2 p-3 border-b border-[var(--border)] bg-[var(--black)]">
                <div className="relative aspect-video bg-[var(--deep)] rounded-lg overflow-hidden border border-[var(--border)]">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Connection Overlay */}
                  {(iceConnectionState === "new" || iceConnectionState === "checking") && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                      <Loader size={16} className="text-[var(--crimson)] animate-spin" />
                      <span className="font-mono text-[8px] text-[var(--ash)] uppercase tracking-widest">Establishing Secure Line...</span>
                    </div>
                  )}

                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded font-mono text-[9px] text-[var(--white)] uppercase tracking-widest">
                    Stranger
                  </div>
                </div>
                <div className="relative aspect-video bg-[var(--deep)] rounded-lg overflow-hidden border border-[var(--border)]">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded font-mono text-[9px] text-[var(--white)] uppercase tracking-widest">
                    You
                  </div>
                </div>
              </div>
            )}


            {mode === "voice" && (
              <div className="flex flex-col items-center justify-center py-10 border-b border-[var(--border)] bg-gradient-to-b from-[var(--black)] to-[var(--deep)]">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-[var(--crimson)]/20"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-12 h-12 rounded-full bg-[var(--crimson-dim)] flex items-center justify-center text-[var(--crimson)]"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </motion.div>
                </div>
                <p className="mt-4 font-mono text-[10px] text-[var(--crimson)] uppercase tracking-[0.3em] font-bold">
                  Shadow Frequency Active
                </p>
                <p className="mt-1 text-[var(--dim)] text-[9px] font-mono uppercase">
                  End-to-end voice encryption
                </p>
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
