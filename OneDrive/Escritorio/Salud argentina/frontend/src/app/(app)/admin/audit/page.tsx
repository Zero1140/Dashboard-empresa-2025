"use client";
import { useEffect, useState, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import type { AuditLogEntry } from "@/lib/types";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/context/ToastContext";

const ACTIONS = ["", "create", "read", "update", "delete", "login", "logout", "verify", "approve"];

type AuditSortField = "created_at" | "action" | "resource" | "user_id";

function SortIcon({ field, sort }: { field: string; sort: { field: string; dir: "asc" | "desc" } }) {
  if (sort.field !== field) return <span className="text-text-3 text-xs ml-1">⇅</span>;
  return <span className="text-accent text-xs ml-1">{sort.dir === "asc" ? "▲" : "▼"}</span>;
}

function generateCSV(entries: AuditLogEntry[]): string {
  const headers = ["Fecha", "Acción", "Recurso", "Usuario", "IP"];
  const rows = entries.map((e) =>
    [
      e.created_at,
      e.action,
      e.resource ?? "",
      e.user_id ?? "",
      e.ip_address ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [userId, setUserId] = useState("");
  const [sort, setSort] = useState<{ field: AuditSortField; dir: "asc" | "desc" }>({ field: "created_at", dir: "desc" });
  const [confirmExportOpen, setConfirmExportOpen] = useState(false);

  const { addToast } = useToast();

  const handleSort = (field: AuditSortField) => {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLog({
        limit: 500,
        action: action || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        user_id: userId || undefined,
      });
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [action, fromDate, toDate, userId]);

  useEffect(() => { load(); }, [load]);

  const doExport = useCallback(() => {
    const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(generateCSV(items), filename);
    addToast("Exportación completada.", "success");
  }, [items, addToast]);

  const handleExport = () => {
    if (items.length > 100) {
      setConfirmExportOpen(true);
    } else {
      doExport();
    }
  };

  const handleConfirmExport = () => {
    setConfirmExportOpen(false);
    doExport();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("es-AR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

  const sortedItems = [...items].sort((a, b) => {
    const dir = sort.dir === "asc" ? 1 : -1;
    if (sort.field === "created_at") {
      return dir * (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0);
    }
    if (sort.field === "action") {
      return dir * a.action.localeCompare(b.action, "es-AR");
    }
    if (sort.field === "resource") {
      return dir * (a.resource ?? "").localeCompare(b.resource ?? "", "es-AR");
    }
    if (sort.field === "user_id") {
      return dir * (a.user_id ?? "").localeCompare(b.user_id ?? "", "es-AR");
    }
    return 0;
  });

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Audit Log"
        subtitle="Registro de accesos y operaciones sobre datos sensibles — Ley 25.326"
        action={
          <button
            onClick={handleExport}
            disabled={items.length === 0}
            aria-label="Exportar registros del audit log como CSV"
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
            aria-label="Filtrar por tipo de acción"
            className="input-base w-44"
          >
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a || "Todas las acciones"}</option>
            ))}
          </select>
          <div className="flex flex-col gap-1">
            <label htmlFor="audit-from-date" className="text-text-3 text-[10px] uppercase tracking-widest">Desde</label>
            <input
              id="audit-from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="input-base w-40 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="audit-to-date" className="text-text-3 text-[10px] uppercase tracking-widest">Hasta</label>
            <input
              id="audit-to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="input-base w-40 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="audit-user-id" className="text-text-3 text-[10px] uppercase tracking-widest">Usuario (ID)</label>
            <input
              id="audit-user-id"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="input-base w-52 text-xs font-mono"
              placeholder="UUID del usuario..."
            />
          </div>
          {(action || fromDate || toDate || userId) && (
            <button
              onClick={() => {
                setAction("");
                setFromDate("");
                setToDate("");
                setUserId("");
              }}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Limpiar filtros
            </button>
          )}
          <p className="text-text-3 text-xs ml-auto">{items.length} entradas</p>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="py-12 text-center"><span className="spinner" /></div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-text-2 text-sm font-medium">Sin entradas en el audit log</p>
              <p className="text-text-3 text-xs">
                {(action || fromDate || toDate || userId)
                  ? "No hay registros que coincidan con los filtros aplicados. Intentá ampliar el rango de fechas."
                  : "Los accesos y modificaciones de datos quedarán registrados acá (Ley 25.326)."}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th
                    scope="col"
                    role="columnheader"
                    tabIndex={0}
                    aria-sort={sort.field === "created_at" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    className="text-left text-text-3 text-[10px] uppercase tracking-widest px-5 py-3 font-medium cursor-pointer select-none hover:text-accent"
                    onClick={() => handleSort("created_at")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort("created_at"); } }}
                  >
                    Fecha<SortIcon field="created_at" sort={sort} />
                  </th>
                  <th
                    scope="col"
                    role="columnheader"
                    tabIndex={0}
                    aria-sort={sort.field === "action" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium cursor-pointer select-none hover:text-accent"
                    onClick={() => handleSort("action")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort("action"); } }}
                  >
                    Acción<SortIcon field="action" sort={sort} />
                  </th>
                  <th
                    scope="col"
                    role="columnheader"
                    tabIndex={0}
                    aria-sort={sort.field === "resource" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium cursor-pointer select-none hover:text-accent"
                    onClick={() => handleSort("resource")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort("resource"); } }}
                  >
                    Recurso<SortIcon field="resource" sort={sort} />
                  </th>
                  <th
                    scope="col"
                    role="columnheader"
                    tabIndex={0}
                    aria-sort={sort.field === "user_id" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium hidden lg:table-cell cursor-pointer select-none hover:text-accent"
                    onClick={() => handleSort("user_id")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort("user_id"); } }}
                  >
                    Usuario<SortIcon field="user_id" sort={sort} />
                  </th>
                  <th scope="col" className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium hidden lg:table-cell">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedItems.map((e) => (
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
                      <span className="text-xs font-mono text-text-3 truncate block max-w-[120px]">{e.user_id ?? "—"}</span>
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

      <ConfirmModal
        open={confirmExportOpen}
        title="Exportar audit log"
        description={`Estás por exportar ${items.length} registros del audit log. Este archivo puede contener datos sensibles bajo Ley 25.326. ¿Confirmás la exportación?`}
        confirmLabel="Exportar"
        onConfirm={handleConfirmExport}
        onCancel={() => setConfirmExportOpen(false)}
      />
    </div>
  );
}
