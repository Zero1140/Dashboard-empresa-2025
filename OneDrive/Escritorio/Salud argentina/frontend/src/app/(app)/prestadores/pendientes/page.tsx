"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/context/ToastContext";
import { api } from "@/lib/api";
import type { Practitioner } from "@/lib/types";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function PrestadoresPendientesPage() {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<Set<string>>(new Set());
  const [rejecting, setRejecting] = useState<Set<string>>(new Set());
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);

  // Bulk selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const { addToast } = useToast();

  const fetchPending = useCallback(() => {
    setLoading(true);
    api
      .listPractitioners(false)
      .then((all) => setPractitioners(all.filter((p) => !p.aprobado)))
      .catch(() => addToast("No se pudo cargar la lista de pendientes.", "error"))
      .finally(() => setLoading(false));
  }, [addToast]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // Sync indeterminate state on select-all checkbox
  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate =
      selected.size > 0 && selected.size < practitioners.length;
  }, [selected, practitioners.length]);

  const handleApprove = useCallback(
    async (id: string) => {
      setApproving((prev) => new Set(prev).add(id));
      try {
        await api.approvePractitioner(id);
        setPractitioners((prev) => prev.filter((p) => p.id !== id));
        addToast("Médico aprobado correctamente.", "success");
      } catch {
        addToast("No se pudo aprobar el médico. Intentá de nuevo.", "error");
      } finally {
        setApproving((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [addToast]
  );

  const confirmReject = useCallback(
    async (id: string) => {
      setRejecting((prev) => new Set(prev).add(id));
      try {
        await api.erasePractitioner(id);
        setPractitioners((prev) => prev.filter((p) => p.id !== id));
        addToast("Médico rechazado.", "success");
      } catch {
        addToast("No se pudo rechazar. Intentá de nuevo.", "error");
      } finally {
        setRejecting((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setRejectModalId(null);
      }
    },
    [addToast]
  );

  // Bulk selection helpers
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === practitioners.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(practitioners.map((p) => p.id)));
    }
  };

  const handleBulkApprove = async () => {
    setBulkLoading(true);
    const ids = Array.from(selected);
    let successCount = 0;
    let errorCount = 0;
    for (const id of ids) {
      try {
        await api.approvePractitioner(id);
        successCount++;
      } catch {
        errorCount++;
      }
    }
    setBulkLoading(false);
    setSelected(new Set());
    if (successCount > 0) {
      addToast(`${successCount} médico(s) aprobado(s) correctamente.`, "success");
    }
    if (errorCount > 0) {
      addToast(`${errorCount} médico(s) no pudieron aprobarse. Intentá de nuevo.`, "error");
    }
    fetchPending();
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Aprobaciones pendientes"
        subtitle="Médicos en espera de ingreso a la cartilla"
        action={
          <Link href="/prestadores" className="btn-secondary text-xs px-3 py-1.5">
            Ver cartilla completa →
          </Link>
        }
      />

      <div className="p-6 animate-fadeIn">
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="spinner" />
          </div>
        ) : practitioners.length === 0 ? (
          <div className="card p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-success-bg border border-success/20 flex items-center justify-center mx-auto">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-success" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-text-2 text-sm font-medium">Todo al día</p>
            <p className="text-text-3 text-xs">No hay médicos pendientes de aprobación.</p>
            <Link href="/prestadores/invitar" className="text-accent text-sm hover:underline inline-block">
              Invitar más médicos →
            </Link>
          </div>
        ) : (
          /* Add bottom padding so sticky bar doesn't cover last row when selection active */
          <div className={selected.size > 0 ? "pb-24" : ""}>
            {/* Desktop table */}
            <div className="hidden md:block card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 w-10">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        aria-label="Seleccionar todos los médicos pendientes"
                        checked={selected.size === practitioners.length && practitioners.length > 0}
                        onChange={toggleAll}
                        className="w-4 h-4 accent-accent cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-text-3 text-xs font-medium uppercase tracking-wide">Médico</th>
                    <th className="px-4 py-3 text-text-3 text-xs font-medium uppercase tracking-wide">DNI</th>
                    <th className="px-4 py-3 text-text-3 text-xs font-medium uppercase tracking-wide">Especialidad</th>
                    <th className="px-4 py-3 text-text-3 text-xs font-medium uppercase tracking-wide">Matrícula</th>
                    <th className="px-4 py-3 text-text-3 text-xs font-medium uppercase tracking-wide">Estado matrícula</th>
                    <th className="px-4 py-3 text-text-3 text-xs font-medium uppercase tracking-wide">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {practitioners.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-2/40 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Seleccionar a ${p.nombre} ${p.apellido}`}
                          checked={selected.has(p.id)}
                          onChange={() => toggleOne(p.id)}
                          className="w-4 h-4 accent-accent cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/prestadores/${p.id}`} className="text-text font-medium hover:text-accent transition-colors">
                          {p.nombre} {p.apellido}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-text-2 font-mono text-xs">{p.dni}</td>
                      <td className="px-4 py-3 text-text-2">{p.especialidad ?? "—"}</td>
                      <td className="px-4 py-3 text-text-2 font-mono text-xs">{p.matricula_nacional ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.estado_matricula} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(p.id)}
                            disabled={approving.has(p.id) || rejecting.has(p.id)}
                            className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {approving.has(p.id) ? (
                              <span className="flex items-center gap-1.5">
                                <span className="spinner w-3 h-3" />
                                Aprobando…
                              </span>
                            ) : (
                              "Aprobar"
                            )}
                          </button>
                          <button
                            onClick={() => setRejectModalId(p.id)}
                            disabled={approving.has(p.id) || rejecting.has(p.id)}
                            className="btn-secondary text-xs px-3 py-1.5 text-danger border-danger/20 hover:bg-danger-bg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {rejecting.has(p.id) ? "..." : "Rechazar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {practitioners.map((p) => (
                <div key={p.id} className="card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar a ${p.nombre} ${p.apellido}`}
                        checked={selected.has(p.id)}
                        onChange={() => toggleOne(p.id)}
                        className="w-4 h-4 accent-accent cursor-pointer mt-0.5"
                      />
                      <div>
                        <Link href={`/prestadores/${p.id}`} className="text-text font-medium hover:text-accent transition-colors">
                          {p.nombre} {p.apellido}
                        </Link>
                        <p className="text-text-3 text-xs mt-0.5">{p.especialidad ?? "Sin especialidad"}</p>
                      </div>
                    </div>
                    <StatusBadge status={p.estado_matricula} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-text-3 uppercase tracking-wide text-[10px]">DNI</p>
                      <p className="text-text-2 font-mono mt-0.5">{p.dni}</p>
                    </div>
                    <div>
                      <p className="text-text-3 uppercase tracking-wide text-[10px]">Matrícula</p>
                      <p className="text-text-2 font-mono mt-0.5">{p.matricula_nacional ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(p.id)}
                      disabled={approving.has(p.id) || rejecting.has(p.id)}
                      className="btn-primary text-xs px-3 py-1.5 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {approving.has(p.id) ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <span className="spinner w-3 h-3" />
                          Aprobando…
                        </span>
                      ) : (
                        "Aprobar"
                      )}
                    </button>
                    <button
                      onClick={() => setRejectModalId(p.id)}
                      disabled={approving.has(p.id) || rejecting.has(p.id)}
                      className="btn-secondary text-xs px-3 py-1.5 flex-1 text-danger border-danger/20 hover:bg-danger-bg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {rejecting.has(p.id) ? "..." : "Rechazar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white p-4 md:left-64">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <span className="text-sm text-text-2">{selected.size} médico(s) seleccionado(s)</span>
            <button
              onClick={handleBulkApprove}
              disabled={bulkLoading}
              className="btn-primary"
            >
              {bulkLoading ? "Aprobando..." : `Aprobar ${selected.size} médico(s)`}
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={rejectModalId !== null}
        title="Rechazar médico"
        description="El médico será rechazado y sus datos serán suprimidos del sistema conforme al Art. 16 de la Ley 25.326. Esta acción es irreversible."
        confirmLabel="Rechazar y suprimir datos"
        danger
        loading={rejectModalId !== null && rejecting.has(rejectModalId)}
        onConfirm={() => { if (rejectModalId) confirmReject(rejectModalId); }}
        onCancel={() => setRejectModalId(null)}
      />
    </div>
  );
}
