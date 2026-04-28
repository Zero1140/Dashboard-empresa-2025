"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ResetPasswordConfirmPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.confirmPasswordReset(token, password);
      setDone(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Token inválido o expirado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <p className="text-accent text-xs font-mono uppercase tracking-widest">SaludOS Argentina</p>
          <h1 className="text-text text-2xl font-semibold">Nueva contraseña</h1>
        </div>

        {done ? (
          <div className="card p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-success-bg flex items-center justify-center mx-auto">
              <svg className="text-success" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-text font-semibold">Contraseña actualizada</p>
            <p className="text-text-2 text-sm">Redirigiendo al login en 3 segundos…</p>
          </div>
        ) : (
          <div className="card p-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">Nueva contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input-base"
                  required
                />
              </div>
              {error && (
                <div className="bg-danger-bg border border-danger/20 rounded-lg px-4 py-3">
                  <p className="text-danger text-sm">{error}</p>
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading && <span className="spinner" />}
                {loading ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </form>
            <Link href="/login" className="block text-center text-text-3 text-xs hover:text-accent transition-colors">
              ← Cancelar
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
