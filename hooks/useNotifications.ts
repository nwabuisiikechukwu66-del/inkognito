"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useLocalStorage } from "./useLocalStorage";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { useEffect, useState } from "react";

/**
 * useNotifications — hooks/useNotifications.ts
 * 
 * Computes "notifications" on the fly by fetching recent activity on 
 * the user's confessions and managing read states locally.
 */
export function useNotifications() {
  const { sessionId } = useAnonSession();
  const [lastChecked, setLastChecked] = useLocalStorage<number>("inkognito_last_notif_check", Date.now());
  const [readNotifIds, setReadNotifIds] = useLocalStorage<string[]>("inkognito_read_notifs", []);

  // Fetch recent activity (comments on user's posts)
  const activity = useQuery(api.users.getRecentActivity, { 
    sessionId: sessionId || "",
    since: Date.now() - 1000 * 60 * 60 * 24 * 7 // Last 7 days
  });

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (activity) {
      const unread = activity.filter(a => a.createdAt > lastChecked && !readNotifIds.includes(a._id)).length;
      setUnreadCount(unread);
    }
  }, [activity, lastChecked, readNotifIds]);

  const markAllAsRead = () => {
    setLastChecked(Date.now());
    if (activity) {
      setReadNotifIds(activity.map(a => a._id));
    }
  };

  const markAsRead = (id: string) => {
    setReadNotifIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  return {
    notifications: activity?.map(n => ({
      ...n,
      isRead: n.createdAt <= lastChecked || readNotifIds.includes(n._id)
    })) || [],
    unreadCount,
    markAllAsRead,
    markAsRead,
    isLoading: activity === undefined,
  };
}
