'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '../ui/Layout';
import Sidebar from '../ui/Sidebar';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import Table from '../ui/Table';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

interface Product {
  id: number;
  name: string;
  category: string;
  color: string;
  stock: number;
  price: number;
  master: string;
  material: string;
  carretel: string;
  bolsa: string;
  nota?: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF4444'];

export default function ProductDashboard() {
  const searchParams = useSearchParams();
  const rol = searchParams.get('rol') || 'usuario';

  const [categories] = useState<string[]>(['PLA', 'PETG']);
  const [selectedCategory, setSelectedCategory] = useState<string>('PLA');
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setProducts([
      {
        id: 1,
        name: 'Filamento PLA Rojo',
        category: 'PLA',
        color: 'Rojo',
        stock: 35,
        price: 22.0,
        master: 'Master 1',
        material: 'PLA',
        carretel: 'Carretel A',
        bolsa: 'Bolsa 1',
        nota: '',
      },
      {
        id: 2,
        name: 'Filamento PETG Azul',
        category: 'PETG',
        color: 'Azul',
        stock: 20,
        price: 25.0,
        master: 'Master 2',
        material: 'PETG',
        carretel: 'Carretel B',
        bolsa: 'Bolsa 2',
        nota: '',
      },
      {
        id: 3,
        name: 'Filamento PLA Azul',
        category: 'PLA',
        color: 'Azul',
        stock: 15,
        price: 21.0,
        master: 'Master 1',
        material: 'PLA',
        carretel: 'Carretel A',
        bolsa: 'Bolsa 1',
        nota: '',
      },
      {
        id: 4,
        name: 'Filamento PETG Verde',
        category: 'PETG',
        color: 'Verde',
        stock: 10,
        price: 26.0,
        master: 'Master 3',
        material: 'PETG',
        carretel: 'Carretel C',
        bolsa: 'Bolsa 3',
        nota: '',
      },
      {
        id: 5,
        name: 'Filamento PLA Negro',
        category: 'PLA',
        color: 'Negro',
        stock: 25,
        price: 23.0,
        master: 'Master 2',
        material: 'PLA',
        carretel: 'Carretel B',
        bolsa: 'Bolsa 2',
        nota: '',
      },
      {
        id: 6,
        name: 'Filamento PETG Blanco',
        category: 'PETG',
        color: 'Blanco',
        stock: 12,
        price: 27.0,
        master: 'Master 1',
        material: 'PETG',
        carretel: 'Carretel A',
        bolsa: 'Bolsa 1',
        nota: '',
      },
      {
        id: 7,
        name: 'Filamento PLA Verde',
        category: 'PLA',
        color: 'Verde',
        stock: 18,
        price: 22.5,
        master: 'Master 3',
        material: 'PLA',
        carretel: 'Carretel C',
        bolsa: 'Bolsa 3',
        nota: '',
      },
      {
        id: 8,
        name: 'Filamento PETG Rojo',
        category: 'PETG',
        color: 'Rojo',
        stock: 8,
        price: 28.0,
        master: 'Master 2',
        material: 'PETG',
        carretel: 'Carretel B',
        bolsa: 'Bolsa 2',
        nota: '',
      },
    ]);
  }, []);

  const filteredProducts = products.filter(p => p.category === selectedCategory);

  const getSummary = (field: keyof Product) => {
    const summary: Record<string, number> = {};
    filteredProducts.forEach(p => {
      const key = p[field] || 'Sin dato';
      summary[key] = (summary[key] || 0) + p.stock;
    });
    return summary;
  };

  const getPriceSummary = (field: keyof Product) => {
    const summary: Record<string, number> = {};
    filteredProducts.forEach(p => {
      const key = p[field] || 'Sin dato';
      summary[key] = (summary[key] || 0) + p.price * p.stock;
    });
    return summary;
  };

  const getCountSummary = (field: keyof Product) => {
    const summary: Record<string, number> = {};
    filteredProducts.forEach(p => {
      const key = p[field] || 'Sin dato';
      summary[key] = (summary[key] || 0) + 1;
    });
    return summary;
  };

  const formatChartData = (field1: keyof Product, field2: keyof Product) => {
    const summary1 = getSummary(field1);
    const summary2 = getSummary(field2);
    const keys = new Set([...Object.keys(summary1), ...Object.keys(summary2)]);
    return Array.from(keys).map(key => ({
      name: key,
      [field1]: summary1[key] || 0,
      [field2]: summary2[key] || 0
    }));
  };

  const getPieData = (field: keyof Product) => {
    const summary = getSummary(field);
    return Object.entries(summary).map(([name, value]) => ({ name, value }));
  };

  const comparisonTables = [
    {
      title: 'Stock por Color',
      field: 'color',
      summary: getSummary('color'),
      columns: ['Color', 'Stock (kg)'],
    },
    {
      title: 'Stock por Master',
      field: 'master',
      summary: getSummary('master'),
      columns: ['Master', 'Stock (kg)'],
    },
    {
      title: 'Stock por Material',
      field: 'material',
      summary: getSummary('material'),
      columns: ['Material', 'Stock (kg)'],
    },
    {
      title: 'Stock por Carretel',
      field: 'carretel',
      summary: getSummary('carretel'),
      columns: ['Carretel', 'Stock (kg)'],
    },
    {
      title: 'Stock por Bolsa',
      field: 'bolsa',
      summary: getSummary('bolsa'),
      columns: ['Bolsa', 'Stock (kg)'],
    },
    {
      title: 'Valor Total por Color',
      field: 'color',
      summary: getPriceSummary('color'),
      columns: ['Color', 'Valor (€)'],
    },
    {
      title: 'Cantidad de Productos por Master',
      field: 'master',
      summary: getCountSummary('master'),
      columns: ['Master', 'Cantidad'],
    },
    {
      title: 'Cantidad de Productos por Material',
      field: 'material',
      summary: getCountSummary('material'),
      columns: ['Material', 'Cantidad'],
    },
  ];

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard de Inventario</h1>
        <div className="flex gap-2">
          {categories.map((cat) => (
            <Button
              key={cat}
              label={cat}
              onClick={() => setSelectedCategory(cat)}
              className={selectedCategory === cat ? 'bg-blue-600 text-white font-bold' : 'bg-gray-200'}
            />
          ))}
        </div>
      </div>

      {/* Graficos principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="p-4 shadow-lg border border-blue-100 rounded-lg bg-white">
          <h2 className="text-lg font-semibold text-center mb-2 text-blue-800">Comparativa Stock: Master vs Material</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={formatChartData('master', 'material')}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: 'kg', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="master" fill="#8884d8" name="Master" />
              <Bar dataKey="material" fill="#82ca9d" name="Material" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="p-4 shadow-lg border border-blue-100 rounded-lg bg-white">
          <h2 className="text-lg font-semibold text-center mb-2 text-blue-800">Distribución de Stock por Color</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={getPieData('color')}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {getPieData('color').map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tablas de comparativa */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {comparisonTables.map((table) => (
          <div key={table.title} className="p-4 shadow border border-gray-200 rounded-lg bg-white">
            <h3 className="text-md font-bold text-center mb-2 text-gray-700">{table.title}</h3>
            <table className="min-w-full text-xs md:text-sm text-center border-collapse">
              <thead>
                <tr>
                  {table.columns.map(col => (
                    <th key={col} className="border-b-2 border-blue-200 px-2 py-1 text-blue-700">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(table.summary).map(([key, value]) => (
                  <tr key={key}>
                    <td className="border-b border-gray-100 px-2 py-1">{key}</td>
                    <td className="border-b border-gray-100 px-2 py-1">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Tabla general de productos */}
      <div className="p-6 shadow-lg border border-blue-200 mb-8 rounded-lg bg-white">
        <h2 className="text-lg font-semibold mb-4 text-blue-800 text-center">Listado de Productos ({selectedCategory})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs md:text-sm text-center border-collapse">
            <thead>
              <tr className="bg-blue-100">
                <th className="px-2 py-2 border-b-2 border-blue-200">Nombre</th>
                <th className="px-2 py-2 border-b-2 border-blue-200">Color</th>
                <th className="px-2 py-2 border-b-2 border-blue-200">Stock (kg)</th>
                <th className="px-2 py-2 border-b-2 border-blue-200">Precio (€)</th>
                <th className="px-2 py-2 border-b-2 border-blue-200">Master</th>
                <th className="px-2 py-2 border-b-2 border-blue-200">Material</th>
                <th className="px-2 py-2 border-b-2 border-blue-200">Carretel</th>
                <th className="px-2 py-2 border-b-2 border-blue-200">Bolsa</th>
                <th className="px-2 py-2 border-b-2 border-blue-200">Nota</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-gray-100">
                  <td className="border-b border-gray-200 px-2 py-2">{p.name}</td>
                  <td className="border-b border-gray-200 px-2 py-2">{p.color}</td>
                  <td className="border-b border-gray-200 px-2 py-2">{p.stock}</td>
                  <td className="border-b border-gray-200 px-2 py-2">{p.price.toFixed(2)}</td>
                  <td className="border-b border-gray-200 px-2 py-2">{p.master}</td>
                  <td className="border-b border-gray-200 px-2 py-2">{p.material}</td>
                  <td className="border-b border-gray-200 px-2 py-2">{p.carretel}</td>
                  <td className="border-b border-gray-200 px-2 py-2">{p.bolsa}</td>
                  <td className="border-b border-gray-200 px-2 py-2">{p.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}