/**
 * Test de la lógica de colores (sin React ni Supabase)
 * Simula el flujo: originales + personalizados - eliminados
 */

// Simular coloresPorTipo (estructura de data.ts)
const coloresPorTipo = {
  PLA: {
    chica: { BLACK: "#000000", RED: "#FF0000" },
    grande: { BLACK_GRANDE: "#000000", RED_GRANDE: "#FF0000" },
  },
};

// Simular caches (como en colores.ts)
let personalizadosCache = null;
let eliminadosCache = null;
let coloresCache = null;

function actualizarCacheColores(coloresPersonalizados) {
  if (coloresPersonalizados) {
    personalizadosCache = coloresPersonalizados;
  }

  const combinados = JSON.parse(JSON.stringify(coloresPorTipo));
  const personalizados = personalizadosCache || {};

  Object.keys(personalizados).forEach((tipo) => {
    if (!combinados[tipo]) combinados[tipo] = { chica: {}, grande: {} };
    if (personalizados[tipo].chica) {
      combinados[tipo].chica = { ...combinados[tipo].chica, ...personalizados[tipo].chica };
    }
    if (personalizados[tipo].grande) {
      combinados[tipo].grande = { ...combinados[tipo].grande, ...personalizados[tipo].grande };
    }
  });

  const eliminados = eliminadosCache || {};
  Object.keys(eliminados).forEach((tipo) => {
    if (combinados[tipo]) {
      (eliminados[tipo].chica || []).forEach((c) => delete combinados[tipo].chica[c]);
      (eliminados[tipo].grande || []).forEach((c) => delete combinados[tipo].grande[c]);
    }
  });

  coloresCache = combinados;
}

function obtenerColoresCombinadosSync() {
  return coloresCache || { ...coloresPorTipo };
}

// --- TESTS ---
let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log("  ✓", msg);
    passed++;
  } else {
    console.error("  ✗", msg);
    failed++;
  }
}

console.log("\n=== Test: Lógica de colores personalizados ===\n");

// Test 1: Agregar color nuevo
console.log("Test 1: Agregar color nuevo (NUEVOAZUL a PLA)");
const nuevosColores = {
  PLA: {
    chica: { NUEVOAZUL: "#0000FF" },
    grande: { NUEVOAZUL_GRANDE: "#0000FF" },
  },
};
actualizarCacheColores(nuevosColores);
const combinados = obtenerColoresCombinadosSync();
assert(combinados.PLA?.chica?.NUEVOAZUL === "#0000FF", "Color chica NUEVOAZUL existe");
assert(combinados.PLA?.grande?.NUEVOAZUL_GRANDE === "#0000FF", "Color grande NUEVOAZUL_GRANDE existe");
assert(combinados.PLA?.chica?.BLACK === "#000000", "Color original BLACK se mantiene");

// Test 2: Colores originales + personalizados combinados
console.log("\nTest 2: Originales + personalizados combinados");
const keysChica = Object.keys(combinados.PLA.chica);
assert(keysChica.includes("BLACK") && keysChica.includes("RED") && keysChica.includes("NUEVOAZUL"),
  "Chica tiene BLACK, RED y NUEVOAZUL");

// Test 3: Eliminación
console.log("\nTest 3: Eliminar color original (BLACK)");
eliminadosCache = { PLA: { chica: ["BLACK"], grande: ["BLACK_GRANDE"] } };
actualizarCacheColores();
const despuesEliminar = obtenerColoresCombinadosSync();
assert(!despuesEliminar.PLA?.chica?.BLACK, "BLACK chica eliminado");
assert(despuesEliminar.PLA?.chica?.NUEVOAZUL === "#0000FF", "NUEVOAZUL personalizado sigue");

// Test 4: Deep copy - no mutar original
console.log("\nTest 4: Original no mutado");
assert(coloresPorTipo.PLA.chica.BLACK === "#000000", "data.ts original intacto");

// Test 5: Variante "ambas" - chica y grande
console.log("\nTest 5: Color con variante ambas");
const conAmbas = {
  PLA: {
    chica: { NUEVOAZUL: "#0000FF", OTRO: "#00FF00" },
    grande: { NUEVOAZUL_GRANDE: "#0000FF", OTRO_GRANDE: "#00FF00" },
  },
};
actualizarCacheColores(conAmbas);
const conOtro = obtenerColoresCombinadosSync();
assert(conOtro.PLA?.chica?.OTRO === "#00FF00", "OTRO chica existe");
assert(conOtro.PLA?.grande?.OTRO_GRANDE === "#00FF00", "OTRO grande existe");

console.log("\n=== Resultado: " + passed + " pasaron, " + failed + " fallaron ===\n");
process.exit(failed > 0 ? 1 : 0);
