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

export default function PrestadoresPage() {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [especialidad, setEspecialidad] = useState("Todas");
  const [soloAprobados, setSoloAprobados] = useState(true);
  const [selected, setSelected] = useState<Practitioner | null>(null);

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

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Red de Prestadores"
        subtitle="Motor OpenLoop — Credencialización multi-jurisdicción"
        action={
          <Link href="/prestadores/invitar" className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Invitar prestador
          </Link>
        }
      />

      <div className="p-6 space-y-4 animate-fadeIn">
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-semibold text-text">{loading ? "—" : practitioners.length}</p>
            <p className="text-text-3 text-xs mt-1">Total prestadores</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-semibold text-success">{loading ? "—" : vigentes}</p>
            <p className="text-text-3 text-xs mt-1">Matrículas vigentes</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-semibold text-warning">{loading ? "—" : suspendidos}</p>
            <p className="text-text-3 text-xs mt-1">Suspendidos</p>
          </div>
        </div>

        <div className="card p-4 flex flex-wrap items-center gap-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base w-64"
            placeholder="Buscar por nombre, DNI o CUFP..."
          />
          <select
            value={especialidad}
            onChange={(e) => setEspecialidad(e.target.value)}
            className="input-base w-48"
          >
            {ESPECIALIDADES.map((e) => <option key={e}>{e}</option>)}
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={soloAprobados}
              onChange={(e) => setSoloAprobados(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            <span className="text-text-2 text-xs">Solo aprobados</span>
          </label>
          <p className="text-text-3 text-xs ml-auto">{filtered.length} prestador{filtered.length !== 1 ? "es" : ""}</p>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="py-12 text-center"><p className="text-text-3 text-sm">Cargando prestadores...</p></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-5 py-3 font-medium">Profesional</th>
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium hidden md:table-cell">CUFP</th>
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium">Estado</th>
                  <th className="text-left text-text-3 text-[10px] uppercase tracking-widest px-4 py-3 font-medium hidden lg:table-cell">Provincias</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-surface-2/50 transition-colors cursor-pointer"
                    onClick={() => setSelected(selected?.id === p.id ? null : p)}
                  >
                    <td className="px-5 py-4">
                      <p className="text-text text-sm font-medium">{p.nombre} {p.apellido}</p>
                      <p className="text-text-3 text-xs">{p.especialidad ?? "Sin especialidad"}</p>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <MonoId value={p.cufp ?? "—"} />
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={p.estado_matricula} />
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      {(p.provincias_habilitadas ?? []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.provincias_habilitadas.slice(0, 2).map((prov) => (
                            <span key={prov} className="text-[10px] px-2 py-0.5 bg-surface-2 border border-border rounded-full text-text-3">
                              {prov}
                            </span>
                          ))}
                          {p.provincias_habilitadas.length > 2 && (
                            <span className="text-[10px] text-text-3">+{p.provincias_habilitadas.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-text-3 text-xs">Sin habilitación</span>
                      )}
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
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <p className="text-text-3 text-sm">No hay prestadores. <Link href="/prestadores/invitar" className="text-accent hover:underline">Invitar el primero →</Link></p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {selected && (
          <div className="card p-5 animate-fadeIn space-y-4 border-accent/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-text font-semibold">{selected.nombre} {selected.apellido}</p>
                <p className="text-text-2 text-sm">{selected.especialidad}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-text-3 hover:text-text transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <hr className="divider-accent" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MonoId value={selected.cufp ?? "—"} label="CUFP" />
              <MonoId value={selected.matricula_nacional ?? "—"} label="Matrícula" dimmed />
              <MonoId value={selected.dni} label="DNI" dimmed />
              <div className="space-y-0.5">
                <p className="text-text-3 text-[10px] uppercase tracking-widest">Verificación</p>
                <StatusBadge status={selected.fuente_verificacion === "mock" ? "mock" : "ok"} label={selected.fuente_verificacion} />
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/prestadores/${selected.id}`} className="btn-primary text-xs px-3 py-1.5">
                Ver detalle completo →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
