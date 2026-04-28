"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/layout/TopBar";
import StatusBadge from "@/components/ui/StatusBadge";
import { api } from "@/lib/api";
import type { HealthResponse } from "@/lib/types";

const CONNECTORS = [
  {
    id: "refeps",
    name: "REFEPS / SISA",
    subtitle: "Motor OpenLoop — Credencialización",
    description: "Verificación de matrículas de profesionales de la salud en las 24 provincias. Fuente autoritativa nacional — CUFP, estado, provincias habilitadas.",
    mockEnv: "REFEPS_MOCK_MODE",
    endpoints: [
      { label: "WS SOAP", url: "sisa.msal.gov.ar/sisa/services/profesionalService?wsdl" },
      { label: "REST", url: "sisa.msal.gov.ar/sisa/services/rest/profesional/buscar" },
    ],
    steps: [
      "Enviar Formulario A1 a soporte@sisa.msal.gov.ar — Asunto: \"Solicitud acceso WS REFEPS — SaludOS Argentina\"",
      "Incluir: nombre empresa, CUIT, descripción del sistema, datos del responsable técnico y legal",
      "Si no hay respuesta en 2 semanas, llamar al 0800-222-1002 (Ministerio de Salud)",
      "Firmar el documento de confidencialidad que soliciten",
      "Agregar en .env: REFEPS_USERNAME y REFEPS_PASSWORD",
      "Cambiar REFEPS_MOCK_MODE=false y correr: pytest tests/integration/test_refeps_real.py",
    ],
    estimatedWeeks: "4–12 semanas",
    coverage: "24 provincias · 100% de profesionales registrados",
  },
  {
    id: "osde",
    name: "OSDE FHIR R4",
    subtitle: "Motor CareValidate — Elegibilidad OSDE",
    description: "Verificación de cobertura en tiempo real para afiliados OSDE (~3.5M afiliados). FHIR R4 nativamente compatible con el estándar mandatado por el Ministerio.",
    mockEnv: "OSDE_MOCK_MODE",
    endpoints: [
      { label: "Sandbox", url: "sandbox.farmalink.com.ar/apis-docs/FARMALINK_RE/farmalink/v3" },
      { label: "Portal", url: "osde.com.ar/interoperabilidad/conectar-prescriptor-de-medicamentos" },
    ],
    steps: [
      "Registrarse en el portal: osde.com.ar/interoperabilidad/conectar-prescriptor-de-medicamentos",
      "Completar el formulario Google Forms de inicio de integración",
      "Firmar el NDA con el equipo de OSDE",
      "Integrar contra el sandbox (disponible HOY sin credenciales)",
      "Coordinar con equipo técnico OSDE para certificación en staging",
      "Agregar OSDE_CLIENT_ID y OSDE_CLIENT_SECRET en .env",
      "Cambiar OSDE_MOCK_MODE=false y correr: pytest tests/integration/test_osde_real.py",
    ],
    estimatedWeeks: "6–10 semanas",
    coverage: "~3.5M afiliados OSDE",
  },
  {
    id: "farmalink",
    name: "Farmalink Hub",
    subtitle: "Hub multi-financiador + Recetas electrónicas",
    description: "Una integración cubre Swiss Medical, Medifé, Omint, IOMA, Sancor Salud y 20+ financiadores más (~70% del mercado). También es el hub para routing de recetas electrónicas a farmacias.",
    mockEnv: "FARMALINK_MOCK_MODE",
    endpoints: [
      { label: "Sandbox", url: "sandbox.farmalink.com.ar" },
      { label: "Docs", url: "sandbox.farmalink.com.ar/apis-docs/FARMALINK_RE/farmalink/v3" },
    ],
    steps: [
      "Acceder a farmalink.com.ar → sección integradores → formulario MS Forms de homologación",
      "Completar el proceso de homologación técnica",
      "Recibir credenciales de staging y hacer las pruebas",
      "Agregar FARMALINK_API_KEY en .env",
      "Cambiar FARMALINK_MOCK_MODE=false",
      "Correr: pytest tests/integration/test_farmalink_real.py",
    ],
    estimatedWeeks: "4–6 semanas",
    coverage: "25+ financiadores · ~70% del mercado argentino",
  },
];

const REGULATORY = [
  { norm: "Ley 27.553",        desc: "Recetas electrónicas y telemedicina habilitadas",          done: true },
  { norm: "Decreto 98/2023",   desc: "Reglamentación — Licencia Federal de Salud, CUIR",         done: true },
  { norm: "Res. 1959/2024",    desc: "Registro ReNaPDiS — plataformas digitales de salud",       done: false },
  { norm: "Res. 3320/2024",    desc: "Matrícula digital nacional (app Mi Argentina)",            done: true },
  { norm: "Res. 5744/2024",    desc: "Interoperabilidad prescripción ↔ financiadores",           done: true },
  { norm: "Ley 25.326",        desc: "Protección de Datos Personales — PII encriptada",          done: true },
  { norm: "Ley 26.529",        desc: "Derechos del Paciente — historia clínica, consentimiento", done: true },
];

export default function IntegracionesPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => {});
  }, []);

  const getMockStatus = (id: string) => {
    if (!health) return "mock";
    const warnings = health.mock_warnings ?? {};
    return warnings[id] ? "mock" : "ok";
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Integraciones"
        subtitle="Estado de conectores externos y cumplimiento regulatorio"
      />

      <div className="p-6 space-y-8 animate-fadeIn">
        {/* Resumen de estado */}
        <div className="grid grid-cols-3 gap-4">
          {CONNECTORS.map((c) => {
            const status = getMockStatus(c.id);
            return (
              <div key={c.id} className={`card p-4 ${status === "mock" ? "border-warning/20" : "border-success/20"}`}>
                <div className="flex items-center justify-between mb-2">
                  <StatusBadge status={status} />
                  <span className="text-text-3 text-xs">{c.estimatedWeeks}</span>
                </div>
                <p className="text-text font-medium text-sm">{c.name}</p>
                <p className="text-text-3 text-xs mt-0.5">{c.coverage}</p>
              </div>
            );
          })}
        </div>

        {/* Conectores detallados */}
        <div className="space-y-5">
          <h2 className="text-text-2 text-xs uppercase tracking-widest">Conectores externos</h2>
          {CONNECTORS.map((connector) => {
            const status = getMockStatus(connector.id);
            return (
              <div key={connector.id} className="card p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-text font-semibold">{connector.name}</p>
                      <span className="text-[10px] text-accent bg-accent-glow px-2 py-0.5 rounded border border-accent/20">
                        {connector.subtitle}
                      </span>
                    </div>
                    <p className="text-text-2 text-sm">{connector.description}</p>
                  </div>
                  <StatusBadge status={status} />
                </div>

                {/* Endpoints */}
                <div className="flex flex-wrap gap-3">
                  {connector.endpoints.map((ep) => (
                    <div key={ep.label} className="flex items-center gap-2 bg-base border border-border rounded-md px-3 py-1.5">
                      <span className="text-text-3 text-[10px] uppercase tracking-widest">{ep.label}</span>
                      <span className="text-text-2 text-xs font-mono">{ep.url}</span>
                    </div>
                  ))}
                </div>

                {/* Variable de entorno */}
                <div className="flex items-center gap-2 bg-base border border-border rounded-md px-3 py-2 w-fit">
                  <span className="text-text-3 text-xs">.env</span>
                  <span className={`font-mono text-sm ${status === "mock" ? "text-warning" : "text-success"}`}>
                    {connector.mockEnv}={status === "mock" ? "true" : "false"}
                  </span>
                </div>

                {/* Pasos para activar */}
                {status === "mock" && (
                  <div className="space-y-2">
                    <p className="text-text-3 text-[10px] uppercase tracking-widest">Pasos para activar la API real</p>
                    <div className="space-y-2">
                      {connector.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-surface-2 border border-border flex items-center justify-center text-text-3 text-[10px] font-mono">
                            {i + 1}
                          </span>
                          <p className="text-text-2 text-xs pt-0.5">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {status === "ok" && (
                  <div className="bg-success-bg border border-success/20 rounded-md px-3 py-2">
                    <p className="text-success text-xs font-medium">✓ Integración real activa</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Cumplimiento regulatorio */}
        <div className="space-y-4">
          <h2 className="text-text-2 text-xs uppercase tracking-widest">Cumplimiento regulatorio</h2>
          <div className="card divide-y divide-border">
            {REGULATORY.map((r) => (
              <div key={r.norm} className="flex items-center gap-4 px-5 py-3.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                  r.done ? "bg-success-bg text-success" : "bg-warning-bg text-warning"
                }`}>
                  {r.done ? "✓" : "⏳"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-text text-sm font-medium">{r.norm}</span>
                    <span className={`text-xs ${r.done ? "text-success" : "text-warning"}`}>
                      {r.done ? "Implementado" : "Pendiente"}
                    </span>
                  </div>
                  <p className="text-text-3 text-xs mt-0.5">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
