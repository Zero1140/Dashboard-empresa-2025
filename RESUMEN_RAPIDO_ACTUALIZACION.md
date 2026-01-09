# Resumen Rápido: Actualizar Render y Supabase

## ⚡ Pasos Rápidos

### 1️⃣ Supabase (2 minutos)

1. Ve a: https://supabase.com/dashboard
2. Abre tu proyecto
3. Click en **SQL Editor** (menú lateral)
4. Click en **New Query**
5. Copia y pega esto:

```sql
ALTER TABLE impresiones 
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'impresa', 'error'));

CREATE INDEX IF NOT EXISTS idx_impresiones_estado ON impresiones(estado) WHERE estado = 'pendiente';

UPDATE impresiones SET estado = 'impresa' WHERE estado IS NULL;
```

6. Click en **Run** (Ctrl+Enter)
7. ✅ Listo!

---

### 2️⃣ Render (3 minutos)

#### Si usas GitHub (Automático):

```bash
cd web
git add .
git commit -m "Agregar sistema de impresión con estado pendiente/impresa"
git push
```

Render se actualizará automáticamente en 2-3 minutos.

#### Si NO usas GitHub:

Sube los archivos manualmente en Render Dashboard.

---

### 3️⃣ Verificar (1 minuto)

1. Abre tu app en Render: https://dashboard-empresa-2025.onrender.com/
2. Haz una prueba: Imprime una etiqueta
3. Ve a Supabase > Table Editor > impresiones
4. Verifica que `estado = 'pendiente'` ✅

---

## ✅ Listo!

Ahora las impresiones se guardan con `estado='pendiente'` y el servicio Python puede leerlas e imprimirlas.

---

📖 Para más detalles, ver: `PASOS_ACTUALIZACION_RENDER_SUPABASE.md`






