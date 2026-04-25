/**
 * useNotificationToast — hooks/useNotificationToast.ts
 * 
 * Listens for new unread notifications and shows a toast.
 */

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import toast from "react-hot-toast";

export function useNotificationToast() {
  const { sessionId } = useAnonSession();
  const notifications = useQuery(api.notifications.getRecent, { sessionId: sessionId || "" });
  const prevCountRef = useRef<number>(0);

  useEffect(() => {
    if (!notifications) return;

    const unread = notifications.filter(n => !n.isRead);
    const count = unread.length;

    if (count > prevCountRef.current) {
      const latest = unread[0];
      if (latest) {
        toast(latest.title + ": " + latest.content, {
          icon: "🔔",
          style: {
            background: "#1a1a1f",
            color: "#e8e0d5",
            border: "1px solid #c41e3a",
          }
        });
      }
    }
    prevCountRef.current = count;
  }, [notifications]);
}
