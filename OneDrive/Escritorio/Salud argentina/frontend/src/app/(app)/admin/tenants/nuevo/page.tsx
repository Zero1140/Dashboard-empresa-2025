"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import { api } from "@/lib/api";

export default function NuevoTenantPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("prepaga");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.createTenant({ nombre, tipo, admin_email: email, admin_password: password });
      router.push("/admin/tenants");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el tenant");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Nuevo tenant"
        subtitle="Registrar una nueva obra social o prepaga en la plataforma"
      />

      <div className="p-6 max-w-lg animate-fadeIn">
        <div className="card p-6 space-y-5">
          <div className="border border-accent/20 bg-accent-glow rounded-lg px-4 py-3 flex items-start gap-3">
            <svg className="text-accent mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-text-2 text-xs">
              Cada tenant tiene aislamiento completo (Row-Level Security en PostgreSQL).
              Un usuario de OSDE nunca puede ver datos de Swiss Medical.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">
                Nombre de la organización
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="input-base"
                placeholder="Ej: Swiss Medical S.A."
                required
              />
            </div>
            <div>
              <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">
                Tipo
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="input-base"
              >
                <option value="prepaga">Prepaga</option>
                <option value="obra_social">Obra Social</option>
                <option value="empleador">Empleador</option>
                <option value="startup">Startup de salud</option>
              </select>
            </div>
            <div>
              <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">
                Email del administrador
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                placeholder="admin@swissmedical.com.ar"
                required
              />
            </div>
            <div>
              <label className="text-text-2 text-xs uppercase tracking-widest block mb-1.5">
                Contraseña inicial
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base"
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
              />
            </div>

            {error && (
              <div className="bg-danger-bg border border-danger/20 rounded-lg px-4 py-3">
                <p className="text-danger text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2">
                {loading && <span className="spinner" />}
                {loading ? "Creando..." : "Crear tenant"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-secondary px-4"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
