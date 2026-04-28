"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import StatusBadge from "@/components/ui/StatusBadge";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import type { Invitation } from "@/lib/types";

function relativeExpiry(iso: string): { label: string; urgent: boolean } {
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: "Expirada", urgent: true };
  if (days === 0) return { label: "Vence hoy", urgent: true };
  if (days === 1) return { label: "Vence mañana", urgent: true };
  if (days <= 3) return { label: `Vence en ${days} días`, urgent: true };
  if (days <= 7) return { label: `Vence en ${days} días`, urgent: false };
  return { label: `Vence el ${new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}`, urgent: false };
}

export default function InvitarPrestadorPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invLoading, setInvLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const router = useRouter();
  const { addToast } = useToast();

  const fetchInvitations = useCallback(async () => {
    try {
      const data = await api.listInvitations();
      setInvitations(data);
    } catch {
      // silently ignore — list is non-critical
    } finally {
      setInvLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const inv = await api.invitePractitioner(email);
      setSuccess(inv.email);
      setEmail("");
      // Refresh invitations list after successful send
      fetchInvitations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar invitación");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (inv: Invitation) => {
    setResendingId(inv.id);
    try {
      await api.resendInvitation(inv.id);
      addToast(`Invitación reenviada a ${inv.email}`, "success");
      fetchInvitations();
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error al reenviar invitación", "error");
    } finally {
      setResendingId(null);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      await api.revokeInvitation(id);
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
      addToast("Invitación revocada", "success");
    } catch {
      addToast("Error al revocar", "error");
    } finally {
      setRevokingId(null);
    }
  };

  const estadoToStatus = (estado: Invitation["estado"]) => {
    if (estado === "pendiente") return "mock";
    if (estado === "aceptada") return "activa";
    return "suspendida"; // expirada
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Invitar Prestador"
        subtitle="Motor OpenLoop — Onboarding de profesionales a la cartilla"
      />

      <div className="p-6 max-w-xl space-y-6 animate-fadeIn">
        <div className="card p-4 border-accent/20 bg-accent-glow flex items-start gap-3">
          <svg className="text-accent mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div className="text-xs space-y-1">
            <p className="text-accent font-medium">Flujo de credencialización SaludOS</p>
            <p className="text-text-2">
              El médico recibe un email con un link personalizado. Al completar su perfil, el sistema verifica su matrícula
              automáticamente contra REFEPS/SISA. Una vez verificado, vos aprobás el ingreso a la cartilla.
            </p>
          </div>
        </div>

        {success ? (
          <div className="card p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-success-bg flex items-center justify-center mx-auto">
              <svg className="text-success" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p className="text-text font-semibold">Invitación enviada</p>
              <p className="text-text-2 text-sm mt-1">
                Se envió un link de registro a <span className="font-mono text-accent">{success}</span>. El link expira en 7 días.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setSuccess(null)} className="btn-primary text-sm px-4 py-2">
                Invitar otro
              </button>
              <button onClick={() => router.push("/prestadores")} className="btn-secondary text-sm px-4 py-2">
                Ver cartilla
              </button>
            </div>
          </div>
        ) : (
          <div className="card p-5 space-y-4">
            <h2 className="text-text font-semibold text-sm">Email del profesional</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">
                  Email del médico / profesional de salud
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base"
                  placeholder="dr.garcia@clinicaejemplo.com.ar"
                  required
                />
                <p className="text-text-3 text-xs mt-1.5">
                  Recibirá un link de auto-registro con expiración de 7 días.
                </p>
              </div>

              {error && (
                <div className="bg-danger-bg border border-danger/20 rounded-lg px-4 py-3">
                  <p className="text-danger text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button type="submit" disabled={loading || !email} className="btn-primary flex items-center gap-2">
                  {loading && <span className="spinner" />}
                  {loading ? "Enviando invitación..." : "Enviar invitación"}
                </button>
                <button type="button" onClick={() => router.back()} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card p-4 space-y-3">
          <p className="text-text-3 text-[10px] uppercase tracking-widest">Flujo de onboarding</p>
          {[
            { n: "1", t: "Invitación enviada", d: "El médico recibe el email con link personalizado" },
            { n: "2", t: "Auto-registro", d: "Completa nombre, DNI, especialidad y contraseña" },
            { n: "3", t: "Verificación REFEPS", d: "El sistema verifica la matrícula automáticamente contra SISA" },
            { n: "4", t: "Aprobación del admin", d: "Vos revisás y aprobás el ingreso a la cartilla" },
            { n: "5", t: "Habilitado en la red", d: "El médico puede operar dentro del sistema" },
          ].map((step) => (
            <div key={step.n} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-surface-2 border border-border flex items-center justify-center text-text-3 text-[10px] font-mono">
                {step.n}
              </span>
              <div>
                <p className="text-text text-xs font-medium">{step.t}</p>
                <p className="text-text-3 text-[11px]">{step.d}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Invitations history section */}
        <div className="card p-4 space-y-3">
          <p className="text-text-3 text-[10px] uppercase tracking-widest">Invitaciones enviadas</p>

          {invLoading ? (
            <div className="flex items-center gap-2 py-4 justify-center">
              <span className="spinner" />
              <span className="text-text-3 text-sm">Cargando...</span>
            </div>
          ) : invitations.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-text-3 text-sm">No enviaste invitaciones aún.</p>
              <p className="text-text-3 text-xs">Las invitaciones que enviés aparecerán acá con su estado.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-text-3 text-[10px] uppercase tracking-widest pb-2 pr-4 font-normal">Email</th>
                      <th className="text-left text-text-3 text-[10px] uppercase tracking-widest pb-2 pr-4 font-normal">Estado</th>
                      <th className="text-left text-text-3 text-[10px] uppercase tracking-widest pb-2 pr-4 font-normal">Enviada</th>
                      <th className="text-left text-text-3 text-[10px] uppercase tracking-widest pb-2 pr-4 font-normal">Vence</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invitations.map((inv) => (
                      <tr key={inv.id} className="group">
                        <td className="py-2.5 pr-4">
                          <span className="font-mono text-text text-xs">{inv.email}</span>
                        </td>
                        <td className="py-2.5 pr-4">
                          <StatusBadge status={estadoToStatus(inv.estado)} />
                        </td>
                        <td className="py-2.5 pr-4 text-text-2 text-xs">
                          {new Date(inv.created_at).toLocaleDateString("es-AR")}
                        </td>
                        <td className="py-2.5 pr-4">
                          {(() => {
                            const exp = relativeExpiry(inv.expires_at);
                            const isExpired = exp.label === "Expirada";
                            return (
                              <span className={`text-xs ${isExpired ? "text-danger" : exp.urgent ? "text-warning font-medium" : "text-text-3"}`}>
                                {exp.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            {(inv.estado === "pendiente" || inv.estado === "expirada") && (
                              <button
                                onClick={() => handleResend(inv)}
                                disabled={resendingId === inv.id || revokingId === inv.id}
                                className="btn-secondary text-xs px-3 py-1 flex items-center gap-1.5 disabled:opacity-50"
                              >
                                {resendingId === inv.id && <span className="spinner" />}
                                Reenviar
                              </button>
                            )}
                            {inv.estado === "pendiente" && (
                              <button
                                onClick={() => handleRevoke(inv.id)}
                                disabled={revokingId === inv.id || resendingId === inv.id}
                                className="text-danger text-xs hover:underline disabled:opacity-50"
                              >
                                {revokingId === inv.id ? "..." : "Revocar"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden space-y-2">
                {invitations.map((inv) => (
                  <div key={inv.id} className="bg-surface-2 rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-text text-xs break-all">{inv.email}</span>
                      <StatusBadge status={estadoToStatus(inv.estado)} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-text-3 text-[11px] space-y-0.5">
                        <p>Enviada: {new Date(inv.created_at).toLocaleDateString("es-AR")}</p>
                        <p>
                          Vence:{" "}
                          {(() => {
                            const exp = relativeExpiry(inv.expires_at);
                            const isExpired = exp.label === "Expirada";
                            return (
                              <span className={`${isExpired ? "text-danger" : exp.urgent ? "text-warning font-medium" : ""}`}>
                                {exp.label}
                              </span>
                            );
                          })()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(inv.estado === "pendiente" || inv.estado === "expirada") && (
                          <button
                            onClick={() => handleResend(inv)}
                            disabled={resendingId === inv.id || revokingId === inv.id}
                            className="btn-secondary text-xs px-3 py-1 flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {resendingId === inv.id && <span className="spinner" />}
                            Reenviar
                          </button>
                        )}
                        {inv.estado === "pendiente" && (
                          <button
                            onClick={() => handleRevoke(inv.id)}
                            disabled={revokingId === inv.id || resendingId === inv.id}
                            className="text-danger text-xs hover:underline disabled:opacity-50"
                          >
                            {revokingId === inv.id ? "..." : "Revocar"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
