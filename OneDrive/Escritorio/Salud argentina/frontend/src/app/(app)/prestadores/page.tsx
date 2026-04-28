"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/layout/TopBar";
import StatusBadge from "@/components/ui/StatusBadge";
import MonoId from "@/components/ui/MonoId";
import { api } from "@/lib/api";
import type { Practitioner } from "@/lib/types";
import Link from "next/link";

const ESPECIALIDADES = [
  "Todas", "Medicina General", "Cardiología", "Pediatría", "Ginecología",
  "Psiquiatría", "Traumatología", "Dermatología", "Neurología", "Endocrinología",
];

type PrestadoresSortField = "nombre" | "especialidad" | "estado_matricula" | "created_at";

function SortIcon({ field, sort }: { field: string; sort: { field: string; dir: "asc" | "desc" } }) {
  if (sort.field !== field) return <span className="text-text-3 text-xs ml-1">⇅</span>;
  return <span className="text-accent text-xs ml-1">{sort.dir === "asc" ? "▲" : "▼"}</span>;
}

export default function PrestadoresPage() {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [especialidad, setEspecialidad] = useState("Todas");
  const [soloAprobados, setSoloAprobados] = useState(true);
  const [selected, setSelected] = useState<Practitioner | null>(null);
  const [sort, setSort] = useState<{ field: PrestadoresSortField; dir: "asc" | "desc" }>({ field: "created_at", dir: "desc" });

  const handleSort = (field: PrestadoresSortField) => {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );
  };

  const load = async (aprobados: boolean) => {
    setLoading(true);
    try {
      const data = await api.listPractitioners(aprobados);
      setPractitioners(data);
    } catch {
      setPractitioners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(soloAprobados); }, [soloAprobados]);

  const filtered = practitioners.filter((p) => {
    const matchSearch =
      !search ||
      `${p.nombre} ${p.apellido}`.toLowerCase().includes(search.toLowerCase()) ||
      p.dni.includes(search) ||
      (p.cufp ?? "").toLowerCase().includes(search.toLowerCase());
    const matchEsp = especialidad === "Todas" || p.especialidad === especialidad;
    return matchSearch && matchEsp;
  });

  const vigentes = practitioners.filter((p) => p.estado_matricula === "vigente").length;
  const suspendidos = practitioners.filter((p) => p.estado_matricula === "suspendida").length;

  const sortedPractitioners = [...filtered].sort((a, b) => {
    const dir = sort.dir === "asc" ? 1 : -1;
    if (sort.field === "nombre") {
      const an = `${a.nombre} ${a.apellido}`;
      const bn = `${b.nombre} ${b.apellido}`;
      return dir * an.localeCompare(bn, "es-AR");
    }
    if (sort.field === "especialidad") {
      return dir * (a.especialidad ?? "").localeCompare(b.especialidad ?? "", "es-AR");
    }
    if (sort.field === "estado_matricula") {
      return dir * (a.estado_matricula ?? "").localeCompare(b.estado_matricula ?? "", "es-AR");
    }
    if (sort.field === "created_at") {
      const av = a.created_at ?? "";
      const bv = b.created_at ?? "";
      return dir * (av < bv ? -1 : av > bv ? 1 : 0);
    }
    return 0;
  });

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Red de Médicos"
        subtitle="Médicos habilitados en la plataforma"
        action={
          <Link href="/prestadores/invitar" className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span className="hidden sm:inline">Invitar médico</span>
            <span className="sm:hidden">Invitar</span>
          </Link>
        }
      />

      <div className="p-4 sm:p-6 space-y-4 animate-fadeIn">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center">
            <p className="text-2xl font-semibold text-text">{loading ? "—" : practitioners.length}</p>
            <p className="text-text-3 text-xs mt-1">Total</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-semibold text-success">{loading ? "—" : vigentes}</p>
            <p className="text-text-3 text-xs mt-1">Habilitados</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-semibold text-warning">{loading ? "—" : suspendidos}</p>
            <p className="text-text-3 text-xs mt-1">Suspendidos</p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 space-y-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base"
            placeholder="Buscar por nombre o DNI..."
          />
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={especialidad}
              onChange={(e) => setEspecialidad(e.target.value)}
              className="input-base flex-1 min-w-[140px]"
            >
              {ESPECIALIDADES.map((e) => <option key={e}>{e}</option>)}
            </select>
            <label className="flex items-center gap-2 cursor-pointer min-h-[44px] px-1">
              <input
                type="checkbox"
                checked={soloAprobados}
                onChange={(e) => setSoloAprobados(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              <span className="text-text-2 text-sm">Solo aprobados</span>
            </label>
            <p className="text-text-3 text-xs ml-auto">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="animate-pulse space-y-3">
            {/* Desktop skeleton table */}
            <div className="hidden md:block card overflow-hidden">
              <div className="divide-y divide-border">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="px-4 py-3 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-border/60 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-border/60 rounded w-36" />
                      <div className="h-2.5 bg-border/60 rounded w-24" />
                    </div>
                    <div className="h-3 bg-border/60 rounded w-20 hidden lg:block" />
                    <div className="h-5 bg-border/60 rounded-full w-16" />
                  </div>
                ))}
              </div>
            </div>
            {/* Mobile skeleton cards */}
            <div className="md:hidden space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-border/60" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 bg-border/60 rounded w-28" />
                      <div className="h-2.5 bg-border/60 rounded w-20" />
                    </div>
                  </div>
                  <div className="h-3 bg-border/60 rounded w-1/3" />
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-text-3">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            {(especialidad !== "Todas" || !soloAprobados) ? (
              <>
                <p className="text-text-2 text-sm font-medium">Sin médicos con estos filtros</p>
                <p className="text-text-3 text-xs">Intentá cambiar los filtros o mostrando todos los estados.</p>
              </>
            ) : (
              <>
                <p className="text-text-2 text-sm font-medium">La cartilla está vacía</p>
                <p className="text-text-3 text-xs">Invitá médicos para que formen parte de la red de tu organización.</p>
                <Link href="/prestadores/invitar" className="text-accent text-sm hover:underline inline-block">
                  Invitar médico →
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="card overflow-hidden hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th
                      scope="col"
                      role="columnheader"
                      tabIndex={0}
                      aria-sort={sort.field === "nombre" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                      className="text-left text-text-3 text-[10px] uppercase tracking-widest px-5 py-3 font-medium cursor-pointer select-none hover:text-accent"
                      onClick={() => handleSort("nombre")}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort("nombre"); } }}
                    >
                      Médico<SortIcon field="nombre" sort={sort} />
                    </th>
                    <th
                      scope="col"
                      role="columnheader"
                      tabIndex={0}
                      aria-sort={sort.field === "especialidad" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                      className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium cursor-pointer select-none hover:text-accent"
                      onClick={() => handleSort("especialidad")}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort("especialidad"); } }}
                    >
                      Especialidad<SortIcon field="especialidad" sort={sort} />
                    </th>
                    <th
                      scope="col"
                      role="columnheader"
                      tabIndex={0}
                      aria-sort={sort.field === "estado_matricula" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                      className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium cursor-pointer select-none hover:text-accent"
                      onClick={() => handleSort("estado_matricula")}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort("estado_matricula"); } }}
                    >
                      Estado<SortIcon field="estado_matricula" sort={sort} />
                    </th>
                    <th
                      scope="col"
                      role="columnheader"
                      tabIndex={0}
                      aria-sort={sort.field === "created_at" ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                      className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium cursor-pointer select-none hover:text-accent"
                      onClick={() => handleSort("created_at")}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSort("created_at"); } }}
                    >
                      Fecha de alta<SortIcon field="created_at" sort={sort} />
                    </th>
                    <th scope="col" className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedPractitioners.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-surface-2/50 transition-colors cursor-pointer"
                      onClick={() => setSelected(selected?.id === p.id ? null : p)}
                    >
                      <td className="px-5 py-4">
                        <p className="text-text text-sm font-medium">{p.nombre} {p.apellido}</p>
                        <p className="text-text-3 text-xs font-mono">{p.cufp ?? "—"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-text-2 text-sm">{p.especialidad ?? "Sin especialidad"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={p.estado_matricula} />
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-text-3 text-xs font-mono">{p.created_at ? new Date(p.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/prestadores/${p.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-text-3 hover:text-accent transition-colors text-xs"
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {filtered.map((p) => (
                <Link
                  key={p.id}
                  href={`/prestadores/${p.id}`}
                  className="card p-4 flex items-center gap-4 hover:border-accent/30 transition-colors active:bg-surface-2"
                >
                  <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-accent text-sm font-semibold">
                      {p.nombre[0]}{p.apellido[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text font-medium text-sm truncate">{p.nombre} {p.apellido}</p>
                    <p className="text-text-3 text-xs truncate">{p.especialidad ?? "Sin especialidad"}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={p.estado_matricula} />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-3">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {selected && (
          <div className="card p-5 animate-fadeIn space-y-4 border-accent/20 hidden md:block">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-text font-semibold">{selected.nombre} {selected.apellido}</p>
                <p className="text-text-2 text-sm">{selected.especialidad}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-text-3 hover:text-text transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <hr className="divider-accent" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MonoId value={selected.cufp ?? "—"} label="Código único" />
              <MonoId value={selected.matricula_nacional ?? "—"} label="Matrícula" dimmed />
              <MonoId value={selected.dni} label="DNI" dimmed />
              <div className="space-y-0.5">
                <p className="text-text-3 text-[10px] uppercase tracking-widest">Verificación</p>
                <StatusBadge status={selected.fuente_verificacion === "mock" ? "mock" : "ok"} label={selected.fuente_verificacion} />
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/prestadores/${selected.id}`} className="btn-primary text-xs px-3 py-1.5">
                Ver ficha completa →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
