"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/layout/TopBar";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { api } from "@/lib/api";
import type { HealthResponse } from "@/lib/types";
import Link from "next/link";

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [stats, setStats] = useState({
    practitioners: 0,
    consultations: 0,
    prescriptions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [h, practitioners, consultations] = await Promise.all([
          api.health(),
          api.listPractitioners(false).catch(() => [] as never[]),
          api.listConsultations().catch(() => [] as never[]),
        ]);
        setHealth(h);
        setStats({
          practitioners: practitioners.length,
          consultations: consultations.length,
          prescriptions: 0,
        });
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
    { href: "/prestadores/invitar", label: "Invitar prestador", icon: "👤" },
    { href: "/consultas/nueva", label: "Nueva consulta", icon: "🩺" },
    { href: "/credenciales", label: "Verificar matrícula", icon: "✅" },
    { href: "/elegibilidad", label: "Verificar cobertura", icon: "🏥" },
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

        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Prestadores"
            value={loading ? "—" : String(stats.practitioners)}
            sub="en la red del tenant"
            accent={stats.practitioners > 0}
          />
          <StatCard
            label="Consultas"
            value={loading ? "—" : String(stats.consultations)}
            sub="en el historial"
          />
          <StatCard
            label="Cobertura"
            value="70%"
            sub="del mercado argentino"
            accent
          />
        </div>

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

        {!loading && (
          <div>
            <p className="text-text-3 text-[10px] uppercase tracking-widest mb-3">Estado de conectores</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "refeps", name: "REFEPS/SISA", sub: "Credencialización" },
                { id: "farmalink", name: "Farmalink Hub", sub: "Elegibilidad" },
                { id: "osde", name: "OSDE FHIR", sub: "Cobertura OSDE" },
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
          <div className="flex gap-1">
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
