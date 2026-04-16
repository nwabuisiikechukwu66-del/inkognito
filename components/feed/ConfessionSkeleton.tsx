/**
 * ConfessionSkeleton — components/feed/ConfessionSkeleton.tsx
 * Shimmer placeholder shown while confession feed loads.
 */

export function ConfessionSkeleton() {
  return (
    <div className="border-b border-[var(--border)] border-l-2 border-l-[var(--muted)] p-5 bg-[var(--black)]">
      {/* Header row */}
      <div className="flex items-center gap-3 mb-4">
        <div className="skeleton h-2.5 w-16 rounded-none" />
        <div className="skeleton h-2.5 w-12 rounded-none" />
        <div className="flex-1" />
        <div className="skeleton h-2.5 w-20 rounded-none" />
      </div>

      {/* Content lines */}
      <div className="space-y-2 mb-4">
        <div className="skeleton h-3.5 w-full rounded-none" />
        <div className="skeleton h-3.5 w-5/6 rounded-none" />
        <div className="skeleton h-3.5 w-4/6 rounded-none" />
      </div>

      {/* Reaction row */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-2">
          {[60, 48, 52, 44, 50].map((w, i) => (
            <div key={i} className={`skeleton h-7 rounded-none`} style={{ width: w }} />
          ))}
        </div>
        <div className="flex gap-3">
          <div className="skeleton h-5 w-5 rounded-none" />
          <div className="skeleton h-5 w-5 rounded-none" />
        </div>
      </div>
    </div>
  );
}
