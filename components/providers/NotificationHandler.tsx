/**
 * NotificationHandler — components/providers/NotificationHandler.tsx
 * 
 * Client-side component to handle global notifications.
 */

"use client";

import { useNotificationToast } from "@/hooks/useNotificationToast";

export function NotificationHandler() {
  useNotificationToast();
  return null;
}
