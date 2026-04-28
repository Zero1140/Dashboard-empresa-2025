"use client";
import { useEffect, useState, useCallback } from "react";
import TopBar from "@/components/layout/TopBar";
import StatusBadge from "@/components/ui/StatusBadge";
import MonoId from "@/components/ui/MonoId";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import type { Practitioner, PractitionerProfileUpdate } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function matriculaStatusToVariant(estado: string): string {
  if (estado === "vigente") return "activa";
  if (estado === "suspendida") return "suspendida";
  if (estado === "inhabilitada") return "inhabilitada";
  return "desconocido";
}

function matriculaStatusLabel(estado: string): string {
  if (estado === "vigente") return "Vigente";
  if (estado === "suspendida") return "Suspendida";
  if (estado === "inhabilitada") return "Inhabilitada";
  return "Desconocido";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const { addToast } = useToast();

  // ── Data state ─────────────────────────────────────────────────────────────
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ── Form state (editable fields) ───────────────────────────────────────────
  const [nombre, setNombre]                       = useState("");
  const [apellido, setApellido]                   = useState("");
  const [especialidad, setEspecialidad]           = useState("");
  const [matriculaNacional, setMatriculaNacional] = useState("");

  // ── Save state ─────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  // ── Load profile ───────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getMyProfile();
      setPractitioner(data);
      setNombre(data.nombre ?? "");
      setApellido(data.apellido ?? "");
      setEspecialidad(data.especialidad ?? "");
      setMatriculaNacional(data.matricula_nacional ?? "");
    } catch (e) {
      if (e instanceof Error && e.message.includes("404")) {
        setNotFound(true);
      } else {
        addToast("No se pudo cargar el perfil. Intentá de nuevo.", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Dirty detection ────────────────────────────────────────────────────────
  const isDirty =
    practitioner !== null &&
    (nombre !== (practitioner.nombre ?? "") ||
      apellido !== (practitioner.apellido ?? "") ||
      especialidad !== (practitioner.especialidad ?? "") ||
      matriculaNacional !== (practitioner.matricula_nacional ?? ""));

  // ── Save handler ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!practitioner || !isDirty) return;
    setSaving(true);
    try {
      const delta: PractitionerProfileUpdate = {};
      if (nombre !== (practitioner.nombre ?? ""))
        delta.nombre = nombre.trim();
      if (apellido !== (practitioner.apellido ?? ""))
        delta.apellido = apellido.trim();
      if (especialidad !== (practitioner.especialidad ?? ""))
        delta.especialidad = especialidad.trim();
      if (matriculaNacional !== (practitioner.matricula_nacional ?? ""))
        delta.matricula_nacional = matriculaNacional.trim();

      const res = await api.updatePractitionerProfile(practitioner.id, delta);
      addToast(
        res.fields_updated.length > 0
          ? `Perfil actualizado (${res.fields_updated.join(", ")})`
          : "Sin cambios para guardar.",
        "success"
      );
      // Refresh from server so state is canonical
      await load();
    } catch (e) {
      addToast(
        e instanceof Error ? e.message : "Error al guardar los cambios.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Discard changes ────────────────────────────────────────────────────────
  const handleDiscard = () => {
    if (!practitioner) return;
    setNombre(practitioner.nombre ?? "");
    setApellido(practitioner.apellido ?? "");
    setEspecialidad(practitioner.especialidad ?? "");
    setMatriculaNacional(practitioner.matricula_nacional ?? "");
  };

  // ── Render: loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Mi perfil" subtitle="Información de tu cuenta profesional" />
        <div className="p-6 flex items-center justify-center py-24">
          <span className="spinner" />
        </div>
      </div>
    );
  }

  // ── Render: not a practitioner ─────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Mi perfil" subtitle="Información de tu cuenta profesional" />
        <div className="p-6 flex items-center justify-center py-24">
          <div className="card p-8 max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center mx-auto">
              <svg className="text-text-3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <p className="text-text font-semibold">Sin perfil de prestador</p>
            <p className="text-text-3 text-sm leading-relaxed">
              Tu cuenta no tiene un perfil de prestador asociado. Este perfil es solo para profesionales de salud.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: profile ────────────────────────────────────────────────────────
  if (!practitioner) return null;

  const topBarAction = isDirty ? (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-warning-bg text-warning border-warning/30">
        <span className="w-1.5 h-1.5 rounded-full bg-warning flex-shrink-0" />
        Cambios sin guardar
      </span>
      <button
        onClick={handleDiscard}
        disabled={saving}
        className="btn-secondary text-sm px-3 py-2 min-h-[36px]"
      >
        Descartar
      </button>
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary text-sm px-3 py-2 flex items-center gap-1.5 min-h-[36px]"
      >
        {saving ? <span className="spinner" /> : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
        <span>Guardar cambios</span>
      </button>
    </div>
  ) : null;

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Mi perfil"
        subtitle="Información de tu cuenta profesional"
        action={topBarAction}
      />

      <div className="p-4 sm:p-6 space-y-6 animate-fadeIn max-w-2xl">

        {/* ── Section 1: Datos de matrícula (read-only) ─────────────────── */}
        <div className="card p-5 space-y-4">
          <h2 className="text-text-3 text-[10px] uppercase tracking-widest font-medium">
            Datos de matrícula
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
            {/* Estado matrícula */}
            <div className="space-y-1.5">
              <p className="text-text-3 text-[10px] uppercase tracking-widest">Estado matrícula</p>
              <StatusBadge
                status={matriculaStatusToVariant(practitioner.estado_matricula)}
                label={matriculaStatusLabel(practitioner.estado_matricula)}
              />
              <p className="text-text-3 text-[10px] mt-0.5">
                Fuente: {practitioner.fuente_verificacion}
              </p>
            </div>

            {/* CUFP */}
            <div className="space-y-1.5">
              <p className="text-text-3 text-[10px] uppercase tracking-widest">CUFP</p>
              {practitioner.cufp ? (
                <MonoId value={practitioner.cufp} />
              ) : (
                <span className="text-text-3 text-sm">Sin CUFP</span>
              )}
            </div>

            {/* Estado en cartilla */}
            <div className="space-y-1.5">
              <p className="text-text-3 text-[10px] uppercase tracking-widest">Estado en cartilla</p>
              <StatusBadge
                status={practitioner.aprobado ? "activa" : "mock"}
                label={practitioner.aprobado ? "Aprobado" : "Pendiente aprobación"}
              />
            </div>
          </div>

          {/* Provincias habilitadas */}
          {(practitioner.provincias_habilitadas ?? []).length > 0 && (
            <div className="border-t border-border pt-4">
              <p className="text-text-3 text-[10px] uppercase tracking-widest mb-2">
                Provincias habilitadas (REFEPS)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {practitioner.provincias_habilitadas.map((p) => (
                  <span
                    key={p}
                    className="text-[10px] px-2 py-0.5 bg-success-bg border border-success/20 rounded-full text-success"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Section 2: Datos editables ────────────────────────────────── */}
        <div className="card p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-text-3 text-[10px] uppercase tracking-widest font-medium">
              Datos personales
            </h2>
            {isDirty && (
              <span className="sm:hidden inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-warning-bg text-warning border border-warning/30">
                <span className="w-1 h-1 rounded-full bg-warning flex-shrink-0" />
                Sin guardar
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="space-y-1.5">
              <label className="text-text-3 text-[10px] uppercase tracking-widest block" htmlFor="nombre">
                Nombre
              </label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="input-base w-full"
                placeholder="Tu nombre"
                autoComplete="given-name"
              />
            </div>

            {/* Apellido */}
            <div className="space-y-1.5">
              <label className="text-text-3 text-[10px] uppercase tracking-widest block" htmlFor="apellido">
                Apellido
              </label>
              <input
                id="apellido"
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className="input-base w-full"
                placeholder="Tu apellido"
                autoComplete="family-name"
              />
            </div>

            {/* Especialidad */}
            <div className="space-y-1.5">
              <label className="text-text-3 text-[10px] uppercase tracking-widest block" htmlFor="especialidad">
                Especialidad
              </label>
              <input
                id="especialidad"
                type="text"
                value={especialidad}
                onChange={(e) => setEspecialidad(e.target.value)}
                className="input-base w-full"
                placeholder="Ej: Medicina General"
              />
            </div>

            {/* Matrícula nacional */}
            <div className="space-y-1.5">
              <label className="text-text-3 text-[10px] uppercase tracking-widest block" htmlFor="matricula_nacional">
                Matrícula nacional
              </label>
              <input
                id="matricula_nacional"
                type="text"
                value={matriculaNacional}
                onChange={(e) => setMatriculaNacional(e.target.value)}
                className="input-base w-full font-mono"
                placeholder="Número de matrícula"
                autoComplete="off"
              />
              <p className="text-text-3 text-[10px]">
                El cambio queda registrado en el audit trail (Art. 16 Ley 25.326).
              </p>
            </div>
          </div>

          {/* Save actions (inline, visible on mobile) */}
          <div className="pt-2 flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="spinner" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
            {isDirty && (
              <button
                onClick={handleDiscard}
                disabled={saving}
                className="btn-secondary text-sm px-4 py-2.5"
              >
                Descartar
              </button>
            )}
            {!isDirty && !saving && (
              <span className="text-text-3 text-xs">No hay cambios pendientes.</span>
            )}
          </div>
        </div>

        {/* ── Section 3: Info card ──────────────────────────────────────── */}
        <div className="card p-4 flex items-start gap-3 border-border bg-surface-2/30">
          <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="text-text-3" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div className="space-y-0.5">
            <p className="text-text-2 text-xs font-medium">Datos no editables en este formulario</p>
            <p className="text-text-3 text-xs leading-relaxed">
              El DNI y la CUFP son asignados por REFEPS y no pueden modificarse desde aquí.
              Para correcciones de matrícula contactá a tu administrador de red.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
