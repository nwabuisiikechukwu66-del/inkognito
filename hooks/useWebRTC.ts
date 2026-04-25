/**
 * useWebRTC — hooks/useWebRTC.ts
 *
 * Custom WebRTC hook for peer-to-peer video chat.
 * Robust implementation with ICE candidate queuing and race condition handling.
 */

import { useRef, useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
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
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  
  const [isPeerInitialized, setIsPeerInitialized] = useState(false);
  const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState>("new");

  const sendSignal = useMutation(api.chat.sendSignal);
  const markConsumed = useMutation(api.chat.markSignalsConsumed);

  const pendingSignals = useQuery(
    api.chat.getPendingSignals,
    chatSessionId ? { chatSessionId, toSessionId: sessionId } : "skip"
  );

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
            console.log("[WebRTC] Received offer");
            await peerRef.current!.setRemoteDescription(new RTCSessionDescription(payload));
            
            // Process any queued ICE candidates now that we have a remote description
            while (iceCandidateQueue.current.length > 0) {
              const candidate = iceCandidateQueue.current.shift();
              if (candidate) await peerRef.current!.addIceCandidate(new RTCIceCandidate(candidate));
            }

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
            console.log("[WebRTC] Received answer");
            await peerRef.current!.setRemoteDescription(new RTCSessionDescription(payload));
            
            // Process any queued ICE candidates
            while (iceCandidateQueue.current.length > 0) {
              const candidate = iceCandidateQueue.current.shift();
              if (candidate) await peerRef.current!.addIceCandidate(new RTCIceCandidate(candidate));
            }
          } else if (signal.type === "ice-candidate") {
            if (peerRef.current?.remoteDescription) {
              await peerRef.current!.addIceCandidate(new RTCIceCandidate(payload));
            } else {
              // Queue candidate if remote description is not yet set
              iceCandidateQueue.current.push(payload);
            }
          }
        } catch (err) {
          console.error("[WebRTC] Error processing signal:", signal.type, err);
        }
      }

      if (ids.length > 0) {
        await markConsumed({ signalIds: ids });
      }
    }

    processSignals();
  }, [pendingSignals, chatSessionId, partnerSessionId, sessionId, sendSignal, markConsumed, isPeerInitialized]);

  /* ── Initialize Peer Connection ─────────────────────────── */
  const initializePeer = useCallback(async (video: boolean = true) => {
    if (peerRef.current) return peerRef.current;

    const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = peer;
    
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

    peer.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peer.oniceconnectionstatechange = () => {
      console.info("[WebRTC] ICE state:", peer.iceConnectionState);
      setIceConnectionState(peer.iceConnectionState);
    };


    setIsPeerInitialized(true);
    return peer;
  }, [chatSessionId, partnerSessionId, sessionId, sendSignal]);

  /* ── Start call ──────────────────────────────────────────── */
  const startCall = useCallback(async (video: boolean = true) => {
    if (!chatSessionId || !partnerSessionId) return;

    const peer = await initializePeer(video);

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

    stream.getTracks().forEach((track) => peer.addTrack(track, stream));

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
  }, [chatSessionId, partnerSessionId, sessionId, myRole, sendSignal, initializePeer]);

  /* ── End call ────────────────────────────────────────────── */
  const endCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    peerRef.current?.close();
    peerRef.current = null;
    setIsPeerInitialized(false);
    setIceConnectionState("closed");
    iceCandidateQueue.current = [];


    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    return () => { endCall(); };
  }, [endCall]);

  return { localVideoRef, remoteVideoRef, startCall, endCall, iceConnectionState };
}

