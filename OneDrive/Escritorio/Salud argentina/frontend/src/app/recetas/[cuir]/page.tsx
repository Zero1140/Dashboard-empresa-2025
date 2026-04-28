// frontend/src/app/recetas/[cuir]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "react-qr-code";
import StatusBadge from "@/components/ui/StatusBadge";
import MonoId from "@/components/ui/MonoId";
import { api } from "@/lib/api";
import type { PublicPrescription } from "@/lib/types";

const ESTADO_LABELS: Record<string, string> = {
  activa: "Receta activa — válida para dispensación",
  dispensada: "Dispensada — ya fue entregada",
  anulada: "Anulada — no válida",
  vencida: "Vencida — expiró el plazo de 30 días",
};

export default function PublicPrescriptionPage() {
  const { cuir } = useParams<{ cuir: string }>();
  const [rx, setRx] = useState<PublicPrescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.getPublicPrescription(cuir)
      .then(setRx)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [cuir]);

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-text-3 text-[10px] uppercase tracking-widest mb-1">Paciente</p>
                  <p className="text-text-2 text-sm font-mono">{rx.paciente_nombre_parcial}</p>
                </div>
                <div>
                  <p className="text-text-3 text-[10px] uppercase tracking-widest mb-1">Prescriptor CUFP</p>
                  <p className="text-text-2 text-sm font-mono">{rx.prescriber_cufp || "—"}</p>
                </div>
              </div>

              {rx.fecha_vencimiento && (
                <div>
                  <p className="text-text-3 text-[10px] uppercase tracking-widest mb-1">Vencimiento</p>
                  <p className="text-text-2 text-sm">{new Date(rx.fecha_vencimiento).toLocaleDateString("es-AR")}</p>
                </div>
              )}

              <hr className="divider-accent" />
              <MonoId value={rx.cuir} label="CUIR" />

              {/* QR para farmacia */}
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
