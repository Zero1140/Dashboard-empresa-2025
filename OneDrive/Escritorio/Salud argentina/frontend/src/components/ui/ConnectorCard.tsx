import StatusBadge from "./StatusBadge";

interface ConnectorCardProps {
  name: string;
  description: string;
  status: "ok" | "mock" | "error";
  warning?: string;
  steps?: string[];
}

export default function ConnectorCard({ name, description, status, warning, steps }: ConnectorCardProps) {
  return (
    <div className="card card-hover p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-text font-semibold text-sm">{name}</p>
          <p className="text-text-3 text-xs mt-0.5">{description}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {warning && (
        <div className="bg-warning-bg border border-warning/20 rounded-md px-3 py-2">
          <p className="text-warning text-xs">{warning}</p>
        </div>
      )}

      {steps && steps.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-text-3 text-[10px] uppercase tracking-widest">Pasos para activar</p>
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-text-3 text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
              <p className="text-text-2 text-xs">{step}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
