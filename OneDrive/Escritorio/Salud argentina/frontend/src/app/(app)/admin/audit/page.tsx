"use client";
import { useEffect, useState, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import type { AuditLogEntry } from "@/lib/types";

const ACTIONS = ["", "create", "read", "update", "delete", "login", "logout", "verify", "approve"];

function downloadCsv(items: AuditLogEntry[]) {
  const header = "fecha,accion,recurso,usuario_id,ip\n";
  const rows = items.map((e) =>
    [e.created_at, e.action, e.resource ?? "", e.user_id ?? "", e.ip_address ?? ""]
      .join(",")
  );
  const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLog({ limit: 500, action: action || undefined });
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [action]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Audit Log"
        subtitle="Registro de accesos y operaciones sobre datos sensibles — Ley 25.326"
        action={
          <button
            onClick={() => downloadCsv(items)}
            disabled={items.length === 0}
            className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar CSV ({items.length})
          </button>
        }
      />

      <div className="p-6 space-y-4 animate-fadeIn">
        <div className="card p-4 flex flex-wrap gap-4 items-center">
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="input-base w-44"
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a || "Todas las acciones"}</option>
            ))}
          </select>
          <p className="text-text-3 text-xs ml-auto">{items.length} entradas</p>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="py-12 text-center"><span className="spinner" /></div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-text-3 text-sm">Sin entradas de audit log.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-5 py-3 font-medium">Fecha</th>
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium">Acción</th>
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium">Recurso</th>
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium hidden lg:table-cell">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-5 py-3 text-text-2 text-xs font-mono">{formatDate(e.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 bg-surface-2 border border-border rounded font-mono text-text-2">
                        {e.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-text text-sm truncate max-w-xs">{e.resource ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
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
