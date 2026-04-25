"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/layout/TopBar";
import StatusBadge from "@/components/ui/StatusBadge";
import { api } from "@/lib/api";
import type { Consultation } from "@/lib/types";

const TIPO_LABEL: Record<string, string> = {
  teleconsulta: "Teleconsulta",
  externa: "Externa",
};

export default function ConsultasPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState("");
  const [filterEstado, setFilterEstado] = useState("");

  useEffect(() => {
    api.listConsultations({ tipo: filterTipo || undefined, estado: filterEstado || undefined })
      .then(setConsultations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterTipo, filterEstado]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Consultas"
        subtitle="Historial de consultas médicas y recetas electrónicas"
        action={
          <Link href="/consultas/nueva" className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nueva consulta
          </Link>
        }
      />

      <div className="p-6 space-y-4 animate-fadeIn">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total", value: consultations.length, color: "text-text" },
            { label: "En curso", value: consultations.filter(c => c.estado === "en_curso").length, color: "text-accent" },
            { label: "Completadas", value: consultations.filter(c => c.estado === "completada").length, color: "text-success" },
            { label: "Canceladas", value: consultations.filter(c => c.estado === "cancelada").length, color: "text-text-3" },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-text-3 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-4 items-center">
          <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="input-base w-44">
            <option value="">Todos los tipos</option>
            <option value="teleconsulta">Teleconsulta</option>
            <option value="externa">Externa</option>
          </select>
          <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="input-base w-44">
            <option value="">Todos los estados</option>
            <option value="programada">Programada</option>
            <option value="en_curso">En curso</option>
            <option value="completada">Completada</option>
            <option value="cancelada">Cancelada</option>
          </select>
          <p className="text-text-3 text-xs ml-auto">{consultations.length} consulta{consultations.length !== 1 ? "s" : ""}</p>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="py-12 text-center"><span className="spinner" /></div>
          ) : consultations.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-text-3 text-sm">No hay consultas aún.</p>
              <Link href="/consultas/nueva" className="text-accent text-sm mt-2 inline-block hover:underline">
                Crear primera consulta →
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-5 py-3 font-medium">Fecha</th>
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium">Paciente</th>
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium hidden md:table-cell">Tipo</th>
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium">Estado</th>
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium hidden lg:table-cell">Cobertura</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {consultations.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-5 py-4 text-text-2 text-sm">{formatDate(c.fecha_consulta)}</td>
                    <td className="px-4 py-4">
                      <p className="text-text text-sm font-medium">{c.paciente_nombre}</p>
                      <p className="text-text-3 text-xs font-mono">DNI {c.paciente_dni}</p>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded border ${
                        c.tipo === "teleconsulta"
                          ? "bg-accent-glow border-accent/20 text-accent"
                          : "bg-surface-2 border-border text-text-3"
                      }`}>
                        {TIPO_LABEL[c.tipo]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={c.estado} />
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <StatusBadge status={c.cobertura_verificada ? "activa" : "mock"} />
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/consultas/${c.id}`} className="text-text-3 hover:text-accent text-xs transition-colors">
                        Ver →
                      </Link>
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
