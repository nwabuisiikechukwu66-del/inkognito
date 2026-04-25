/**
 * Admin Dashboard — app/admin/page.tsx
 * 
 * Centralized command center for Inkognito.
 * Features: Stats, Moderation, Seeding, and System Logs.
 */

"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  ShieldAlert, Activity, Users, Flag, Database, 
  Trash2, Check, ExternalLink, Filter, Map, Clock, 
  Zap, Loader, Lock, Search
} from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";

type Tab = "overview" | "moderation" | "reports" | "seeding" | "logs";

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4">
        <div className="max-w-md w-full bg-[var(--surface)] border border-[var(--border)] p-10 shadow-2xl">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[var(--crimson-dim)] flex items-center justify-center text-[var(--crimson)] border border-[var(--crimson)]">
              <Lock size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold text-center text-[var(--white)] mb-2 uppercase tracking-widest">
            Shadow Command
          </h1>
          <p className="text-[10px] font-mono text-center text-[var(--dim)] uppercase tracking-[0.3em] mb-8">
            Administrative Authorization Required
          </p>
          <input 
            type="password" 
            placeholder="ACCESS_KEY"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="w-full bg-[var(--black)] border border-[var(--border)] px-6 py-4 text-sm font-mono text-[var(--white)] text-center tracking-[0.5em] focus:border-[var(--crimson)] outline-none transition-all"
            onKeyDown={(e) => e.key === "Enter" && setIsAuthorized(true)}
          />
          <button 
            onClick={() => setIsAuthorized(true)}
            className="w-full mt-6 bg-[var(--crimson)] text-white py-4 font-mono text-xs uppercase tracking-[0.3em] hover:bg-[var(--crimson-bright)] transition-all"
          >
            Authenticate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[var(--white)] font-sans">
      {/* Admin Header */}
      <header className="h-16 border-b border-[var(--border)] bg-[var(--black)] sticky top-0 z-50 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <Zap size={18} className="text-[var(--crimson)]" />
          <h1 className="font-display font-bold text-lg uppercase tracking-tighter">Inkognito Admin <span className="text-[10px] font-mono text-[var(--dim)] ml-2">v2.0_BETA</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-mono text-[var(--ash)] uppercase tracking-widest">System Online</span>
          </div>
          <button 
            onClick={() => setIsAuthorized(false)}
            className="text-[9px] font-mono uppercase text-[var(--dim)] hover:text-[var(--crimson)] transition-colors"
          >
            Terminal Logout
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Admin Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-64px)] border-r border-[var(--border)] bg-[var(--black)] p-4 flex flex-col gap-2">
          <AdminTab label="Overview" icon={Activity} active={activeTab === "overview"} onClick={() => setActiveTab("overview")} />
          <AdminTab label="Moderation" icon={ShieldAlert} active={activeTab === "moderation"} onClick={() => setActiveTab("moderation")} />
          <AdminTab label="Reports" icon={Flag} active={activeTab === "reports"} onClick={() => setActiveTab("reports")} />
          <AdminTab label="Auto-Seeding" icon={Database} active={activeTab === "seeding"} onClick={() => setActiveTab("seeding")} />
          <AdminTab label="System Logs" icon={Clock} active={activeTab === "logs"} onClick={() => setActiveTab("logs")} />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-10 bg-[#080808]">
          {activeTab === "overview" && <OverviewTab secret={secret} />}
          {activeTab === "moderation" && <ModerationTab secret={secret} />}
          {activeTab === "reports" && <ReportsTab secret={secret} />}
          {activeTab === "seeding" && <SeedingTab secret={secret} />}
          {activeTab === "logs" && <LogsTab secret={secret} />}
        </main>
      </div>
    </div>
  );
}

function AdminTab({ label, icon: Icon, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-4 py-3 px-4 transition-all rounded-sm group",
        active ? "bg-[var(--crimson-dim)] text-[var(--white)] border-l-4 border-[var(--crimson)]" : "text-[var(--dim)] hover:text-[var(--ash)] hover:bg-[var(--surface)]"
      )}
    >
      <Icon size={16} className={active ? "text-[var(--crimson)]" : "group-hover:text-[var(--ash)]"} />
      <span className="text-[10px] font-mono uppercase tracking-[0.2em]">{label}</span>
    </button>
  );
}

/* ─── Overview Tab ────────────────────────────────────────── */
function OverviewTab({ secret }: { secret: string }) {
  const stats = useQuery(api.admin.getStats, { secret });

  if (!stats) return <Loading />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-4 gap-6">
        <StatCard label="Total Users" value={stats.totalUsers} sub="Lifetime" icon={Users} />
        <StatCard label="Premium Users" value={stats.premiumUsers} sub="Active Subs" icon={Zap} color="text-yellow-500" />
        <StatCard label="Active 24h" value={stats.activeUsers24h} sub="Current Wave" icon={Activity} color="text-green-500" />
        <StatCard label="Pending Reports" value={stats.pendingReports} sub="Urgent Actions" icon={Flag} color="text-red-500" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[var(--surface)] border border-[var(--border)] p-8">
          <h3 className="text-xs font-mono uppercase tracking-[0.3em] mb-6 border-b border-[var(--border)] pb-4">Geo Distribution</h3>
          <div className="space-y-4">
             {/* Mock map or list of countries */}
             <p className="text-[10px] text-[var(--ash)] font-mono">Nigeria (NG) — 45%</p>
             <div className="w-full bg-[var(--black)] h-1.5 rounded-full"><div className="bg-[var(--crimson)] h-1.5 w-[45%] rounded-full" /></div>
             <p className="text-[10px] text-[var(--ash)] font-mono">USA (US) — 20%</p>
             <div className="w-full bg-[var(--black)] h-1.5 rounded-full"><div className="bg-[var(--crimson)] h-1.5 w-[20%] rounded-full" /></div>
             <p className="text-[10px] text-[var(--ash)] font-mono">Kenya (KE) — 15%</p>
             <div className="w-full bg-[var(--black)] h-1.5 rounded-full"><div className="bg-[var(--crimson)] h-1.5 w-[15%] rounded-full" /></div>
          </div>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] p-8">
          <h3 className="text-xs font-mono uppercase tracking-[0.3em] mb-6 border-b border-[var(--border)] pb-4">Recent Activity</h3>
          <div className="space-y-4">
            {stats.recentConfessions.slice(0, 5).map((c: any) => (
              <div key={c._id} className="flex items-center justify-between text-[10px] font-mono border-b border-[var(--border)] pb-2">
                <span className="text-[var(--ash)] line-clamp-1 flex-1 pr-4">{c.content}</span>
                <span className="text-[var(--dim)]">{new Date(c.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color = "text-[var(--crimson)]" }: any) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] p-8 flex items-center gap-6">
      <div className={clsx("w-12 h-12 rounded bg-[var(--black)] flex items-center justify-center border border-[var(--border)]", color)}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-[10px] font-mono text-[var(--dim)] uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-display font-bold text-[var(--white)]">{value}</p>
        <p className="text-[8px] font-mono text-[var(--ash)] uppercase mt-1">{sub}</p>
      </div>
    </div>
  );
}

/* ─── Moderation Tab ───────────────────────────────────────── */
function ModerationTab({ secret }: { secret: string }) {
  const stats = useQuery(api.admin.getStats, { secret });
  const hideConfession = useMutation(api.admin.hideConfession);
  const flagConfession = useMutation(api.admin.flagConfession);

  if (!stats) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-display font-bold uppercase tracking-widest">Feed Moderation</h2>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] text-[9px] font-mono uppercase tracking-widest">Latest</button>
          <button className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] text-[9px] font-mono uppercase tracking-widest opacity-50">Flagged Only</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {stats.recentConfessions.map((c: any) => (
          <div key={c._id} className="bg-[var(--surface)] border border-[var(--border)] p-6 flex items-start justify-between gap-10">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[9px] font-mono px-2 py-0.5 bg-[var(--black)] text-[var(--crimson)] border border-[var(--crimson-dim)] uppercase">{c.category}</span>
                <span className="text-[9px] font-mono text-[var(--dim)]">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-[var(--ash)] leading-relaxed">{c.content}</p>
            </div>
            <div className="flex flex-col gap-2 w-48">
              <button 
                onClick={() => hideConfession({ secret, confessionId: c._id })}
                className="w-full flex items-center justify-center gap-2 py-2 bg-red-950/30 text-red-500 border border-red-900/50 text-[9px] font-mono uppercase tracking-widest hover:bg-red-900/50 transition-all"
              >
                <Trash2 size={12} /> HIDE POST
              </button>
              <button 
                onClick={() => flagConfession({ secret, confessionId: c._id })}
                className="w-full flex items-center justify-center gap-2 py-2 bg-yellow-950/30 text-yellow-500 border border-yellow-900/50 text-[9px] font-mono uppercase tracking-widest hover:bg-yellow-900/50 transition-all"
              >
                <Flag size={12} /> FLAG POST
              </button>
              <button 
                className="w-full flex items-center justify-center gap-2 py-2 bg-[var(--black)] text-[var(--ash)] border border-[var(--border)] text-[9px] font-mono uppercase tracking-widest"
              >
                <ExternalLink size={12} /> VIEW USER
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Reports Tab ──────────────────────────────────────────── */
function ReportsTab({ secret }: { secret: string }) {
  const reports = useQuery(api.admin.getReports, { secret });
  const updateStatus = useMutation(api.admin.updateReportStatus);

  if (!reports) return <Loading />;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold uppercase tracking-widest mb-8">Urgent Reports</h2>
      <div className="bg-[var(--surface)] border border-[var(--border)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--black)] text-[9px] font-mono uppercase tracking-[0.3em] text-[var(--dim)]">
              <th className="p-6 border-b border-[var(--border)]">Type</th>
              <th className="p-6 border-b border-[var(--border)]">Reason</th>
              <th className="p-6 border-b border-[var(--border)]">Note</th>
              <th className="p-6 border-b border-[var(--border)]">Status</th>
              <th className="p-6 border-b border-[var(--border)] text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-[11px] font-mono">
            {reports.map((r: any) => (
              <tr key={r._id} className="border-b border-[var(--border)] hover:bg-white/[0.02] transition-colors">
                <td className="p-6 text-[var(--ash)] uppercase">{r.targetType}</td>
                <td className="p-6"><span className="px-2 py-1 bg-red-950/20 text-red-400 border border-red-900/30">{r.reason}</span></td>
                <td className="p-6 text-[var(--dim)]">{r.note || "—"}</td>
                <td className="p-6">
                   <span className={clsx(
                     "uppercase tracking-widest text-[9px]",
                     r.status === "pending" ? "text-yellow-500 animate-pulse" : "text-green-500"
                   )}>{r.status}</span>
                </td>
                <td className="p-6 text-right space-x-4">
                  <button onClick={() => updateStatus({ secret, reportId: r._id, status: "reviewed" })} className="text-[var(--crimson)] hover:underline">MARK REVIEWED</button>
                  <button onClick={() => updateStatus({ secret, reportId: r._id, status: "dismissed" })} className="text-[var(--dim)] hover:underline">DISMISS</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Seeding Tab ──────────────────────────────────────────── */
function SeedingTab({ secret }: { secret: string }) {
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const seedFeed = useMutation(api.admin.seedFeed);

  const handleSeed = async () => {
    setLoading(true);
    try {
      await seedFeed({ secret, count });
      toast.success(`Launched ${count} generation tasks.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to seed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-display font-bold uppercase tracking-widest mb-4">Feed Seeding Engine</h2>
      <p className="text-sm text-[var(--ash)] mb-10 leading-relaxed font-mono">
        Inject human-like, authentic stories into the global feed. This triggers high-fidelity AI personas across diverse genres and cultures.
      </p>
      
      <div className="bg-[var(--surface)] border border-[var(--border)] p-10 space-y-8">
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-[var(--dim)] block mb-4">Post Count</label>
          <input 
            type="number" 
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value))}
            className="w-full bg-[var(--black)] border border-[var(--border)] px-6 py-4 text-xl font-mono text-[var(--white)]"
          />
        </div>
        <button 
          onClick={handleSeed}
          disabled={loading}
          className="w-full bg-[var(--crimson)] text-white py-6 font-mono text-xs uppercase tracking-[0.3em] hover:bg-[var(--crimson-bright)] transition-all flex items-center justify-center gap-4"
        >
          {loading ? <Loader className="animate-spin" size={16} /> : <Zap size={16} />}
          LITERAL SEEDING TASK
        </button>
        <p className="text-[9px] text-[var(--dim)] font-mono uppercase text-center italic">
          * Caution: Each task calls the Groq Llama3 model. Excessive use may hit quotas.
        </p>
      </div>
    </div>
  );
}

/* ─── Logs Tab ─────────────────────────────────────────────── */
function LogsTab({ secret }: { secret: string }) {
  const logs = useQuery(api.admin.getSystemLogs, { secret });

  if (!logs) return <Loading />;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-display font-bold uppercase tracking-widest mb-8">System Event Stream</h2>
      <div className="space-y-2">
        {logs.map((log: any) => (
          <div key={log._id} className="p-4 bg-[var(--black)] border border-[var(--border)] flex items-start gap-6 font-mono text-[10px]">
            <span className="text-[var(--dim)] w-24 shrink-0">{new Date(log.createdAt).toLocaleTimeString()}</span>
            <span className={clsx(
              "w-20 shrink-0 font-bold",
              log.status === "success" ? "text-green-500" : "text-red-500"
            )}>[{log.status.toUpperCase()}]</span>
            <span className="text-[var(--crimson)] w-24 shrink-0">{log.task.toUpperCase()}</span>
            <span className="text-[var(--ash)]">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <Loader size={32} className="animate-spin text-[var(--crimson)]" />
      <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-[var(--dim)]">Initializing Terminal...</p>
    </div>
  );
}
