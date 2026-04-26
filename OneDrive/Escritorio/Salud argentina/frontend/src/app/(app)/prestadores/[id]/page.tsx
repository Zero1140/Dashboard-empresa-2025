"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

  const load = async () => {
    try {
      const data = await api.getPractitioner(id);
      setPractitioner(data);
    } catch {
      router.push("/prestadores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

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
    </div>
  );
}
