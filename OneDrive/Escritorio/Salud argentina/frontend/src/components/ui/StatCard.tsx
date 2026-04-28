export default function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`card p-5 ${accent ? "border-accent/30 bg-accent-glow" : ""}`}>
      <p className="text-text-3 text-xs uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-2xl font-semibold ${accent ? "text-accent" : "text-text"}`}>{value}</p>
      {sub && <p className="text-text-3 text-xs mt-1">{sub}</p>}
    </div>
  );
}
