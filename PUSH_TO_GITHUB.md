# Instrucciones para Subir a GitHub

## Pasos para Reemplazar el Repositorio Dashboard-empresa-2025

### 1. Inicializar Git (si no está inicializado)
```bash
cd web
git init
```

### 2. Cambiar el Remote al Nuevo Repositorio
```bash
git remote remove origin
git remote add origin https://github.com/Zero1140/Dashboard-empresa-2025.git
```

### 3. Agregar Todos los Archivos
```bash
git add .
```

### 4. Hacer Commit
```bash
git commit -m "Reemplazo completo: Dashboard GST3D con integración Supabase"
```

### 5. Push Forzado para Reemplazar Todo
```bash
git push -f origin main
```

**⚠️ ADVERTENCIA**: El `-f` (force) reemplazará completamente el contenido del repositorio remoto.

## Alternativa: Script Automático

Ejecuta estos comandos en PowerShell desde la carpeta `web`:

```powershell
cd web
git init
git remote remove origin 2>$null
git remote add origin https://github.com/Zero1140/Dashboard-empresa-2025.git
git add .
git commit -m "Reemplazo completo: Dashboard GST3D con integración Supabase"
git branch -M main
git push -f origin main
```

