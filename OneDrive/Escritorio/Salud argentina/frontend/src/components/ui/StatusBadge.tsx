type Status = "vigente" | "suspendida" | "inhabilitada" | "desconocido" | "activa" | "inactiva" | "mock" | "ok" | "error" | "warning";

const MAP: Record<string, { label: string; cls: string; dot: string }> = {
  vigente:      { label: "Vigente",      cls: "bg-success-bg text-success border-success/30",     dot: "bg-success" },
  activa:       { label: "Activa",       cls: "bg-success-bg text-success border-success/30",     dot: "bg-success" },
  ok:           { label: "Activo",       cls: "bg-success-bg text-success border-success/30",     dot: "bg-success" },
  suspendida:   { label: "Suspendida",   cls: "bg-warning-bg text-warning border-warning/30",     dot: "bg-warning" },
  inhabilitada: { label: "Inhabilitada", cls: "bg-danger-bg text-danger border-danger/30",        dot: "bg-danger" },
  inactiva:     { label: "Inactiva",     cls: "bg-danger-bg text-danger border-danger/30",        dot: "bg-danger" },
  error:        { label: "Error",        cls: "bg-danger-bg text-danger border-danger/30",        dot: "bg-danger" },
  mock:         { label: "Mock",         cls: "bg-info-bg text-info border-info/30",              dot: "bg-info" },
  warning:      { label: "Advertencia", cls: "bg-warning-bg text-warning border-warning/30",     dot: "bg-warning" },
  desconocido:  { label: "Desconocido", cls: "bg-surface-2 text-text-2 border-border",           dot: "bg-text-3" },
};

export default function StatusBadge({ status, label }: { status: string; label?: string }) {
  const cfg = MAP[status] ?? MAP.desconocido;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {label ?? cfg.label}
    </span>
  );
}
