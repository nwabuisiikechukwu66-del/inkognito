/**
 * InstallPrompt — components/layout/InstallPrompt.tsx
 *
 * Prompts users to install the PWA for a better experience.
 */

"use client";

import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after a short delay or based on some heuristic
      const dismissed = localStorage.getItem("pwa_prompt_dismissed");
      if (!dismissed) {
        setShow(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("pwa_prompt_dismissed", Date.now().toString());
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 z-[60] md:bottom-8 md:right-8 md:left-auto md:w-80"
        >
          <div className="bg-[var(--surface)] border border-[var(--crimson-dim)] p-5 shadow-2xl rounded-xl">
            <button 
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-[var(--dim)] hover:text-white"
            >
              <X size={16} />
            </button>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[var(--crimson-dim)] rounded-xl flex items-center justify-center text-[var(--crimson)]">
                <Smartphone size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold text-[var(--white)] text-sm mb-1">
                  Install Inkognito
                </h3>
                <p className="text-[var(--ash)] text-xs leading-relaxed mb-4">
                  Add to home screen for faster access, offline mode, and direct notifications.
                </p>
                <button
                  onClick={handleInstall}
                  className="w-full py-2 bg-[var(--crimson)] text-white text-[10px] font-mono uppercase tracking-widest rounded-md flex items-center justify-center gap-2"
                >
                  <Download size={12} />
                  Install App
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
