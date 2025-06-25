'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../../ui/Layout';
import Sidebar from '../../ui/Sidebar';
import Button from '../../ui/Button';
import Input from '../../ui/Input';

// --- Tipos y datos base ---

export interface MateriaPrima {
  id: number;
  nombre: string;
  kg: number;
}

export interface Master {
  id: number;
  nombre: string;
  kg: number;
}

export interface Product {
  sku: string;
  nombre: string;
  tipoFilamento: string;
  materiaPrima: string;
  colorMaster: string;
  carretel: string;
  stock: number;
}

export interface MaterialEmpaque {
  id: number;
  nombre: string;
  unidades: number;
}

export interface FilamentoProducts {
  [tipoFilamento: string]: Product[];
}

const MATERIA_PRIMA_LIST = [
  'PLA', 'PETG', 'ABS', 'TPU', 'ASA', 'NYLON 6', 'NYLON 66', 'LDPE', 'HDPE', 'PP',
  'ARBOCEL CW 630 PU', 'ARBOCEL BE600/30 PU'
];

const MASTER_LIST = [
  'PE ROJO 1324', 'PE SILVER1852', 'PP WHITE: 50', 'PP BLACK:40', 'PETG WHITE:17189', 'PETG BLACK:21680',
  'FIBRA CARBONO POLVO: 21800000FC', 'GLITER SILVER:POLIESTER EPOXY SILVER727.015', 'GLITER NEGRO:ALUMINIUM EPOXYNEGRO C14.008',
  'FIREFLY: PIGM.FOSFORESCENTE 60M', 'PLA WHITE:00050', 'PLA BLACK:4420P PBAT', 'PLA SILVER:21244', 'PLA RED:21297',
  'PLA ORANGE:21671', 'PLA BLUE:21298', 'PLA LIGHT BLUE:21302', 'PLA ICE BLUE:21189', 'PLA YELLOW:21956',
  'PLA MELLOW YELLOW:21773', 'PLA VIOLET:21417', 'PLA AQUAMARINE:21776', 'PLA APPLE GREEN:21299', 'PLA ARMY GREEN:21244',
  'PLA FUCHSIA:21420', 'PLA PINK PHANTER:21957', 'PLA LIGHT PINK:21771', 'PLA GOLD:21813', 'PLA MUSTARD:22082',
  'PLA BROWN:21419', 'PLA FLUORESCENT ORANGE:21418', 'PLA FLUORESCENT GREEN:21672', 'PLA FLUORESCENT YELLOW:22081',
  'PLA METALLIC BRONZE:21975', 'PLA OCRE R8000', 'PLA VERDE R6001'
];

const MATERIAL_EMPAQUE_LIST = [
  'Caja Cartón', 'Bolsa Plástica', 'Etiqueta', 'Cinta Adhesiva', 'Film Stretch', 'Palet', 'Fleje', 'Espuma', 'Protector Esquinas'
];

const FILAMENTO_CATEGORIAS = ['ABS', 'TPU', 'PLA', 'PETG', 'SILK', 'ASA'];

const PRODUCT_FIELDS = [
  { label: 'SKU', name: 'sku', type: 'text' },
  { label: 'Nombre', name: 'nombre', type: 'text' },
  { label: 'Tipo', name: 'tipoFilamento', type: 'text', disabled: true },
  { label: 'Materia Prima', name: 'materiaPrima', type: 'select' },
  { label: 'Color Master', name: 'colorMaster', type: 'select' },
  { label: 'Carretel', name: 'carretel', type: 'select' },
  { label: 'Stock', name: 'stock', type: 'number' },
];

const MATERIAL_EMPAQUE_FIELDS: {
  label: string;
  name: keyof Omit<MaterialEmpaque, 'id'>;
  type?: string;
}[] = [
  { label: 'Nombre', name: 'nombre' },
  { label: 'Unidades', name: 'unidades', type: 'number' },
];

export interface CategoriesDashboardData {
  filamentoProducts: FilamentoProducts;
  tiposFilamento: string[];
  masters: Master[];
  materiasPrimas: MateriaPrima[];
  materialesEmpaque: MaterialEmpaque[];
}

function SectionCard({ title, children, actions }: { title: string, children: React.ReactNode, actions?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function TableContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm mb-4">
      {children}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      className={`px-4 py-2 rounded-t-lg font-semibold transition-colors border-b-2 ${active ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-gray-50 border-transparent text-gray-600 hover:bg-blue-100'}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

type User = {
  name: string;
  email: string;
  password: string;
  role: string;
};

export default function CategoriesDashboard() {
  const router = useRouter();

  // Estado de usuario y control de acceso
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Tabs y datos ---
  const [tab, setTab] = useState<'filamento' | 'master' | 'materiaPrima' | 'materialEmpaque'>('filamento');

  // --- Filamento ---
  const [tiposFilamento, setTiposFilamento] = useState<string[]>([...FILAMENTO_CATEGORIAS]);
  const [selectedFilamento, setSelectedFilamento] = useState<string>(FILAMENTO_CATEGORIAS[0]);
  const [filamentoProducts, setFilamentoProducts] = useState<FilamentoProducts>({
    'PLA': [
      {
        sku: 'PLA-001',
        nombre: 'Filamento PLA Rojo',
        tipoFilamento: 'PLA',
        materiaPrima: 'PLA',
        colorMaster: 'PLA RED:21297',
        carretel: 'Carretel A',
        stock: 35,
      },
    ],
    'PETG': [
      {
        sku: 'PETG-001',
        nombre: 'Filamento PETG Azul',
        tipoFilamento: 'PETG',
        materiaPrima: 'PETG',
        colorMaster: 'PETG BLUE:21298',
        carretel: 'Carretel B',
        stock: 20,
      },
    ],
  });

  // --- Master ---
  const [masters, setMasters] = useState<Master[]>([]);
  const [showMasterForm, setShowMasterForm] = useState(false);
  const [masterForm, setMasterForm] = useState<{ nombre: string; kg: number }>({ nombre: '', kg: 0 });
  const [editingMasterId, setEditingMasterId] = useState<number | null>(null);

  // --- Materia Prima ---
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([]);
  const [showMateriaPrimaForm, setShowMateriaPrimaForm] = useState(false);
  const [materiaPrimaForm, setMateriaPrimaForm] = useState<{ nombre: string; kg: number }>({ nombre: '', kg: 0 });
  const [editingMateriaPrimaId, setEditingMateriaPrimaId] = useState<number | null>(null);

  // --- Material de Empaque ---
  const [materialesEmpaque, setMaterialesEmpaque] = useState<MaterialEmpaque[]>([]);
  const [showMaterialEmpaqueForm, setShowMaterialEmpaqueForm] = useState(false);
  const [materialEmpaqueForm, setMaterialEmpaqueForm] = useState<{ nombre: string; unidades: number }>({ nombre: '', unidades: 0 });
  const [editingMaterialEmpaqueId, setEditingMaterialEmpaqueId] = useState<number | null>(null);

  // --- Filamento: formulario y edición ---
  const [form, setForm] = useState<Omit<Product, never>>({
    sku: '',
    nombre: '',
    tipoFilamento: selectedFilamento,
    materiaPrima: '',
    colorMaster: '',
    carretel: '',
    stock: 0,
  });
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showFilamentoForm, setShowFilamentoForm] = useState(false);
  const [newFilamento, setNewFilamento] = useState('');
  const [search, setSearch] = useState('');

  // --- Control de acceso: cargar usuario desde localStorage ---
  useEffect(() => {
    const storedUser = localStorage.getItem('loggedUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push('/login');
    }
    setLoading(false);
  }, [router]);

  // --- Actualizar tipoFilamento en form cuando cambia selección ---
  useEffect(() => {
    setForm((prev) => ({ ...prev, tipoFilamento: selectedFilamento }));
  }, [selectedFilamento]);

  // --- Handlers generales ---

  const handleTab = (t: typeof tab) => {
    setTab(t);
    setShowForm(false);
    setShowMasterForm(false);
    setShowMateriaPrimaForm(false);
    setShowMaterialEmpaqueForm(false);
    setEditingSku(null);
    setEditingMasterId(null);
    setEditingMateriaPrimaId(null);
    setEditingMaterialEmpaqueId(null);
  };

  // --- Filamento Handlers ---

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]: type === 'number' ? Number(value) : value,
    });
  };

  const handleShowForm = () => {
    setShowForm(true);
    setEditingSku(null);
    setForm({
      sku: '',
      nombre: '',
      tipoFilamento: selectedFilamento,
      materiaPrima: '',
      colorMaster: '',
      carretel: '',
      stock: 0,
    });
  };

  const handleShowFilamentoForm = () => {
    setShowFilamentoForm(true);
    setNewFilamento('');
  };

  const handleAddFilamento = async () => {
    const fil = newFilamento.trim();
    if (!fil || tiposFilamento.includes(fil)) return;
    setTiposFilamento((prev) => [...prev, fil]);
    setFilamentoProducts((prev) => ({ ...prev, [fil]: [] }));
    setShowFilamentoForm(false);
    setSelectedFilamento(fil);
    await fetch('/api/filamentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipoFilamento: fil }),
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setForm({
      sku: '',
      nombre: '',
      tipoFilamento: selectedFilamento,
      materiaPrima: '',
      colorMaster: '',
      carretel: '',
      stock: 0,
    });
    setEditingSku(null);
  };

  // --- NUEVO: API para guardar productos usando /api/saveproduct/route.ts ---
  const saveProductApi = async (data: any) => {
    await fetch('/api/saveproduct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  };

  const handleSubmit = async () => {
    if (
      !form.sku.trim() ||
      !form.nombre.trim() ||
      !form.tipoFilamento.trim() ||
      !form.materiaPrima.trim() ||
      !form.colorMaster.trim() ||
      !form.carretel.trim() ||
      isNaN(form.stock)
    ) {
      alert('Por favor, completa todos los campos correctamente.');
      return;
    }

    const fil = form.tipoFilamento;
    let updatedProducts: Product[] = [];
    let newSku = editingSku ?? form.sku.trim();

    // Validar que el SKU no se repita al crear
    if (
      !editingSku &&
      (filamentoProducts[fil] || []).some((p) => p.sku === form.sku.trim())
    ) {
      alert('El SKU ya existe para este tipo de filamento.');
      return;
    }

    if (editingSku !== null) {
      updatedProducts = (filamentoProducts[fil] || []).map((p) =>
        p.sku === editingSku ? { ...p, ...form, sku: editingSku } : p
      );
    } else {
      const newProduct: Product = { ...form, sku: newSku };
      updatedProducts = [...(filamentoProducts[fil] || []), newProduct];
    }
    setFilamentoProducts((prev) => ({
      ...prev,
      [fil]: updatedProducts,
    }));

    // Guardar usando la API /api/saveproduct/route.ts
    await saveProductApi({
      producto: { ...form, sku: newSku },
      tipoFilamento: fil,
      method: editingSku !== null ? 'PUT' : 'POST',
    });

    setShowForm(false);
    setForm({
      sku: '',
      nombre: '',
      tipoFilamento: selectedFilamento,
      materiaPrima: '',
      colorMaster: '',
      carretel: '',
      stock: 0,
    });
    setEditingSku(null);
  };

  const handleEdit = (product: Product) => {
    setForm({
      sku: product.sku,
      nombre: product.nombre,
      tipoFilamento: product.tipoFilamento,
      materiaPrima: product.materiaPrima,
      colorMaster: product.colorMaster,
      carretel: product.carretel,
      stock: product.stock,
    });
    setEditingSku(product.sku);
    setShowForm(true);
  };

  const handleDelete = async (sku: string) => {
    setFilamentoProducts((prev) => ({
      ...prev,
      [selectedFilamento]: prev[selectedFilamento].filter((p) => p.sku !== sku),
    }));
    if (editingSku === sku) {
      setEditingSku(null);
      setForm({
        sku: '',
        nombre: '',
        tipoFilamento: selectedFilamento,
        materiaPrima: '',
        colorMaster: '',
        carretel: '',
        stock: 0,
      });
      setShowForm(false);
    }
    // Guardar usando la API /api/saveproduct/route.ts
    await saveProductApi({
      sku,
      tipoFilamento: selectedFilamento,
      method: 'DELETE',
    });
  };

  const handleDeleteFilamento = async (fil: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el tipo de filamento "${fil}" y todos sus productos?`)) return;
    setTiposFilamento((prev) => prev.filter((c) => c !== fil));
    setFilamentoProducts((prev) => {
      const newObj = { ...prev };
      delete newObj[fil];
      return newObj;
    });
    if (selectedFilamento === fil) {
      setSelectedFilamento(tiposFilamento.find((c) => c !== fil) || '');
    }
    // Guardar usando la API /api/saveproduct/route.ts
    await saveProductApi({
      tipoFilamento: fil,
      method: 'DELETE_FILAMENTO',
    });
  };

  // --- Master Handlers ---

  const handleShowMasterForm = () => {
    setShowMasterForm(true);
    setEditingMasterId(null);
    setMasterForm({ nombre: '', kg: 0 });
  };

  const handleMasterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setMasterForm({
      ...masterForm,
      [name]: type === 'number' ? Number(value) : value,
    });
  };

  const handleMasterSubmit = async () => {
    if (!masterForm.nombre.trim() || isNaN(masterForm.kg) || masterForm.kg < 0) {
      alert('Por favor, completa todos los campos correctamente.');
      return;
    }
    let newId = editingMasterId ?? Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
    let updated: Master[];
    if (editingMasterId !== null) {
      updated = masters.map((m) =>
        m.id === editingMasterId ? { ...m, ...masterForm, id: editingMasterId } : m
      );
    } else {
      updated = [...masters, { id: newId, ...masterForm }];
    }
    setMasters(updated);
    setShowMasterForm(false);
    setMasterForm({ nombre: '', kg: 0 });
    setEditingMasterId(null);
    // Guardar usando la API /api/saveproduct/route.ts
    await saveProductApi({
      master: { id: newId, ...masterForm },
      method: editingMasterId !== null ? 'PUT_MASTER' : 'POST_MASTER',
    });
  };

  const handleEditMaster = (m: Master) => {
    setMasterForm({ nombre: m.nombre, kg: m.kg });
    setEditingMasterId(m.id);
    setShowMasterForm(true);
  };

  const handleDeleteMaster = async (id: number) => {
    setMasters((prev) => prev.filter((m) => m.id !== id));
    if (editingMasterId === id) {
      setEditingMasterId(null);
      setMasterForm({ nombre: '', kg: 0 });
      setShowMasterForm(false);
    }
    // Guardar usando la API /api/saveproduct/route.ts
    await saveProductApi({
      id,
      method: 'DELETE_MASTER',
    });
  };

  // --- Materia Prima Handlers ---

  const handleShowMateriaPrimaForm = () => {
    setShowMateriaPrimaForm(true);
    setEditingMateriaPrimaId(null);
    setMateriaPrimaForm({ nombre: '', kg: 0 });
  };

  const handleMateriaPrimaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setMateriaPrimaForm({
      ...materiaPrimaForm,
      [name]: type === 'number' ? Number(value) : value,
    });
  };

  const handleMateriaPrimaSubmit = async () => {
    if (!materiaPrimaForm.nombre.trim() || isNaN(materiaPrimaForm.kg) || materiaPrimaForm.kg < 0) {
      alert('Por favor, completa todos los campos correctamente.');
      return;
    }
    let newId = editingMateriaPrimaId ?? Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
    let updated: MateriaPrima[];
    if (editingMateriaPrimaId !== null) {
      updated = materiasPrimas.map((m) =>
        m.id === editingMateriaPrimaId ? { ...m, ...materiaPrimaForm, id: editingMateriaPrimaId } : m
      );
    } else {
      updated = [...materiasPrimas, { id: newId, ...materiaPrimaForm }];
    }
    setMateriasPrimas(updated);
    setShowMateriaPrimaForm(false);
    setMateriaPrimaForm({ nombre: '', kg: 0 });
    setEditingMateriaPrimaId(null);
    // Guardar usando la API /api/saveproduct/route.ts
    await saveProductApi({
      materiaPrima: { id: newId, ...materiaPrimaForm },
      method: editingMateriaPrimaId !== null ? 'PUT_MATERIAPRIMA' : 'POST_MATERIAPRIMA',
    });
  };

  const handleEditMateriaPrima = (m: MateriaPrima) => {
    setMateriaPrimaForm({ nombre: m.nombre, kg: m.kg });
    setEditingMateriaPrimaId(m.id);
    setShowMateriaPrimaForm(true);
  };

  const handleDeleteMateriaPrima = async (id: number) => {
    setMateriasPrimas((prev) => prev.filter((m) => m.id !== id));
    if (editingMateriaPrimaId === id) {
      setEditingMateriaPrimaId(null);
      setMateriaPrimaForm({ nombre: '', kg: 0 });
      setShowMateriaPrimaForm(false);
    }
    // Guardar usando la API /api/saveproduct/route.ts
    await saveProductApi({
      id,
      method: 'DELETE_MATERIAPRIMA',
    });
  };

  // --- Material Empaque Handlers ---

  const handleShowMaterialEmpaqueForm = () => {
    setShowMaterialEmpaqueForm(true);
    setEditingMaterialEmpaqueId(null);
    setMaterialEmpaqueForm({ nombre: '', unidades: 0 });
  };

  const handleMaterialEmpaqueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setMaterialEmpaqueForm({
      ...materialEmpaqueForm,
      [name]: type === 'number' ? Number(value) : value,
    });
  };

  const handleMaterialEmpaqueSubmit = async () => {
    if (!materialEmpaqueForm.nombre.trim() || isNaN(materialEmpaqueForm.unidades) || materialEmpaqueForm.unidades < 0) {
      alert('Por favor, completa todos los campos correctamente.');
      return;
    }
    let newId = editingMaterialEmpaqueId ?? Number(`${Date.now()}${Math.floor(Math.random() * 1000)}`);
    let updated: MaterialEmpaque[];
    if (editingMaterialEmpaqueId !== null) {
      updated = materialesEmpaque.map((m) =>
        m.id === editingMaterialEmpaqueId ? { ...m, ...materialEmpaqueForm, id: editingMaterialEmpaqueId } : m
      );
    } else {
      updated = [...materialesEmpaque, { id: newId, ...materialEmpaqueForm }];
    }
    setMaterialesEmpaque(updated);
    setShowMaterialEmpaqueForm(false);
    setMaterialEmpaqueForm({ nombre: '', unidades: 0 });
    setEditingMaterialEmpaqueId(null);
    // Guardar usando la API /api/saveproduct/route.ts
    await saveProductApi({
      materialEmpaque: { id: newId, ...materialEmpaqueForm },
      method: editingMaterialEmpaqueId !== null ? 'PUT_MATERIALEMPAQUE' : 'POST_MATERIALEMPAQUE',
    });
  };

  const handleEditMaterialEmpaque = (m: MaterialEmpaque) => {
    setMaterialEmpaqueForm({ nombre: m.nombre, unidades: m.unidades });
    setEditingMaterialEmpaqueId(m.id);
    setShowMaterialEmpaqueForm(true);
  };

  const handleDeleteMaterialEmpaque = async (id: number) => {
    setMaterialesEmpaque((prev) => prev.filter((m) => m.id !== id));
    if (editingMaterialEmpaqueId === id) {
      setEditingMaterialEmpaqueId(null);
      setMaterialEmpaqueForm({ nombre: '', unidades: 0 });
      setShowMaterialEmpaqueForm(false);
    }
    // Guardar usando la API /api/saveproduct/route.ts
    await saveProductApi({
      id,
      method: 'DELETE_MATERIALEMPAQUE',
    });
  };

  // --- Filtrado de productos de filamento ---
  const filteredProducts = useMemo(() => {
    const prods = filamentoProducts[selectedFilamento] || [];
    if (!search.trim()) return prods;
    const s = search.trim().toLowerCase();
    return prods.filter(
      (p) =>
        p.sku.toLowerCase().includes(s) ||
        p.nombre.toLowerCase().includes(s) ||
        p.materiaPrima?.toLowerCase().includes(s) ||
        p.colorMaster?.toLowerCase().includes(s) ||
        p.carretel?.toLowerCase().includes(s)
    );
  }, [filamentoProducts, selectedFilamento, search]);

  const dashboardData: CategoriesDashboardData = {
    filamentoProducts,
    tiposFilamento,
    masters,
    materiasPrimas,
    materialesEmpaque,
  };

  // --- Render ---

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  }

  if (!user) {
    return null;
  }

  if (user.role !== 'admin') {
    return (
      <Layout>
        <div className="w-full max-w-2xl mx-auto px-2 md:px-6 py-16 flex flex-col items-center">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Acceso restringido</h2>
            <p className="text-gray-600 mb-4">
              No tienes permisos para ver esta sección. Si crees que esto es un error, contacta a un administrador.
            </p>
            <Button label="Volver al inicio" onClick={() => router.push('/dashboard')} />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto px-2 md:px-6 py-4">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-8 gap-2">
          <TabButton label="Filamento" active={tab === 'filamento'} onClick={() => handleTab('filamento')} />
          <TabButton label="Master" active={tab === 'master'} onClick={() => handleTab('master')} />
          <TabButton label="Materia Prima" active={tab === 'materiaPrima'} onClick={() => handleTab('materiaPrima')} />
          <TabButton label="Material Empaque" active={tab === 'materialEmpaque'} onClick={() => handleTab('materialEmpaque')} />
        </div>

        {/* --- FILAMENTO --- */}
        {tab === 'filamento' && (
          <SectionCard
            title="Gestión de Filamentos"
            actions={
              <>
                <Button label="Agregar Tipo de Filamento" onClick={handleShowFilamentoForm} />
                <Button label="Agregar Producto" onClick={handleShowForm} />
              </>
            }
          >
            {/* Tipos de Filamento */}
            <div className="flex flex-wrap gap-2 mb-4">
              {tiposFilamento.map((fil) => (
                <div key={fil} className="flex items-center gap-1">
                  <Button
                    label={fil}
                    onClick={() => setSelectedFilamento(fil)}
                    className={`rounded-full px-4 py-1 text-sm font-medium border ${selectedFilamento === fil ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-blue-100'}`}
                  />
                  <Button
                    label="🗑️"
                    onClick={() => handleDeleteFilamento(fil)}
                    className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 rounded-full"
                    title="Eliminar tipo de filamento"
                  />
                </div>
              ))}
            </div>

            {/* Buscador */}
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <Input
                label="Buscar producto"
                name="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:w-1/3"
              />
            </div>

            {/* Formulario para agregar tipo de filamento */}
            {showFilamentoForm && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-30">
                <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
                  <h2 className="text-xl font-semibold mb-4">Agregar Nuevo Tipo de Filamento</h2>
                  <div className="flex gap-2">
                    <Input
                      label="Nombre del Tipo de Filamento"
                      name="newFilamento"
                      value={newFilamento}
                      onChange={e => setNewFilamento(e.target.value)}
                    />
                    <Button label="Guardar" onClick={handleAddFilamento} />
                    <Button label="Cancelar" onClick={() => setShowFilamentoForm(false)} />
                  </div>
                </div>
              </div>
            )}

            {/* Formulario para agregar/editar producto */}
            {showForm && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-30">
                <div className="bg-white p-6 rounded-xl shadow-lg max-w-xl w-full">
                  <h2 className="text-xl font-semibold mb-4">
                    {editingSku ? 'Editar Producto' : 'Agregar Nuevo Producto'}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <Input
                      label="SKU"
                      name="sku"
                      type="text"
                      value={form.sku}
                      onChange={handleChange}
                      disabled={!!editingSku}
                      placeholder="Ej: PLA-001"
                    />
                    <Input
                      label="Nombre"
                      name="nombre"
                      type="text"
                      value={form.nombre}
                      onChange={handleChange}
                    />
                    <Input
                      label="Tipo"
                      name="tipoFilamento"
                      type="text"
                      value={form.tipoFilamento}
                      onChange={handleChange}
                      disabled
                    />
                    <div>
                      <label className="block text-sm font-medium mb-1">Materia Prima</label>
                      <select
                        name="materiaPrima"
                        value={form.materiaPrima}
                        onChange={handleChange}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Selecciona una materia prima</option>
                        {materiasPrimas.length === 0 ? (
                          <option disabled value="">No hay materias primas registradas</option>
                        ) : (
                          materiasPrimas.map((mp) => (
                            <option key={mp.id} value={mp.nombre}>{mp.nombre}</option>
                          ))
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Color Master</label>
                      <select
                        name="colorMaster"
                        value={form.colorMaster}
                        onChange={handleChange}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Selecciona un color master</option>
                        {masters.length === 0 ? (
                          <option disabled value="">No hay masters registrados</option>
                        ) : (
                          masters.map((m) => (
                            <option key={m.id} value={m.nombre}>{m.nombre}</option>
                          ))
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Carretel</label>
                      <select
                        name="carretel"
                        value={form.carretel}
                        onChange={handleChange}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">Selecciona un carretel</option>
                        {materialesEmpaque.length === 0 ? (
                          <option disabled value="">No hay materiales de empaque registrados</option>
                        ) : (
                          materialesEmpaque.map((me) => (
                            <option key={me.id} value={me.nombre}>{me.nombre}</option>
                          ))
                        )}
                      </select>
                    </div>
                    <Input
                      label="Stock"
                      name="stock"
                      type="number"
                      value={form.stock}
                      onChange={handleChange}
                      min={0}
                    />
                  </div>
                  <div className="flex gap-4 justify-end">
                    <Button
                      label={editingSku ? 'Actualizar Producto' : 'Guardar Producto'}
                      onClick={handleSubmit}
                    />
                    <Button label="Cancelar" onClick={handleCancel} />
                  </div>
                </div>
              </div>
            )}

            {/* Tabla de productos */}
            <TableContainer>
              <table className="min-w-full">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="px-4 py-2 border-b font-semibold text-center">SKU</th>
                    <th className="px-4 py-2 border-b font-semibold text-center">Nombre</th>
                    <th className="px-4 py-2 border-b font-semibold text-center">Tipo</th>
                    <th className="px-4 py-2 border-b font-semibold text-center">Materia Prima</th>
                    <th className="px-4 py-2 border-b font-semibold text-center">Color Master</th>
                    <th className="px-4 py-2 border-b font-semibold text-center">Carretel</th>
                    <th className="px-4 py-2 border-b font-semibold text-center">Stock</th>
                    <th className="px-4 py-2 border-b font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-4 text-gray-500">
                        No hay productos registrados en este tipo de filamento.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.sku} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border-b text-center">{product.sku}</td>
                        <td className="px-4 py-2 border-b text-center">{product.nombre}</td>
                        <td className="px-4 py-2 border-b text-center">{product.tipoFilamento}</td>
                        <td className="px-4 py-2 border-b text-center">{product.materiaPrima}</td>
                        <td className="px-4 py-2 border-b text-center">{product.colorMaster}</td>
                        <td className="px-4 py-2 border-b text-center">{product.carretel}</td>
                        <td className="px-4 py-2 border-b text-center">{product.stock}</td>
                        <td className="px-4 py-2 border-b text-center">
                          <div className="flex justify-center gap-2">
                            <Button label="✏️ Editar" onClick={() => handleEdit(product)} />
                            <Button label="🗑️ Eliminar" onClick={() => handleDelete(product.sku)} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </TableContainer>
          </SectionCard>
        )}

        {/* --- MASTER --- */}
        {tab === 'master' && (
          <SectionCard
            title="Gestión de Master"
            actions={<Button label="Agregar Master" onClick={handleShowMasterForm} />}
          >
            {showMasterForm && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-30">
                <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
                  <h3 className="text-lg font-semibold mb-4">{editingMasterId ? 'Editar Master' : 'Agregar Master'}</h3>
                  <div className="flex flex-col gap-4">
                    <Input
                      label="Nombre"
                      name="nombre"
                      value={masterForm.nombre}
                      onChange={handleMasterChange}
                      list="master-list"
                      placeholder="Ej: PLA WHITE:00050"
                    />
                    <datalist id="master-list">
                      {MASTER_LIST.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                    <Input
                      label="Cantidad (kg)"
                      name="kg"
                      type="number"
                      value={masterForm.kg}
                      onChange={handleMasterChange}
                      min={0}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button label={editingMasterId ? 'Actualizar' : 'Guardar'} onClick={handleMasterSubmit} />
                      <Button label="Cancelar" onClick={() => { setShowMasterForm(false); setEditingMasterId(null); }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <TableContainer>
              <table className="min-w-full">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="px-4 py-2 border-b font-semibold text-center">ID</th>
                    <th className="px-4 py-2 border-b font-semibold text-center">Nombre</th>
                    <th className="px-4 py-2 border-b font-semibold text-center">Cantidad (kg)</th>
                    <th className="px-4 py-2 border-b font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {masters.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-gray-500">
                        No hay masters registrados.
                      </td>
                    </tr>
                  ) : (
                    masters.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border-b text-center">{m.id}</td>
                        <td className="px-4 py-2 border-b text-center">{m.nombre}</td>
                        <td className="px-4 py-2 border-b text-center">{m.kg}</td>
                        <td className="px-4 py-2 border-b text-center">
                          <div className="flex justify-center gap-2">
                            <Button label="✏️ Editar" onClick={() => handleEditMaster(m)} />
                            <Button label="🗑️ Eliminar" onClick={() => handleDeleteMaster(m.id)} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </TableContainer>
          </SectionCard>
        )}

        {/* --- MATERIA PRIMA --- */}
        {tab === 'materiaPrima' && (
          <SectionCard
            title="Gestión de Materia Prima"
            actions={<Button label="Agregar Materia Prima" onClick={handleShowMateriaPrimaForm} />}
          >
            {showMateriaPrimaForm && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-30">
                <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
                  <h3 className="text-lg font-semibold mb-4">{editingMateriaPrimaId ? 'Editar Materia Prima' : 'Agregar Materia Prima'}</h3>
                  <div className="flex flex-col gap-4">
                    <Input
                      label="Nombre"
                      name="nombre"
                      value={materiaPrimaForm.nombre}
                      onChange={handleMateriaPrimaChange}
                      list="materia-prima-list"
                      placeholder="Ej: PLA"
                    />
                    <datalist id="materia-prima-list">
                      {MATERIA_PRIMA_LIST.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                    <Input
                      label="Cantidad (kg)"
                      name="kg"
                      type="number"
                      value={materiaPrimaForm.kg}
                      onChange={handleMateriaPrimaChange}
                      min={0}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button label={editingMateriaPrimaId ? 'Actualizar' : 'Guardar'} onClick={handleMateriaPrimaSubmit} />
                      <Button label="Cancelar" onClick={() => { setShowMateriaPrimaForm(false); setEditingMateriaPrimaId(null); }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <TableContainer>
              <table className="min-w-full">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="px-4 py-2 border-b font-semibold text-center">ID</th>
                    <th className="px-4 py-2 border-b font-semibold text-center">Nombre</th>
                    <th className="px-4 py-2 border-b font-semibold text-center">Cantidad (kg)</th>
                    <th className="px-4 py-2 border-b font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {materiasPrimas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-gray-500">
                        No hay materias primas registradas.
                      </td>
                    </tr>
                  ) : (
                    materiasPrimas.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border-b text-center">{m.id}</td>
                        <td className="px-4 py-2 border-b text-center">{m.nombre}</td>
                        <td className="px-4 py-2 border-b text-center">{m.kg}</td>
                        <td className="px-4 py-2 border-b text-center">
                          <div className="flex justify-center gap-2">
                            <Button label="✏️ Editar" onClick={() => handleEditMateriaPrima(m)} />
                            <Button label="🗑️ Eliminar" onClick={() => handleDeleteMateriaPrima(m.id)} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </TableContainer>
          </SectionCard>
        )}

        {/* --- MATERIAL DE EMPAQUE --- */}
        {tab === 'materialEmpaque' && (
          <SectionCard
            title="Gestión de Material de Empaque"
            actions={<Button label="Agregar Material de Empaque" onClick={handleShowMaterialEmpaqueForm} />}
          >
            {showMaterialEmpaqueForm && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-30">
                <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full">
                  <h3 className="text-lg font-semibold mb-4">{editingMaterialEmpaqueId ? 'Editar Material de Empaque' : 'Agregar Material de Empaque'}</h3>
                  <div className="flex flex-col gap-4">
                    <Input
                      label="Nombre"
                      name="nombre"
                      value={materialEmpaqueForm.nombre}
                      onChange={handleMaterialEmpaqueChange}
                      list="material-empaque-list"
                      placeholder="Ej: Caja Cartón"
                    />
                    <datalist id="material-empaque-list">
                      {MATERIAL_EMPAQUE_LIST.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                    <Input
                      label="Cantidad (unidades)"
                      name="unidades"
                      type="number"
                      value={materialEmpaqueForm.unidades}
                      onChange={handleMaterialEmpaqueChange}
                      min={0}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button label={editingMaterialEmpaqueId ? 'Actualizar' : 'Guardar'} onClick={handleMaterialEmpaqueSubmit} />
                      <Button label="Cancelar" onClick={() => { setShowMaterialEmpaqueForm(false); setEditingMaterialEmpaqueId(null); }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <TableContainer>
              <table className="min-w-full">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="px-4 py-2 border-b font-semibold text-center">ID</th>
                    <th className="px-4 py-2 border-b font-semibold text-center">Nombre</th>
                    <th className="px-4 py-2 border-b font-semibold text-center">Cantidad (unidades)</th>
                    <th className="px-4 py-2 border-b font-semibold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {materialesEmpaque.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-gray-500">
                        No hay materiales de empaque registrados.
                      </td>
                    </tr>
                  ) : (
                    materialesEmpaque.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border-b text-center">{m.id}</td>
                        <td className="px-4 py-2 border-b text-center">{m.nombre}</td>
                        <td className="px-4 py-2 border-b text-center">{m.unidades}</td>
                        <td className="px-4 py-2 border-b text-center">
                          <div className="flex justify-center gap-2">
                            <Button label="✏️ Editar" onClick={() => handleEditMaterialEmpaque(m)} />
                            <Button label="🗑️ Eliminar" onClick={() => handleDeleteMaterialEmpaque(m.id)} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </TableContainer>
          </SectionCard>
        )}

        {/* --- JSON EXPORT --- */}
        <SectionCard title="Datos en formato JSON (para route.ts y cálculos)">
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto max-h-64">{JSON.stringify(dashboardData, null, 2)}</pre>
        </SectionCard>
      </div>
    </Layout>
  );
}