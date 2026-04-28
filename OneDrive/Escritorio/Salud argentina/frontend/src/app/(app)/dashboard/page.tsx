"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { api } from "@/lib/api";
import type { DashboardStats, HealthResponse } from "@/lib/types";

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [h, s] = await Promise.all([
          api.health(),
          api.getDashboardStats().catch(() => null),
        ]);
        setHealth(h);
        setStats(s);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const connectorStatus = (id: string) => {
    if (!health) return "pending";
    return (health.mock_warnings ?? {})[id] ? "mock" : "ok";
  };

  const QUICK_ACTIONS = [
    { href: "/prestadores/invitar", label: "Invitar prestador",    icon: "👤" },
    { href: "/consultas/nueva",     label: "Nueva consulta",       icon: "🩺" },
    { href: "/credenciales",        label: "Verificar matrícula",  icon: "✅" },
    { href: "/elegibilidad",        label: "Verificar cobertura",  icon: "🏥" },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Dashboard"
        subtitle="SaludOS Argentina — Infraestructura de salud digital B2B"
      />

      <div className="p-6 space-y-6 animate-fadeIn">
        {health?.mock_warnings && Object.keys(health.mock_warnings).length > 0 && (
          <div className="card p-4 border-warning/20 bg-warning-bg flex items-start gap-3">
            <svg className="text-warning mt-0.5 flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div className="text-xs">
              <p className="text-warning font-medium">Sistema en modo DEMO</p>
              <p className="text-warning/80 mt-0.5">
                Conectores usando datos de prueba: {Object.keys(health.mock_warnings).join(", ")}.{" "}
                <Link href="/integraciones" className="underline">Ver estado de integraciones →</Link>
              </p>
            </div>
          </div>
        )}

        {/* KPI row — operaciones */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Prestadores en red"
            value={loading || !stats ? "—" : String(stats.practitioners_total)}
            sub={stats ? `${stats.practitioners_aprobados} aprobados` : "cargando..."}
            accent={!!stats && stats.practitioners_aprobados > 0}
          />
          <StatCard
            label="Consultas totales"
            value={loading || !stats ? "—" : String(stats.consultations_total)}
            sub="en el historial"
          />
          <StatCard
            label="Recetas activas"
            value={loading || !stats ? "—" : String(stats.prescriptions_activas)}
            sub="pendientes dispensación"
            accent={!!stats && stats.prescriptions_activas > 0}
          />
          <StatCard
            label="Verificaciones hoy"
            value={loading || !stats ? "—" : String(stats.verificaciones_hoy)}
            sub="REFEPS consultado"
          />
        </div>

        {/* Market coverage + provinces */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 col-span-2">
            <p className="text-text-3 text-[10px] uppercase tracking-widest mb-3">Cobertura del mercado</p>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold text-accent tabular-nums">
                {stats ? `${stats.cobertura_mercado_pct}%` : "—"}
              </p>
              <p className="text-text-2 text-sm mb-1">
                del mercado argentino
                <br />
                <span className="text-text-3 text-xs">via Farmalink Hub + OSDE FHIR</span>
              </p>
            </div>
            <div className="mt-3 h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-1000"
                style={{ width: stats ? `${stats.cobertura_mercado_pct}%` : "0%" }}
              />
            </div>
          </div>

          <div className="card p-4 flex flex-col justify-between">
            <p className="text-text-3 text-[10px] uppercase tracking-widest">Provincias cubiertas</p>
            <p className="text-4xl font-bold text-text">24</p>
            <p className="text-text-3 text-xs">habilitación multi-jurisdicción</p>
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <p className="text-text-3 text-[10px] uppercase tracking-widest mb-3">Acciones rápidas</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="card p-4 hover:border-accent/40 transition-all group text-center space-y-2"
              >
                <p className="text-2xl">{action.icon}</p>
                <p className="text-text text-sm font-medium group-hover:text-accent transition-colors">{action.label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Connectors */}
        {!loading && (
          <div>
            <p className="text-text-3 text-[10px] uppercase tracking-widest mb-3">Estado de conectores</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "refeps",    name: "REFEPS/SISA",   sub: "Credencialización" },
                { id: "farmalink", name: "Farmalink Hub",  sub: "Elegibilidad" },
                { id: "osde",      name: "OSDE FHIR",      sub: "Cobertura OSDE" },
              ].map((c) => {
                const st = connectorStatus(c.id);
                return (
                  <div key={c.id} className={`card p-4 ${st === "mock" ? "border-warning/20" : "border-success/20"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <StatusBadge status={st} />
                      <Link href="/integraciones" className="text-text-3 hover:text-accent text-xs">→</Link>
                    </div>
                    <p className="text-text font-medium text-sm">{c.name}</p>
                    <p className="text-text-3 text-xs">{c.sub}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="card p-4 flex items-center gap-4">
          <div className="flex flex-wrap gap-1">
            {["Ley 27.553", "CUIR", "FHIR R4", "Ley 25.326"].map((n) => (
              <span key={n} className="text-[10px] px-2 py-0.5 bg-success-bg border border-success/30 rounded text-success font-mono">{n}</span>
            ))}
            <span className="text-[10px] px-2 py-0.5 bg-warning-bg border border-warning/30 rounded text-warning font-mono">ReNaPDiS ⏳</span>
          </div>
          <Link href="/integraciones" className="ml-auto text-text-3 hover:text-accent text-xs transition-colors">
            Ver compliance completo →
          </Link>
        </div>
      </div>
    </div>
  );
}
