'use client';

import { useEffect, useRef, useState } from 'react';
import Layout from '../../ui/Layout';

// Lista de máquinas
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

// Lista de filamentos con tipo y color
const FILAMENTOS = [
  { id: 'FILA-001', nombre: 'PLA Blanco', tipo: 'PLA', color: 'Blanco' },
  { id: 'FILA-002', nombre: 'ABS Negro', tipo: 'ABS', color: 'Negro' },
  { id: 'FILA-003', nombre: 'PETG Azul', tipo: 'PETG', color: 'Azul' },
  { id: 'FILA-004', nombre: 'TPU Rojo', tipo: 'TPU', color: 'Rojo' },
];

// Registro extendido con hora, tipo y color
interface ProduccionRegistro {
  maquina: string;
  id: string;
  contador: string;
  hora: string; // Nueva propiedad para la hora
  tipo?: string; // Tipo de material
  color?: string; // Color del material
}

export default function ProduccionMaquinas() {
  // Estado: registros por máquina (mapa de nombre de máquina a lista de registros)
  const [registrosPorMaquina, setRegistrosPorMaquina] = useState<{ [maquina: string]: ProduccionRegistro[] }>({});
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Función para transformar los datos recibidos en registros agrupados por máquina y con hora, tipo y color
  const procesarRegistros = (data: any[]) => {
    // Agrupar por máquina
    const agrupados: { [maquina: string]: ProduccionRegistro[] } = {};
    data.forEach((registro) => {
      // Buscar si el id está en la lista de filamentos
      const filamento = FILAMENTOS.find(f => f.id === registro.id);
      // Si el registro ya tiene hora, la usamos, si no, usamos la hora actual
      let hora = registro.hora;
      if (!hora) {
        // Si no viene la hora, asignamos la hora actual
        const now = new Date();
        hora = now.toLocaleString();
      }
      const reg: ProduccionRegistro = {
        maquina: registro.maquina,
        id: registro.id,
        contador: registro.contador,
        hora,
        tipo: filamento ? filamento.tipo : undefined,
        color: filamento ? filamento.color : undefined,
      };
      if (!agrupados[registro.maquina]) agrupados[registro.maquina] = [];
      agrupados[registro.maquina].push(reg);
    });
    return agrupados;
  };

  // Cargar registros periódicamente
  useEffect(() => {
    let cancelado = false;

    async function fetchRegistros() {
      try {
        const res = await fetch('/api/saveoperators/', { cache: 'no-store' });
        if (!res.ok) throw new Error('Error al obtener datos');
        const data: any[] = await res.json();
        if (!cancelado) {
          // Procesar y agrupar registros
          setRegistrosPorMaquina(procesarRegistros(data));
        }
      } catch (e) {
        console.error(e);
      }
    }

    fetchRegistros();
    intervalRef.current = setInterval(fetchRegistros, 5000);

    return () => {
      cancelado = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Obtener registros de una máquina
  const obtenerRegistrosMaquina = (maquina: string) => {
    return registrosPorMaquina[maquina] || [];
  };

  // Obtener nombre, tipo y color de filamento
  const getDatosFilamento = (id: string) => {
    const f = FILAMENTOS.find(f => f.id === id);
    if (f) {
      return { nombre: f.nombre, tipo: f.tipo, color: f.color };
    }
    return { nombre: id, tipo: '-', color: '-' };
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4 text-center">Producción por Máquina</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-center">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-8">
        {MAQUINAS.map((maquina) => (
          <div key={maquina.nombre} className="bg-white border rounded shadow p-4">
            <h2 className="text-lg font-semibold text-blue-700 text-center mb-2">{maquina.nombre}</h2>
            {/* Ya no hay formulario de ingreso manual, los datos se obtienen automáticamente del backend */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm border">
                <thead>
                  <tr>
                    <th className="px-2 py-2 border-b bg-gray-100 text-center font-bold">Hora</th>
                    <th className="px-2 py-2 border-b bg-gray-100 text-center font-bold">ID Filamento</th>
                    <th className="px-2 py-2 border-b bg-gray-100 text-center font-bold">Tipo Material</th>
                    <th className="px-2 py-2 border-b bg-gray-100 text-center font-bold">Color</th>
                    <th className="px-2 py-2 border-b bg-gray-100 text-center font-bold">Contador</th>
                  </tr>
                </thead>
                <tbody>
                  {obtenerRegistrosMaquina(maquina.nombre).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-gray-400 py-4">
                        Sin registros para esta máquina.
                      </td>
                    </tr>
                  ) : (
                    obtenerRegistrosMaquina(maquina.nombre).map((registro, idx) => {
                      const datosFilamento = getDatosFilamento(registro.id);
                      return (
                        <tr key={registro.id + '-' + idx} style={{ background: idx % 2 ? '#f9fafb' : '#fff' }}>
                          <td className="px-2 py-1 border-b text-center">{registro.hora}</td>
                          <td className="px-2 py-1 border-b text-center">{registro.id}</td>
                          <td className="px-2 py-1 border-b text-center">{datosFilamento.tipo}</td>
                          <td className="px-2 py-1 border-b text-center">{datosFilamento.color}</td>
                          <td className="px-2 py-1 border-b text-center">{registro.contador}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}