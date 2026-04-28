"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/layout/TopBar";
import StatusBadge from "@/components/ui/StatusBadge";
import MonoId from "@/components/ui/MonoId";
import { api } from "@/lib/api";
import type { EligibilityResult } from "@/lib/types";

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

const MOCK_EXAMPLES = [
  { label: "Swiss Medical — activa",   afiliado_id: "SWISS-001",  financiador_id: "swiss-medical" },
  { label: "Medifé — activa",          afiliado_id: "MEDIFE-001", financiador_id: "medife" },
  { label: "Omint — activa",           afiliado_id: "OMINT-001",  financiador_id: "omint" },
  { label: "IOMA — activa",            afiliado_id: "IOMA-001",   financiador_id: "ioma" },
  { label: "Sancor — suspendida",      afiliado_id: "SANCOR-001", financiador_id: "sancor-salud" },
];

export default function ElegibilidadPage() {
  const [afiliadoId, setAfiliadoId] = useState("");
  const [financiadorId, setFinanciadorId] = useState("");
  const [prestacionCode, setPrestacionCode] = useState("");
  const [financiadores, setFinanciadores] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listFinanciadores().then((r) => setFinanciadores(r.financiadores)).catch(() => {});
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const res = await api.checkEligibility({
        afiliado_id: afiliadoId.trim(),
        financiador_id: financiadorId,
        prestacion_code: prestacionCode.trim() || undefined,
      });
      setResult(res);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const fillExample = (ex: typeof MOCK_EXAMPLES[0]) => {
    setAfiliadoId(ex.afiliado_id);
    setFinanciadorId(ex.financiador_id);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Elegibilidad"
        subtitle="Verificá la cobertura de tus afiliados en tiempo real"
      />

      <div className="p-6 max-w-3xl space-y-6 animate-fadeIn">
        {/* Info banner */}
        <div className="card p-4 border-accent/20 bg-accent-glow flex items-start gap-3">
          <svg className="text-accent mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div className="text-xs space-y-1">
            <p className="text-accent font-medium">Verificación de cobertura — 800+ financiadores disponibles</p>
            <p className="text-text-2">
              Equivalente al <span className="font-medium">Carrie AI Engine</span> adaptado al PMO argentino. Verifica cobertura activa contra{" "}
              {financiadores.length > 0 ? `${financiadores.length} financiadores` : "múltiples financiadores"} vía Farmalink Hub.
              La cobertura activa garantiza el piso PMO obligatorio por ley.
            </p>
          </div>
        </div>

        {/* Formulario */}
        <div className="card p-5 space-y-4">
          <h2 className="text-text font-semibold text-sm">Verificar cobertura</h2>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">
                  ID de afiliado
                </label>
                <input
                  value={afiliadoId}
                  onChange={(e) => setAfiliadoId(e.target.value)}
                  className="input-base font-mono"
                  placeholder="Ej: SWISS-001"
                  required
                />
              </div>

              <div>
                <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">
                  Financiador
                </label>
                <select
                  value={financiadorId}
                  onChange={(e) => setFinanciadorId(e.target.value)}
                  className="input-base"
                  required
                >
                  <option value="">Seleccionar financiador</option>
                  {financiadores.map((f) => (
                    <option key={f.id} value={f.id}>{f.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">
                Código de prestación SNOMED CT{" "}
                <span className="text-text-3 normal-case tracking-normal">(opcional)</span>
              </label>
              <input
                value={prestacionCode}
                onChange={(e) => setPrestacionCode(e.target.value)}
                className="input-base font-mono"
                placeholder="Ej: 11429006 (consulta médica)"
              />
              <p className="text-text-3 text-xs mt-1">
                Si se omite, verifica cobertura general. El PMO garantiza cobertura mínima obligatoria.
              </p>
            </div>

            <button type="submit" disabled={loading || !afiliadoId.trim() || !financiadorId} className="btn-primary flex items-center gap-2">
              {loading && <span className="spinner" />}
              {loading ? "Verificando cobertura..." : "Verificar elegibilidad"}
            </button>
          </form>

          {/* Ejemplos mock */}
          <div>
            <p className="text-text-3 text-[10px] uppercase tracking-widest mb-2">Datos de prueba (mock)</p>
            <div className="flex flex-wrap gap-2">
              {MOCK_EXAMPLES.map((ex) => (
                <button
                  key={ex.afiliado_id}
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
            <div className="card p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-text text-lg font-semibold">
                    {result.found ? result.financiador_nombre : "Afiliado no encontrado"}
                  </p>
                  {result.found && (
                    <p className="text-text-2 text-sm">{result.plan ?? "Plan no especificado"}</p>
                  )}
                </div>
                <StatusBadge status={result.found ? (result.activa ? "activa" : "suspendida") : "desconocido"} />
              </div>

              {result.found && (
                <>
                  <hr className="divider-accent" />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MonoId value={result.afiliado_id} label="ID Afiliado" />
                    <MonoId value={result.financiador_id} label="Financiador" dimmed />

                    <div className="space-y-0.5">
                      <p className="text-text-3 text-[10px] uppercase tracking-widest">PMO cubierto</p>
                      <StatusBadge
                        status={result.pmo_cubierto ? "activa" : "suspendida"}
                        label={result.pmo_cubierto ? "Sí — obligatorio" : "No verificado"}
                      />
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-text-3 text-[10px] uppercase tracking-widest">Fuente</p>
                      <StatusBadge status={result.fuente === "mock" ? "mock" : "ok"} label={result.fuente} />
                    </div>
                  </div>

                  {result.activa && (
                    <div className="bg-success-bg border border-success/20 rounded-md px-4 py-3">
                      <p className="text-success text-sm font-medium">✓ Cobertura activa verificada</p>
                      <p className="text-success/70 text-xs mt-0.5">
                        Afiliado habilitado para prestaciones cubiertas por el PMO. Res. 5744/2024 — interoperabilidad verificada.
                      </p>
                    </div>
                  )}

                  {!result.activa && (
                    <div className="bg-warning-bg border border-warning/20 rounded-md px-4 py-3">
                      <p className="text-warning text-sm font-medium">⚠ Cobertura no activa</p>
                      <p className="text-warning/70 text-xs mt-0.5">
                        Estado: <span className="font-medium">{result.estado}</span>. Verificar con el financiador antes de autorizar prestaciones.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
