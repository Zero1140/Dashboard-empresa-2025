"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/context/ToastContext";
import { api } from "@/lib/api";
import type { Practitioner } from "@/lib/types";

export default function PrestadoresPendientesPage() {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<Set<string>>(new Set());
  const [rejecting, setRejecting] = useState<Set<string>>(new Set());
  const [rejectConfirmId, setRejectConfirmId] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    api
      .listPractitioners(false)
      .then((all) => setPractitioners(all.filter((p) => !p.aprobado)))
      .catch(() => addToast("No se pudo cargar la lista de pendientes.", "error"))
      .finally(() => setLoading(false));
  }, [addToast]);

  const handleApprove = useCallback(
    async (id: string) => {
      setApproving((prev) => new Set(prev).add(id));
      try {
        await api.approvePractitioner(id);
        setPractitioners((prev) => prev.filter((p) => p.id !== id));
        addToast("Prestador aprobado correctamente.", "success");
      } catch {
        addToast("No se pudo aprobar el prestador. Intentá de nuevo.", "error");
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
      setRejectConfirmId(null);
      try {
        await api.erasePractitioner(id);
        setPractitioners((prev) => prev.filter((p) => p.id !== id));
        addToast("Prestador rechazado.", "success");
      } catch {
        addToast("No se pudo rechazar el prestador. Intentá de nuevo.", "error");
      } finally {
        setRejecting((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [addToast]
  );

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
          <div className="card p-10 text-center">
            <p className="text-text-2 text-sm">No hay médicos pendientes de aprobación.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
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
                        {rejectConfirmId === p.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-danger text-xs">¿Confirmar rechazo?</span>
                            <button
                              onClick={() => confirmReject(p.id)}
                              className="btn-primary text-xs px-2 py-1 bg-danger border-danger"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setRejectConfirmId(null)}
                              className="btn-secondary text-xs px-2 py-1"
                            >
                              No
                            </button>
                          </div>
                        ) : (
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
                              onClick={() => setRejectConfirmId(p.id)}
                              disabled={approving.has(p.id) || rejecting.has(p.id)}
                              className="btn-secondary text-xs px-3 py-1.5 text-danger border-danger/20 hover:bg-danger-bg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {rejecting.has(p.id) ? "..." : "Rechazar"}
                            </button>
                          </div>
                        )}
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
                    <div>
                      <Link href={`/prestadores/${p.id}`} className="text-text font-medium hover:text-accent transition-colors">
                        {p.nombre} {p.apellido}
                      </Link>
                      <p className="text-text-3 text-xs mt-0.5">{p.especialidad ?? "Sin especialidad"}</p>
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
                  {rejectConfirmId === p.id ? (
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-danger text-xs flex-1">¿Confirmar rechazo?</span>
                      <button
                        onClick={() => confirmReject(p.id)}
                        className="btn-primary text-xs px-2 py-1 bg-danger border-danger"
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setRejectConfirmId(null)}
                        className="btn-secondary text-xs px-2 py-1"
                      >
                        No
                      </button>
                    </div>
                  ) : (
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
                        onClick={() => setRejectConfirmId(p.id)}
                        disabled={approving.has(p.id) || rejecting.has(p.id)}
                        className="btn-secondary text-xs px-3 py-1.5 flex-1 text-danger border-danger/20 hover:bg-danger-bg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {rejecting.has(p.id) ? "..." : "Rechazar"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
