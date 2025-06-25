import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Tipos de datos
interface MateriaPrima {
  id: number;
  nombre: string;
  kg: number;
}

interface Master {
  id: number;
  nombre: string;
  kg: number;
}

interface Product {
  sku: string;
  nombre: string;
  tipoFilamento: string;
  materiaPrima: string;
  colorMaster: string;
  carretel: string;
  stock: number;
}

interface MaterialEmpaque {
  id: number;
  nombre: string;
  unidades: number;
}

interface FilamentoProducts {
  [tipoFilamento: string]: Product[];
}

interface CategoriesDashboardData {
  filamentoProducts: FilamentoProducts;
  tiposFilamento: string[];
  masters: Master[];
  materiasPrimas: MateriaPrima[];
  materialesEmpaque: MaterialEmpaque[];
}

// Ruta al archivo JSON
const DATA_PATH = path.resolve(process.cwd(), 'src/lib/productdata.json');

// Lee los datos actuales
function readProductData(): CategoriesDashboardData {
  if (!fs.existsSync(DATA_PATH)) {
    const initialData: CategoriesDashboardData = {
      filamentoProducts: {},
      tiposFilamento: [],
      masters: [],
      materiasPrimas: [],
      materialesEmpaque: [],
    };
    fs.writeFileSync(DATA_PATH, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

// Escribe los datos en el archivo
function writeProductData(data: CategoriesDashboardData) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Manejo del método POST
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const data = readProductData();

    // Productos
    if (payload.method === 'POST') {
      const { producto, tipoFilamento } = payload;
      if (!data.filamentoProducts[tipoFilamento]) {
        data.filamentoProducts[tipoFilamento] = [];
        if (!data.tiposFilamento.includes(tipoFilamento)) {
          data.tiposFilamento.push(tipoFilamento);
        }
      }
      data.filamentoProducts[tipoFilamento].push(producto);
    }

    if (payload.method === 'PUT') {
      const { producto, tipoFilamento } = payload;
      if (!data.filamentoProducts[tipoFilamento]) {
        return NextResponse.json({ error: 'Tipo de filamento no encontrado' }, { status: 404 });
      }
      data.filamentoProducts[tipoFilamento] = data.filamentoProducts[tipoFilamento].map((p: Product) =>
        p.sku === producto.sku ? { ...producto } : p
      );
    }

    if (payload.method === 'DELETE') {
      const { sku, tipoFilamento } = payload;
      if (data.filamentoProducts[tipoFilamento]) {
        data.filamentoProducts[tipoFilamento] = data.filamentoProducts[tipoFilamento].filter((p) => p.sku !== sku);
      }
    }

    if (payload.method === 'POST_FILAMENTO') {
      const { tipoFilamento } = payload;
      if (!data.tiposFilamento.includes(tipoFilamento)) {
        data.tiposFilamento.push(tipoFilamento);
        data.filamentoProducts[tipoFilamento] = [];
      }
    }

    if (payload.method === 'DELETE_FILAMENTO') {
      const { tipoFilamento } = payload;
      delete data.filamentoProducts[tipoFilamento];
      data.tiposFilamento = data.tiposFilamento.filter((t) => t !== tipoFilamento);
    }

    // Master
    if (payload.method === 'POST_MASTER') {
      data.masters.push(payload.master);
    }

    if (payload.method === 'PUT_MASTER') {
      data.masters = data.masters.map((m) =>
        m.id === payload.master.id ? { ...payload.master } : m
      );
    }

    if (payload.method === 'DELETE_MASTER') {
      data.masters = data.masters.filter((m) => m.id !== payload.id);
    }

    // Materia Prima
    if (payload.method === 'POST_MATERIAPRIMA') {
      data.materiasPrimas.push(payload.materiaPrima);
    }

    if (payload.method === 'PUT_MATERIAPRIMA') {
      data.materiasPrimas = data.materiasPrimas.map((m) =>
        m.id === payload.materiaPrima.id ? { ...payload.materiaPrima } : m
      );
    }

    if (payload.method === 'DELETE_MATERIAPRIMA') {
      data.materiasPrimas = data.materiasPrimas.filter((m) => m.id !== payload.id);
    }

    // Material Empaque
    if (payload.method === 'POST_MATERIALEMPAQUE') {
      data.materialesEmpaque.push(payload.materialEmpaque);
    }

    if (payload.method === 'PUT_MATERIALEMPAQUE') {
      data.materialesEmpaque = data.materialesEmpaque.map((m) =>
        m.id === payload.materialEmpaque.id ? { ...payload.materialEmpaque } : m
      );
    }

    if (payload.method === 'DELETE_MATERIALEMPAQUE') {
      data.materialesEmpaque = data.materialesEmpaque.filter((m) => m.id !== payload.id);
    }

    writeProductData(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en API saveproduct:', error);
    return NextResponse.json({ error: 'Error procesando la solicitud' }, { status: 500 });
  }
}