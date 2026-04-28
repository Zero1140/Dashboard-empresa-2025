"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import StatusBadge from "@/components/ui/StatusBadge";
import MonoId from "@/components/ui/MonoId";
import { api } from "@/lib/api";
import type { Practitioner } from "@/lib/types";

const PROVINCIAS = [
  "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut",
  "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy",
  "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén",
  "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz",
  "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

const PROVINCE_STATUS_OPTIONS = ["pendiente", "tramitando", "habilitado"] as const;
type ProvinceStatus = typeof PROVINCE_STATUS_OPTIONS[number];

const PROVINCE_BADGE: Record<ProvinceStatus, string> = {
  pendiente: "text-text-3 bg-surface-2 border-border",
  tramitando: "text-warning bg-warning-bg border-warning/30",
  habilitado: "text-success bg-success-bg border-success/30",
};

export default function PractitionerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [patchingProvince, setPatchingProvince] = useState<string | null>(null);
  const [showEraseModal, setShowEraseModal] = useState(false);
  const [erasing, setErasing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getPractitioner(id);
      setPractitioner(data);
    } catch {
      router.push("/prestadores");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await api.approvePractitioner(id);
      await load();
    } finally {
      setApproving(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await api.verifyPractitioner(id);
      await load();
    } finally {
      setVerifying(false);
    }
  };

  const handleErase = async () => {
    setErasing(true);
    try {
      await api.erasePractitioner(id);
      router.push("/prestadores");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al procesar la solicitud");
      setErasing(false);
    }
  };

  const handleProvinceChange = async (provincia: string, estado: ProvinceStatus) => {
    setPatchingProvince(provincia);
    try {
      await api.patchPractitionerProvince(id, provincia, estado);
      await load();
    } finally {
      setPatchingProvince(null);
    }
  };

  const getProvinceStatus = (provincia: string): ProvinceStatus => {
    const found = practitioner?.provinces.find((p) => p.provincia === provincia);
    return (found?.estado as ProvinceStatus) ?? "pendiente";
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Prestador" subtitle="Cargando..." />
        <div className="p-6 flex items-center justify-center py-24">
          <span className="spinner" />
        </div>
      </div>
    );
  }

  if (!practitioner) return null;

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title={`${practitioner.nombre} ${practitioner.apellido}`}
        subtitle={practitioner.especialidad ?? "Sin especialidad registrada"}
      />

      <div className="p-6 max-w-4xl space-y-6 animate-fadeIn">
        <div className="card p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-text text-xl font-semibold">{practitioner.nombre} {practitioner.apellido}</p>
              <p className="text-text-2">{practitioner.especialidad}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={practitioner.estado_matricula} />
              {!practitioner.aprobado && (
                <span className="text-xs px-2 py-0.5 bg-warning-bg border border-warning/30 rounded text-warning">Pendiente aprobación</span>
              )}
            </div>
          </div>

          <hr className="divider-accent" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MonoId value={practitioner.cufp ?? "—"} label="CUFP" />
            <MonoId value={practitioner.matricula_nacional ?? "—"} label="Matrícula Nac." dimmed />
            <MonoId value={practitioner.dni} label="DNI" dimmed />
            <div className="space-y-0.5">
              <p className="text-text-3 text-[10px] uppercase tracking-widest">Verificación</p>
              <StatusBadge status={practitioner.fuente_verificacion === "mock" ? "mock" : "ok"} label={practitioner.fuente_verificacion} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!practitioner.aprobado && (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="btn-primary text-sm px-3 py-1.5 flex items-center gap-2"
              >
                {approving && <span className="spinner" />}
                Aprobar y agregar a cartilla
              </button>
            )}
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-2"
            >
              {verifying && <span className="spinner" />}
              Re-verificar REFEPS
            </button>
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <p className="text-text-3 text-[10px] uppercase tracking-widest mb-3">Derechos Ley 25.326</p>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/prestadores/${id}/consentimientos`}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Ver consentimientos →
              </Link>
              <button
                onClick={() => setShowEraseModal(true)}
                className="text-xs px-3 py-1.5 border border-danger/30 text-danger rounded hover:bg-danger-bg transition-colors"
              >
                Solicitar supresión (Art. 16)
              </button>
            </div>
          </div>
        </div>

        {(practitioner.provincias_habilitadas ?? []).length > 0 && (
          <div className="card p-5 space-y-3">
            <p className="text-text-3 text-[10px] uppercase tracking-widest">Provincias habilitadas (REFEPS)</p>
            <div className="flex flex-wrap gap-2">
              {practitioner.provincias_habilitadas.map((p) => (
                <span key={p} className="text-xs px-2.5 py-1 bg-success-bg border border-success/30 rounded-full text-success">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-text font-semibold text-sm">Tracking de habilitación por provincia</p>
            <p className="text-text-3 text-xs">Gestión manual del proceso de tramitación</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {PROVINCIAS.map((provincia) => {
              const estado = getProvinceStatus(provincia);
              return (
                <div key={provincia} className={`flex items-center justify-between px-3 py-2.5 rounded-md border ${PROVINCE_BADGE[estado]}`}>
                  <span className="text-sm font-medium">{provincia}</span>
                  <select
                    value={estado}
                    onChange={(e) => handleProvinceChange(provincia, e.target.value as ProvinceStatus)}
                    disabled={patchingProvince === provincia}
                    className="bg-transparent text-xs border-none outline-none cursor-pointer"
                  >
                    {PROVINCE_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showEraseModal && (
        <div className="fixed inset-0 bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md space-y-4 animate-fadeIn border-danger/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-danger-bg flex items-center justify-center flex-shrink-0">
                <svg className="text-danger" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h3 className="text-text font-semibold">Confirmar supresión de datos</h3>
            </div>
            <p className="text-text-2 text-sm leading-relaxed">
              Esta acción anonimiza los datos personales del prestador conforme al Art. 16 de la Ley 25.326
              (derecho al olvido). Se preserva el audit trail pero el nombre, DNI y matrícula quedarán como
              <span className="font-mono text-danger"> [ELIMINADO]</span>.
            </p>
            <p className="text-danger text-xs font-medium">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={handleErase}
                disabled={erasing}
                className="flex-1 text-sm py-2 border border-danger/30 text-danger rounded hover:bg-danger-bg transition-colors flex items-center justify-center gap-2"
              >
                {erasing && <span className="spinner" />}
                {erasing ? "Procesando..." : "Confirmar supresión"}
              </button>
              <button
                onClick={() => setShowEraseModal(false)}
                disabled={erasing}
                className="flex-1 btn-secondary text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
