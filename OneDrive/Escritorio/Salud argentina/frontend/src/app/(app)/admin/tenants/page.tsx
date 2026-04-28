"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import { api } from "@/lib/api";
import type { Tenant } from "@/lib/types";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.listTenants()
      .then(setTenants)
      .catch((e) => setError(e instanceof Error ? e.message : "Sin acceso — requiere rol platform_admin"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Tenants"
        subtitle="Obras sociales y prepagas en la plataforma"
        action={
          <Link href="/admin/tenants/nuevo" className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo tenant
          </Link>
        }
      />

      <div className="p-6 space-y-4 animate-fadeIn">
        {error && (
          <div className="card p-4 border-warning/20 bg-warning-bg">
            <p className="text-warning text-sm">{error}</p>
          </div>
        )}

        <div className="card overflow-hidden">
          {loading ? (
            <div className="py-12 text-center"><span className="spinner" /></div>
          ) : tenants.length === 0 && !error ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-text-3 text-sm">No hay tenants registrados.</p>
              <Link href="/admin/tenants/nuevo" className="btn-primary text-sm px-4 py-2 inline-block">
                Crear el primero
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-5 py-3 font-medium">Organización</th>
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium">ID</th>
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium">Tipo</th>
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium">Estado</th>
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium">Creado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-text font-medium text-sm">{t.nombre}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-text-3 text-xs font-mono">{t.id.slice(0, 8)}…</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-text-2 text-xs capitalize">{t.tipo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-mono border ${
                        t.activo
                          ? "text-success bg-success-bg border-success/20"
                          : "text-text-3 bg-surface-2 border-border"
                      }`}>
                        {t.activo ? "activo" : "inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-3 text-xs">
                      {new Date(t.created_at).toLocaleDateString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
