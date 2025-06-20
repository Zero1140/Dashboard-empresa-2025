'use client';

import { useEffect, useRef, useState } from 'react';
import Layout from '../../ui/Layout';

interface Registro {
  id: number;
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

// Simulación de API: genera datos aleatorios para cada máquina
function generarRegistro(maquinaIdx: number): Registro {
  const materiales = ['PLA', 'PETG', 'ABS', 'TPU'];
  const colores = ['Rojo', 'Azul', 'Verde', 'Negro', 'Blanco', 'Amarillo'];
  const filamentos = ['Filamento A', 'Filamento B', 'Filamento C'];
  return {
    id: Date.now() + Math.floor(Math.random() * 10000) + maquinaIdx * 100000,
    fecha: new Date().toLocaleString(),
    material: materiales[Math.floor(Math.random() * materiales.length)],
    color: colores[Math.floor(Math.random() * colores.length)],
    filamento: filamentos[Math.floor(Math.random() * filamentos.length)],
    codigoBarra: Math.floor(100000000 + Math.random() * 900000000).toString(),
    contadorEtiqueta: (Math.floor(Math.random() * 1000) + 1).toString(),
  };
}

const columnas = [
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

  // Guardar intervalos para limpiar al desmontar
  const intervalRefs = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Simular la llegada de datos de la API para cada máquina
    MAQUINAS.forEach((_, idx) => {
      // Cada máquina recibe un nuevo registro cada 5-10 segundos
      const intervalo = setInterval(() => {
        setRegistros(prev => {
          const nuevos = [...prev];
          // Simular máximo 20 registros por máquina
          if (nuevos[idx].length > 19) {
            nuevos[idx] = [...nuevos[idx].slice(1), generarRegistro(idx)];
          } else {
            nuevos[idx] = [...nuevos[idx], generarRegistro(idx)];
          }
          return nuevos;
        });
      }, 5000 + Math.random() * 5000);
      intervalRefs.current.push(intervalo);
    });

    // Limpieza al desmontar
    return () => {
      intervalRefs.current.forEach(clearInterval);
    };
  }, []);

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
                  </tr>
                </thead>
                <tbody>
                  {registros[idx].length === 0 ? (
                    <tr>
                      <td colSpan={columnas.length} className="text-center py-6 text-gray-400">
                        Esperando datos de producción...
                      </td>
                    </tr>
                  ) : (
                    registros[idx].map((registro, filaIdx) => (
                      <tr key={registro.id}>
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