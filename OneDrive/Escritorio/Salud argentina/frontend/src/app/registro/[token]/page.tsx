"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { InvitationInfo } from "@/lib/types";

type FieldErrors = {
  dni?: string;
  password?: string;
  confirm?: string;
};

type RegistrationResult = {
  message: string;
  refeps_verificado: boolean;
  estado_matricula: string;
};

export default function RegistroPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  // Invitation state
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [invError, setInvError] = useState("");
  const [loading, setLoading] = useState(true);

  // Form state
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    especialidad: "",
    password: "",
    confirm: "",
    acepta_terminos: false,
  });

  // Inline validation errors
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState<RegistrationResult | null>(null);

  useEffect(() => {
    api
      .getInvitationInfo(token)
      .then(setInvitation)
      .catch((e: Error) =>
        setInvError(e.message || "Invitación inválida o expirada")
      )
      .finally(() => setLoading(false));
  }, [token]);

  // ── Inline validators ──────────────────────────────────────────────────────

  const validateDni = (value: string): string => {
    if (value && !/^\d{7,8}$/.test(value)) {
      return "El DNI debe tener 7 u 8 dígitos";
    }
    return "";
  };

  const validatePassword = (value: string): string => {
    if (value && value.length >= 8 && !/\d/.test(value)) {
      return "La contraseña debe contener al menos un número";
    }
    return "";
  };

  const validateConfirm = (value: string): string => {
    if (value && form.password && value !== form.password) {
      return "Las contraseñas no coinciden";
    }
    return "";
  };

  const handleFieldChange = (field: keyof typeof form, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));

    if (field === "dni") {
      setFieldErrors((e) => ({ ...e, dni: validateDni(value as string) }));
    }
    if (field === "password") {
      setFieldErrors((e) => ({
        ...e,
        password: validatePassword(value as string),
        // Re-validate confirm if it already has a value
        confirm: form.confirm ? (form.confirm !== value ? "Las contraseñas no coinciden" : "") : e.confirm,
      }));
    }
    if (field === "confirm") {
      setFieldErrors((e) => ({ ...e, confirm: validateConfirm(value as string) }));
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Run all validations before submitting
    const dniErr = validateDni(form.dni);
    const pwErr = validatePassword(form.password);
    const confirmErr = form.password !== form.confirm ? "Las contraseñas no coinciden" : "";

    setFieldErrors({ dni: dniErr, password: pwErr, confirm: confirmErr });

    if (dniErr || pwErr || confirmErr) return;

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
      const msg = err instanceof Error ? err.message : "Error de conexión. Intentá de nuevo.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Format expiry date ─────────────────────────────────────────────────────

  const formatExpiry = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-base flex flex-col">
        <PageHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <span className="spinner" />
            <p className="text-text-3 text-sm">Verificando invitación...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Invalid invitation ─────────────────────────────────────────────────────

  if (invError) {
    return (
      <div className="min-h-screen bg-base flex flex-col">
        <PageHeader />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="card p-8 max-w-sm w-full text-center space-y-4 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-danger-bg border border-danger/20 flex items-center justify-center mx-auto">
              <svg
                className="text-danger"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <p className="text-text font-semibold">Invitación no válida</p>
            <p className="text-text-2 text-sm">
              El link de invitación es inválido o ya expiró.
            </p>
            {invError !== "El link de invitación es inválido o ya expiró." && (
              <p className="text-text-3 text-xs">{invError}</p>
            )}
            <p className="text-text-3 text-xs">
              Solicitá una nueva invitación al administrador de tu organización.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────

  if (done) {
    return (
      <div className="min-h-screen bg-base flex flex-col">
        <PageHeader />
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="card p-8 max-w-md w-full space-y-5 animate-fadeIn">
            {/* Check icon */}
            <div className="w-14 h-14 rounded-full bg-success-bg border border-success/20 flex items-center justify-center mx-auto">
              <svg
                className="text-success"
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <div className="text-center space-y-1">
              <p className="text-text font-semibold text-lg">¡Registro completado!</p>
              <p className="text-text-2 text-sm">
                Tu matrícula fue verificada contra REFEPS/SISA.
              </p>
            </div>

            {/* Estado matrícula */}
            <div className="bg-success-bg border border-success/20 rounded-lg px-4 py-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
              <div>
                <p className="text-text-3 text-[10px] uppercase tracking-widest">Estado de matrícula</p>
                <p className="text-success text-sm font-medium capitalize">{done.estado_matricula}</p>
              </div>
            </div>

            {/* REFEPS warning */}
            {!done.refeps_verificado && (
              <div className="bg-warning-bg border border-warning/20 rounded-lg px-4 py-3 flex items-start gap-3">
                <svg
                  className="text-warning flex-shrink-0 mt-0.5"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <p className="text-warning text-sm">
                  No pudimos verificar tu matrícula automáticamente. El administrador la revisará manualmente.
                </p>
              </div>
            )}

            <hr className="divider-accent" />

            {/* Pending approval message */}
            <div className="text-center space-y-1">
              <p className="text-text-2 text-sm">
                Tu cuenta está pendiente de aprobación por el administrador de la organización.
              </p>
              <p className="text-text-3 text-xs">
                Te notificaremos por email cuando puedas comenzar a operar.
              </p>
            </div>

            <button
              onClick={() => router.push("/login")}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              Ir al login
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-base flex flex-col">
      <PageHeader />

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="max-w-md w-full space-y-5">

          {/* Invitation info card */}
          {invitation && (
            <div className="card px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 animate-fadeIn">
              <div>
                <p className="text-text-3 text-[10px] uppercase tracking-widest">Email</p>
                <p className="text-text font-mono text-sm">{invitation.email}</p>
              </div>
              <div className="hidden sm:block w-px h-8 bg-border" />
              <div>
                <p className="text-text-3 text-[10px] uppercase tracking-widest">Link válido hasta</p>
                <p className="text-text-2 text-sm">{formatExpiry(invitation.expires_at)}</p>
              </div>
            </div>
          )}

          {/* Form card */}
          <div className="card p-6 animate-fadeIn">
            <h1 className="text-text font-semibold text-lg mb-5">Completar registro</h1>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* Nombre + Apellido */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-2 text-[10px] uppercase tracking-widest block mb-1.5">
                    Nombre <span className="text-danger">*</span>
                  </label>
                  <input
                    value={form.nombre}
                    onChange={(e) => handleFieldChange("nombre", e.target.value)}
                    className="input-base"
                    placeholder="María"
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label className="text-text-2 text-[10px] uppercase tracking-widest block mb-1.5">
                    Apellido <span className="text-danger">*</span>
                  </label>
                  <input
                    value={form.apellido}
                    onChange={(e) => handleFieldChange("apellido", e.target.value)}
                    className="input-base"
                    placeholder="García"
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>

              {/* DNI */}
              <div>
                <label className="text-text-2 text-[10px] uppercase tracking-widest block mb-1.5">
                  DNI <span className="text-danger">*</span>
                </label>
                <input
                  value={form.dni}
                  onChange={(e) => handleFieldChange("dni", e.target.value)}
                  className={`input-base font-mono ${fieldErrors.dni ? "border-danger" : ""}`}
                  placeholder="12345678"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  minLength={7}
                  maxLength={8}
                  required
                  autoComplete="off"
                />
                {fieldErrors.dni ? (
                  <p className="text-danger text-xs mt-1">{fieldErrors.dni}</p>
                ) : (
                  <p className="text-text-3 text-xs mt-1">
                    Se usará para verificar tu matrícula en REFEPS/SISA.
                  </p>
                )}
              </div>

              {/* Especialidad */}
              <div>
                <label className="text-text-2 text-[10px] uppercase tracking-widest block mb-1.5">
                  Especialidad <span className="text-danger">*</span>
                </label>
                <input
                  value={form.especialidad}
                  onChange={(e) => handleFieldChange("especialidad", e.target.value)}
                  className="input-base"
                  placeholder="Ej: Cardiología, Clínica médica"
                  required
                />
              </div>

              {/* Contraseña */}
              <div>
                <label className="text-text-2 text-[10px] uppercase tracking-widest block mb-1.5">
                  Contraseña <span className="text-danger">*</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => handleFieldChange("password", e.target.value)}
                  className={`input-base ${fieldErrors.password ? "border-danger" : ""}`}
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
                {fieldErrors.password ? (
                  <p className="text-danger text-xs mt-1">{fieldErrors.password}</p>
                ) : (
                  <p className="text-text-3 text-xs mt-1">
                    Mínimo 8 caracteres, al menos un número.
                  </p>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div>
                <label className="text-text-2 text-[10px] uppercase tracking-widest block mb-1.5">
                  Confirmar contraseña <span className="text-danger">*</span>
                </label>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => handleFieldChange("confirm", e.target.value)}
                  className={`input-base ${fieldErrors.confirm ? "border-danger" : ""}`}
                  required
                  autoComplete="new-password"
                />
                {fieldErrors.confirm && (
                  <p className="text-danger text-xs mt-1">{fieldErrors.confirm}</p>
                )}
              </div>

              {/* Términos */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    className="mt-0.5 w-4 h-4 accent-accent flex-shrink-0"
                    checked={form.acepta_terminos}
                    onChange={(e) =>
                      handleFieldChange("acepta_terminos", e.target.checked)
                    }
                  />
                  <span className="text-text-2 text-xs leading-relaxed">
                    Acepto los Términos y Condiciones y la Política de Privacidad de
                    SaludOS Argentina (Ley 26.529, Ley 25.326)
                  </span>
                </label>
              </div>

              {/* API error */}
              {submitError && (
                <div className="bg-danger-bg border border-danger/20 rounded-lg px-4 py-3">
                  <p className="text-danger text-sm">{submitError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {submitting && <span className="spinner" />}
                {submitting ? "Verificando matrícula..." : "Completar registro"}
              </button>
            </form>
          </div>

          <p className="text-text-3 text-[10px] text-center">
            SaludOS Argentina · Ley 27.553 · Ley 25.326 · Ley 26.529
          </p>
        </div>
      </main>
    </div>
  );
}

// ── Shared header ────────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <header className="border-b border-border px-6 py-4 flex items-center gap-3">
      <div className="w-7 h-7 rounded bg-accent flex items-center justify-center flex-shrink-0">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#080C18"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      </div>
      <div>
        <p className="text-text font-semibold text-sm">SaludOS Argentina</p>
        <p className="text-text-3 text-[10px] uppercase tracking-widest">
          Registro de Profesional de Salud
        </p>
      </div>
    </header>
  );
}
