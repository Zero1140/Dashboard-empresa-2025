"use client";
import { useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import { api } from "@/lib/api";
import type { PatientPrescription } from "@/lib/types";

const ESTADO_BADGE_MAP: Record<string, string> = {
  activa: "activa",
  dispensada: "ok",
  anulada: "suspendida",
  vencida: "mock",
};

export default function PatientPortalPage() {
  const [dni, setDni] = useState("");
  const [nombre, setNombre] = useState("");
  const [dniError, setDniError] = useState("");
  const [nombreError, setNombreError] = useState("");
  const [results, setResults] = useState<PatientPrescription[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    let valid = true;
    const trimmedDni = dni.trim();
    const trimmedNombre = nombre.trim();

    if (!/^\d{7,8}$/.test(trimmedDni)) {
      setDniError("El DNI debe tener 7 u 8 dígitos.");
      valid = false;
    } else {
      setDniError("");
    }

    if (trimmedNombre.length < 2) {
      setNombreError("Ingresá al menos 2 letras de tu nombre.");
      valid = false;
    } else {
      setNombreError("");
    }

    if (!valid) return;

    setLoading(true);
    setError("");
    setResults(null);
    setSearched(false);

    try {
      const data = await api.getPatientPrescriptions(trimmedDni, trimmedNombre);
      setResults(data);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo consultar las recetas.");
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3">
        <div className="w-7 h-7 rounded bg-accent flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#080C18" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-text font-semibold text-sm">SaludOS Argentina</p>
          <p className="text-text-3 text-[10px] uppercase tracking-widest">Portal del Paciente</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-6 gap-6">
        {/* Search form */}
        <div className="card p-6 w-full max-w-md mt-6">
          <h1 className="text-text font-semibold text-base mb-1">Mis recetas</h1>
          <p className="text-text-3 text-sm mb-5">
            Ingresá tu DNI y nombre para consultar tus recetas electrónicas emitidas.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Nombre field */}
            <div>
              <label className="block text-text-3 text-xs uppercase tracking-widest mb-1">
                Tu nombre
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => { setNombre(e.target.value); setNombreError(""); }}
                className={`input-base w-full text-sm${nombreError ? " border-danger" : ""}`}
                placeholder="Ej: María"
                minLength={2}
                required
                autoComplete="given-name"
              />
              {nombreError && (
                <p className="text-danger text-xs mt-1">{nombreError}</p>
              )}
            </div>

            {/* DNI field */}
            <div>
              <label className="block text-text-3 text-xs uppercase tracking-widest mb-1">
                DNI
              </label>
              <input
                type="text"
                value={dni}
                onChange={(e) => { setDni(e.target.value); setDniError(""); }}
                className={`input-base w-full text-sm${dniError ? " border-danger" : ""}`}
                placeholder="Ej: 30123456"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={8}
                required
              />
              {dniError && (
                <p className="text-danger text-xs mt-1">{dniError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !dni.trim() || !nombre.trim()}
              className="btn-primary text-sm flex items-center justify-center gap-2 mt-1"
            >
              {loading && <span className="spinner" />}
              {loading ? "Buscando..." : "Buscar mis recetas"}
            </button>
          </form>

          {/* Privacy notice */}
          <p className="text-text-3 text-[10px] mt-4 leading-relaxed">
            Tu nombre se usa solo para verificar tu identidad. No se almacena. Ley 25.326.
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="card p-5 w-full max-w-md border border-danger/20 bg-danger-bg text-center">
            <p className="text-danger text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {searched && !error && results && results.length === 0 && (
          <div className="card p-8 w-full max-w-md text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-text-3">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <p className="text-text-2 text-sm font-medium">No encontramos recetas</p>
            <p className="text-text-3 text-xs leading-relaxed">
              Verificá que el DNI y nombre estén escritos correctamente.<br/>
              Si creés que hay un error, consultá con tu médico o la farmacia.
            </p>
          </div>
        )}

        {/* Results */}
        {results && results.length > 0 && (
          <div className="w-full max-w-2xl space-y-3">
            <p className="text-text-3 text-xs uppercase tracking-widest px-1">
              {results.length} receta{results.length !== 1 ? "s" : ""} encontrada{results.length !== 1 ? "s" : ""}
            </p>
            {results.map((rx) => (
              <div key={rx.cuir} className="card p-5 space-y-3">
                {/* Medication name */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-text font-semibold">
                      {rx.medicamento_nombre || "Medicamento no especificado"}
                    </p>
                    {rx.posologia && (
                      <p className="text-text-2 text-sm mt-0.5">{rx.posologia}</p>
                    )}
                  </div>
                  <StatusBadge
                    status={ESTADO_BADGE_MAP[rx.estado] ?? "desconocido"}
                    label={rx.estado.charAt(0).toUpperCase() + rx.estado.slice(1)}
                  />
                </div>

                <hr className="divider-accent" />

                <div className="flex items-center justify-between gap-4 flex-wrap">
                  {/* CUIR */}
                  <div>
                    <p className="text-text-3 text-[10px] uppercase tracking-widest mb-0.5">CUIR</p>
                    <p className="text-text-3 text-xs font-mono">{rx.cuir}</p>
                  </div>

                  {/* Vencimiento */}
                  {rx.fecha_vencimiento && (
                    <div>
                      <p className="text-text-3 text-[10px] uppercase tracking-widest mb-0.5">Vence</p>
                      <p className="text-text-2 text-xs">
                        {new Date(rx.fecha_vencimiento).toLocaleDateString("es-AR")}
                      </p>
                    </div>
                  )}

                  {/* Link */}
                  <Link
                    href={`/recetas/${rx.cuir}`}
                    className="text-accent text-sm font-medium hover:underline ml-auto"
                  >
                    Ver receta →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border px-6 py-4 text-center">
        <p className="text-text-3 text-[10px]">
          SaludOS Argentina · Ley 27.553 · Decreto 98/2023
        </p>
      </footer>
    </div>
  );
}
