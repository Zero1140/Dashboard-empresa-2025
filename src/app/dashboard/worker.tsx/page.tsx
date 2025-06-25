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

export default function ProduccionMaquinas() {
  // Un array de 8 arrays, uno por máquina
  const [registros, setRegistros] = useState<Registro[][]>(
    Array(8).fill(null).map(() => [])
  );
  const router = useRouter();

  // Guardar intervalos para limpiar al desmontar
  const intervalRefs = useRef<NodeJS.Timeout[]>([]);

  // Cargar datos desde la API (route.js)
  useEffect(() => {
    let cancelado = false;

    async function fetchRegistros() {
      try {
        const res = await fetch('/api/produccion', { cache: 'no-store' });
        if (!res.ok) throw new Error('Error al obtener datos');
        const data: { [maquina: string]: Registro[] } = await res.json();

        if (!cancelado) {
          // Mapear los datos a un array de arrays por máquina
          const nuevosRegistros: Registro[][] = MAQUINAS.map((m, idx) => {
            // Suponemos que la clave es el nombre de la máquina
            return data[m.nombre] || [];
          });
          setRegistros(nuevosRegistros);
        }
      } catch (e) {
        // Si hay error, no hacer nada (o podrías mostrar un mensaje)
      }
    }

    fetchRegistros();

    // Opcional: refrescar cada X segundos
    const intervalo = setInterval(fetchRegistros, 7000);
    intervalRefs.current.push(intervalo);

    return () => {
      cancelado = true;
      intervalRefs.current.forEach(clearInterval);
    };
  }, []);

  // Función para enviar SKU a la página de categorías
  const handleEnviarSKU = (sku: string) => {
    // Puedes enviar el SKU por query param, localStorage, context, etc.
    // Aquí lo enviamos por query param
    router.push(`/app/dashboard/categorias?sku=${encodeURIComponent(sku)}`);
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6 text-center">Registro de Producción por Máquina</h1>
      <div className="flex flex-col gap-8">
        {MAQUINAS.map((maquina, idx) => (
          <div
            key={maquina.nombre}
            className="bg-white border border-gray-200 rounded-lg shadow p-4 flex flex-col max-w-full"
          >
            <h2 className="text-lg font-semibold mb-3 text-center text-blue-700">{maquina.nombre}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm border border-gray-200 rounded" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    {columnas.map(col => (
                      <th
                        key={col.key}
                        className="px-2 py-2 border-b font-bold text-center bg-gray-100"
                      >
                        {col.label}
                      </th>
                    ))}
                    <th className="px-2 py-2 border-b font-bold text-center bg-gray-100">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {registros[idx].length === 0 ? (
                    <tr>
                      <td colSpan={columnas.length + 1} className="text-center py-6 text-gray-400">
                        Esperando datos de producción...
                      </td>
                    </tr>
                  ) : (
                    registros[idx].map((registro, filaIdx) => (
                      <tr key={registro.SKU}>
                        {columnas.map(col => (
                          <td
                            key={col.key}
                            className="px-2 py-1 border-b text-center"
                            style={{
                              background: filaIdx % 2 === 0 ? '#fff' : '#f9fafb',
                            }}
                          >
                            {(registro as any)[col.key]}
                          </td>
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
        ))}
      </div>
    </Layout>
  );
}