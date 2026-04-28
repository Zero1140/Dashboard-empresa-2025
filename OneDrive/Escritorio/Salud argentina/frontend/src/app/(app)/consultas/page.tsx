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

type ConsultasSortField = "fecha_consulta" | "paciente_nombre" | "tipo" | "estado";

function SortIcon({ field, sort }: { field: string; sort: { field: string; dir: "asc" | "desc" } }) {
  if (sort.field !== field) return <span className="text-text-3 text-xs ml-1">⇅</span>;
  return <span className="text-accent text-xs ml-1">{sort.dir === "asc" ? "▲" : "▼"}</span>;
}

export default function ConsultasPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ field: ConsultasSortField; dir: "asc" | "desc" }>({ field: "fecha_consulta", dir: "desc" });

  const handleSort = (field: ConsultasSortField) => {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );
  };

  useEffect(() => {
    api.listConsultations({ tipo: filterTipo || undefined, estado: filterEstado || undefined })
      .then(setConsultations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterTipo, filterEstado]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const filtered = consultations.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.paciente_nombre.toLowerCase().includes(q) ||
      c.paciente_dni.includes(q)
    );
  });

  const sortedConsultations = [...filtered].sort((a, b) => {
    const dir = sort.dir === "asc" ? 1 : -1;
    const field: ConsultasSortField = sort.field;
    const av = a[field];
    const bv = b[field];
    if (typeof av === "string" && typeof bv === "string") {
      if (field === "fecha_consulta") return dir * (av < bv ? -1 : av > bv ? 1 : 0);
      return dir * av.localeCompare(bv, "es-AR");
    }
    return 0;
  });

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: filtered.length, color: "text-text" },
            { label: "En curso", value: filtered.filter(c => c.estado === "en_curso").length, color: "text-accent" },
            { label: "Completadas", value: filtered.filter(c => c.estado === "completada").length, color: "text-success" },
            { label: "Canceladas", value: filtered.filter(c => c.estado === "cancelada").length, color: "text-text-3" },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-text-3 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="card p-4 flex flex-wrap gap-4 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base w-52"
            placeholder="Buscar por nombre o DNI..."
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-text-3 hover:text-text text-xs">
              × Limpiar
            </button>
          )}
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
          <p className="text-text-3 text-xs ml-auto">{filtered.length} de {consultations.length} consulta{consultations.length !== 1 ? "s" : ""}</p>
        </div>

        {/* Table */}
        {loading ? (
          <div className="card overflow-hidden animate-pulse">
            <div className="divide-y divide-border">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4">
                  <div className="h-3 bg-border/60 rounded w-20" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-border/60 rounded w-32" />
                    <div className="h-2.5 bg-border/60 rounded w-20" />
                  </div>
                  <div className="h-5 bg-border/60 rounded-full w-16 hidden md:block" />
                  <div className="h-5 bg-border/60 rounded-full w-14" />
                </div>
              ))}
            </div>
          </div>
        ) : (
        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-text-3">
                  <path d="M9 12h6M9 16h6M9 8h6" strokeLinecap="round"/>
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                </svg>
              </div>
              {search ? (
                <>
                  <p className="text-text-2 text-sm font-medium">Sin resultados para &ldquo;{search}&rdquo;</p>
                  <p className="text-text-3 text-xs">Probá buscar por nombre completo o número de DNI.</p>
                  <button onClick={() => setSearch("")} className="text-accent text-sm hover:underline">
                    Limpiar búsqueda
                  </button>
                </>
              ) : (
                <>
                  <p className="text-text-2 text-sm font-medium">No hay consultas aún</p>
                  <p className="text-text-3 text-xs">Las consultas médicas y recetas electrónicas aparecerán acá.</p>
                  <Link href="/consultas/nueva" className="text-accent text-sm hover:underline inline-block">
                    Crear primera consulta →
                  </Link>
                </>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th
                    scope="col"
                    role="columnheader"
                    tabIndex={0}
                    aria-sort={sort.field === "fecha_consulta" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    className="text-left text-text-3 text-[10px] uppercase tracking-widest px-5 py-3 font-medium cursor-pointer select-none hover:text-accent"
                    onClick={() => handleSort("fecha_consulta")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort("fecha_consulta"); } }}
                  >
                    Fecha<SortIcon field="fecha_consulta" sort={sort} />
                  </th>
                  <th
                    scope="col"
                    role="columnheader"
                    tabIndex={0}
                    aria-sort={sort.field === "paciente_nombre" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium cursor-pointer select-none hover:text-accent"
                    onClick={() => handleSort("paciente_nombre")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort("paciente_nombre"); } }}
                  >
                    Paciente<SortIcon field="paciente_nombre" sort={sort} />
                  </th>
                  <th
                    scope="col"
                    role="columnheader"
                    tabIndex={0}
                    aria-sort={sort.field === "tipo" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium hidden md:table-cell cursor-pointer select-none hover:text-accent"
                    onClick={() => handleSort("tipo")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort("tipo"); } }}
                  >
                    Tipo<SortIcon field="tipo" sort={sort} />
                  </th>
                  <th
                    scope="col"
                    role="columnheader"
                    tabIndex={0}
                    aria-sort={sort.field === "estado" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                    className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium cursor-pointer select-none hover:text-accent"
                    onClick={() => handleSort("estado")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort("estado"); } }}
                  >
                    Estado<SortIcon field="estado" sort={sort} />
                  </th>
                  <th scope="col" className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium hidden lg:table-cell">Cobertura</th>
                  <th scope="col" className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedConsultations.map((c) => (
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
        )} {/* end loading conditional */}
      </div>
    </div>
  );
}
