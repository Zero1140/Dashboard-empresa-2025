"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import { api } from "@/lib/api";

export default function InvitarPrestadorPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const inv = await api.invitePractitioner(email);
      setSuccess(inv.email);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar invitación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Invitar Prestador"
        subtitle="Motor OpenLoop — Onboarding de profesionales a la cartilla"
      />

      <div className="p-6 max-w-xl space-y-6 animate-fadeIn">
        <div className="card p-4 border-accent/20 bg-accent-glow flex items-start gap-3">
          <svg className="text-accent mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div className="text-xs space-y-1">
            <p className="text-accent font-medium">Flujo de credencialización SaludOS</p>
            <p className="text-text-2">
              El médico recibe un email con un link personalizado. Al completar su perfil, el sistema verifica su matrícula
              automáticamente contra REFEPS/SISA. Una vez verificado, vos aprobás el ingreso a la cartilla.
            </p>
          </div>
        </div>

        {success ? (
          <div className="card p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-success-bg flex items-center justify-center mx-auto">
              <svg className="text-success" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p className="text-text font-semibold">Invitación enviada</p>
              <p className="text-text-2 text-sm mt-1">
                Se envió un link de registro a <span className="font-mono text-accent">{success}</span>. El link expira en 7 días.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setSuccess(null)} className="btn-primary text-sm px-4 py-2">
                Invitar otro
              </button>
              <button onClick={() => router.push("/prestadores")} className="btn-secondary text-sm px-4 py-2">
                Ver cartilla
              </button>
            </div>
          </div>
        ) : (
          <div className="card p-5 space-y-4">
            <h2 className="text-text font-semibold text-sm">Email del profesional</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">
                  Email del médico / profesional de salud
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base"
                  placeholder="dr.garcia@clinicaejemplo.com.ar"
                  required
                />
                <p className="text-text-3 text-xs mt-1.5">
                  Recibirá un link de auto-registro con expiración de 7 días.
                </p>
              </div>

              {error && (
                <div className="bg-danger-bg border border-danger/20 rounded-lg px-4 py-3">
                  <p className="text-danger text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button type="submit" disabled={loading || !email} className="btn-primary flex items-center gap-2">
                  {loading && <span className="spinner" />}
                  {loading ? "Enviando invitación..." : "Enviar invitación"}
                </button>
                <button type="button" onClick={() => router.back()} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card p-4 space-y-3">
          <p className="text-text-3 text-[10px] uppercase tracking-widest">Flujo de onboarding</p>
          {[
            { n: "1", t: "Invitación enviada", d: "El médico recibe el email con link personalizado" },
            { n: "2", t: "Auto-registro", d: "Completa nombre, DNI, especialidad y contraseña" },
            { n: "3", t: "Verificación REFEPS", d: "El sistema verifica la matrícula automáticamente contra SISA" },
            { n: "4", t: "Aprobación del admin", d: "Vos revisás y aprobás el ingreso a la cartilla" },
            { n: "5", t: "Habilitado en la red", d: "El médico puede operar dentro del sistema" },
          ].map((step) => (
            <div key={step.n} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-surface-2 border border-border flex items-center justify-center text-text-3 text-[10px] font-mono">
                {step.n}
              </span>
              <div>
                <p className="text-text text-xs font-medium">{step.t}</p>
                <p className="text-text-3 text-[11px]">{step.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
