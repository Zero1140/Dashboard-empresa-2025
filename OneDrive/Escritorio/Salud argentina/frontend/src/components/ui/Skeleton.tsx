export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`bg-border/60 rounded animate-pulse ${className}`} />;
}

export function SkeletonCard({ children }: { children: React.ReactNode }) {
  return <div className="card p-4 space-y-3">{children}</div>;
}
