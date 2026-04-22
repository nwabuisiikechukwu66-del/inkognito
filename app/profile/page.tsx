"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { User, Edit3, Loader2, MessageSquare, Flame, Moon } from "lucide-react";
import { DeviceSync } from "@/components/profile/DeviceSync";
import { PremiumBanner } from "@/components/profile/PremiumBanner";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { sessionId } = useAnonSession();
  const user = useQuery(api.users.getBySession, { sessionId: sessionId || "" });
  const karma = useQuery(api.users.getKarma, { sessionId: sessionId || "" });
  const myConfessions = useQuery(api.confessions.getMyConfessions, { sessionId: sessionId || "" });
  const setUsernameMutation = useMutation(api.users.setUsername);
  
  const [newUsername, setNewUsername] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleUpdateUsername() {
    if (!sessionId || !newUsername.trim()) return;
    setLoading(true);
    try {
      await setUsernameMutation({ sessionId, username: newUsername.trim() });
      toast.success("Username updated!");
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update username.");
    } finally {
      setLoading(false);
    }
  }

  if (!user) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="animate-spin text-[var(--dim)]" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex flex-col items-center mb-12">
        <div className="w-24 h-24 rounded-full bg-[var(--surface)] flex items-center justify-center border-2 border-[var(--border)] mb-6 shadow-xl">
          <User size={48} className="text-[var(--ash)]" />
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-3xl font-display font-bold text-[var(--white)]">
              {user.username || "Anonymous User"}
            </h1>
            {user.isPremium && !isEditing && (
              <button 
                onClick={() => { setIsEditing(true); setNewUsername(user.username || ""); }}
                className="p-1 hover:bg-[var(--surface)] rounded text-[var(--dim)] hover:text-[var(--white)] transition-colors"
              >
                <Edit3 size={16} />
              </button>
            )}
          </div>
          <p className="text-[var(--dim)] font-mono text-[10px] uppercase tracking-[0.2em] mb-3">
            Session: {sessionId?.slice(0, 8)}...
          </p>

          <div className="flex items-center justify-center gap-3">
            <div className="bg-[var(--surface)] border border-[var(--border)] px-4 py-2 rounded-full flex items-center gap-2 shadow-inner" title="Shadow Streak">
              <Flame size={16} className={user.streak && user.streak > 0 ? "text-[var(--crimson)]" : "text-[var(--dim)]"} />
              <span className="font-mono text-xs font-bold text-[var(--white)]">
                {user.streak || 0}
              </span>
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] px-4 py-2 rounded-full flex items-center gap-2 shadow-inner" title="Void Karma">
              <Moon size={16} className="text-[var(--ash)]" />
              <span className="font-mono text-xs font-bold text-[var(--white)]">
                {karma || 0}
              </span>
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-sm">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter new username..."
              className="w-full bg-[var(--surface)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--white)] rounded-lg focus:border-[var(--crimson)] outline-none"
            />
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-3 border border-[var(--border)] text-[var(--white)] text-xs font-mono uppercase tracking-widest rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUsername}
                disabled={loading}
                className="flex-1 py-3 bg-[var(--crimson)] text-[var(--white)] text-xs font-mono uppercase tracking-widest rounded-lg flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={12} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="space-y-12">
        {/* Subscription */}
        <PremiumBanner />

        {/* My Confessions */}
        <div>
          <h2 className="text-xl font-display font-bold text-[var(--white)] mb-6 flex items-center gap-2">
            <MessageSquare size={20} className="text-[var(--crimson)]" />
            My Confessions
          </h2>
          <div className="space-y-px">
            {myConfessions && myConfessions.length > 0 ? (
              myConfessions.map((c) => (
                <div key={c._id} className="bg-[var(--surface)] border border-[var(--border)] p-5 hover:border-[var(--dim)] transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] text-[var(--dim)] uppercase tracking-widest">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--crimson)] uppercase border border-[var(--crimson-dim)] px-2 py-0.5">
                      {c.category}
                    </span>
                  </div>
                  <p className="text-[var(--ash)] text-sm line-clamp-2 leading-relaxed">
                    {c.content}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 border border-[var(--border)] border-dashed rounded-xl">
                <p className="text-[var(--dim)] text-sm">You haven't shared anything yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Security */}
        <DeviceSync />
      </div>
    </div>
  );
}
