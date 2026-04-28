"use client";
import { useState } from "react";
import TopBar from "@/components/layout/TopBar";
import StatusBadge from "@/components/ui/StatusBadge";
import MonoId from "@/components/ui/MonoId";
import { Tooltip } from "@/components/ui/Tooltip";
import { GLOSARIO } from "@/data/glosario";
import { api } from "@/lib/api";
import type { CredentialResult } from "@/lib/types";

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("422") || msg.includes("Unprocessable"))
    return "Revisá los datos ingresados. Verificá que el DNI o número de afiliado sean correctos.";
  if (msg.includes("404") || msg.includes("not found") || msg.includes("no encontrado"))
    return "No encontramos resultados para los datos ingresados. Verificá y volvé a intentar.";
  if (msg.includes("401") || msg.includes("403") || msg.includes("Unauthorized") || msg.includes("Forbidden"))
    return "Tu sesión expiró. Iniciá sesión nuevamente.";
  if (msg.includes("500") || msg.includes("Internal"))
    return "Hubo un error en el servidor. Intentá nuevamente en unos minutos.";
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("Failed to fetch"))
    return "No se pudo conectar al servidor. Verificá tu conexión a internet.";
  return "Ocurrió un error inesperado. Intentá nuevamente.";
}

type SearchMode = "dni" | "matricula" | "cufp";

// Datos de prueba para el modo mock
const MOCK_EXAMPLES = [
  { label: "Médica — vigente", dni: "12345678", matricula: "MN-98765", cufp: "CUFP-00001234" },
  { label: "Cardiólogo — vigente", dni: "98765432", matricula: "MN-11223", cufp: "CUFP-00005678" },
  { label: "Pediatra — suspendida", dni: "11111111", matricula: "MN-44556", cufp: "CUFP-00009999" },
];

export default function CredencialesPage() {
  const [mode, setMode] = useState<SearchMode>("dni");
  const [value, setValue] = useState("");
  const [includeFhir, setIncludeFhir] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CredentialResult | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const res = await api.verifyCredential({
        [mode]: value.trim(),
        include_fhir: includeFhir,
      });
      setResult(res);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const fillExample = (ex: typeof MOCK_EXAMPLES[0]) => {
    const val = mode === "dni" ? ex.dni : mode === "matricula" ? ex.matricula : ex.cufp;
    setValue(val);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Credencialización"
        subtitle="Motor OpenLoop — verificación de matrículas contra REFEPS/SISA"
      />

      <div className="p-6 max-w-3xl space-y-6 animate-fadeIn">
        {/* Info banner */}
        <div className="card p-4 border-accent/20 bg-accent-glow flex items-start gap-3">
          <svg className="text-accent mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div className="text-xs space-y-1">
            <p className="text-accent font-medium">Motor OpenLoop — Credencialización multi-jurisdicción</p>
            <p className="text-text-2">
              Verifica matrículas en las 24 provincias vía{" "}
              <Tooltip content={GLOSARIO.REFEPS}><span className="underline decoration-dotted cursor-help">REFEPS</span></Tooltip>/{" "}
              <Tooltip content={GLOSARIO.SISA}><span className="underline decoration-dotted cursor-help">SISA</span></Tooltip>.
              {" "}Devuelve{" "}
              <Tooltip content={GLOSARIO.CUFP}><span className="underline decoration-dotted cursor-help">CUFP</span></Tooltip>,
              {" "}estado, provincias habilitadas y recurso FHIR R4.
              El sistema está en <span className="font-mono">MOCK MODE</span> — las búsquedas usan datos de prueba.
            </p>
          </div>
        </div>

        {/* Formulario */}
        <div className="card p-5 space-y-4">
          <h2 className="text-text font-semibold text-sm">Buscar profesional</h2>

          {/* Selector de modo */}
          <div className="flex gap-1 p-1 bg-base rounded-md w-fit">
            {(["dni", "matricula", "cufp"] as SearchMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setValue(""); }}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  mode === m
                    ? "bg-surface-2 text-text border border-border-bright"
                    : "text-text-3 hover:text-text-2"
                }`}
              >
                {m === "dni" ? "DNI" : m === "matricula" ? "Matrícula" : (
                  <Tooltip content={GLOSARIO.CUFP}><span className="underline decoration-dotted cursor-help">CUFP</span></Tooltip>
                )}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="space-y-3">
            <div>
              <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">
                {mode === "dni" ? "Número de DNI" : mode === "matricula" ? "Matrícula Nacional" : (
                  <Tooltip content={GLOSARIO.CUFP}><span className="underline decoration-dotted cursor-help">CUFP</span></Tooltip>
                )}
              </label>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="input-base font-mono"
                placeholder={
                  mode === "dni" ? "Ej: 12345678" :
                  mode === "matricula" ? "Ej: MN-98765" :
                  "Ej: CUFP-00001234"
                }
                required
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeFhir}
                onChange={(e) => setIncludeFhir(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              <span className="text-text-2 text-xs">Incluir recurso FHIR R4 completo en la respuesta</span>
            </label>

            <button type="submit" disabled={loading || !value.trim()} className="btn-primary flex items-center gap-2">
              {loading && <span className="spinner" />}
              {loading ? <>Verificando contra <Tooltip content={GLOSARIO.REFEPS}><span className="underline decoration-dotted cursor-help">REFEPS</span></Tooltip>...</> : "Verificar matrícula"}
            </button>
          </form>

          {/* Ejemplos mock */}
          <div>
            <p className="text-text-3 text-[10px] uppercase tracking-widest mb-2">Datos de prueba (mock)</p>
            <div className="flex flex-wrap gap-2">
              {MOCK_EXAMPLES.map((ex) => (
                <button
                  key={ex.dni}
                  onClick={() => fillExample(ex)}
                  className="text-xs px-2.5 py-1 border border-border rounded-md text-text-2 hover:border-border-bright hover:text-text transition-all"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-danger bg-danger-bg p-4 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div className="animate-fadeIn space-y-4">
            {/* Header del resultado */}
            <div className="card p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  {result.found ? (
                    <>
                      <p className="text-text text-lg font-semibold">{result.nombre_completo ?? "Nombre no disponible"}</p>
                      <p className="text-text-2 text-sm">{result.especialidad ?? "Especialidad no registrada"}</p>
                    </>
                  ) : (
                    <p className="text-text-2 text-sm">Profesional no encontrado en <Tooltip content={GLOSARIO.REFEPS}><span className="underline decoration-dotted cursor-help">REFEPS</span></Tooltip></p>
                  )}
                </div>
                {result.found && result.estado_matricula && (
                  <StatusBadge status={result.estado_matricula} />
                )}
                {!result.found && <StatusBadge status="desconocido" label="No encontrado" />}
              </div>

              {result.found && (
                <>
                  <hr className="divider-accent" />

                  {/* IDs médicos — el anchor visual */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <MonoId value={result.cufp} label="CUFP" />
                    <div className="space-y-0.5">
                      <p className="text-text-3 text-[10px] uppercase tracking-widest">Fuente</p>
                      <StatusBadge status={result.fuente === "mock" ? "mock" : "ok"} label={result.fuente} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-text-3 text-[10px] uppercase tracking-widest">
                        <Tooltip content={GLOSARIO.PMO}><span className="underline decoration-dotted cursor-help">PMO</span></Tooltip>
                      </p>
                      <StatusBadge status={result.estado_matricula === "vigente" ? "activa" : "suspendida"} label="Prescripción" />
                    </div>
                  </div>

                  {/* Provincias habilitadas */}
                  {result.provincias_habilitadas.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-text-3 text-[10px] uppercase tracking-widest">Provincias habilitadas</p>
                      <div className="flex flex-wrap gap-2">
                        {result.provincias_habilitadas.map((p) => (
                          <span key={p} className="text-xs px-2.5 py-1 bg-surface-2 border border-border rounded-full text-text-2">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* FHIR R4 Resource */}
            {result.fhir_resource && (
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-accent text-xs font-medium font-mono">FHIR R4</span>
                  <span className="text-text-3 text-xs">Practitioner Resource</span>
                </div>
                <pre className="text-text-2 text-xs font-mono bg-base rounded-md p-3 overflow-x-auto border border-border">
                  {JSON.stringify(result.fhir_resource, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
