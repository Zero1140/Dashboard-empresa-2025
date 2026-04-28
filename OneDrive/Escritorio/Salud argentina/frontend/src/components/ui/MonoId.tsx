/**
 * Muestra IDs médicos (CUFP, CUIR, DNI, matrícula) con el estilo "medical-id".
 * El anchor visual del sistema: IBM Plex Mono + teal glow.
 */
export default function MonoId({
  value,
  label,
  dimmed = false,
}: {
  value: string | null | undefined;
  label?: string;
  dimmed?: boolean;
}) {
  if (!value) return <span className="text-text-3 text-sm">—</span>;
  return (
    <div className="inline-flex flex-col gap-0.5">
      {label && <span className="text-text-3 text-[10px] uppercase tracking-widest">{label}</span>}
      <span className={dimmed ? "font-mono text-sm text-text-2" : "medical-id text-sm"}>{value}</span>
    </div>
  );
}
