"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import type { ConsentEvent } from "@/lib/types";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  accepted: { label: "Aceptó términos", color: "text-success" },
  revoked: { label: "Revocó consentimiento", color: "text-warning" },
};

function downloadCsv(events: ConsentEvent[], practitionerId: string) {
  const header = "accion,version_tos,fecha,ip,user_agent\n";
  const rows = events.map((e) =>
    [e.action, e.tos_version, e.recorded_at, e.ip_address ?? "", (e.user_agent ?? "").replace(/,/g, ";")]
      .join(",")
  );
  const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `consentimientos-${practitionerId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ConsentHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const [events, setEvents] = useState<ConsentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.getConsentHistory(id);
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Historial de consentimientos"
        subtitle="Ley 25.326 — Registro de aceptaciones y revocaciones"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => downloadCsv(events, id)}
              disabled={events.length === 0}
              className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar CSV
            </button>
            <Link href={`/prestadores/${id}`} className="btn-secondary text-sm px-4 py-2">
              ← Volver
            </Link>
          </div>
        }
      />

      <div className="p-6 space-y-4 animate-fadeIn">
        <div className="card p-4 border-accent/20 bg-accent-glow flex items-start gap-3">
          <svg className="text-accent mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="text-text-2 text-xs">
            Registro inmutable de cada vez que este prestador aceptó o revocó su consentimiento.
            Exigido por Ley 25.326 (AAIP). Exportable para auditorías.
          </p>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="py-12 text-center"><span className="spinner" /></div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-text-3 text-sm">Sin eventos de consentimiento registrados.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-5 py-3 font-medium">Acción</th>
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium">Versión TOS</th>
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium">Fecha y hora</th>
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium hidden md:table-cell">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-5 py-3">
                      <span className={`text-sm font-medium ${(ACTION_LABELS[e.action] ?? { color: "text-text-2" }).color}`}>
                        {ACTION_LABELS[e.action]?.label ?? e.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-text-3">v{e.tos_version}</span>
                    </td>
                    <td className="px-4 py-3 text-text-2 text-sm">{formatDate(e.recorded_at)}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs font-mono text-text-3">{e.ip_address ?? "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
