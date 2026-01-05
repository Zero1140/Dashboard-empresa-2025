# Guía de Deploy - Dashboard GST3D

Esta guía te ayudará a sincronizar tu código con Git y hacer el deploy a Render.

## Prerequisitos

1. **Git instalado** en tu computadora
2. **Cuenta de GitHub** (o el repositorio remoto que uses)
3. **Cuenta de Render** con el servicio configurado
4. **Acceso a Supabase** con las tablas configuradas

## Paso 1: Configurar Git (Solo la primera vez)

### 1.1 Verificar si Git está configurado

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

### 1.2 Inicializar repositorio (si no existe)

Si es la primera vez que trabajas con este proyecto:

```bash
cd C:\Users\guill\Desktop\dashboardgst3d\web
git init
```

### 1.3 Agregar repositorio remoto

Si ya tienes un repositorio en GitHub:

```bash
git remote add origin https://github.com/tu-usuario/tu-repositorio.git
```

O si ya existe, verifica con:

```bash
git remote -v
```

## Paso 2: Preparar cambios para commit

### 2.1 Ver el estado actual

```bash
git status
```

Esto mostrará todos los archivos modificados, nuevos o eliminados.

### 2.2 Agregar archivos al staging

Para agregar todos los cambios:

```bash
git add .
```

O para agregar archivos específicos:

```bash
git add app/utils/operadores.ts
git add app/utils/colores.ts
# etc...
```

### 2.3 Verificar lo que se va a commitear

```bash
git status
```

Deberías ver los archivos listados en verde bajo "Changes to be committed".

## Paso 3: Hacer commit

### 3.1 Crear el commit

```bash
git commit -m "Implementar sincronización Realtime completa con Supabase

- Agregar Realtime para operadores personalizados y eliminados
- Agregar Realtime para colores personalizados y eliminados
- Agregar Realtime para stock mínimos
- Agregar Realtime para contador de etiquetas
- Agregar Realtime para PINs de operadores
- Actualizar useRealtimeSync con todas las suscripciones
- Actualizar componentes para usar funciones asíncronas"
```

**Nota:** Puedes personalizar el mensaje del commit según tus preferencias.

## Paso 4: Sincronizar con el repositorio remoto

### 4.1 Verificar la rama actual

```bash
git branch
```

### 4.2 Hacer push al repositorio remoto

Si es la primera vez o si trabajas en la rama `main`:

```bash
git push -u origin main
```

Si trabajas en otra rama (por ejemplo, `master`):

```bash
git push -u origin master
```

Si ya hiciste push anteriormente:

```bash
git push
```

### 4.3 Si hay conflictos

Si Git te indica que hay conflictos o que necesitas hacer pull primero:

```bash
git pull origin main
```

Resuelve los conflictos si los hay, y luego:

```bash
git add .
git commit -m "Resolver conflictos"
git push
```

## Paso 5: Deploy automático en Render

Si tienes configurado el **Auto-Deploy** en Render:

1. Render detectará automáticamente el nuevo commit
2. Iniciará el proceso de build
3. Desplegará la nueva versión

### 5.1 Verificar el deploy

1. Ve a tu dashboard de Render: https://dashboard.render.com
2. Selecciona tu servicio
3. Ve a la pestaña "Events" o "Logs"
4. Verifica que el deploy se esté ejecutando correctamente

### 5.2 Si el deploy falla

Revisa los logs en Render para identificar el error. Errores comunes:

- **Build errors**: Problemas de compilación (revisa la consola)
- **Environment variables**: Variables de entorno faltantes
- **Dependencies**: Paquetes no instalados correctamente

## Paso 6: Verificar que todo funciona

### 6.1 Verificar la aplicación

1. Abre tu aplicación en Render: `https://dashboard-empresa-2025.onrender.com`
2. Verifica que la aplicación carga correctamente
3. Prueba las funcionalidades principales

### 6.2 Verificar Realtime

1. Abre la aplicación en dos navegadores diferentes (o dos pestañas)
2. Realiza un cambio en una pestaña (por ejemplo, agregar una categoría)
3. Verifica que el cambio aparece automáticamente en la otra pestaña

### 6.3 Verificar Supabase

1. Ve a tu dashboard de Supabase
2. Verifica que las tablas tienen datos
3. Verifica que Realtime está habilitado en las tablas necesarias

## Comandos útiles de Git

### Ver historial de commits

```bash
git log --oneline
```

### Ver diferencias antes de commitear

```bash
git diff
```

### Deshacer cambios no commiteados

```bash
git restore .
```

### Ver ramas

```bash
git branch -a
```

### Cambiar de rama

```bash
git checkout nombre-de-rama
```

### Crear nueva rama

```bash
git checkout -b nueva-rama
```

## Configuración de Supabase

Asegúrate de que las siguientes tablas tengan Realtime habilitado:

1. `categorias`
2. `stock`
3. `stock_categorias`
4. `operadores_asignados`
5. `colores_maquinas`
6. `operadores_personalizados`
7. `operadores_eliminados`
8. `colores_personalizados`
9. `colores_eliminados`
10. `contador_etiquetas`
11. `pins_operadores`
12. `stock_minimos`

### Habilitar Realtime en Supabase

1. Ve a tu proyecto en Supabase
2. Ve a "Database" > "Replication"
3. Para cada tabla, activa "Enable Replication"
4. O usa el SQL Editor para habilitar:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE categorias;
ALTER PUBLICATION supabase_realtime ADD TABLE stock;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_categorias;
ALTER PUBLICATION supabase_realtime ADD TABLE operadores_asignados;
ALTER PUBLICATION supabase_realtime ADD TABLE colores_maquinas;
ALTER PUBLICATION supabase_realtime ADD TABLE operadores_personalizados;
ALTER PUBLICATION supabase_realtime ADD TABLE operadores_eliminados;
ALTER PUBLICATION supabase_realtime ADD TABLE colores_personalizados;
ALTER PUBLICATION supabase_realtime ADD TABLE colores_eliminados;
ALTER PUBLICATION supabase_realtime ADD TABLE contador_etiquetas;
ALTER PUBLICATION supabase_realtime ADD TABLE pins_operadores;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_minimos;
```

## Troubleshooting

### Error: "fatal: not a git repository"

Solución: Ejecuta `git init` en la carpeta del proyecto.

### Error: "fatal: remote origin already exists"

Solución: Usa `git remote set-url origin https://github.com/tu-usuario/tu-repositorio.git` para cambiar la URL.

### Error: "Updates were rejected"

Solución: Haz `git pull` primero, resuelve conflictos si los hay, y luego `git push`.

### El deploy no se activa automáticamente

Solución: 
1. Verifica que Auto-Deploy esté habilitado en Render
2. Verifica que estás haciendo push a la rama correcta (main/master)
3. Verifica los webhooks de GitHub en Render

### Los cambios no aparecen en tiempo real

Solución:
1. Verifica que Realtime está habilitado en Supabase
2. Verifica que las variables de entorno de Supabase están configuradas en Render
3. Revisa la consola del navegador para errores
4. Verifica que las suscripciones Realtime se están creando correctamente

## Resumen del flujo completo

```bash
# 1. Ver cambios
git status

# 2. Agregar cambios
git add .

# 3. Hacer commit
git commit -m "Descripción de los cambios"

# 4. Subir a GitHub
git push

# 5. Render detecta el cambio y hace deploy automáticamente
# 6. Verificar que todo funciona en producción
```

## Notas importantes

- **Nunca commitees** archivos sensibles como `.env` con credenciales
- **Siempre verifica** que el build funciona localmente antes de hacer push
- **Revisa los logs** de Render si algo falla
- **Haz commits frecuentes** con mensajes descriptivos
- **Mantén sincronizado** tu repositorio local con el remoto

¡Listo! Con esta guía deberías poder sincronizar tus cambios y hacer deploy sin problemas.

