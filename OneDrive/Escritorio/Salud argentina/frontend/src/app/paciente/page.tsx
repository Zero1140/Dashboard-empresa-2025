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
  const [results, setResults] = useState<PatientPrescription[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedDni = dni.trim();
    if (!trimmedDni) return;

    setLoading(true);
    setError("");
    setResults(null);
    setSearched(false);

    try {
      const data = await api.getPatientPrescriptions(trimmedDni);
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
            Ingresá tu DNI para consultar tus recetas electrónicas emitidas.
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              className="input-base flex-1 text-sm"
              placeholder="Ej: 30123456"
              inputMode="numeric"
              maxLength={10}
              required
            />
            <button
              type="submit"
              disabled={loading || !dni.trim()}
              className="btn-primary text-sm whitespace-nowrap flex items-center gap-2"
            >
              {loading && <span className="spinner" />}
              {loading ? "Buscando..." : "Buscar mis recetas"}
            </button>
          </form>
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
            <p className="text-text font-medium">Sin resultados</p>
            <p className="text-text-3 text-sm">No encontramos recetas para este DNI.</p>
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
