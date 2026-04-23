/**
 * AnonSessionProvider — components/providers/AnonSessionProvider.tsx
 *
 * Manages the anonymous user identity across the app.
 *
 * On mount:
 * 1. Checks localStorage for existing sessionId UUID
 * 2. If none → generates a new UUID v4
 * 3. Fetches approximate location via ipapi.co (free, no key needed)
 * 4. Upserts session into Convex DB
 * 5. Exposes sessionId + location via AnonSessionContext
 *
 * Used throughout: posting confessions, chat sessions, reactions, etc.
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { v4 as uuidv4 } from "uuid";

interface AnonSession {
  sessionId: string;
  country: string | null;
  city: string | null;
  isLoaded: boolean;
  updateSessionId: (newSessionId: string) => void;
}

const AnonSessionContext = createContext<AnonSession>({
  sessionId: "",
  country: null,
  city: null,
  isLoaded: false,
  updateSessionId: () => {},
});

export function useAnonSession() {
  return useContext(AnonSessionContext);
}

export function AnonSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AnonSession>({
    sessionId: "",
    country: null,
    city: null,
    isLoaded: false,
    updateSessionId: () => {},
  });

  const upsertSession = useMutation(api.users.upsertSession);

  useEffect(() => {
    async function initSession() {
      // ── 1. Get or create session UUID ──────────────────────
      let sessionId = localStorage.getItem("ink_session_id");
      if (!sessionId) {
        sessionId = uuidv4();
        localStorage.setItem("ink_session_id", sessionId);
      }

      // ── 2. Get approximate location (IP-based, no GPS prompt) ──
      let country: string | null = null;
      let city: string | null = null;

      try {
        // ipapi.co — free tier: 1,000 requests/day, no API key needed
        // Manual timeout for older mobile browser compatibility
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const geoRes = await fetch("https://ipapi.co/json/", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (geoRes.ok) {
          const geo = await geoRes.json();
          country = geo.country_code ?? null;   // "NG"
          city = geo.city ?? null;              // "Lagos"
        }
      } catch {
        // Location is optional — silently fail
        console.info("[Inkognito] Location unavailable — continuing anonymously.");
      }

      // ── 3. Generate coarse device fingerprint ──────────────
      // Not used for tracking — just for abuse detection (rate limiting)
      const fingerprint = btoa(
        [
          navigator.platform,
          navigator.language,
          screen.width,
          screen.height,
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        ].join("|")
      ).slice(0, 32);

      // ── 4. Upsert into Convex ───────────────────────────────
      try {
        await upsertSession({
          sessionId,
          country: country ?? undefined,
          city: city ?? undefined,
          deviceFingerprint: fingerprint,
        });
      } catch (err) {
        console.error("[Inkognito] Failed to upsert session:", err);
      }

      // ── 5. Set context ──────────────────────────────────────
      setSession({ sessionId, country, city, isLoaded: true, updateSessionId });
    }

    initSession();
  }, [upsertSession]);

  // ── Register Service Worker (PWA) ──────────────────────────
  useEffect(() => {
    if ("serviceWorker" in navigator && typeof window !== "undefined") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("[PWA] ServiceWorker registered"))
        .catch((err) => console.error("[PWA] ServiceWorker failed", err));
    }
  }, []);

  const updateSessionId = useCallback((newSessionId: string) => {

    localStorage.setItem("ink_session_id", newSessionId);
    setSession(prev => ({ ...prev, sessionId: newSessionId }));
  }, []);

  return (
    <AnonSessionContext.Provider value={{ ...session, updateSessionId }}>
      {children}
    </AnonSessionContext.Provider>
  );
}
