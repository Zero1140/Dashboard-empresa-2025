'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '../../ui/Layout';
import Sidebar from '../../ui/Sidebar';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Card from '../../ui/Card';
import Table from '../../ui/Table';

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
}

interface CategoryProducts {
  [category: string]: Product[];
}

const PRODUCT_FIELDS: { label: string; name: keyof Omit<Product, 'id'>; type?: string }[] = [
  { label: 'Nombre', name: 'name' },
  { label: 'Color', name: 'color' },
  { label: 'Stock', name: 'stock', type: 'number' },
  { label: 'Precio (€)', name: 'price', type: 'number' },
  { label: 'Master', name: 'master' },
  { label: 'Material', name: 'material' },
  { label: 'Carretel', name: 'carretel' },
  { label: 'Bolsa', name: 'bolsa' },
];

export default function ProductDashboard() {
  const searchParams = useSearchParams();
  const rol = searchParams.get('rol') || 'usuario';

  // Estado de categorías y productos
  const [categories, setCategories] = useState<string[]>(['PLA', 'PETG']);
  const [selectedCategory, setSelectedCategory] = useState<string>('PLA');
  const [categoryProducts, setCategoryProducts] = useState<CategoryProducts>({
    'PLA': [
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
      },
    ],
    'PETG': [
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
      },
    ],
  });

  // Estado para formularios y edición
  const [form, setForm] = useState<Omit<Product, 'id'>>({
    name: '',
    category: selectedCategory,
    color: '',
    stock: 0,
    price: 0,
    master: '',
    material: '',
    carretel: '',
    bolsa: '',
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [search, setSearch] = useState('');
  const [bulkProducts, setBulkProducts] = useState<string>('');
  const [showBulkForm, setShowBulkForm] = useState(false);

  // Sincronizar categoría seleccionada en el formulario
  useEffect(() => {
    setForm((prev) => ({ ...prev, category: selectedCategory }));
  }, [selectedCategory]);

  // Manejo de cambios en los inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]: type === 'number' ? Number(value) : value,
    });
  };

  // Mostrar formulario de producto
  const handleShowForm = () => {
    setShowForm(true);
    setEditingId(null);
    setForm({
      name: '',
      category: selectedCategory,
      color: '',
      stock: 0,
      price: 0,
      master: '',
      material: '',
      carretel: '',
      bolsa: '',
    });
  };

  // Mostrar formulario de carga masiva
  const handleShowBulkForm = () => {
    setShowBulkForm(true);
    setBulkProducts('');
  };

  // Mostrar formulario de categoría
  const handleShowCategoryForm = () => {
    setShowCategoryForm(true);
    setNewCategory('');
  };

  // Agregar nueva categoría
  const handleAddCategory = () => {
    const cat = newCategory.trim();
    if (!cat || categories.includes(cat)) return;
    setCategories((prev) => [...prev, cat]);
    setCategoryProducts((prev) => ({ ...prev, [cat]: [] }));
    setShowCategoryForm(false);
    setSelectedCategory(cat);
  };

  // Cancelar formularios
  const handleCancel = () => {
    setShowForm(false);
    setShowBulkForm(false);
    setForm({
      name: '',
      category: selectedCategory,
      color: '',
      stock: 0,
      price: 0,
      master: '',
      material: '',
      carretel: '',
      bolsa: '',
    });
    setEditingId(null);
  };

  // Agregar o editar productos
  const handleSubmit = () => {
    if (
      !form.name.trim() ||
      !form.category.trim() ||
      !form.color.trim() ||
      isNaN(form.stock) ||
      isNaN(form.price)
    ) {
      alert('Por favor, completa todos los campos correctamente.');
      return;
    }

    const cat = form.category;
    if (editingId !== null) {
      setCategoryProducts((prev) => ({
        ...prev,
        [cat]: prev[cat].map((p) => (p.id === editingId ? { ...p, ...form } : p)),
      }));
    } else {
      const uniqueId = Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
      const newProduct: Product = { id: uniqueId, ...form };
      setCategoryProducts((prev) => ({
        ...prev,
        [cat]: [...(prev[cat] || []), newProduct],
      }));
    }
    setShowForm(false);
    setForm({
      name: '',
      category: selectedCategory,
      color: '',
      stock: 0,
      price: 0,
      master: '',
      material: '',
      carretel: '',
      bolsa: '',
    });
    setEditingId(null);
  };

  // Edición de producto
  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      category: product.category,
      color: product.color,
      stock: product.stock,
      price: product.price,
      master: product.master,
      material: product.material,
      carretel: product.carretel,
      bolsa: product.bolsa,
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  // Eliminar producto
  const handleDelete = (id: number) => {
    setCategoryProducts((prev) => ({
      ...prev,
      [selectedCategory]: prev[selectedCategory].filter((p) => p.id !== id),
    }));
    if (editingId === id) {
      setEditingId(null);
      setForm({
        name: '',
        category: selectedCategory,
        color: '',
        stock: 0,
        price: 0,
        master: '',
        material: '',
        carretel: '',
        bolsa: '',
      });
      setShowForm(false);
    }
  };

  // Eliminar categoría (y sus productos)
  const handleDeleteCategory = (cat: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la categoría "${cat}" y todos sus productos?`)) return;
    setCategories((prev) => prev.filter((c) => c !== cat));
    setCategoryProducts((prev) => {
      const newObj = { ...prev };
      delete newObj[cat];
      return newObj;
    });
    if (selectedCategory === cat) {
      setSelectedCategory(categories.find((c) => c !== cat) || '');
    }
  };

  // Carga masiva de productos (CSV simple: nombre,color,stock,precio,master,material,carretel,bolsa)
  const handleBulkSubmit = () => {
    const lines = bulkProducts.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const cat = selectedCategory;
    const newProducts: Product[] = [];
    for (const line of lines) {
      const [name, color, stock, price, master, material, carretel, bolsa] = line.split(',');
      if (!name || !color || isNaN(Number(stock)) || isNaN(Number(price))) continue;
      newProducts.push({
        id: Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
        name: name.trim(),
        category: cat,
        color: color.trim(),
        stock: Number(stock),
        price: Number(price),
        master: master?.trim() || '',
        material: material?.trim() || '',
        carretel: carretel?.trim() || '',
        bolsa: bolsa?.trim() || '',
      });
    }
    if (newProducts.length) {
      setCategoryProducts((prev) => ({
        ...prev,
        [cat]: [...(prev[cat] || []), ...newProducts],
      }));
    }
    setShowBulkForm(false);
    setBulkProducts('');
  };

  // Productos filtrados y buscados
  const filteredProducts = useMemo(() => {
    const prods = categoryProducts[selectedCategory] || [];
    if (!search.trim()) return prods;
    const s = search.trim().toLowerCase();
    return prods.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.color.toLowerCase().includes(s) ||
        p.master.toLowerCase().includes(s) ||
        p.material.toLowerCase().includes(s) ||
        p.carretel.toLowerCase().includes(s) ||
        p.bolsa.toLowerCase().includes(s)
    );
  }, [categoryProducts, selectedCategory, search]);

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Gestión de Productos</h1>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <div key={cat} className="flex items-center gap-1">
              <Button
                label={cat}
                onClick={() => setSelectedCategory(cat)}
                className={selectedCategory === cat ? 'bg-blue-500 text-white' : ''}
              />
              <Button
                label="🗑️"
                onClick={() => handleDeleteCategory(cat)}
                className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200"
                title="Eliminar categoría"
              />
            </div>
          ))}
          <Button label="Agregar Categoría" onClick={handleShowCategoryForm} />
        </div>
        <div className="flex gap-2">
          <Button label="Agregar Producto" onClick={handleShowForm} />
          <Button label="Carga Masiva" onClick={handleShowBulkForm} />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <Input
          label="Buscar producto"
          name="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-1/3"
        />
      </div>

      {/* Formulario para agregar categoría */}
      {showCategoryForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-8 max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-4">Agregar Nueva Categoría</h2>
          <div className="flex gap-2">
            <Input
              label="Nombre de Categoría"
              name="newCategory"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
            />
            <Button label="Guardar" onClick={handleAddCategory} />
            <Button label="Cancelar" onClick={() => setShowCategoryForm(false)} />
          </div>
        </div>
      )}

      {/* Formulario para agregar/editar producto */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-8 max-w-xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Editar Producto' : 'Agregar Nuevo Producto'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input label="Categoría" name="category" value={form.category} disabled onChange={() => {}} />
            {PRODUCT_FIELDS.map((f) => (
              <Input
                key={f.name}
                label={f.label}
                name={f.name}
                type={f.type || 'text'}
                value={form[f.name]?.toString() ?? ''}
                onChange={handleChange}
              />
            ))}
          </div>
          <div className="flex gap-4 justify-end">
            <Button
              label={editingId ? 'Actualizar Producto' : 'Guardar Producto'}
              onClick={handleSubmit}
            />
            <Button label="Cancelar" onClick={handleCancel} />
          </div>
        </div>
      )}

      {/* Formulario de carga masiva */}
      {showBulkForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-8 max-w-xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">Carga Masiva de Productos</h2>
          <p className="mb-2 text-sm text-gray-600">
            Pega varias líneas, cada una con: <b>nombre,color,stock,precio,master,material,carretel,bolsa</b>
          </p>
          <textarea
            className="w-full border rounded p-2 mb-4"
            rows={6}
            value={bulkProducts}
            onChange={e => setBulkProducts(e.target.value)}
            placeholder="Ejemplo: Filamento PLA Verde,Verde,10,20,Master 3,PLA,Carretel C,Bolsa 3"
          />
          <div className="flex gap-4 justify-end">
            <Button label="Cargar Productos" onClick={handleBulkSubmit} />
            <Button label="Cancelar" onClick={handleCancel} />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow">
          <thead>
            <tr>
              <th className="px-4 py-2 border-b font-semibold text-center">ID</th>
              <th className="px-4 py-2 border-b font-semibold text-center">Nombre</th>
              <th className="px-4 py-2 border-b font-semibold text-center">Categoría</th>
              <th className="px-4 py-2 border-b font-semibold text-center">Color</th>
              <th className="px-4 py-2 border-b font-semibold text-center">Stock</th>
              <th className="px-4 py-2 border-b font-semibold text-center">Precio (€)</th>
              <th className="px-4 py-2 border-b font-semibold text-center">Master</th>
              <th className="px-4 py-2 border-b font-semibold text-center">Material</th>
              <th className="px-4 py-2 border-b font-semibold text-center">Carretel</th>
              <th className="px-4 py-2 border-b font-semibold text-center">Bolsa</th>
              <th className="px-4 py-2 border-b font-semibold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-4 text-gray-500">
                  No hay productos registrados en esta categoría.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b text-center">{product.id}</td>
                  <td className="px-4 py-2 border-b text-center">{product.name}</td>
                  <td className="px-4 py-2 border-b text-center">{product.category}</td>
                  <td className="px-4 py-2 border-b text-center">{product.color}</td>
                  <td className="px-4 py-2 border-b text-center">{product.stock}</td>
                  <td className="px-4 py-2 border-b text-center">€{product.price.toFixed(2)}</td>
                  <td className="px-4 py-2 border-b text-center">{product.master}</td>
                  <td className="px-4 py-2 border-b text-center">{product.material}</td>
                  <td className="px-4 py-2 border-b text-center">{product.carretel}</td>
                  <td className="px-4 py-2 border-b text-center">{product.bolsa}</td>
                  <td className="px-4 py-2 border-b text-center">
                    <div className="flex justify-center gap-2">
                      <Button label="✏️ Editar" onClick={() => handleEdit(product)} />
                      <Button label="🗑️ Eliminar" onClick={() => handleDelete(product.id)} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}