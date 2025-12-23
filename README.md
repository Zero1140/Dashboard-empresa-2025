# Dashboard GST3D

Sistema de gestión de etiquetas para impresión con integración Supabase.

## 🚀 Getting Started

### Desarrollo Local

Primero, instala las dependencias:

```bash
npm install
```

Luego, ejecuta el servidor de desarrollo:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

### Variables de Entorno

Crea un archivo `.env.local` con:

```
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_de_supabase
```

## 📦 Despliegue en Render

Este proyecto está configurado para Render usando **npm** (NO pnpm).

### Configuración Automática

El archivo `render.yaml` está incluido y Render lo detectará automáticamente.

### Configuración Manual en Render

Si prefieres configurar manualmente:

1. **Tipo de Servicio**: Web Service (NO Static Site, porque Next.js necesita SSR)
2. **Build Command**: `npm install && npm run build`
3. **Start Command**: `npm start`
4. **Node Version**: `22.16.0` (o superior)

### Variables de Entorno en Render

Configura estas variables en Render:

- `NEXT_PUBLIC_SUPABASE_URL` - URL de tu proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Clave pública (anon key) de Supabase

## 📚 Documentación

- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Guía completa de configuración de Supabase
- [CONFIGURACION_SUPABASE.md](./CONFIGURACION_SUPABASE.md) - Valores específicos de configuración
- [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) - Guía de despliegue en Render
- [README_SUPABASE.md](./README_SUPABASE.md) - Resumen de la integración con Supabase

## 🛠️ Tecnologías

- **Next.js 16** - Framework React
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **Supabase** - Base de datos PostgreSQL
- **React 19** - Biblioteca UI

## 📝 Scripts Disponibles

- `npm run dev` - Inicia servidor de desarrollo
- `npm run build` - Construye para producción
- `npm start` - Inicia servidor de producción
- `npm run lint` - Ejecuta ESLint

## ⚠️ Notas Importantes

- Este proyecto usa **npm**, NO pnpm ni yarn
- El archivo `package-lock.json` debe estar presente
- Render detectará automáticamente la configuración desde `render.yaml`
