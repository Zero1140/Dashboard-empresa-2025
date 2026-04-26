"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { InvitationInfo } from "@/lib/types";

const ESPECIALIDADES = [
  "Medicina General", "Cardiología", "Pediatría", "Ginecología", "Psiquiatría",
  "Traumatología", "Dermatología", "Neurología", "Oncología", "Endocrinología",
  "Gastroenterología", "Neumología", "Reumatología", "Urología", "Oftalmología",
];

export default function RegistroPage() {
  const { token } = useParams<{ token: string }>();
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [invError, setInvError] = useState("");
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    nombre: "", apellido: "", dni: "", especialidad: "", password: "", confirm: "", acepta_terminos: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ refeps_verificado: boolean; estado_matricula: string } | null>(null);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    api.getInvitationInfo(token)
      .then(setInvitation)
      .catch((e: Error) => setInvError(e.message ?? "Invitación inválida o expirada"))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setSubmitError("Las contraseñas no coinciden");
      return;
    }
    setSubmitError("");
    setSubmitting(true);
    try {
      const result = await api.registerPractitioner(token, {
        nombre: form.nombre,
        apellido: form.apellido,
        dni: form.dni,
        especialidad: form.especialidad,
        password: form.password,
        acepta_terminos: form.acepta_terminos,
      });
      setDone(result);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base">
        <span className="spinner" />
      </div>
    );
  }

  if (invError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base px-4">
        <div className="card p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger-bg flex items-center justify-center mx-auto">
            <svg className="text-danger" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <p className="text-text font-semibold">Invitación no válida</p>
          <p className="text-text-2 text-sm">{invError}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base px-4">
        <div className="card p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-success-bg flex items-center justify-center mx-auto">
            <svg className="text-success" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p className="text-text font-semibold text-lg">Registro completado</p>
            <p className="text-text-2 text-sm mt-2">
              {done.refeps_verificado
                ? `Tu matrícula fue verificada contra REFEPS — estado: ${done.estado_matricula}.`
                : "No se encontró tu matrícula en REFEPS. El administrador podrá revisarlo."}
            </p>
            <p className="text-text-3 text-xs mt-3">
              El administrador de la red recibirá una notificación para aprobar tu ingreso a la cartilla.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-1">
          <p className="text-accent text-xs font-mono uppercase tracking-widest">SaludOS Argentina</p>
          <h1 className="text-text text-2xl font-semibold">Completar registro</h1>
          <p className="text-text-2 text-sm">Invitación para <span className="font-mono text-accent">{invitation?.email}</span></p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">Nombre</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="input-base"
                  placeholder="María"
                  required
                />
              </div>
              <div>
                <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">Apellido</label>
                <input
                  value={form.apellido}
                  onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
                  className="input-base"
                  placeholder="García"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">DNI</label>
              <input
                value={form.dni}
                onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value }))}
                className="input-base font-mono"
                placeholder="12345678"
                required
              />
              <p className="text-text-3 text-xs mt-1">Se usará para verificar tu matrícula en REFEPS/SISA.</p>
            </div>

            <div>
              <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">Especialidad</label>
              <select
                value={form.especialidad}
                onChange={(e) => setForm((f) => ({ ...f, especialidad: e.target.value }))}
                className="input-base"
                required
              >
                <option value="">Seleccionar especialidad</option>
                {ESPECIALIDADES.map((e) => <option key={e}>{e}</option>)}
              </select>
            </div>

            <div>
              <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="input-base"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">Confirmar contraseña</label>
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                className="input-base"
                required
              />
            </div>

            <div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  className="mt-0.5 w-4 h-4 accent-accent flex-shrink-0"
                  checked={form.acepta_terminos}
                  onChange={(e) => setForm((f) => ({ ...f, acepta_terminos: e.target.checked }))}
                />
                <span className="text-text-2 text-xs leading-relaxed">
                  Acepto los{" "}
                  <a href="/privacidad" target="_blank" className="text-accent underline">
                    términos de uso y política de privacidad
                  </a>
                  {" "}de SaludOS Argentina, y autorizo el tratamiento de mis datos personales
                  conforme a la Ley 25.326.
                </span>
              </label>
            </div>

            {submitError && (
              <div className="bg-danger-bg border border-danger/20 rounded-lg px-4 py-3">
                <p className="text-danger text-sm">{submitError}</p>
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2">
              {submitting && <span className="spinner" />}
              {submitting ? "Verificando matrícula..." : "Completar registro"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
