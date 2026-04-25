/**
 * useNotificationToast — hooks/useNotificationToast.ts
 * 
 * Listens for new unread notifications and shows a toast.
 */

"use client";

import { useEffect, useRef } from "react";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import toast from "react-hot-toast";
import { clsx } from "clsx";
import { Bell } from "lucide-react";


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
        toast.custom((t) => (
          <div
            className={clsx(
              "max-w-md w-full bg-[var(--card)] border-l-4 border-[var(--crimson)] shadow-2xl p-4 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-5",
              t.visible ? "opacity-100" : "opacity-0"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--crimson-dim)] flex items-center justify-center text-[var(--crimson)]">
                <Bell size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--white)] uppercase tracking-widest">{latest.title}</p>
                <p className="text-[10px] text-[var(--ash)] line-clamp-1">{latest.content}</p>
              </div>
            </div>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                if (latest.link) window.location.href = latest.link;
              }}
              className="px-3 py-1.5 bg-[var(--crimson)] text-white text-[9px] font-mono uppercase tracking-widest hover:bg-[var(--crimson-bright)] transition-colors"
            >
              View
            </button>
          </div>
        ), { duration: 6000 });
      }
    }
    prevCountRef.current = count;
  }, [notifications]);
}

