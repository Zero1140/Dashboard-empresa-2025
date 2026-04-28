"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import StatusBadge from "@/components/ui/StatusBadge";
import MonoId from "@/components/ui/MonoId";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import type { Practitioner, ConsentEvent } from "@/lib/types";
import ConfirmModal from "@/components/ui/ConfirmModal";

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

const PROVINCE_STATUS_LABELS: Record<ProvinceStatus, string> = {
  pendiente:  "Pendiente",
  tramitando: "En trámite",
  habilitado: "Habilitado",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  accepted: { label: "Aceptó términos",        color: "text-success" },
  revoked:  { label: "Revocó consentimiento",  color: "text-warning" },
};

export default function PractitionerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();

  const [practitioner, setPractitioner]   = useState<Practitioner | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(false);

  const [approving, setApproving]         = useState(false);
  const [verifying, setVerifying]         = useState(false);
  const [verifyResult, setVerifyResult]   = useState<{ verificado: boolean; estado_matricula: string } | null>(null);

  const [patchingProvince, setPatchingProvince]   = useState<string | null>(null);
  const [provinceSuccess, setProvinceSuccess]     = useState<string | null>(null);

  const [showEraseConfirm, setShowEraseConfirm]   = useState(false);
  const [erasing, setErasing]                     = useState(false);

  const [consentOpen, setConsentOpen]     = useState(false);
  const [consentEvents, setConsentEvents] = useState<ConsentEvent[]>([]);
  const [consentLoading, setConsentLoading] = useState(false);

  // ── Data loading ───────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const data = await api.getPractitioner(id);
      setPractitioner(data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const loadConsentHistory = useCallback(async () => {
    setConsentLoading(true);
    try {
      const data = await api.getConsentHistory(id);
      setConsentEvents(data);
    } catch {
      setConsentEvents([]);
    } finally {
      setConsentLoading(false);
    }
  }, [id]);

  const handleToggleConsent = () => {
    if (!consentOpen && consentEvents.length === 0) {
      loadConsentHistory();
    }
    setConsentOpen((prev) => !prev);
  };

  // ── Actions ────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    setApproving(true);
    try {
      await api.approvePractitioner(id);
      addToast("Prestador aprobado y agregado a la cartilla.", "success");
      await load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Error al aprobar el prestador.", "error");
    } finally {
      setApproving(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await api.verifyPractitioner(id);
      setVerifyResult(result);
      addToast(
        result.verificado
          ? `Verificado — Estado: ${result.estado_matricula}`
          : "Matrícula no encontrada en REFEPS.",
        result.verificado ? "success" : "error"
      );
      await load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Error al verificar en REFEPS.", "error");
    } finally {
      setVerifying(false);
    }
  };

  const handleErase = async () => {
    setErasing(true);
    try {
      await api.erasePractitioner(id);
      addToast("Datos suprimidos conforme al Art. 16 de la Ley 25.326.", "success");
      router.push("/prestadores");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Error al procesar la supresión.", "error");
      setErasing(false);
    }
  };

  const handleProvinceChange = async (provincia: string, estado: ProvinceStatus) => {
    setPatchingProvince(provincia);
    try {
      await api.patchPractitionerProvince(id, provincia, estado);
      setProvinceSuccess(provincia);
      setTimeout(() => setProvinceSuccess(null), 1500);
      await load();
    } catch (e) {
      addToast(e instanceof Error ? e.message : "Error al actualizar la provincia.", "error");
    } finally {
      setPatchingProvince(null);
    }
  };

  const getProvinceStatus = (provincia: string): ProvinceStatus => {
    const found = practitioner?.provinces.find((p) => p.provincia === provincia);
    return (found?.estado as ProvinceStatus) ?? "pendiente";
  };

  // ── Back button (shared) ───────────────────────────────────────────────
  const BackButton = () => (
    <div className="px-4 pt-3 pb-0">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-text-3 hover:text-text text-sm transition-colors mb-1"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        ← Médicos
      </button>
    </div>
  );

  // ── Render: loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <BackButton />
        <TopBar title="Prestador" subtitle="Cargando..." />
        <div className="p-6 flex items-center justify-center py-24">
          <span className="spinner" />
        </div>
      </div>
    );
  }

  // ── Render: error ──────────────────────────────────────────────────────
  if (error || !practitioner) {
    return (
      <div className="flex flex-col min-h-screen">
        <BackButton />
        <TopBar title="Prestador no encontrado" />
        <div className="p-6 flex items-center justify-center py-24">
          <div className="card p-8 max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-danger-bg flex items-center justify-center mx-auto">
              <svg className="text-danger" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p className="text-text font-semibold">No se encontró el prestador.</p>
            <p className="text-text-3 text-sm">El ID solicitado no existe o no tenés acceso a este recurso.</p>
            <Link href="/prestadores" className="btn-secondary text-sm inline-block">
              ← Volver a la cartilla
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: detail ─────────────────────────────────────────────────────
  const habilitadasCount = PROVINCIAS.filter((p) => getProvinceStatus(p) === "habilitado").length;

  const topBarAction = (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      {!practitioner.aprobado && (
        <button
          onClick={handleApprove}
          disabled={approving}
          className="btn-primary text-sm px-3 py-2 flex items-center gap-1.5 min-h-[36px]"
        >
          {approving ? <span className="spinner" /> : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
          <span className="hidden sm:inline">Aprobar</span>
        </button>
      )}
      <button
        onClick={handleVerify}
        disabled={verifying}
        className="btn-secondary text-sm px-3 py-2 flex items-center gap-1.5 min-h-[36px]"
      >
        {verifying ? <span className="spinner" /> : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        )}
        <span className="hidden sm:inline">Re-verificar REFEPS</span>
        <span className="sm:hidden">REFEPS</span>
      </button>
      <button
        onClick={() => setShowEraseConfirm(true)}
        className="btn-secondary text-sm px-3 py-2 flex items-center gap-1.5 min-h-[36px] text-danger border-danger/30 hover:bg-danger-bg"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14H6L5 6"/>
          <path d="M10 11v6M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
        <span className="hidden sm:inline">Solicitar supresión</span>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <BackButton />
      <TopBar
        title={`${practitioner.apellido}, ${practitioner.nombre}`}
        subtitle={practitioner.especialidad ?? "Sin especialidad registrada"}
        action={topBarAction}
      />

      <div className="p-4 sm:p-6 space-y-6 animate-fadeIn max-w-4xl">

        {/* ── Section 1: Datos básicos ──────────────────────────────── */}
        <div className="card p-5 space-y-4">
          <h2 className="text-text-3 text-[10px] uppercase tracking-widest font-medium">Datos del prestador</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
            {/* DNI */}
            <div className="space-y-1">
              <p className="text-text-3 text-[10px] uppercase tracking-widest">DNI</p>
              <MonoId value={practitioner.dni} />
            </div>

            {/* CUFP */}
            <div className="space-y-1">
              <p className="text-text-3 text-[10px] uppercase tracking-widest">CUFP</p>
              {practitioner.cufp ? <MonoId value={practitioner.cufp} /> : <span className="text-text-3 text-sm">Sin CUFP</span>}
            </div>

            {/* Matrícula nacional */}
            <div className="space-y-1">
              <p className="text-text-3 text-[10px] uppercase tracking-widest">Matrícula Nac.</p>
              {practitioner.matricula_nacional
                ? <MonoId value={practitioner.matricula_nacional} dimmed />
                : <span className="text-text-3 text-sm">—</span>
              }
            </div>

            {/* Estado matrícula */}
            <div className="space-y-1">
              <p className="text-text-3 text-[10px] uppercase tracking-widest">Estado matrícula</p>
              <StatusBadge
                status={
                  practitioner.estado_matricula === "vigente" ? "activa" :
                  practitioner.estado_matricula === "suspendida" ? "suspendida" :
                  practitioner.estado_matricula === "inhabilitada" ? "mock" :
                  "desconocido"
                }
                label={
                  practitioner.estado_matricula === "vigente" ? "Vigente" :
                  practitioner.estado_matricula === "suspendida" ? "Suspendida" :
                  practitioner.estado_matricula === "inhabilitada" ? "Inhabilitada" :
                  "Desconocido"
                }
              />
              <p className="text-text-3 text-[10px] mt-1">Fuente: {practitioner.fuente_verificacion}</p>
            </div>

            {/* Aprobado */}
            <div className="space-y-1">
              <p className="text-text-3 text-[10px] uppercase tracking-widest">Estado en cartilla</p>
              <StatusBadge
                status={practitioner.aprobado ? "activa" : "mock"}
                label={practitioner.aprobado ? "Aprobado" : "Pendiente"}
              />
            </div>
          </div>

          {/* REFEPS habilitadas (informativo) */}
          {(practitioner.provincias_habilitadas ?? []).length > 0 && (
            <div className="border-t border-border pt-4">
              <p className="text-text-3 text-[10px] uppercase tracking-widest mb-2">Provincias habilitadas en REFEPS</p>
              <div className="flex flex-wrap gap-1.5">
                {practitioner.provincias_habilitadas.map((p) => (
                  <span key={p} className="text-[10px] px-2 py-0.5 bg-success-bg border border-success/20 rounded-full text-success">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Verify result card ─────────────────────────────────────── */}
        {verifyResult && (
          <div className={`card p-4 animate-fadeIn flex items-start gap-3 ${
            verifyResult.verificado ? "border-success/20 bg-success-bg/30" : "border-danger/20 bg-danger-bg/30"
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              verifyResult.verificado ? "bg-success-bg" : "bg-danger-bg"
            }`}>
              {verifyResult.verificado ? (
                <svg className="text-success" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg className="text-danger" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              )}
            </div>
            <div>
              <p className={`text-sm font-semibold ${verifyResult.verificado ? "text-success" : "text-danger"}`}>
                {verifyResult.verificado ? "Verificado en REFEPS" : "No encontrado en REFEPS"}
              </p>
              <p className="text-text-2 text-xs mt-0.5">
                Estado: <span className="font-medium">{verifyResult.estado_matricula}</span>
              </p>
            </div>
            <button
              onClick={() => setVerifyResult(null)}
              className="ml-auto text-text-3 hover:text-text transition-colors p-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        {/* ── Section 2: Habilitación provincial ───────────────────── */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-text font-semibold text-sm">Habilitación provincial</h2>
            <p className="text-text-3 text-xs">{habilitadasCount}/24 habilitadas</p>
          </div>

          {/* Desktop: geographic map + legend */}
          <div className="hidden sm:block space-y-3">
            {/* Legend */}
            <div className="flex gap-4 text-xs">
              {(["pendiente", "tramitando", "habilitado"] as ProvinceStatus[]).map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-sm ${
                    s === "habilitado" ? "bg-success/60" :
                    s === "tramitando" ? "bg-warning/60" :
                    "bg-surface-2 border border-border"
                  }`} />
                  <span className="text-text-3">{PROVINCE_STATUS_LABELS[s]}</span>
                </div>
              ))}
              <p className="text-text-3 text-[10px] ml-auto mt-0.5">Clic en celda para cambiar estado</p>
            </div>

            {/* Geographic grid */}
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: "repeat(8, 1fr)", gridTemplateRows: "repeat(9, auto)" }}
            >
              {PROVINCE_MAP.map(({ name, abbr, col, row }) => {
                const estado = getProvinceStatus(name);
                const isPatching = patchingProvince === name;
                const isSuccess = provinceSuccess === name;
                return (
                  <div
                    key={name}
                    title={name}
                    style={{ gridColumn: col, gridRow: row }}
                    className={`relative group rounded p-1 transition-all cursor-pointer border ${
                      isSuccess
                        ? "bg-success/30 border-success/50"
                        : estado === "habilitado"
                        ? "bg-success/15 border-success/30 hover:bg-success/25"
                        : estado === "tramitando"
                        ? "bg-warning/15 border-warning/30 hover:bg-warning/25"
                        : "bg-surface-2 border-border hover:bg-surface"
                    }`}
                  >
                    {isSuccess ? (
                      <svg className="text-success mx-auto" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      <p className={`text-[9px] font-mono font-medium text-center leading-none ${
                        isPatching ? "opacity-40" :
                        estado === "habilitado" ? "text-success" :
                        estado === "tramitando" ? "text-warning" :
                        "text-text-3"
                      }`}>
                        {isPatching ? "…" : abbr}
                      </p>
                    )}

                    {/* Hover tooltip with select */}
                    {!isPatching && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 hidden group-hover:block">
                        <div className="bg-surface border border-border rounded px-2 py-1.5 shadow-xl min-w-max space-y-1">
                          <p className="text-text text-xs font-medium">{name}</p>
                          <select
                            value={estado}
                            onChange={(e) => handleProvinceChange(name, e.target.value as ProvinceStatus)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-surface-2 text-text-2 text-xs border border-border rounded px-1.5 py-0.5 w-full"
                          >
                            {PROVINCE_STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>{PROVINCE_STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile: list with dropdowns */}
          <div className="sm:hidden grid grid-cols-2 gap-2">
            {PROVINCIAS.map((prov) => {
              const estado = getProvinceStatus(prov);
              const isPatching = patchingProvince === prov;
              const isSuccess = provinceSuccess === prov;
              return (
                <div
                  key={prov}
                  className={`rounded border p-2 transition-all ${
                    isSuccess
                      ? "border-success/50 bg-success/10"
                      : estado === "habilitado"
                      ? "border-success/20 bg-success-bg/30"
                      : estado === "tramitando"
                      ? "border-warning/20 bg-warning/5"
                      : "border-border bg-surface-2"
                  }`}
                >
                  <p className="text-text-2 text-[10px] font-medium truncate mb-1">{prov}</p>
                  {isSuccess ? (
                    <div className="flex items-center gap-1">
                      <svg className="text-success" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span className="text-success text-[10px]">Guardado</span>
                    </div>
                  ) : (
                    <select
                      value={estado}
                      onChange={(e) => handleProvinceChange(prov, e.target.value as ProvinceStatus)}
                      disabled={isPatching}
                      className="bg-transparent text-text-3 text-[10px] border border-border rounded px-1 py-0.5 w-full disabled:opacity-40"
                    >
                      {PROVINCE_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{PROVINCE_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Section 3: Historial de consentimiento (collapsible) ── */}
        <div className="card overflow-hidden">
          <button
            onClick={handleToggleConsent}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-2/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg
                className={`text-text-3 transition-transform ${consentOpen ? "rotate-90" : ""}`}
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              <span className="text-text text-sm font-medium">Historial de consentimiento</span>
              {consentEvents.length > 0 && (
                <span className="text-text-3 text-xs">({consentEvents.length})</span>
              )}
            </div>
            <Link
              href={`/prestadores/${id}/consentimientos`}
              onClick={(e) => e.stopPropagation()}
              className="text-text-3 hover:text-accent text-xs transition-colors flex items-center gap-1"
            >
              Ver completo →
            </Link>
          </button>

          {consentOpen && (
            <div className="border-t border-border animate-fadeIn">
              {consentLoading ? (
                <div className="py-8 text-center"><span className="spinner" /></div>
              ) : consentEvents.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-text-3 text-sm">Sin eventos de consentimiento registrados.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-surface-2">
                        <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-5 py-3 font-medium">Fecha y hora</th>
                        <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium">Acción</th>
                        <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium">Versión TOS</th>
                        <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium hidden md:table-cell">IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {consentEvents.map((e) => (
                        <tr key={e.id} className="hover:bg-surface-2/50 transition-colors">
                          <td className="px-5 py-3 text-text-2 text-sm">{formatDate(e.recorded_at)}</td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-medium ${(ACTION_LABELS[e.action] ?? { color: "text-text-2" }).color}`}>
                              {ACTION_LABELS[e.action]?.label ?? e.action}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono text-text-3">v{e.tos_version}</span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-xs font-mono text-text-3">{e.ip_address ?? "—"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={showEraseConfirm}
        title="Suprimir datos del médico"
        description="Todos los datos personales de este médico serán eliminados conforme al Art. 16 de la Ley 25.326 (derecho de supresión). Los registros del audit log se conservan. Esta acción es irreversible."
        confirmLabel="Suprimir datos"
        danger
        loading={erasing}
        onConfirm={handleErase}
        onCancel={() => setShowEraseConfirm(false)}
      />
    </div>
  );
}
