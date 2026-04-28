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

// Geographic schematic map: col (1-8), row (1-9) — shape of Argentina, N top, S bottom
const PROVINCE_MAP: { name: string; abbr: string; col: number; row: number }[] = [
  { name: "Jujuy",               abbr: "JJY", col: 4, row: 1 },
  { name: "Salta",               abbr: "SAL", col: 5, row: 1 },
  { name: "Formosa",             abbr: "FOR", col: 6, row: 1 },
  { name: "Chaco",               abbr: "CHA", col: 7, row: 1 },
  { name: "Misiones",            abbr: "MIS", col: 8, row: 1 },
  { name: "Tucumán",             abbr: "TUC", col: 4, row: 2 },
  { name: "Santiago del Estero", abbr: "SGO", col: 5, row: 2 },
  { name: "Corrientes",          abbr: "COR", col: 7, row: 2 },
  { name: "Entre Ríos",          abbr: "ERÍ", col: 8, row: 2 },
  { name: "Catamarca",           abbr: "CAT", col: 3, row: 3 },
  { name: "La Rioja",            abbr: "LRJ", col: 4, row: 3 },
  { name: "Córdoba",             abbr: "CBA", col: 5, row: 3 },
  { name: "Santa Fe",            abbr: "SFE", col: 6, row: 3 },
  { name: "CABA",                abbr: "CAB", col: 7, row: 3 },
  { name: "Buenos Aires",        abbr: "BAS", col: 8, row: 3 },
  { name: "San Juan",            abbr: "SJN", col: 2, row: 4 },
  { name: "San Luis",            abbr: "SLU", col: 3, row: 4 },
  { name: "La Pampa",            abbr: "LPA", col: 5, row: 4 },
  { name: "Mendoza",             abbr: "MDZ", col: 2, row: 5 },
  { name: "Neuquén",             abbr: "NQN", col: 3, row: 5 },
  { name: "Río Negro",           abbr: "RNG", col: 4, row: 5 },
  { name: "Chubut",              abbr: "CHU", col: 3, row: 6 },
  { name: "Santa Cruz",          abbr: "SCZ", col: 3, row: 7 },
  { name: "Tierra del Fuego",    abbr: "TDF", col: 2, row: 8 },
];

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

        {/* Province schematic map */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-text font-semibold text-sm">Habilitación por provincia</p>
            <p className="text-text-3 text-xs">
              {PROVINCE_MAP.filter((p) => getProvinceStatus(p.name) === "habilitado").length}/24 habilitadas
            </p>
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs">
            {(["pendiente", "tramitando", "habilitado"] as ProvinceStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${
                  s === "habilitado" ? "bg-success/60" :
                  s === "tramitando" ? "bg-warning/60" :
                  "bg-surface-2 border border-border"
                }`} />
                <span className="text-text-3 capitalize">{s}</span>
              </div>
            ))}
          </div>

          {/* Geographic grid */}
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: "repeat(8, 1fr)", gridTemplateRows: "repeat(9, auto)" }}
          >
            {PROVINCE_MAP.map(({ name, abbr, col, row }) => {
              const estado = getProvinceStatus(name);
              return (
                <div
                  key={name}
                  title={name}
                  style={{ gridColumn: col, gridRow: row }}
                  className={`relative group rounded p-1 transition-all cursor-pointer border ${
                    estado === "habilitado"
                      ? "bg-success/15 border-success/30 hover:bg-success/25"
                      : estado === "tramitando"
                      ? "bg-warning/15 border-warning/30 hover:bg-warning/25"
                      : "bg-surface-2 border-border hover:bg-surface"
                  }`}
                >
                  <p className={`text-[9px] font-mono font-medium text-center leading-none ${
                    estado === "habilitado" ? "text-success" :
                    estado === "tramitando" ? "text-warning" :
                    "text-text-3"
                  }`}>
                    {abbr}
                  </p>

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 hidden group-hover:block">
                    <div className="bg-surface border border-border rounded px-2 py-1.5 shadow-lg min-w-max space-y-1">
                      <p className="text-text text-xs font-medium">{name}</p>
                      <select
                        value={estado}
                        onChange={(e) => handleProvinceChange(name, e.target.value as ProvinceStatus)}
                        disabled={patchingProvince === name}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-surface-2 text-text-2 text-xs border border-border rounded px-1.5 py-0.5 w-full"
                      >
                        {PROVINCE_STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
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
