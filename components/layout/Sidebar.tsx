/**
 * Sidebar — components/layout/Sidebar.tsx
 *
 * Vertical navigation sidebar for desktop screens.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { Home, Compass, PenSquare, MessagesSquare, Smile, User, Settings, Bell, Bookmark } from "lucide-react";
import { clsx } from "clsx";
import { motion } from "framer-motion";

const TOP_LINKS = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/confess", label: "Confess", icon: PenSquare },
  { href: "/chat", label: "Stranger Chat", icon: MessagesSquare },
  { href: "/companion", label: "Companion", icon: Smile },
];

const BOTTOM_LINKS = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isLoaded, country } = useAnonSession();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-[var(--border)] bg-[var(--black)] py-6 z-40 overflow-y-auto">
      
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
      <nav className="flex-1 px-4 space-y-1">
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

      {/* Bottom Nav */}
      <nav className="px-4 mt-8 space-y-1">
        {BOTTOM_LINKS.map((link) => {
          const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "flex items-center gap-4 py-2 px-4 rounded-md transition-all relative group",
                active ? "text-[var(--white)]" : "text-[var(--dim)] hover:text-[var(--ash)] hover:bg-[var(--surface)]"
              )}
            >
              <Icon size={16} />
              <span className="font-mono text-[10px] uppercase tracking-widest">{link.label}</span>
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
