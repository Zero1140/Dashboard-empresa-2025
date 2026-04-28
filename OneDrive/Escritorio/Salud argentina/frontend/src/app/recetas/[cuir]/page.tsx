// frontend/src/app/recetas/[cuir]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import StatusBadge from "@/components/ui/StatusBadge";
import MonoId from "@/components/ui/MonoId";
import { api } from "@/lib/api";
import type { PublicPrescription } from "@/lib/types";

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

const ESTADO_LABELS: Record<string, string> = {
  activa: "Receta activa — válida para dispensación",
  dispensada: "Dispensada — ya fue entregada",
  anulada: "Anulada — no válida",
  vencida: "Vencida — expiró el plazo de 30 días",
};

export default function PublicPrescriptionPage() {
  const { cuir } = useParams<{ cuir: string }>();
  const router = useRouter();
  const [rx, setRx] = useState<PublicPrescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showDispenseForm, setShowDispenseForm] = useState(false);
  const [farmacia, setFarmacia] = useState("");
  const [farmacista, setFarmacista] = useState("");
  const [dispensing, setDispensing] = useState(false);
  const [dispenseError, setDispenseError] = useState("");

  useEffect(() => {
    api.getPublicPrescription(cuir)
      .then(setRx)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [cuir]);

  const handleDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispensing(true);
    setDispenseError("");
    try {
      const result = await api.dispensePrescription(cuir, { nombre_farmacia: farmacia, nombre_farmacista: farmacista });
      setRx((prev) => prev ? { ...prev, estado: result.estado } : prev);
      setShowDispenseForm(false);
    } catch (err) {
      setDispenseError(err instanceof Error ? err.message : "Error al dispensar");
    } finally {
      setDispensing(false);
    }
  };

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-text-3 hover:text-text text-sm transition-colors mr-1 flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          ← Inicio
        </button>
        <div className="w-px h-6 bg-border flex-shrink-0" />
        <div className="w-7 h-7 rounded bg-accent flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#080C18" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <p className="text-text font-semibold text-sm">SaludOS Argentina</p>
          <p className="text-text-3 text-[10px] uppercase tracking-widest">Verificación de Receta Electrónica</p>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        {loading && (
          <div className="text-center space-y-3">
            <span className="spinner" />
            <p className="text-text-3 text-sm">Verificando receta...</p>
          </div>
        )}

        {notFound && (
          <div className="card p-8 max-w-sm w-full text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-danger-bg border border-danger/20 flex items-center justify-center mx-auto text-xl">✗</div>
            <p className="text-text font-semibold">Receta no encontrada</p>
            <p className="text-text-3 text-sm">El código CUIR no corresponde a ninguna receta registrada.</p>
            <MonoId value={cuir} label="CUIR consultado" dimmed />
          </div>
        )}

        {!loading && !notFound && !rx && (
          <div className="card p-8 max-w-sm w-full text-center space-y-3">
            <p className="text-text-3 text-sm">No se pudo cargar la receta.</p>
          </div>
        )}

        {rx && (
          <div className="card p-6 max-w-lg w-full space-y-5 animate-fadeIn">
            {/* Status prominente */}
            <div className={`rounded-lg px-4 py-3 border ${
              rx.estado === "activa" ? "bg-success-bg border-success/20" :
              rx.estado === "dispensada" ? "bg-accent-glow border-accent/20" :
              "bg-warning-bg border-warning/20"
            }`}>
              <div className="flex items-center gap-3">
                <StatusBadge status={rx.estado === "activa" ? "activa" : rx.estado === "dispensada" ? "ok" : "suspendida"} />
                <p className={`text-sm font-medium ${
                  rx.estado === "activa" ? "text-success" :
                  rx.estado === "dispensada" ? "text-accent" :
                  "text-warning"
                }`}>
                  {ESTADO_LABELS[rx.estado] || rx.estado}
                </p>
              </div>
            </div>

            <hr className="divider-accent" />

            {/* Prescription details */}
            <div className="space-y-4">
              <div>
                <p className="text-text-3 text-[10px] uppercase tracking-widest mb-1">Medicamento</p>
                <p className="text-text font-semibold">{rx.medicamento_nombre || "No especificado"}</p>
                {rx.medicamento_snomed_code && (
                  <p className="text-text-3 text-xs font-mono mt-0.5">SNOMED: {rx.medicamento_snomed_code}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-text-3 text-[10px] uppercase tracking-widest mb-1">Cantidad</p>
                  <p className="text-text text-sm font-medium">{rx.cantidad != null ? `${rx.cantidad} unidades` : "—"}</p>
                </div>
                <div>
                  <p className="text-text-3 text-[10px] uppercase tracking-widest mb-1">Cobertura</p>
                  <StatusBadge status={rx.cobertura_verificada ? "activa" : "mock"} label={rx.cobertura_verificada ? "PMO verificado" : "Sin verificar"} />
                </div>
              </div>

              {rx.posologia && (
                <div>
                  <p className="text-text-3 text-[10px] uppercase tracking-widest mb-1">Posología</p>
                  <p className="text-text-2 text-sm">{rx.posologia}</p>
                </div>
              )}

              {rx.estado === "activa" && !showDispenseForm && (
                <button
                  onClick={() => setShowDispenseForm(true)}
                  className="btn-primary w-full text-sm"
                >
                  Dispensar en farmacia
                </button>
              )}

              {showDispenseForm && (
                <form onSubmit={handleDispense} className="space-y-3 border border-border rounded-lg p-4">
                  <p className="text-text-2 text-xs font-medium uppercase tracking-widest">Registrar dispensación</p>
                  <div>
                    <label className="text-text-3 text-[10px] uppercase tracking-widest block mb-1">Nombre de la farmacia</label>
                    <input value={farmacia} onChange={(e) => setFarmacia(e.target.value)} className="input-base text-sm" placeholder="Farmacia Central" required />
                  </div>
                  <div>
                    <label className="text-text-3 text-[10px] uppercase tracking-widest block mb-1">Farmacista responsable</label>
                    <input value={farmacista} onChange={(e) => setFarmacista(e.target.value)} className="input-base text-sm" placeholder="Lic. García" required />
                  </div>
                  {dispenseError && <p className="text-danger text-xs">{dispenseError}</p>}
                  <div className="flex gap-2">
                    <button type="submit" disabled={dispensing} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
                      {dispensing && <span className="spinner" />}
                      {dispensing ? "Procesando..." : "Confirmar dispensación"}
                    </button>
                    <button type="button" onClick={() => setShowDispenseForm(false)} className="btn-secondary text-sm">
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-text-3 text-[10px] uppercase tracking-widest mb-1">Paciente</p>
                  <p className="text-text-2 text-sm font-mono">{rx.paciente_nombre_parcial}</p>
                  <p className="text-text-3 text-[10px] mt-0.5">Nombre parcial — protegido por Ley 25.326</p>
                </div>
                <div>
                  <p className="text-text-3 text-[10px] uppercase tracking-widest mb-1">Prescriptor CUFP</p>
                  <p className="text-text-2 text-sm font-mono">{rx.prescriber_cufp || "—"}</p>
                </div>
              </div>

              {rx.fecha_vencimiento && (
                <div>
                  <p className="text-text-3 text-[10px] uppercase tracking-widest mb-1">Vencimiento</p>
                  <p className="text-text-2 text-sm">
                    {new Date(rx.fecha_vencimiento).toLocaleDateString("es-AR")}
                    {(() => {
                      const exp = relativeExpiry(rx.fecha_vencimiento);
                      const isExpired = exp.label === "Expirada";
                      return (
                        <span className={`text-xs ml-2 ${isExpired ? "text-danger" : exp.urgent ? "text-warning" : "text-text-3"}`}>
                          · {exp.label}
                        </span>
                      );
                    })()}
                  </p>
                </div>
              )}

              <hr className="divider-accent" />
              <MonoId value={rx.cuir} label="CUIR" />

              {/* QR para farmacia — only active prescriptions */}
              {rx.estado === "activa" && (
                <div className="border border-border rounded-lg p-4 flex flex-col items-center gap-3">
                  <p className="text-text-3 text-[10px] uppercase tracking-widest">Código QR — Farmacia</p>
                  <div className="bg-white p-3 rounded-md">
                    <QRCode
                      value={typeof window !== "undefined"
                        ? `${window.location.origin}/recetas/${rx.cuir}`
                        : `/recetas/${rx.cuir}`}
                      size={140}
                      level="M"
                    />
                  </div>
                  <p className="text-text-3 text-[10px] text-center">Escaneá para verificar en la farmacia</p>
                </div>
              )}

              {rx.estado !== "activa" && (
                <div className="border border-border rounded-lg p-3 text-center">
                  <p className="text-text-3 text-xs">Código QR no disponible — receta {rx.estado}</p>
                </div>
              )}
            </div>

            <div className="text-center">
              <a href="/paciente" className="text-accent text-xs hover:underline">
                Ver todas mis recetas por DNI →
              </a>
            </div>

            <p className="text-text-3 text-[10px] text-center">
              Verificado por SaludOS Argentina · Ley 27.553 · Decreto 98/2023
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
