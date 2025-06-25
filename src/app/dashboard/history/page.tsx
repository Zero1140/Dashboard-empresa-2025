'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '../../ui/Layout';
import Sidebar from '../../ui/Sidebar';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Card from '../../ui/Card';
import Table from '../../ui/Table';

// Simulación de datos de historial de producción por máquina
interface MachineProduction {
  id: number;
  machine: string;
  date: string; // formato YYYY-MM-DD
  producto: string;
  cantidad: number;
  operador: string;
  turno: string;
  observaciones?: string;
}

const MACHINES = [
  'Máquina 1',
  'Máquina 2',
  'Máquina 3',
  'Máquina 4',
];

const MOCK_HISTORY: MachineProduction[] = [
  {
    id: 1,
    machine: 'Máquina 1',
    date: '2024-06-01',
    producto: 'Filamento PLA Rojo',
    cantidad: 10,
    operador: 'Juan',
    turno: 'Mañana',
    observaciones: 'Sin incidencias',
  },
  {
    id: 2,
    machine: 'Máquina 2',
    date: '2024-06-02',
    producto: 'Filamento PETG Azul',
    cantidad: 8,
    operador: 'Ana',
    turno: 'Tarde',
    observaciones: 'Cambio de boquilla',
  },
  {
    id: 3,
    machine: 'Máquina 1',
    date: '2024-06-03',
    producto: 'Filamento PLA Verde',
    cantidad: 12,
    operador: 'Juan',
    turno: 'Noche',
    observaciones: '',
  },
  {
    id: 4,
    machine: 'Máquina 3',
    date: '2024-06-01',
    producto: 'Filamento ABS Negro',
    cantidad: 7,
    operador: 'Luis',
    turno: 'Mañana',
    observaciones: 'Parada por mantenimiento',
  },
  {
    id: 5,
    machine: 'Máquina 2',
    date: '2024-06-04',
    producto: 'Filamento PETG Azul',
    cantidad: 9,
    operador: 'Ana',
    turno: 'Tarde',
    observaciones: '',
  },
  // ... puedes agregar más datos simulados aquí
];

export default function HistorySearch() {
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [results, setResults] = useState<MachineProduction[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    if (!selectedMachine || !dateFrom || !dateTo) {
      alert('Por favor, selecciona una máquina y un rango de fechas.');
      return;
    }
    // Filtrar historial por máquina y rango de fechas
    const filtered = MOCK_HISTORY.filter((item) => {
      return (
        item.machine === selectedMachine &&
        item.date >= dateFrom &&
        item.date <= dateTo
      );
    });
    setResults(filtered);
    setSearched(true);
  };

  const handleReset = () => {
    setSelectedMachine('');
    setDateFrom('');
    setDateTo('');
    setResults([]);
    setSearched(false);
  };

  return (
    <Layout>
      <div className="flex flex-col items-center gap-8 max-w-4xl mx-auto mt-10">
        <h1 className="text-3xl font-bold text-center mb-2">Historial de Producción por Máquina</h1>
        <div className="w-full flex justify-center">
          <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col md:flex-row gap-6 items-center w-full max-w-3xl">
            <div className="flex flex-col items-center w-full md:w-auto">
              <label className="block font-medium mb-1 text-center">Máquina</label>
              <select
                className="border rounded px-3 py-2 w-48 text-center"
                value={selectedMachine}
                onChange={e => setSelectedMachine(e.target.value)}
              >
                <option value="">Selecciona una máquina</option>
                {MACHINES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col items-center w-full md:w-auto">
              <label className="block font-medium mb-1 text-center">Desde</label>
              <Input
                type="date"
                name="dateFrom"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-40 text-center"
              />
            </div>
            <div className="flex flex-col items-center w-full md:w-auto">
              <label className="block font-medium mb-1 text-center">Hasta</label>
              <Input
                type="date"
                name="dateTo"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-40 text-center"
              />
            </div>
            <div className="flex flex-col gap-2 items-center w-full md:w-auto">
              <Button label="Buscar" onClick={handleSearch} className="w-28" />
              <Button label="Limpiar" onClick={handleReset} className="w-28" />
            </div>
          </div>
        </div>

        {searched && (
          <div className="w-full flex flex-col items-center mt-4">
            <h2 className="text-xl font-semibold mb-4 text-center">
              {results.length > 0
                ? `Resultados para ${selectedMachine} del ${dateFrom} al ${dateTo}`
                : 'No se encontraron registros para la búsqueda.'}
            </h2>
            {results.length > 0 && (
              <div className="w-full overflow-x-auto">
                <table className="min-w-[700px] w-full bg-white border border-gray-200 rounded-lg shadow-lg mx-auto">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 border-b font-semibold text-center">ID</th>
                      <th className="px-4 py-2 border-b font-semibold text-center">Fecha</th>
                      <th className="px-4 py-2 border-b font-semibold text-center">Producto</th>
                      <th className="px-4 py-2 border-b font-semibold text-center">Cantidad</th>
                      <th className="px-4 py-2 border-b font-semibold text-center">Operador</th>
                      <th className="px-4 py-2 border-b font-semibold text-center">Turno</th>
                      <th className="px-4 py-2 border-b font-semibold text-center">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <td className="px-4 py-2 border-b text-center">{item.id}</td>
                        <td className="px-4 py-2 border-b text-center">{item.date}</td>
                        <td className="px-4 py-2 border-b text-center">{item.producto}</td>
                        <td className="px-4 py-2 border-b text-center">{item.cantidad}</td>
                        <td className="px-4 py-2 border-b text-center">{item.operador}</td>
                        <td className="px-4 py-2 border-b text-center">{item.turno}</td>
                        <td className="px-4 py-2 border-b text-center">{item.observaciones?.trim() ? item.observaciones : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}