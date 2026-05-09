/**
 * Sidebar — components/layout/Sidebar.tsx
 *
 * Vertical navigation sidebar for desktop screens.
 * Includes Realms link + list of joined realms.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Home, Compass, PenSquare, MessagesSquare, Smile, User, Settings, Bell, Bookmark, Globe, ChevronDown, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";

const TOP_LINKS = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/realms", label: "Realms", icon: Globe },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/confess", label: "Confess", icon: PenSquare },
  { href: "/chat", label: "Stranger Chat", icon: MessagesSquare },
  { href: "/companion", label: "Companion", icon: Smile },
];

const BOTTOM_LINKS = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/chat/dm", label: "Direct Messages", icon: MessagesSquare },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isLoaded, country, sessionId } = useAnonSession();
  const unreadCount = useQuery(api.notifications.getUnreadCount, { sessionId: sessionId || "" }) ?? 0;
  const myRealms = useQuery(api.realms.getMyRealms, sessionId ? { sessionId } : "skip");
  const [realmsExpanded, setRealmsExpanded] = useState(true);

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-[var(--border)] bg-[var(--black)] py-6 z-40 overflow-y-auto no-scrollbar">
      
      {/* Brand */}
      <div className="px-8 mb-10">
        <Link href="/" className="group flex items-center gap-2">
          <span className="w-2 h-2 bg-[var(--crimson)] block animate-pulse-red" />
          <span className="font-display font-bold text-xl tracking-tight text-[var(--white)] group-hover:text-[var(--paper)] transition-colors">
            Inkognito
          </span>
        </Link>
      </div>

      {/* Identity Badge */}
      {isLoaded && (
        <div className="px-8 mb-8">
          <div className="px-4 py-3 border border-[var(--border)] bg-[var(--surface)] text-[11px] font-mono uppercase tracking-widest text-[var(--ash)]">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--dim)]" />
              <span className="text-[var(--white)] font-bold">Anon</span>
            </div>
            {country && <div className="pl-3.5 opacity-60">Loc: {country}</div>}
          </div>
        </div>
      )}

      {/* Main Nav */}
      <nav className="px-4 space-y-2">
        {TOP_LINKS.map((link) => {
          const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "flex items-center gap-4 py-3 px-4 rounded-md transition-all relative group",
                active ? "text-[var(--white)]" : "text-[var(--ash)] hover:text-[var(--white)] hover:bg-[var(--surface)]"
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 top-1 bottom-1 w-1 bg-[var(--crimson)] rounded-r-md"
                />
              )}
              <Icon size={18} className={active ? "text-[var(--crimson)]" : "text-[var(--dim)] group-hover:text-[var(--ash)] transition-colors"} />
              <span className="font-mono text-[11px] uppercase tracking-widest">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* My Realms */}
      {myRealms && myRealms.length > 0 && (
        <div className="px-4 mt-6">
          <button
            onClick={() => setRealmsExpanded(!realmsExpanded)}
            className="flex items-center justify-between w-full px-4 py-2 text-[var(--dim)] hover:text-[var(--ash)] transition-colors"
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.2em]">
              My Realms
            </span>
            {realmsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>

          <AnimatePresence initial={false}>
            {realmsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-0.5 mt-1">
                  {myRealms.map((realm: any) => {
                    const active = pathname === `/realms/${realm.slug}`;
                    return (
                      <Link
                        key={realm._id}
                        href={`/realms/${realm.slug}`}
                        className={clsx(
                          "flex items-center gap-3 py-2 px-4 rounded-md transition-all group",
                          active
                            ? "bg-[var(--surface)] text-[var(--white)]"
                            : "text-[var(--dim)] hover:text-[var(--ash)] hover:bg-[var(--surface)]/50"
                        )}
                      >
                        <span className="text-sm flex-shrink-0">{realm.emoji}</span>
                        <span className="font-mono text-[10px] uppercase tracking-wider truncate">
                          {realm.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="px-4 mt-8 space-y-1">
        {BOTTOM_LINKS.map((link) => {
          const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          const Icon = link.icon;
          const isNotifications = link.href === "/notifications";
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "flex items-center gap-4 py-2 px-4 rounded-md transition-all relative group",
                active ? "text-[var(--white)]" : "text-[var(--dim)] hover:text-[var(--ash)] hover:bg-[var(--surface)]"
              )}
            >
              <div className="relative">
                <Icon size={16} />
                {isNotifications && unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1">
                    <span className="absolute inset-0 animate-ping rounded-full bg-[var(--crimson)] opacity-75"></span>
                    <span className="relative flex items-center justify-center w-4 h-4 bg-[var(--crimson)] text-[var(--white)] text-[8px] font-bold rounded-full">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </div>
                )}
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest">{link.label}</span>
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
