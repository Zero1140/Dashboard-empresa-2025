# 🔧 Corrección: Stock de Bobinas

## ❌ Problema Identificado

El sistema estaba **incorrectamente** sumando stock de dos colores diferentes:
- `CRYSTAL` para etiquetas chicas
- `CRYSTAL_GRANDE` para etiquetas grandes

Esto creaba **duplicidad** en el stock, cuando en realidad:
- **Hay UNA SOLA bobina** con un solo color
- Las etiquetas chicas y grandes son solo para **imprimir**, no para el stock
- El stock debe ser del **color base** (sin `_GRANDE`)

## ✅ Corrección Implementada

### **Antes (Incorrecto):**
```typescript
// Sumaba stock de dos colores diferentes
await sumarStock(tipoChica, colorChica, cantidadChicas);  // CRYSTAL
await sumarStock(tipoGrande, colorGrande, cantidadGrandes); // CRYSTAL_GRANDE
```

### **Ahora (Correcto):**
```typescript
// Obtener el color base (sin _GRANDE)
const colorBase = colorChica.replace(/_GRANDE$/, "");
const tipoMaterialBase = tipoChica;

// Calcular cuántas bobinas se crearon (1 bobina = 1 chica + 1 grande)
const bobinasCreadas = Math.min(cantidadChicas, cantidadGrandes);

// Sumar al stock del color base la cantidad de bobinas creadas
if (bobinasCreadas > 0) {
  await sumarStock(tipoMaterialBase, colorBase, bobinasCreadas);
}
```

## 📊 Funcionamiento Correcto

### **Ejemplo:**
- Usuario imprime: **3 etiquetas chicas** y **3 etiquetas grandes** de **CRYSTAL PLA**
- **Bobinas creadas:** `Math.min(3, 3) = 3 bobinas`
- **Stock sumado:** `sumarStock("PLA", "CRYSTAL", 3)` ✅
- **Descuentos:**
  - 3 cajas de 1k
  - 3 bolsas selladas

### **Otro Ejemplo:**
- Usuario imprime: **5 etiquetas chicas** y **2 etiquetas grandes** de **RED PLA**
- **Bobinas creadas:** `Math.min(5, 2) = 2 bobinas`
- **Stock sumado:** `sumarStock("PLA", "RED", 2)` ✅
- **Descuentos:**
  - 2 cajas de 1k
  - 2 bolsas selladas

## 🎯 Cambios Realizados

1. ✅ **Extracción del color base:** Remover sufijo `_GRANDE` del color
2. ✅ **Cálculo de bobinas:** `Math.min(cantidadChicas, cantidadGrandes)`
3. ✅ **Suma de stock:** Solo al color base, por cantidad de bobinas
4. ✅ **Descuentos:** Se mantienen igual (1 caja + 1 bolsa por bobina)

## 📝 Notas Importantes

- **Una bobina = 1 chica + 1 grande**
- **El stock es del color base** (sin `_GRANDE`)
- **Las etiquetas chicas y grandes son solo para imprimir**, no afectan el stock individualmente
- **Los descuentos de cajas y bolsas funcionan correctamente** (1 por bobina)

## ✅ Verificación

- ✅ No hay duplicidad en el stock
- ✅ El stock se suma correctamente al color base
- ✅ Los descuentos de cajas y bolsas funcionan correctamente
- ✅ El sistema de conteo de etiquetas se mantiene igual


