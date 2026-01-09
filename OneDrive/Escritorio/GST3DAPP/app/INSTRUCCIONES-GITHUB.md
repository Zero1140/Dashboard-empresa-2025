# 📤 INSTRUCCIONES PARA SUBIR PROYECTO A GITHUB

## 🎯 Objetivo
Subir el proyecto completo a GitHub para poder clonarlo en Mac usando GitHub Desktop.

---

## 📋 PASO 1: Verificar Estado Actual

El proyecto ya tiene un repositorio Git configurado:
- **Repositorio remoto:** `https://github.com/Zero1140/gst3d-push-server-g.git`
- **Commits pendientes:** 2 commits listos para subir

---

## 📋 PASO 2: Opciones para Subir

### Opción A: Usando GitHub Desktop (Recomendado)

1. **Abrir GitHub Desktop**
   - Abre GitHub Desktop en Windows

2. **Abrir el repositorio local**
   - Click en "File" → "Add Local Repository"
   - Navega a: `C:\Users\guill\OneDrive\Escritorio\GST3DAPP\app`
   - Click en "Add repository"

3. **Verificar cambios pendientes**
   - Deberías ver los commits pendientes en la pestaña "History"
   - Si hay cambios sin commitear, aparecerán en "Changes"

4. **Hacer commit de cambios pendientes (si hay)**
   - Si hay archivos nuevos o modificados:
     - Revisa los cambios
     - Escribe un mensaje de commit (ej: "Agregar documentación y scripts de verificación")
     - Click en "Commit to master"

5. **Hacer Push**
   - Click en el botón "Push origin" (arriba a la derecha)
   - O ve a "Repository" → "Push"

6. **Verificar en GitHub.com**
   - Ve a: https://github.com/Zero1140/gst3d-push-server-g
   - Verifica que todos los archivos estén subidos

---

### Opción B: Usando Línea de Comandos (Git Bash o PowerShell)

Si prefieres usar la terminal, ejecuta estos comandos:

```powershell
# 1. Verificar estado
git status

# 2. Agregar todos los archivos nuevos/modificados
git add .

# 3. Hacer commit (si hay cambios)
git commit -m "Agregar documentación completa y scripts de verificación"

# 4. Hacer push a GitHub
git push origin master
```

---

## 📋 PASO 3: Verificar que Todo Esté Subido

Después del push, verifica en GitHub.com que estén presentes:

### ✅ Archivos Críticos que DEBEN estar:
- `gst3d-app-main/` (toda la carpeta de la app)
- `gst3d-push-server-main/` (toda la carpeta del servidor)
- `PLAN-DETALLADO-WINDOWS-COMPLETO.md`
- `PLAN-MIGRACION-WINDOWS-A-MAC.md`
- `ESTADO-ACTUAL-PROYECTO.md`
- `INSTRUCCIONES-GITHUB.md` (este archivo)
- `.gitignore`

### 📁 Estructura Esperada en GitHub:
```
gst3d-push-server-g/
├── .gitignore
├── gst3d-app-main/
│   ├── ios/
│   ├── src/
│   ├── scripts/
│   └── package.json
├── gst3d-push-server-main/
│   ├── server.js
│   ├── supabase-client.js
│   ├── services/
│   └── package.json
└── Documentación/
    ├── PLAN-DETALLADO-WINDOWS-COMPLETO.md
    ├── PLAN-MIGRACION-WINDOWS-A-MAC.md
    └── ESTADO-ACTUAL-PROYECTO.md
```

---

## 📋 PASO 4: Clonar en Mac

Una vez que todo esté en GitHub:

### Usando GitHub Desktop en Mac:

1. **Abrir GitHub Desktop en Mac**
2. **Clonar el repositorio:**
   - Click en "File" → "Clone Repository"
   - Selecciona el repositorio: `gst3d-push-server-g`
   - Elige una ubicación (ej: `~/Documents/GST3DAPP/`)
   - Click en "Clone"

3. **Verificar que se clonó correctamente:**
   ```bash
   cd ~/Documents/GST3DAPP/app
   ls -la
   ```

### Usando Terminal en Mac:

```bash
# Navegar a donde quieres clonar
cd ~/Documents

# Clonar el repositorio
git clone https://github.com/Zero1140/gst3d-push-server-g.git GST3DAPP

# Entrar al directorio
cd GST3DAPP/app
```

---

## ⚠️ IMPORTANTE: Archivos que NO se Suben

El `.gitignore` está configurado para NO subir:
- `node_modules/` (se instalan con `npm install`)
- `.env` (variables de entorno - configurar manualmente)
- `firebase-service-account.json` (credenciales - configurar manualmente)
- `build/` (archivos compilados)
- Archivos temporales y backups

**Esto es correcto y seguro.** Estos archivos se generan o configuran localmente.

---

## 🔐 Configuración Necesaria en Mac

Después de clonar, necesitarás configurar:

### 1. Variables de Entorno del Servidor:
```bash
cd gst3d-push-server-main
# Crear archivo .env con:
# SUPABASE_URL=https://whmhsijczphqspjhgmkx.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=tu_key_aqui
```

### 2. Instalar Dependencias:
```bash
# En el servidor
cd gst3d-push-server-main
npm install

# En la app
cd ../gst3d-app-main
npm install
```

### 3. Configurar Firebase:
- Copiar `GoogleService-Info.plist` si no está en el repo (verificar primero)

---

## ✅ Checklist Final

Antes de cerrar en Windows:
- [ ] Todos los commits están en GitHub
- [ ] Verificaste en GitHub.com que todos los archivos están presentes
- [ ] Documentación actualizada
- [ ] `.gitignore` configurado correctamente

En Mac después de clonar:
- [ ] Repositorio clonado correctamente
- [ ] Dependencias instaladas (`npm install` en ambos proyectos)
- [ ] Variables de entorno configuradas
- [ ] Listo para seguir con configuración iOS

---

## 🆘 Solución de Problemas

### Error: "Permission denied"
- Verifica que tengas permisos de escritura en el repositorio de GitHub
- Verifica tu autenticación en GitHub Desktop

### Error: "Repository not found"
- Verifica que el repositorio existe en GitHub
- Verifica que estás autenticado con la cuenta correcta

### Archivos grandes no se suben
- GitHub tiene límite de 100MB por archivo
- Si hay archivos grandes, considera usar Git LFS o excluirlos del repo

---

## 📞 Siguiente Paso

Una vez que el proyecto esté en GitHub y clonado en Mac:
1. Seguir: `gst3d-app-main/ios/CONFIGURACION-XCODE.md`
2. Seguir: `gst3d-app-main/ios/CONFIGURACION-APNS.md`
3. Ejecutar: `gst3d-app-main/scripts/verify-ios-setup.sh`

¡Buena suerte! 🚀




