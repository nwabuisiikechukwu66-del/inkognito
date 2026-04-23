/**
 * useWebRTC — hooks/useWebRTC.ts
 *
 * Custom WebRTC hook for peer-to-peer video chat.
 *
 * How it works:
 * 1. "A" (first user) creates an offer and stores it via Convex rtcSignals
 * 2. "B" (second user) reads the offer, creates an answer, stores it back
 * 3. Both sides exchange ICE candidates the same way
 * 4. WebRTC establishes a direct peer connection — server only saw signaling
 *
 * All video/audio data is peer-to-peer (no server cost).
 * Signaling data is tiny and temporary in Convex.
 */

import { useRef, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/* Free STUN servers — help peers find each other across NAT */
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  // Optional: add TURN server here for users behind symmetric NAT
  // { urls: "turn:yourturnserver.com", username: "x", credential: "y" }
];

interface UseWebRTCOptions {
  sessionId: string;
  chatSessionId: Id<"chatSessions"> | null;
  myRole: "A" | "B";
}

export function useWebRTC({ sessionId, chatSessionId, myRole }: UseWebRTCOptions) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const sendSignal = useMutation(api.chat.sendSignal);
  const markConsumed = useMutation(api.chat.markSignalsConsumed);

  // Poll for incoming signals addressed to me
  const pendingSignals = useQuery(
    api.chat.getPendingSignals,
    chatSessionId ? { chatSessionId, toSessionId: sessionId } : "skip"
  );

  /* ── Get partner's session ID from chat session ─────────── */
  const chatSession = useQuery(
    api.chat.getMyChatSession,
    sessionId ? { sessionId } : "skip"
  );

  const partnerSessionId =
    chatSession
      ? myRole === "A"
        ? chatSession.participantB
        : chatSession.participantA
      : null;

  /* ── Process incoming signals ────────────────────────────── */
  useEffect(() => {
    if (!pendingSignals || pendingSignals.length === 0) return;
    if (!peerRef.current) return;

    async function processSignals() {
      const ids: Id<"rtcSignals">[] = [];

      for (const signal of pendingSignals!) {
        ids.push(signal._id);
        const payload = JSON.parse(signal.payload);

        try {
          if (signal.type === "offer") {
            await peerRef.current!.setRemoteDescription(
              new RTCSessionDescription(payload)
            );
            const answer = await peerRef.current!.createAnswer();
            await peerRef.current!.setLocalDescription(answer);

            if (chatSessionId && partnerSessionId) {
              await sendSignal({
                chatSessionId,
                fromSessionId: sessionId,
                toSessionId: partnerSessionId,
                type: "answer",
                payload: JSON.stringify(answer),
              });
            }
          } else if (signal.type === "answer") {
            await peerRef.current!.setRemoteDescription(
              new RTCSessionDescription(payload)
            );
          } else if (signal.type === "ice-candidate") {
            await peerRef.current!.addIceCandidate(
              new RTCIceCandidate(payload)
            );
          }
        } catch (err) {
          console.error("[WebRTC] Error processing signal:", signal.type, err);
        }
      }

      // Mark all processed signals as consumed
      if (ids.length > 0) {
        await markConsumed({ signalIds: ids });
      }
    }

    processSignals();
  }, [pendingSignals, chatSessionId, partnerSessionId, sessionId, sendSignal, markConsumed]);

  /* ── Start call ──────────────────────────────────────────── */
  const startCall = useCallback(async (video: boolean = true) => {
    if (!chatSessionId || !partnerSessionId) return;

    // Get user's camera + mic
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: 640, height: 480, facingMode: "user" } : false,
        audio: true,
      });
    } catch (err) {

      console.error("[WebRTC] Could not get media devices:", err);
      return;
    }

    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    // Create peer connection
    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = peer;

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

    // When we get remote video stream
    peer.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Send ICE candidates to partner via Convex
    peer.onicecandidate = async (event) => {
      if (event.candidate && chatSessionId && partnerSessionId) {
        await sendSignal({
          chatSessionId,
          fromSessionId: sessionId,
          toSessionId: partnerSessionId,
          type: "ice-candidate",
          payload: JSON.stringify(event.candidate),
        });
      }
    };

    peer.oniceconnectionstatechange = () => {
      console.info("[WebRTC] ICE state:", peer.iceConnectionState);
    };

    // Role A creates the offer
    if (myRole === "A") {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      await sendSignal({
        chatSessionId,
        fromSessionId: sessionId,
        toSessionId: partnerSessionId,
        type: "offer",
        payload: JSON.stringify(offer),
      });
    }
    // Role B waits for the offer (handled in useEffect above)
  }, [chatSessionId, partnerSessionId, sessionId, myRole, sendSignal]);

  /* ── End call ────────────────────────────────────────────── */
  const endCall = useCallback(() => {
    // Stop all local tracks
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    // Close peer connection
    peerRef.current?.close();
    peerRef.current = null;

    // Clear video elements
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  /* ── Cleanup on unmount ──────────────────────────────────── */
  useEffect(() => {
    return () => { endCall(); };
  }, [endCall]);

  return { localVideoRef, remoteVideoRef, startCall, endCall };
}
