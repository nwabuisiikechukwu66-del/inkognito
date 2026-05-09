/**
 * BottomNav — components/layout/BottomNav.tsx
 *
 * Sticky bottom navigation for mobile view.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PenSquare, MessagesSquare, Globe, User } from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";

const NAV_LINKS = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/realms", label: "Realms", icon: Globe },
  { href: "/confess", label: "Confess", icon: PenSquare },
  { href: "/chat", label: "Chat", icon: MessagesSquare },
  { href: "/profile", label: "Profile", icon: User },
];


export function BottomNav() {
  const pathname = usePathname();
  const { sessionId } = useAnonSession();
  const unreadCount = useQuery(api.notifications.getUnreadCount, { sessionId: sessionId || "" }) ?? 0;


  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--black)]/90 backdrop-blur-xl border-t border-[var(--border)] pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="relative flex flex-col items-center justify-center w-full h-full space-y-1"
            >
              <AnimatePresence>
                {active && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute inset-0 bg-[var(--crimson-dim)]/30 rounded-lg m-1"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </AnimatePresence>
              <div className="relative">
                <Icon
                  size={22}
                  className={clsx(
                    "relative z-10 transition-colors duration-200",
                    active ? "text-[var(--crimson)]" : "text-[var(--dim)] group-hover:text-[var(--ash)]"
                  )}
                />
              </div>

              <span
                className={clsx(
                  "relative z-10 font-mono text-[9px] uppercase tracking-widest",
                  active ? "text-[var(--white)]" : "text-[var(--dim)]"
                )}
              >
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
