'use client';

import { useEffect, useRef, useState } from 'react';
import Layout from '../../ui/Layout';
import { useRouter } from 'next/navigation';

interface Registro {
  SKU: string;
  fecha: string;
  material: string;
  color: string;
  filamento: string;
  codigoBarra: string;
  contadorEtiqueta: string;
}

interface TurnoRegistro {
  maquina: string;
  turno: 1 | 2 | 3;
  operario: string | null;
  horaInicio: string;
  horaFin: string | null;
  usuarioRegistro: string; // usuario que asignó el operario
}

interface User {
  name: string;
  email: string;
  role: string;
}

const MAQUINAS = [
  { nombre: 'Máquina 1' },
  { nombre: 'Máquina 2' },
  { nombre: 'Máquina 3' },
  { nombre: 'Máquina 4' },
  { nombre: 'Máquina 5' },
  { nombre: 'Máquina 6' },
  { nombre: 'Máquina 7' },
  { nombre: 'Máquina 8' },
];

const columnas = [
  { key: 'SKU', label: 'SKU' },
  { key: 'fecha', label: 'Fecha' },
  { key: 'material', label: 'Material' },
  { key: 'color', label: 'Color' },
  { key: 'filamento', label: 'Filamento' },
  { key: 'codigoBarra', label: 'Código de Barra' },
  { key: 'contadorEtiqueta', label: 'Contador de Etiqueta' },
];

function getTurnoActual(): 1 | 2 | 3 {
  const hora = new Date().getHours();
  if (hora >= 6 && hora < 14) return 1;
  if (hora >= 14 && hora < 22) return 2;
  return 3;
}

function getUserFromLocalStorage(): User | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('loggedUser');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export default function ProduccionMaquinas() {
  const [registros, setRegistros] = useState<Registro[][]>(
    Array(MAQUINAS.length).fill(null).map(() => [])
  );
  const [turnos, setTurnos] = useState<TurnoRegistro[]>([]);
  const [asignaciones, setAsignaciones] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const intervalRefs = useRef<NodeJS.Timeout[]>([]);

  // Cargar usuario autenticado
  useEffect(() => {
    const u = getUserFromLocalStorage();
    if (!u) {
      router.push('/login');
    } else {
      setUser(u);
    }
  }, [router]);

  // Fetch de datos periódicos
  useEffect(() => {
    let cancelado = false;

    async function fetchRegistros() {
      try {
        const res = await fetch('/api/produccion', { cache: 'no-store' });
        if (!res.ok) throw new Error('Error al obtener datos');
        const data: { [maquina: string]: Registro[] } = await res.json();

        if (!cancelado) {
          const nuevosRegistros: Registro[][] = MAQUINAS.map(m => data[m.nombre] || []);
          setRegistros(nuevosRegistros);
        }
      } catch (e) {
        // Opcional: setError('Error al obtener registros de producción');
      }
    }

    async function fetchTurnos() {
      try {
        const res = await fetch('/api/turnos');
        if (!res.ok) throw new Error('Error al obtener turnos');
        const data = await res.json();
        setTurnos(data);
      } catch (e) {
        // Opcional: setError('Error al obtener turnos');
      }
    }

    fetchRegistros();
    fetchTurnos();

    const intervalo = setInterval(() => {
      fetchRegistros();
      fetchTurnos();
    }, 7000);
    intervalRefs.current.push(intervalo);

    return () => {
      cancelado = true;
      intervalRefs.current.forEach(clearInterval);
    };
  }, []);

  // Manejar asignación de operario por máquina
  const handleAsignacionChange = (maquina: string, value: string) => {
    setAsignaciones(prev => ({
      ...prev,
      [maquina]: value,
    }));
  };

  // Guardar asignaciones de operarios para el turno actual
  const handleAsignarOperarios = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Usuario no autenticado');
      return;
    }
    setLoading(true);
    setError(null);

    const turno = getTurnoActual();
    const now = new Date().toISOString();

    // Para cada máquina, guardar la asignación si hay operario
    const asignacionesAEnviar = Object.entries(asignaciones)
      .filter(([_, operario]) => operario && operario.trim().length > 0)
      .map(([maquina, operario]) => ({
        maquina,
        operario,
        turno,
        horaInicio: now,
        horaFin: null,
        usuarioRegistro: user.email,
      }));

    if (asignacionesAEnviar.length === 0) {
      setError('Debe asignar al menos un operario.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asignacionesAEnviar),
      });
      if (!res.ok) throw new Error('Error al guardar asignaciones');
      setAsignaciones({});
      setError(null);
    } catch (e) {
      setError('Error al guardar asignaciones');
    } finally {
      setLoading(false);
    }
  };

  // Cerrar turno para una máquina y operario
  const handleCerrarTurno = async (maquina: string, turno: 1 | 2 | 3) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/turnos/cerrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maquina,
          turno,
          horaFin: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error('Error al cerrar turno');
    } catch (e) {
      setError('Error al cerrar turno');
    } finally {
      setLoading(false);
    }
  };

  // Últimos turnos por máquina y turno actual
  const turnosPorMaquinaYTurno = (nombre: string, turno: 1 | 2 | 3) =>
    turnos
      .filter(t => t.maquina === nombre && t.turno === turno)
      .sort((a, b) => new Date(b.horaInicio).getTime() - new Date(a.horaInicio).getTime());

  // Últimos 3 turnos por máquina (histórico)
  const ultimosTurnosPorMaquina = (nombre: string) =>
    turnos
      .filter(t => t.maquina === nombre)
      .sort((a, b) => new Date(b.horaInicio).getTime() - new Date(a.horaInicio).getTime())
      .slice(0, 3);

  const handleEnviarSKU = (sku: string) => {
    router.push(`/app/dashboard/categorias?sku=${encodeURIComponent(sku)}`);
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4 text-center">Gestión de Operarios por Turno y Máquina</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-center">
          {error}
        </div>
      )}

      <form
        onSubmit={handleAsignarOperarios}
        className="mb-8 flex flex-col gap-4 items-center justify-center"
      >
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {MAQUINAS.map((m) => (
            <div key={m.nombre} className="flex flex-col items-center">
              <label className="font-semibold mb-1">{m.nombre}</label>
              <input
                type="text"
                value={asignaciones[m.nombre] || ''}
                onChange={e => handleAsignacionChange(m.nombre, e.target.value)}
                placeholder="Nombre del operario"
                className="border p-2 rounded w-full"
                autoComplete="off"
              />
            </div>
          ))}
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-semibold mt-4"
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Asignar Operarios al Turno Actual'}
        </button>
      </form>

      <div className="flex flex-col gap-8">
        {MAQUINAS.map((maquina, idx) => {
          const turnoActual = getTurnoActual();
          const turnosActuales = turnosPorMaquinaYTurno(maquina.nombre, turnoActual);
          const ultimoTurnoActual = turnosActuales.length > 0 ? turnosActuales[0] : null;
          return (
            <div key={maquina.nombre} className="bg-white border rounded shadow p-4">
              <h2 className="text-lg font-semibold text-blue-700 text-center mb-2">{maquina.nombre}</h2>
              <div className="text-sm text-gray-600 mb-3">
                <div className="mb-1">
                  <span className="font-bold">Turno actual ({turnoActual}): </span>
                  {ultimoTurnoActual ? (
                    <span>
                      {ultimoTurnoActual.operario || 'Sin operario'}{' '}
                      <span className="text-xs text-gray-400">
                        (asignado por {ultimoTurnoActual.usuarioRegistro})
                      </span>
                      {ultimoTurnoActual.horaFin ? (
                        <span className="ml-2 text-green-600 font-semibold">Finalizado</span>
                      ) : (
                        <button
                          className="ml-2 bg-red-500 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                          onClick={() => handleCerrarTurno(maquina.nombre, turnoActual)}
                          disabled={loading}
                        >
                          Cerrar Turno
                        </button>
                      )}
                    </span>
                  ) : (
                    <span className="text-red-500">No asignado</span>
                  )}
                </div>
                <div>
                  <span className="font-bold">Últimos turnos:</span>
                  <ul className="list-disc list-inside">
                    {ultimosTurnosPorMaquina(maquina.nombre).map((t, i) => (
                      <li key={i}>
                        {t.operario || 'Sin operario'} - Turno {t.turno} | Inició: {new Date(t.horaInicio).toLocaleTimeString()} {t.horaFin && `| Finalizó: ${new Date(t.horaFin).toLocaleTimeString()}`}
                        <span className="ml-2 text-xs text-gray-400">(por {t.usuarioRegistro})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm border">
                  <thead>
                    <tr>
                      {columnas.map(col => (
                        <th key={col.key} className="px-2 py-2 border-b bg-gray-100 text-center font-bold">{col.label}</th>
                      ))}
                      <th className="px-2 py-2 border-b bg-gray-100 text-center font-bold">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros[idx].length === 0 ? (
                      <tr>
                        <td colSpan={columnas.length + 1} className="text-center text-gray-400 py-4">
                          Esperando datos...
                        </td>
                      </tr>
                    ) : (
                      registros[idx].map((registro, filaIdx) => (
                        <tr key={registro.SKU} style={{ background: filaIdx % 2 ? '#f9fafb' : '#fff' }}>
                          {columnas.map(col => (
                            <td key={col.key} className="px-2 py-1 border-b text-center">{(registro as any)[col.key]}</td>
                          ))}
                          <td className="px-2 py-1 border-b text-center">
                            <button
                              className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                              onClick={() => handleEnviarSKU(registro.SKU)}
                            >
                              Enviar a Categorías
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}