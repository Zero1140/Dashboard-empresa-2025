// frontend/src/app/(app)/consultas/nueva/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import StatusBadge from "@/components/ui/StatusBadge";
import { api } from "@/lib/api";

type Step = 1 | 2 | 3;
type Tipo = "teleconsulta" | "externa" | null;

export default function NuevaConsultaPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [tipo, setTipo] = useState<Tipo>(null);
  const [pacienteDni, setPacienteDni] = useState("");
  const [pacienteNombre, setPacienteNombre] = useState("");
  const [afiliadoId, setAfiliadoId] = useState("");
  const [financiadorId, setFinanciadorId] = useState("");
  const [financiadores, setFinanciadores] = useState<{ id: string; nombre: string }[]>([]);
  const [coberturaStatus, setCoberturaStatus] = useState<"idle" | "checking" | "activa" | "inactiva">("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listFinanciadores().then((r) => setFinanciadores(r.financiadores)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!afiliadoId.trim() || !financiadorId) { setCoberturaStatus("idle"); return; }
    setCoberturaStatus("checking");
    const t = setTimeout(() => {
      api.checkEligibility({ afiliado_id: afiliadoId, financiador_id: financiadorId })
        .then((r) => setCoberturaStatus(r.activa ? "activa" : "inactiva"))
        .catch(() => setCoberturaStatus("idle"));
    }, 600);
    return () => clearTimeout(t);
  }, [afiliadoId, financiadorId]);

  const handleSubmit = async () => {
    if (!tipo) return;
    setLoading(true);
    setError("");
    try {
      const consultation = await api.createConsultation({
        tipo,
        paciente_dni: pacienteDni.trim(),
        paciente_nombre: pacienteNombre.trim(),
        paciente_afiliado_id: afiliadoId.trim() || undefined,
        financiador_id: financiadorId || undefined,
      });
      router.push(`/consultas/${consultation.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la consulta");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Nueva consulta" subtitle="Receta Electrónica — Ley 27.553" />

      <div className="p-6 max-w-2xl animate-fadeIn space-y-6">
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                step === s ? "bg-accent text-base" : step > s ? "bg-success/20 text-success border border-success/30" : "bg-surface-2 text-text-3 border border-border"
              }`}>
                {step > s ? "✓" : s}
              </div>
              {s < 3 && <div className={`h-px w-12 ${step > s ? "bg-success/40" : "bg-border"}`} />}
            </div>
          ))}
          <span className="text-text-3 text-xs ml-2">
            {step === 1 ? "Tipo de consulta" : step === 2 ? "Datos del paciente" : "Confirmación"}
          </span>
        </div>

        {/* Step 1: Type */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-text font-semibold">¿Qué tipo de consulta?</h2>
            <div className="grid grid-cols-2 gap-4">
              {([
                { value: "teleconsulta", label: "Teleconsulta", desc: "Video integrado vía Jitsi Meet", icon: "📹" },
                { value: "externa", label: "Externa", desc: "Presencial o sin video integrado", icon: "🏥" },
              ] as { value: Tipo; label: string; desc: string; icon: string }[]).map((opt) => (
                <button
                  key={opt.value!}
                  onClick={() => setTipo(opt.value)}
                  className={`card p-5 text-left transition-all ${
                    tipo === opt.value ? "border-accent/40 bg-accent-glow" : "hover:border-border-bright"
                  }`}
                >
                  <div className="text-2xl mb-2">{opt.icon}</div>
                  <p className="text-text font-medium text-sm">{opt.label}</p>
                  <p className="text-text-3 text-xs mt-1">{opt.desc}</p>
                  {tipo === opt.value && (
                    <div className="mt-2 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#080C18" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} disabled={!tipo} className="btn-primary">
              Continuar →
            </button>
          </div>
        )}

        {/* Step 2: Patient */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-text font-semibold">Datos del paciente</h2>
            <div className="card p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">DNI *</label>
                  <input value={pacienteDni} onChange={(e) => setPacienteDni(e.target.value)}
                    className="input-base font-mono" placeholder="Ej: 12345678" />
                </div>
                <div>
                  <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">Nombre completo *</label>
                  <input value={pacienteNombre} onChange={(e) => setPacienteNombre(e.target.value)}
                    className="input-base" placeholder="Ej: Juan Pérez" />
                </div>
              </div>
              <hr className="divider-accent" />
              <p className="text-text-3 text-[10px] uppercase tracking-widest">Cobertura (opcional)</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">Financiador</label>
                  <select value={financiadorId} onChange={(e) => setFinanciadorId(e.target.value)} className="input-base">
                    <option value="">Sin financiador</option>
                    {financiadores.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">ID Afiliado</label>
                  <input value={afiliadoId} onChange={(e) => setAfiliadoId(e.target.value)}
                    className="input-base font-mono" placeholder="Ej: SWISS-001" />
                </div>
              </div>
              {coberturaStatus !== "idle" && (
                <div className="flex items-center gap-2">
                  <span className="text-text-3 text-xs">Cobertura:</span>
                  {coberturaStatus === "checking" && <span className="spinner" />}
                  {coberturaStatus === "activa" && <StatusBadge status="activa" label="Activa — PMO cubierto" />}
                  {coberturaStatus === "inactiva" && <StatusBadge status="suspendida" label="No activa" />}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary">← Atrás</button>
              <button onClick={() => setStep(3)} disabled={!pacienteDni.trim() || !pacienteNombre.trim()} className="btn-primary">
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-text font-semibold">Confirmación</h2>
            <div className="card p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{tipo === "teleconsulta" ? "📹" : "🏥"}</span>
                <div>
                  <p className="text-text font-medium">{tipo === "teleconsulta" ? "Teleconsulta" : "Consulta externa"}</p>
                  {tipo === "teleconsulta" && <p className="text-text-3 text-xs">Se generará sala Jitsi Meet automáticamente</p>}
                </div>
              </div>
              <hr className="divider-accent" />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-text-3 text-[10px] uppercase tracking-widest">DNI</p><p className="text-text font-mono">{pacienteDni}</p></div>
                <div><p className="text-text-3 text-[10px] uppercase tracking-widest">Paciente</p><p className="text-text">{pacienteNombre}</p></div>
                {financiadorId && <div><p className="text-text-3 text-[10px] uppercase tracking-widest">Financiador</p><p className="text-text">{financiadores.find(f => f.id === financiadorId)?.nombre}</p></div>}
                {coberturaStatus === "activa" && (
                  <div><p className="text-text-3 text-[10px] uppercase tracking-widest">Cobertura</p><StatusBadge status="activa" label="Activa" /></div>
                )}
              </div>
            </div>
            {error && <div className="bg-danger-bg border border-danger/20 rounded-lg px-4 py-3"><p className="text-danger text-sm">{error}</p></div>}
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="btn-secondary">← Atrás</button>
              <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2">
                {loading && <span className="spinner" />}
                {loading ? "Creando consulta..." : "Iniciar consulta →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
