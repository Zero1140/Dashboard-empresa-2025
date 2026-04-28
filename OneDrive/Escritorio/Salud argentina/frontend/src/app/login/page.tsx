"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { saveToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.login(email, password);
      saveToken(data.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center px-4">
      {/* Glow de fondo */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-accent opacity-[0.04] blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm animate-fadeIn">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#080C18" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-text text-2xl font-semibold">SaludOS Argentina</h1>
          <p className="text-text-2 text-sm mt-1">Infraestructura de salud digital B2B</p>
        </div>

        {/* Card */}
        <div className="card p-6 space-y-5">
          <div>
            <h2 className="text-text font-semibold text-base">Iniciar sesión</h2>
            <p className="text-text-3 text-xs mt-0.5">Acceso para operadores y financiadores</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                placeholder="admin@prepaga.com.ar"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-danger-bg border border-danger/20 rounded-md px-3 py-2">
                <p className="text-danger text-xs">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <span className="spinner" /> : null}
              {loading ? "Verificando..." : "Ingresar"}
            </button>

            <Link
              href="/reset-password"
              className="block text-center text-text-3 text-xs hover:text-accent transition-colors mt-2"
            >
              ¿Olvidaste tu contraseña?
            </Link>

            <p className="text-center text-text-3 text-xs">
              Al iniciar sesión aceptás nuestra{" "}
              <a href="/privacidad" target="_blank" className="text-accent hover:underline">
                Política de Privacidad
              </a>
            </p>
          </form>

          <hr className="divider-accent" />

          <p className="text-text-3 text-xs text-center">
            Sistema certificado bajo{" "}
            <span className="text-text-2">Ley 25.326 · Ley 27.553 · ReNaPDiS</span>
          </p>
        </div>

        {/* Dev hint */}
        <div className="mt-4 card p-3 border-info/20 bg-info-bg">
          <p className="text-info text-xs font-medium mb-1">Modo desarrollo activo</p>
          <p className="text-text-3 text-xs">
            El sistema corre con conectores mock. El backend debe estar corriendo en{" "}
            <span className="font-mono text-text-2">localhost:8000</span>
          </p>
        </div>
      </div>
    </div>
  );
}
