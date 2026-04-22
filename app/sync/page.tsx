"use client";

import { useEffect, useState, Suspense } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useAnonSession } from "@/components/providers/AnonSessionProvider";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

function SyncPageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const { updateSessionId, isLoaded } = useAnonSession();
  const consumeToken = useMutation(api.sync.consumeSyncToken);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!token) {
      setStatus("error");
      toast.error("Invalid sync link.");
      router.push("/");
      return;
    }

    async function sync() {
      try {
        const result = await consumeToken({ token: token! });
        updateSessionId(result.sourceSessionId);
        setStatus("success");
        toast.success("Device linked successfully!");
        setTimeout(() => router.push("/profile"), 2000);
      } catch (err: unknown) {
        setStatus("error");
        toast.error((err as Error).message ?? "Failed to sync device.");
        setTimeout(() => router.push("/"), 2000);
      }
    }

    sync();
  }, [token, isLoaded, consumeToken, router, updateSessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--black)] p-4 text-center">
      <div className="bg-[#121215] border border-[var(--border)] rounded-xl p-8 max-w-sm w-full">
        <h2 className="text-xl font-display text-[var(--white)] mb-4">Device Sync</h2>
        
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={32} className="text-[var(--crimson)] animate-spin" />
            <p className="text-[var(--dim)] font-mono text-xs uppercase tracking-widest">
              Authenticating...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--crimson-dim)] text-[var(--crimson)] flex items-center justify-center font-bold text-xl">
              ✓
            </div>
            <p className="text-[var(--white)] font-mono text-sm uppercase tracking-widest">
              Account Linked
            </p>
            <p className="text-[var(--dim)] text-xs mt-2">
              Redirecting you to your profile...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-[var(--border)] text-[var(--dim)] flex items-center justify-center font-bold text-xl">
              ✗
            </div>
            <p className="text-[var(--white)] font-mono text-sm uppercase tracking-widest">
              Link Failed
            </p>
            <p className="text-[var(--dim)] text-xs mt-2">
              The link may be expired or invalid.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SyncPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--black)] p-4 text-center">
        <div className="bg-[#121215] border border-[var(--border)] rounded-xl p-8 max-w-sm w-full">
          <h2 className="text-xl font-display text-[var(--white)] mb-4">Device Sync</h2>
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={32} className="text-[var(--crimson)] animate-spin" />
            <p className="text-[var(--dim)] font-mono text-xs uppercase tracking-widest">
              Loading...
            </p>
          </div>
        </div>
      </div>
    }>
      <SyncPageContent />
    </Suspense>
  );
}
