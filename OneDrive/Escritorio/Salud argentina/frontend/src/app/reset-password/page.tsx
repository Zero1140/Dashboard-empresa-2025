"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ResetPasswordRequestPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.requestPasswordReset(email.trim());
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <p className="text-accent text-xs font-mono uppercase tracking-widest">SaludOS Argentina</p>
          <h1 className="text-text text-2xl font-semibold">Restablecer contraseña</h1>
        </div>

        {done ? (
          <div className="card p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-success-bg flex items-center justify-center mx-auto">
              <svg className="text-success" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <p className="text-text font-semibold">Email enviado</p>
              <p className="text-text-2 text-sm mt-1">
                Si el email existe en el sistema, recibirás un link para restablecer tu contraseña en los próximos minutos.
              </p>
            </div>
            <Link href="/login" className="btn-primary inline-block text-sm px-4 py-2">
              Volver al login
            </Link>
          </div>
        ) : (
          <div className="card p-6 space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base"
                  placeholder="tu@email.com"
                  required
                />
              </div>
              {error && (
                <div className="bg-danger-bg border border-danger/20 rounded-lg px-4 py-3">
                  <p className="text-danger text-sm">{error}</p>
                </div>
              )}
              <button type="submit" disabled={loading || !email} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading && <span className="spinner" />}
                {loading ? "Enviando..." : "Enviar link de reset"}
              </button>
            </form>
            <Link href="/login" className="block text-center text-text-3 text-xs hover:text-accent transition-colors">
              ← Volver al login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
