/**
 * SWRegistration — components/providers/SWRegistration.tsx
 * 
 * Explicitly registers the service worker for PWA functionality.
 */

"use client";

import { useEffect } from "react";

export function SWRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("SW registered:", reg.scope);
          })
          .catch((err) => {
            console.error("SW registration failed:", err);
          });
      });
    }
  }, []);

  return null;
}
