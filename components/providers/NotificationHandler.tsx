/**
 * NotificationHandler — components/providers/NotificationHandler.tsx
 * 
 * Client-side component to handle global notifications and Web Push setup.
 */

"use client";

import { useEffect, useCallback } from "react";
import { useNotificationToast } from "@/hooks/useNotificationToast";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationHandler() {
  useNotificationToast();
  const { sessionId } = useAnonSession();
  const saveSubscription = useMutation(api.push.saveSubscription);

  const subscribeToPush = useCallback(async () => {
    if (!sessionId || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicVapidKey) return;
        
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
        });
      }

      // Send to convex
      const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey("p256dh")!) as any));
      const auth = btoa(String.fromCharCode.apply(null, new Uint8Array(subscription.getKey("auth")!) as any));

      await saveSubscription({
        sessionId,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
      });

    } catch (err) {
      console.error("Failed to subscribe to Web Push:", err);
    }
  }, [sessionId, saveSubscription]);

  useEffect(() => {
    // We attempt to subscribe if permission is already granted,
    // or request it if they interact (browsers usually need user interaction to call requestPermission,
    // but some allow it on mount. If denied/default, we wait).
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        subscribeToPush();
      } else if (Notification.permission !== "denied") {
        // Request on first click anywhere in the app
        const handleInteraction = () => {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") {
              subscribeToPush();
            }
          });
          document.removeEventListener("click", handleInteraction);
        };
        document.addEventListener("click", handleInteraction);
        return () => document.removeEventListener("click", handleInteraction);
      }
    }
  }, [subscribeToPush]);

  return null;
}
