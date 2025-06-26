import { NextRequest, NextResponse } from 'next/server';

// Datos simulados en memoria
let produccion: { maquina: string, id: string, contador: string }[] = [];

export async function GET(req: NextRequest) {
  return NextResponse.json(produccion);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { maquina, id, contador } = body;

  if (!maquina || !id || !contador) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  // Guardar el registro
  produccion.push({ maquina, id, contador });

  console.log(`Guardado: Máquina=${maquina}, ID=${id}, Contador=${contador}`);

  return NextResponse.json({ message: 'Datos guardados correctamente' }, { status: 201 });
}