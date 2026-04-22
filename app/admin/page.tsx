/**
 * Admin Dashboard — app/admin/page.tsx
 *
 * Private content moderation panel.
 * Protected by ADMIN_TOKEN (set in Convex env vars).
 *
 * Features:
 * - Stats overview (total confessions, reports, banned users)
 * - Pending reports queue
 * - Flagged confessions
 * - Actions: hide, restore, ban session
 *
 * Access: /admin — enter your ADMIN_TOKEN to unlock.
 * This is NOT linked from the public navbar.
 */

"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import { Eye, EyeOff, Ban, CheckCircle, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { clsx } from "clsx";

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState<"reports" | "flagged" | "stats">(
    "stats"
  );

  /* ── Token gate ────────────────────────────────────────────── */
  if (!authed) {
    return (
      <div className="container-ink py-24 max-w-sm">
        <p className="font-mono text-xs text-[var(--crimson)] uppercase tracking-widest mb-6">
          Admin Access
        </p>
        <div className="border border-[var(--border)] p-6 bg-[var(--surface)]">
          <Lock size={20} className="text-[var(--dim)] mb-4" />
          <input
            type="password"
            placeholder="Admin token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setAuthed(true)}
            className="w-full bg-[var(--card)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--white)] placeholder:text-[var(--muted)] mb-4"
          />
          <button
            onClick={() => setAuthed(true)}
            className="w-full py-3 bg-[var(--crimson)] text-[var(--white)] font-mono text-xs uppercase tracking-widest hover:bg-[var(--crimson-bright)] transition-colors"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-ink py-10">
      <div className="mb-8">
        <p className="font-mono text-xs text-[var(--crimson)] tracking-[0.2em] uppercase mb-2">
          Admin
        </p>
        <h1 className="heading-editorial text-3xl text-[var(--white)]">
          Moderation Dashboard
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)] mb-8">
        {(["stats", "reports", "flagged"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              "px-5 py-2.5 font-mono text-xs uppercase tracking-widest border-b-2 -mb-px transition-all",
              activeTab === tab
                ? "border-[var(--crimson)] text-[var(--white)]"
                : "border-transparent text-[var(--dim)] hover:text-[var(--ash)]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "stats" && <StatsPanel token={token} />}
      {activeTab === "reports" && <ReportsPanel token={token} />}
      {activeTab === "flagged" && <FlaggedPanel token={token} />}
    </div>
  );
}

/* ── Stats Panel ───────────────────────────────────────────── */
function StatsPanel({ token }: { token: string }) {
  const stats = useQuery(api.moderation.getStats, { adminToken: token });

  if (!stats) {
    return <div className="skeleton h-40 w-full rounded-none" />;
  }

  const statCards = [
    { label: "Total Confessions", value: stats.totalConfessions },
    { label: "Today", value: stats.todayConfessions },
    { label: "Premium Subs", value: stats.premiumUsers },
    { label: "Total Users", value: stats.totalUsers },
    { label: "Active 24h", value: stats.activeUsers24h },
    { label: "Pending Reports", value: stats.pendingReports, alert: stats.pendingReports > 0 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {statCards.map((s) => (
        <div
          key={s.label}
          className={clsx(
            "border p-5 bg-[var(--surface)]",
            s.alert ? "border-[var(--crimson)]" : "border-[var(--border)]"
          )}
        >
          <p className="font-mono text-[10px] text-[var(--dim)] uppercase tracking-widest mb-2">
            {s.label}
          </p>
          <p className={clsx(
            "font-display font-bold text-3xl",
            s.alert ? "text-[var(--crimson)]" : "text-[var(--white)]"
          )}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Reports Panel ─────────────────────────────────────────── */
function ReportsPanel({ token }: { token: string }) {
  const reports = useQuery(api.moderation.getPendingReports, {
    adminToken: token,
  });
  const reviewReport = useMutation(api.moderation.reviewReport);

  async function handleAction(
    reportId: string,
    action: "dismiss" | "hide_content" | "ban_user"
  ) {
    try {
      await reviewReport({ adminToken: token, reportId: reportId as any, action });
      toast.success(`Action taken: ${action}`);
    } catch {
      toast.error("Failed.");
    }
  }

  if (!reports) return <div className="skeleton h-40 w-full rounded-none" />;

  if (reports.length === 0) {
    return (
      <p className="text-[var(--dim)] font-mono text-sm uppercase tracking-widest">
        No pending reports. Clean.
      </p>
    );
  }

  return (
    <div className="space-y-px">
      {reports.map((r) => (
        <div key={r._id} className="border border-[var(--border)] p-5 bg-[var(--surface)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex gap-2 mb-2">
                <span className="font-mono text-[10px] text-[var(--crimson)] uppercase tracking-widest border border-[var(--crimson-dim)] px-1.5 py-0.5">
                  {r.reason}
                </span>
                <span className="font-mono text-[10px] text-[var(--dim)] uppercase tracking-widest">
                  {r.targetType} · {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-[var(--ash)] text-xs font-mono">
                Target ID: <span className="text-[var(--paper)]">{r.targetId}</span>
              </p>
              {r.note && (
                <p className="text-[var(--ash)] text-xs mt-1 italic">"{r.note}"</p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleAction(r._id, "dismiss")}
                className="p-2 border border-[var(--border)] text-[var(--dim)] hover:text-[var(--ash)] transition-colors"
                title="Dismiss"
              >
                <CheckCircle size={14} />
              </button>
              <button
                onClick={() => handleAction(r._id, "hide_content")}
                className="p-2 border border-[var(--border)] text-[var(--dim)] hover:text-[var(--crimson)] transition-colors"
                title="Hide content"
              >
                <EyeOff size={14} />
              </button>
              <button
                onClick={() => handleAction(r._id, "ban_user")}
                className="p-2 border border-[var(--crimson-dim)] text-[var(--crimson)] hover:bg-[var(--crimson-dim)] transition-colors"
                title="Ban user"
              >
                <Ban size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Flagged Confessions Panel ─────────────────────────────── */
function FlaggedPanel({ token }: { token: string }) {
  const confessions = useQuery(api.moderation.getFlaggedConfessions, {
    adminToken: token,
  });
  const hide = useMutation(api.moderation.hideConfession);
  const restore = useMutation(api.moderation.restoreConfession);

  if (!confessions) return <div className="skeleton h-40 w-full rounded-none" />;

  if (confessions.length === 0) {
    return (
      <p className="text-[var(--dim)] font-mono text-sm uppercase tracking-widest">
        No flagged confessions.
      </p>
    );
  }

  return (
    <div className="space-y-px">
      {confessions.map((c) => (
        <div key={c._id} className="border border-[var(--border)] border-l-2 border-l-[var(--crimson)] p-5 bg-[var(--surface)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex gap-2 mb-2">
                <span className="font-mono text-[10px] text-[var(--dim)] uppercase tracking-widest">
                  {c.category} · {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                </span>
                {c.isHidden && (
                  <span className="font-mono text-[10px] text-[var(--muted)] uppercase">· hidden</span>
                )}
              </div>
              <p className="text-[var(--ash)] text-sm leading-relaxed line-clamp-3">
                {c.content}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {c.isHidden ? (
                <button
                  onClick={() => restore({ adminToken: token, confessionId: c._id })}
                  className="p-2 border border-[var(--border)] text-[var(--dim)] hover:text-[var(--ash)] transition-colors"
                  title="Restore"
                >
                  <Eye size={14} />
                </button>
              ) : (
                <button
                  onClick={() => hide({ adminToken: token, confessionId: c._id })}
                  className="p-2 border border-[var(--border)] text-[var(--dim)] hover:text-[var(--crimson)] transition-colors"
                  title="Hide"
                >
                  <EyeOff size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
