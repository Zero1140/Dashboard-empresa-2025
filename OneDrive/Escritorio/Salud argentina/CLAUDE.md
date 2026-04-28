# CLAUDE.md — SaludOS Argentina

> Sistema operativo de infraestructura de salud digital para el mercado argentino.
> Híbrido estratégico de CareValidate + OpenLoop Health, adaptado al contexto regulatorio y de financiadores de Argentina.

---

## Visión del Proyecto

Construir la capa de infraestructura B2B que permite a obras sociales, prepagas, empleadores y startups de salud lanzar o escalar servicios de salud digital en Argentina, resolviendo los dos problemas que ningún competidor local resuelve hoy de forma integrada:

1. **Credencialización multi-jurisdicción** de profesionales de la salud (24 provincias)
2. **Verificación de cobertura en tiempo real** contra 800+ financiadores del sistema

---

## Análisis de Referencia: CareValidate vs OpenLoop

### CareValidate — Lo que aporta al modelo

**Qué hace:** Stack completo white-label de backend para telemedicina. No es solo credencialización — es infraestructura end-to-end para que una empresa lance un negocio de salud digital en 30 días.

**Componentes clave que tomamos como referencia:**

| Componente CareValidate | Equivalente en SaludOS AR |
|------------------------|--------------------------|
| Carrie AI Engine (eligibility verification automatizada) | Motor de verificación PMO multi-financiador en tiempo real |
| Provider Network (+10K profesionales, 50 estados) | Red de profesionales habilitados multi-provincia (REFEPS + colegios) |
| Pharmacy routing (mail order + compounding) | Integración prescripción electrónica → farmacias (Farmacity, cadenas) |
| White-label completo con branding propio | White-label para obras sociales y prepagas |
| SOC 2 Type II + HIPAA compliance | Cumplimiento Ley 25.326 (datos) + ReNaPDiS + Res. 5744/2024 |
| Intake forms + e-prescribing integrado | Receta electrónica (Ley 27.553 obligatoria desde julio 2024) |
| Programas propios (GLP-1, HRT, TRT) | Protocolos clínicos propios para condiciones de alta prevalencia AR |

**Diferencia crítica vs. nuestro contexto:** CareValidate está optimizado para el modelo D2C y B2B2C de salud digital americana (compounding pharma, cash-pay). En Argentina el modelo es B2B2C via financiadores — el PMO es el piso regulatorio y las obras sociales son el canal principal.

---

### OpenLoop Health — Lo que aporta al modelo

**Qué hace:** Infraestructura white-label para lanzar virtual care, con énfasis en la capa de habilitación regulatoria (licensing, credentialing, payer contracts) y RCM.

**Componentes clave que tomamos como referencia:**

| Componente OpenLoop | Equivalente en SaludOS AR |
|--------------------|--------------------------|
| Licensing & Credentialing NCQA-certified (50 estados, 6-8 semanas) | Credencialización multi-provincia (24 jurisdicciones, colegios médicos) |
| 600+ payer contracts, cobertura 250M vidas | Contratos marco con obras sociales y prepagas (empezar top-10) |
| RCM (Revenue Cycle Management) centralizado | Facturación centralizada contra financiadores del sistema |
| EHR propietario + API-driven (launch en 48h) | EHR mínimo + API layer para integrar con sistemas existentes |
| Provider Staffing (30+ especialidades, 15 idiomas) | Red de profesionales de guardia para cobertura de especialidades |
| 100+ protocolos clínicos | Protocolos validados para las patologías del PMO de alta frecuencia |

**Diferencia crítica vs. nuestro contexto:** OpenLoop hace credencialización en estados americanos, donde el sistema es federalizado pero los licencing boards tienen APIs y procesos estandarizados. En Argentina, cada colegio médico provincial es una corporación autónoma con procesos heterogéneos — el problema técnico es más complejo pero también más defensible.

---

### Síntesis: Qué construimos nosotros

```
SaludOS Argentina = 
  CareValidate (stack end-to-end, white-label, pharmacy, AI engine)
  + OpenLoop (credentialing multi-jurisdicción, payer contracts, RCM)
  - Compounding pharma americano (no aplica en AR)
  - Cash-pay D2C (el canal primario es financiadores, no pacientes directos)
  + Capa de fragmentación argentina (800+ financiadores sin API unificada)
  + Adaptación regulatoria local (ReNaPDiS, Ley 27.553, Res. 5744)
```

---

## Las 5 Brechas que Resolvemos

### Brecha 1 — Bus de Elegibilidad Multi-Financiador
No existe API unificada de verificación de cobertura en tiempo real en Argentina. La Resolución 5744/2024 exige interoperabilidad pero la implementación es incipiente. Construimos la capa de agregación.

**Target inicial:** Top-10 financiadores (OSDE, Swiss Medical, Galeno, Medifé, IOMA, PAMI, OSSEG, Sancor Salud, Accordia, OSECAC) = ~70% de afiliados del sistema.

### Brecha 2 — Credencialización Multi-Jurisdicción
REFEPS/SISA digitaliza la consulta de matrículas pero NO gestiona el proceso de habilitación. Un médico que quiere ejercer telemedicina en múltiples provincias necesita tramitar manualmente con cada colegio médico provincial. Automatizamos este flujo.

**Pain point concreto:** La credencial digital nacional (Res. 3320/2024) NO habilita ejercicio en Provincia de Buenos Aires — sigue requiriendo matrícula del Colegio Médico provincial. Esto es el problema que resolvemos.

### Brecha 3 — Infraestructura White-Label End-to-End
Doc24 (el incumbente más fuerte) solo ofrece la capa de videoconsulta white-label. No incluye: credencialización de red propia, verificación de cobertura, RCM, farmacia integrada, ni protocolos clínicos. Somos el stack completo.

### Brecha 4 — Repositorio Único de Credenciales (CAQH Argentino)
No existe equivalente a CAQH ProView en Argentina. Cada financiador hace su propio onboarding de prestadores. Los médicos cargan sus datos repetidamente. Creamos el single source of truth conectado a REFEPS.

### Brecha 5 — Prescripción + Farmacia + Cobertura en Flujo Único
Receta electrónica obligatoria desde julio 2024, pero la integración prescripción → cobertura → farmacia no existe como producto de mercado. La construimos sobre el rail de la Ley 27.553.

---

## Modelo de Negocio

### Segmentos (en orden de prioridad de go-to-market)

```
Fase 1 (0-12 meses)   → Prepagas medianas + empleadores grandes
                          (decisión rápida, ticket accesible, casos de uso validables)

Fase 2 (12-30 meses)  → Obras sociales sindicales (~300 obras sociales, muchas pequeñas,
                          alta necesidad de modernización, presupuesto limitado)

Fase 3 (30+ meses)    → PAMI, IOMA, OSDE, Swiss Medical
                          (contratos grandes, ciclo largo, posiciona como infraestructura nacional)
```

### Revenue Streams
- **SaaS fee mensual** por organización (basado en volumen de beneficiarios)
- **Per-transaction fee** sobre verificaciones de elegibilidad
- **Setup fee** de credencialización de red de prestadores
- **Revenue share** opcional sobre prescripciones enrutadas (largo plazo)

---

## Arquitectura del Sistema

### Principio rector
El sistema de salud argentino es fragmentado por diseño — 800+ financiadores, 24 jurisdicciones, APIs heterogéneas, regulaciones que cambian cada 6 meses. La arquitectura no unifica todo: **abraza la fragmentación** con una capa de conectores intercambiables encima de un core estable.

### Las 6 decisiones arquitectónicas fundamentales

**1. Monolito modular, no microservicios**
Los tres engines (Credentialing, Eligibility, E-prescription) viven en el mismo proceso FastAPI como packages Python con interfaces limpias. Cuando un engine necesite escalar independiente, los límites ya estarán definidos para extraerlo. Microservicios desde el día 1 = overhead operativo innecesario y regulación que cambia varios servicios a la vez.

**2. Connector pattern para todos los externos**
Cada sistema externo (REFEPS, OSDE, Farmalink, Swiss Medical, futuros) es una clase Python que implementa una interfaz abstracta común. Agregar un nuevo financiador = agregar una clase, sin tocar el core. Cambio en API de OSDE = solo cambia ese conector. Un mock conector por externo para tests.

**3. FHIR R4 como formato canónico interno**
No inventar schemas propietarios para entidades de salud. Practitioner, Patient, Coverage, MedicationRequest usan FHIR R4 — estándar mandatado por el Ministerio que OSDE ya usa en producción. Nuevos financiadores con FHIR nativo = integración trivial.

**4. Multi-tenancy con row-level security desde el día 1**
Un solo DB, un solo schema, RLS en PostgreSQL. Aislamiento garantizado a nivel de motor de DB, no solo de aplicación. Escala a cientos de tenants sin multiplicar infraestructura.

**5. Async + circuit breakers en todos los externos**
REFEPS WS tarda 3-8 segundos y tiene downtime. Reglas para cada llamada externa:
- Asíncrona (FastAPI async + Celery para procesos largos)
- Circuit breaker: 3 fallos → modo degradado, nunca error 500 al cliente
- Cache Redis 24hs para resultados de verificación de matrícula
- Fallback documentado: qué hace el sistema si el externo no responde

**6. API versionada + feature flags por tenant desde el primer endpoint**
Todos los endpoints con prefijo `/v1/`. Feature flags por tenant en tabla `tenant_features` para habilitar/deshabilitar capacidades sin deployar. Regla: cuando la regulación cambia (y cambiará), no se rompen clientes en producción.

### Anti-patrones a evitar

| Anti-patrón | Por qué falla en Argentina |
|-------------|---------------------------|
| Microservicios desde el día 1 | Overhead alto, regulación cambia varios servicios juntos |
| Schemas propietarios para datos de salud | Incompatible con FHIR, reinventa lo que ya existe |
| Un DB por tenant | 800+ financiadores = 800+ bases, imposible de mantener |
| Confiar en que los externos siempre responden | REFEPS WS y OSDE tienen downtime real |
| Verificación síncrona de matrícula en el request path | El WS de REFEPS puede tardar 3-8 segundos |
| Hardcodear lógica de cobertura por financiador | Cada OS tiene sus propias reglas del PMO |

### Stack Tecnológico

| Capa | Tecnología | Razón |
|------|-----------|-------|
| API | FastAPI (Python, async) | Consistente con el stack del proyecto, async nativo |
| DB | PostgreSQL + RLS | Multi-tenancy a nivel motor, FHIR-friendly |
| Queue | Redis + Celery | Procesos de credencialización lentos y asíncronos |
| Cache | Redis | Resultados de REFEPS WS (TTL 24hs) |
| Auth | OAuth2 + JWT, roles multi-tenant | Una OS no ve datos de otra |
| Estándar datos | FHIR R4 + SNOMED CT | Mandatado por Ministerio, compatible con OSDE |
| Infra MVP | Docker + Render o Railway | Mínimo operativo, PostgreSQL managed |
| Infra escala | AWS/GCP | Cuando el volumen lo justifique |
| Testing | pytest, ≥ 90% en engines críticos | Errores en credencialización tienen consecuencias legales |

```
┌──────────────────────────────────────────────────────┐
│                   CLIENTES (B2B)                      │
│  Prepagas · Obras Sociales · Empleadores · Startups   │
└──────────────────┬───────────────────────────────────┘
                   │ REST API /v1/ + SDK white-label
┌──────────────────▼───────────────────────────────────┐
│             SaludOS — Monolito Modular                │
│                                                       │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────┐  │
│  │ Credentialing│ │  Eligibility │ │ E-Prescription│  │
│  │    Engine    │ │    Engine    │ │    Module     │  │
│  └──────┬───────┘ └──────┬───────┘ └──────┬────────┘  │
│         │                │                │           │
│  ┌──────▼───────────────▼────────────────▼────────┐   │
│  │           Connector Layer (Abstract Base)       │   │
│  │  REFEPS · OSDE FHIR · Farmalink · [futuros]    │   │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  PostgreSQL (RLS)  ·  Redis (cache + queue)  · Celery │
└───────────────────────────────────────────────────────┘
```

---

## Dominio: Glosario Crítico del Sistema de Salud Argentino

| Término | Definición |
|---------|-----------|
| **PMO** | Programa Médico Obligatorio — piso de cobertura que todas las obras sociales y prepagas deben garantizar |
| **Obra Social** | Seguro de salud vinculado al empleo formal y sindicatos (~300 nacionales + 24 provinciales) |
| **Prepaga** | Empresa privada de salud (~500 entidades, reguladas por Ley 26.682) |
| **PAMI** | Instituto Nacional de Servicios Sociales para Jubilados — ~5.5M beneficiarios |
| **IOMA** | Instituto de Obra Médico Asistencial — obra social de la Pcia. de Bs. As. |
| **REFEPS** | Red Federal de Registros de Profesionales de la Salud — sistema nacional gestionado vía SISA |
| **SISA** | Sistema Integrado de Información Sanitaria Argentino — plataforma del Ministerio de Salud |
| **RNAS / RNOS** | Registro Nacional de Agentes del Seguro de Salud — administrado por la SSS |
| **SSS** | Superintendencia de Servicios de Salud — organismo regulador de obras sociales y prepagas |
| **ReNaPDiS** | Registro Nacional de Plataformas Digitales Sanitarias — registro obligatorio para plataformas digitales de salud (Res. 1959/2024) |
| **Ley 27.553** | Ley de Recetas Electrónicas (2020) — habilita prescripción y teleasistencia digital |
| **Decreto 98/2023** | Reglamentación de Ley 27.553 — crea Licencia Federal de Salud y receta electrónica obligatoria desde julio 2024 |
| **Res. 5744/2024** | Exige interoperabilidad en tiempo real entre plataformas de prescripción y financiadores |
| **Res. 3320/2024** | Crea matrícula profesional única nacional (pero NO reemplaza matrícula provincial de Bs. As. ni otras) |
| **Colegio Médico** | Corporación autónoma provincial que administra matrículas de médicos. Cada provincia tiene el suyo. Son el obstáculo principal de credencialización |
| **Cartilla** | Lista de prestadores habilitados por una obra social o prepaga |
| **Módulo / Coseguro** | Copago del paciente sobre prestaciones cubiertas |
| **Prestador** | Médico, clínica o efector habilitado en la red de un financiador |

---

## Marco Regulatorio Vigente

```
Ley 27.553 (2020)      → Habilita telemedicina y recetas digitales
Decreto 98/2023        → Reglamentación: Licencia Federal de Salud, receta electrónica obligatoria
Res. 1959/2024         → Crea ReNaPDiS (registro obligatorio de plataformas digitales)
Res. 3320/2024         → Matrícula digital profesional nacional (app Mi Argentina)
Res. 3934/2024         → Solo prestadores en red del financiador pueden prescribir en planes cerrados
Res. 5744/2024         → Interoperabilidad en tiempo real prescripción ↔ financiadores
Ley 26.682             → Regula empresas de medicina prepaga
Ley 25.326             → Protección de Datos Personales (equivalente GDPR local)
Ley 26.529             → Derechos del Paciente (historia clínica, consentimiento informado)
```

**Prioridad de compliance para MVP:**
1. ReNaPDiS — registrar la plataforma antes de lanzar
2. Ley 27.553 + Decreto 98/2023 — flujo de receta electrónica correcto
3. Ley 25.326 — manejo de datos de salud (sensibles por definición)

---

## Competidores a Conocer

| Jugador | Fortaleza | Debilidad | Riesgo de competencia |
|---------|-----------|-----------|----------------------|
| **Doc24** | Primer mover, white-label de videoconsulta, integrado con OSDE/Swiss | Solo la capa de video; sin credencialización, sin RCM, sin farmacia | Medio — si amplía su stack |
| **Doctoralia** | Marketplace masivo, +50K médicos | Solo booking + video; sin infraestructura B2B real | Bajo — modelo distinto |
| **1DOC3** | Volumen de consultas rápidas, expansión regional | Sin RCM, sin credencialización, modelo freemium consumer | Bajo — distinto segmento |
| **Medikus** | Records management, +500 clínicas | Foco en historia clínica, no en habilitación ni cobertura | Bajo |
| **UMA Salud** | App consumer, wearables | D2C, no B2B infraestructura | Bajo |

**Conclusión:** No hay un competidor local que resuelva el stack completo de infraestructura. El mayor riesgo es que Doc24 pivote hacia esto en los próximos 2-3 años.

---

## APIs y Endpoints Reales (Verificados)

```
# Credencialización
REFEPS WS (SOAP):  https://sisa.msal.gov.ar/sisa/services/profesionalService?wsdl
REFEPS WS (REST):  https://sisa.msal.gov.ar/sisa/services/rest/profesional/buscar
Acceso:            Formulario A1 → soporte@sisa.msal.gov.ar (4–12 semanas)

# Elegibilidad / Recetas
OSDE FHIR sandbox: https://sandbox.farmalink.com.ar/apis-docs/FARMALINK_RE/farmalink/v3
Farmalink sandbox: https://sandbox.farmalink.com.ar/apis-docs/FARMALINK_RE/farmalink/v3
OSDE interop:      https://osde.com.ar/interoperabilidad/conectar-prescriptor-de-medicamentos

# Registros
ReNaPDiS (TAD):    https://tramitesadistancia.gob.ar (buscar "ReNaPDiS")
Plataformas OK:    https://argentina.gob.ar/salud/digital/renapdis/plataformas-aprobadas
SSSalud RNAS:      https://www.sssalud.gob.ar/?page=rnos_nor

# Estándares
FHIR AR:           https://simplifier.net/saluddigital.ar
REFEPS FHIR guide: https://simplifier.net/guide/practitionerrefeps
Open-RSD (ref):    https://github.com/SALUD-AR/Open-RSD
```

**Estrategia de integración MVP:** REFEPS WS + OSDE FHIR + Farmalink Hub = cubre credencialización nacional + elegibilidad de ~70% del mercado con solo 3 integraciones.

**Estándar técnico obligatorio:** FHIR R4 + SNOMED CT (mandatados por el Ministerio de Salud, OSDE ya lo usa en producción). Adoptar desde el día 1 — facilita futuras integraciones.

---

## Reglas de Desarrollo

1. **Idioma:** UI y comunicaciones en español argentino. Código y commits en inglés.
2. **Multi-tenancy estricto:** Una obra social NUNCA puede ver datos de otra. Row-level security en Postgres. Aislamiento a nivel de tenant en cada query.
3. **Datos de salud = sensibles:** Toda PII de pacientes y profesionales encriptada en reposo y en tránsito. Logging de accesos obligatorio con timestamp + user + acción.
4. **Credencialización es crítica:** Los módulos de verificación de matrícula tienen cobertura de tests ≥ 90%. Un error aquí tiene consecuencias legales y médicas.
5. **FHIR R4 es el estándar:** Todos los modelos de datos de salud usan FHIR R4. No inventar esquemas propietarios para entidades que FHIR ya define (Practitioner, Patient, Coverage, MedicationRequest).
6. **No usar WS REFEPS sin credenciales:** Mientras llegan las credenciales SISA, verificar matrícula manualmente en `sisa.msal.gov.ar`. Nunca hardcodear credenciales — solo `.env`.
7. **CUIR obligatoria:** Cada receta electrónica debe tener CUIR válida antes de persistir. Sin CUIR = receta inválida legalmente.
8. **Compliance primero:** Antes de cualquier feature que toque datos de pacientes o prescripciones, verificar contra Ley 27.553, Ley 25.326 y Res. ReNaPDiS vigente.
9. **Context7 para librerías:** Siempre consultar docs actualizadas antes de usar cualquier SDK externo.
10. **Free-first:** Siempre elegir la mejor opción gratuita disponible. Solo considerar servicios pagos cuando el volumen o los requisitos técnicos lo exijan explícitamente. Cuando haya que migrar a pago, documentarlo como próximo paso pero no implementarlo.

---

## Servicios Externos — Elecciones Free-First

| Función | Solución gratuita elegida | Migración paga (cuando escale) |
|---------|--------------------------|-------------------------------|
| Videollamada (teleconsulta) | **Jitsi Meet** (`meet.jit.si`) — sin API key, sin límites | Daily.co (HIPAA-ready, grabación) |
| Email transaccional | **Resend** (3.000/mes gratis) | Resend Pro / SendGrid |
| Storage archivos | **Supabase Storage** (1 GB gratis) | AWS S3 / Cloudflare R2 |
| Deploy API | **Render** (free tier, sleep after 15min) | Render Starter / Railway |
| Deploy frontend | **Vercel** (free tier) | Vercel Pro |
| Monitoreo errores | **Sentry** (5.000 events/mes gratis) | Sentry Team |
| CI/CD | **GitHub Actions** (2.000 min/mes gratis) | GitHub Actions Team |

---

## Mercado y Métricas Objetivo

- **TAM:** USD 5.310M para 2033 (CAGR 18.31% — IMARC)
- **SAM inicial:** 300 obras sociales nacionales + 500 prepagas + empleadores top-500
- **Métrica norte:** Vidas cubiertas verificables a través de la plataforma
- **KPI de credencialización:** Tiempo de habilitación provincial (objetivo: < 3 semanas vs. meses actual)
- **KPI de elegibilidad:** Latencia de verificación de cobertura (objetivo: < 2 segundos)

---

## Estado del Proyecto

- [x] Investigación de mercado y análisis de brechas
- [x] Definición de visión y modelo de negocio
- [x] Flujo maestro con dos tracks paralelos (`docs/flujo-maestro.md`)
- [x] Identificación de APIs reales disponibles hoy
- [x] Fundación técnica (FastAPI + PostgreSQL + FHIR R4) — branch `feat/conectores-reales`
- [x] Credencialización Fase 2: invitaciones, cartilla, provincias, Celery re-verificación
- [x] Compliance legal: audit log a DB, derecho de supresión, consent_events (Ley 25.326)
- [x] Demo investor: dashboard con KPIs reales, landing page, QR en recetas, consentimiento informado, tenants admin
- [x] UX overhaul mobile/WebView: bottom nav, sidebar drawer, responsive grids, jargon cleanup, toast system
- [x] UX multi-stakeholder (EN PROGRESO — ver sección abajo)
- [ ] Constitución legal (SRL + AFIP)
- [ ] Solicitud acceso WS REFEPS (Formulario A1 → soporte@sisa.msal.gov.ar)
- [ ] Registro ReNaPDiS vía TAD
- [ ] Integración sandbox OSDE FHIR
- [ ] Reclutamiento 20 médicos fundadores

## Documentos Clave

- `docs/flujo-maestro.md` — Diagramas de flujo completos (Track A + Track B + Gantt + Checklists)
- `docs/superpowers/plans/2026-04-26-infrastructure-complete.md` — Plan ejecutado (14 tareas)

---

## 🚧 Trabajo en Progreso — Sesión 2026-04-28

### Contexto
Se inició una mejora UX multi-stakeholder para que la plataforma sea usable por todos los involucrados: médicos, admins de obra social, abogados/compliance, farmacéuticos y pacientes.

### ✅ Completado en esta sesión

**UX Mobile/WebView (100% hecho):**
- `frontend/src/context/SidebarContext.tsx` — contexto global para toggle del sidebar
- `frontend/src/context/ToastContext.tsx` — sistema de toasts (`useToast()` hook disponible en cualquier página)
- `frontend/src/components/layout/BottomNav.tsx` — barra de navegación inferior para mobile (5 ítems)
- `frontend/src/app/(app)/layout.tsx` — responsive: `md:ml-60`, overlay backdrop, providers wrapping
- `frontend/src/components/layout/Sidebar.tsx` — drawer en mobile (`-translate-x-full md:translate-x-0`), botón X, touch targets 44px
- `frontend/src/components/layout/TopBar.tsx` — hamburger button en mobile, subtitle oculto en xs
- Grids responsive en dashboard, consultas, prestadores, elegibilidad
- Jargon cleanup: "Motor OpenLoop/CareValidate" → plain Spanish en todos lados
- `frontend/src/app/(app)/prestadores/page.tsx` — cards en mobile, tabla en desktop

**Backend stats:**
- `app/api/v1/endpoints/admin.py` — `practitioners_pendientes` en BusinessStats, filtros `from_date`/`to_date` en audit log

**Backend practitioners:**
- `app/api/v1/endpoints/practitioners.py` — `InvitationListItem` model, `GET /invitations`, `POST /invitations/{id}/resend`

**Backend prescriptions:**
- `app/api/v1/endpoints/prescriptions.py` — `POST /prescriptions/{cuir}/dispense` (endpoint público para farmacéuticos)

### ❌ Pendiente para mañana (interrumpido a mitad)

**Prioridad 1 — Buscador de medicamentos (MÉDICO):**
- Crear `frontend/src/data/medicamentos.ts` — dataset de ~80 medicamentos argentinos con SNOMED CT codes
- Actualizar `frontend/src/app/(app)/consultas/[id]/page.tsx` — reemplazar input manual de SNOMED por autocomplete que llena nombre + código al seleccionar
- El médico tipea "amox" y ve "Amoxicilina 500mg" → selecciona → se llenan ambos campos

**Prioridad 2 — Cola de aprobaciones pendientes (ADMIN):**
- Actualizar `frontend/src/app/(app)/dashboard/page.tsx` — banner de alerta si `stats.practitioners_pendientes > 0` con link a `/prestadores/pendientes`
- Crear `frontend/src/app/(app)/prestadores/pendientes/page.tsx` — lista de médicos no aprobados con botón "Aprobar" por cada uno (llama `api.approvePractitioner(id)`)
- Agregar `practitioners_pendientes: number` a `DashboardStats` en `frontend/src/lib/types.ts`

**Prioridad 3 — Historial de invitaciones (ADMIN):**
- Agregar `listInvitations()` y `resendInvitation(id)` a `frontend/src/lib/api.ts`
- Agregar tipo `Invitation` a `frontend/src/lib/types.ts`
- Actualizar `frontend/src/app/(app)/prestadores/invitar/page.tsx` — agregar sección "Invitaciones enviadas" debajo del formulario, con columnas: email, estado (badge), fecha envío, vencimiento, botón "Reenviar" si pendiente/expirada

**Prioridad 4 — Filtros de fecha en audit log (ABOGADO):**
- Agregar `from_date?: string` y `to_date?: string` a `api.getAuditLog()` en `frontend/src/lib/api.ts`
- Actualizar `frontend/src/app/(app)/admin/audit/page.tsx` — agregar dos inputs type="date" (Desde / Hasta), limpiar filtros button

**Prioridad 5 — Dispensar receta (FARMACÉUTICO):**
- Agregar `dispensePrescription(cuir, body)` a `frontend/src/lib/api.ts`
- Actualizar `frontend/src/app/recetas/[cuir]/page.tsx` — si `rx.estado === "activa"`, mostrar botón "Dispensar en farmacia" → abre mini-form (nombre farmacia + farmacista) → llama endpoint → actualiza estado en UI con toast

**Prioridad 6 — Portal de paciente (PACIENTE):**
- Crear `app/api/v1/endpoints/patient.py` — `GET /patient/prescriptions?dni=...` sin auth, solo campos seguros (cuir, medicamento_nombre, posología, estado, fecha_vencimiento)
- Agregar al `app/api/v1/router.py`: `from app.api.v1.endpoints.patient import router as patient_router` + `router.include_router(patient_router)`
- Agregar `getPatientPrescriptions(dni)` a `frontend/src/lib/api.ts`
- Agregar tipo `PatientPrescription` a `frontend/src/lib/types.ts`
- Crear `frontend/src/app/paciente/page.tsx` — página pública (fuera del grupo `(app)`): input DNI → lista de recetas del paciente con estado visual claro

### Notas técnicas importantes
- El `patient_dni` en la tabla `prescriptions` es un String(20) **NO encriptado** — query directa por DNI es posible
- El endpoint `/prescriptions/{cuir}/dispense` ya está implementado en el backend, falta solo el frontend
- Los endpoints `/invitations` y `/invitations/{id}/resend` ya están implementados, faltan api.ts + UI
- El campo `practitioners_pendientes` ya está en el backend BusinessStats — falta solo en types.ts + dashboard UI
- El filtro `from_date`/`to_date` en audit log ya está en el backend — falta solo en api.ts + audit UI
- Para continuar mañana: arrancar desde Prioridad 1 (medicamentos) que es la más bloqueante para el flujo médico

---

## Demo Local — Cómo levantar y probar la plataforma

> **Pendiente ejecutar.** Todo corre en modo MOCK (sin credenciales reales). Los tres conectores
> (REFEPS, Farmalink, OSDE) devuelven datos de prueba realistas.

### Requisitos previos
- Docker Desktop corriendo
- Puerto 3000 (frontend), 8000 (API), 5432 (PostgreSQL), 6379 (Redis) libres

### Paso 1 — Levantar el stack

```bash
cd "C:\Users\guill\OneDrive\Escritorio\Salud argentina"
docker compose up --build
```

### Paso 2 — Aplicar migraciones (primera vez o después de reset)

```bash
docker compose exec db psql -U saludos -d saludos_db -f /migrations/sql/001_initial_schema.sql
docker compose exec db psql -U saludos -d saludos_db -f /migrations/sql/002_add_consultations.sql
docker compose exec db psql -U saludos -d saludos_db -f /migrations/sql/003_add_practitioner_invitations.sql
docker compose exec db psql -U saludos -d saludos_db -f /migrations/sql/004_consent_and_refresh_tokens.sql
docker compose exec db psql -U saludos -d saludos_db -f /migrations/sql/005_consent_events.sql
```

### Paso 3 — Cargar datos demo

```bash
docker compose exec api python scripts/seed_demo.py
```

Carga: 10 médicos argentinos con nombres/CUFPs/especialidades reales, 7 consultas (completadas/en curso/programadas), 5 recetas con CUIRs válidos.

### Paso 4 — Frontend (si no corre en Docker)

```bash
cd frontend && npm install && npm run dev
# → http://localhost:3000
```

### Credenciales demo

| Rol | Email | Password |
|---|---|---|
| Admin del tenant (financiador_admin) | `admin@dev.saludos.ar` | `dev123` |
| Médico aprobado (prestador) | `medico@dev.saludos.ar` | `dev123` |

### Flujos principales a probar

**Como admin:**
1. Dashboard → banner "modo DEMO" + métricas reales de la DB
2. `/prestadores` → lista de 10 médicos, filtros por especialidad
3. `/prestadores/{id}` → detalle + grid de 24 provincias con estados
4. `/prestadores/invitar` → enviar invitación (link aparece en log de Docker si no hay Resend key)
5. `/elegibilidad` → verificar cobertura de afiliado (mock de OSDE/Swiss/Medifé)
6. `/credenciales` → verificar matrícula por DNI (mock de REFEPS, < 100ms)

**Como médico:**
1. `/consultas` → historial de consultas propias
2. `/consultas/{id}` → ver diagnóstico, crear receta nueva
3. La receta genera CUIR automáticamente

**Flujo de registro completo:**
1. Admin invita desde `/prestadores/invitar`
2. Copiás el link del log: `docker compose logs api | grep registro`
3. Abrís `/registro/{token}` — formulario público, acepta términos
4. Sistema verifica REFEPS mock → devuelve estado de matrícula
5. Admin aprueba desde el panel

**Vista de farmacia (pública, sin login):**
- `/recetas/{cuir}` — cualquier CUIR de los seeds funciona

### Verificar el audit log funcionando

```bash
# Login y verificar una credencial
TOKEN=$(curl -s -X POST http://localhost:8000/v1/auth/token \
  -d "username=medico@dev.saludos.ar&password=dev123" \
  | python -m json.tool | grep access_token | cut -d'"' -f4)

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/v1/credentials/verify?dni=20123456"

# Ver audit log en DB
docker compose exec db psql -U saludos -d saludos_db \
  -c "SELECT action, resource, ip_address, created_at FROM audit_log ORDER BY created_at DESC LIMIT 5;"
```

### Confirmar estado de conectores

```bash
curl http://localhost:8000/v1/health | python -m json.tool
# Debe mostrar mock_warnings para refeps, farmalink, osde
```

### Tests

```bash
# Desde el proyecto (sin Docker)
python -m pytest tests/unit/ -q
# → 121 tests, 82.78% coverage
```

---

## Fase 2 — Credencialización de Médicos (EN DISEÑO)

> **Estado:** Brainstorming completado, pendiente escribir spec y plan de implementación.
> Retomar con: `/brainstorm` o decirle a Claude "continuá con el diseño de Fase 2".

### Decisiones tomadas

**Flujo principal:**
Admin del tenant invita por email → Médico completa su perfil (texto, sin upload de archivos) → Sistema verifica automáticamente → Admin aprueba → Médico queda en la cartilla del tenant.

**Verificación de identidad:**
- **MVP:** REFEPS es suficiente — si la matrícula existe con ese DNI, hay verificación implícita de identidad.
- **Futuro:** RENAPER API (gobierno argentino, DNI + biometría). Diseñar el conector como stub ahora, activar cuando lleguen credenciales (proceso burocrático similar a REFEPS).

**Tracking de provincias:**
Estado individual por provincia: `pendiente` / `tramitando` / `habilitado`. El admin puede actualizar cada provincia manualmente. Re-verificación automática contra REFEPS cada 7 días.

**Arquitectura elegida — Opción C (híbrido):**
- Verificación inicial al registrarse: **síncrona** (respuesta inmediata al médico).
- Re-verificación periódica: **Celery beat** semanal sobre todos los practitioners activos.
- Requiere levantar infraestructura Celery (no existe todavía en el proyecto).

### Componentes a implementar

| Componente | Descripción |
|---|---|
| `PractitionerInvitation` model | Token de invitación, email, estado, expiración |
| `PractitionerProvince` model | Estado por provincia para cada practitioner |
| API invitaciones | `POST /practitioners/invite`, `GET/POST /practitioners/register/{token}` |
| API cartilla | `GET /practitioners`, `GET /practitioners/{id}`, `POST /practitioners/{id}/approve` |
| API provincias | `PATCH /practitioners/{id}/provinces/{province}` |
| `RENAPERConnector` | Stub del conector (misma interfaz que REFEPS), activar con credenciales reales |
| Celery setup | `app/tasks/__init__.py`, `app/tasks/verify_practitioners.py`, beat schedule |
| Email invitación | Resend — template con link de registro |
| Frontend `/prestadores` | Lista cartilla (ya existe el directorio) |
| Frontend `/prestadores/invitar` | Formulario de invitación |
| Frontend `/prestadores/[id]` | Detalle + estado por provincia |
| Frontend `/registro/[token]` | Página pública de auto-registro (fuera del grupo `(app)`) |

### Próximo paso
Continuar brainstorming → escribir spec completo → generar plan de implementación → ejecutar con subagent-driven-development.

---

## Contactos y Recursos Externos

- **SSS (Superintendencia):** https://www.sssalud.gob.ar
- **SISA / REFEPS:** https://sisa.msal.gov.ar
- **RNAS:** https://www.sssalud.gob.ar/?page=rnos_nor
- **ReNaPDiS:** https://www.argentina.gob.ar/salud/digital/red
- **PMO vigente:** https://www.sssalud.gob.ar — sección PMO
- **Resolución 5744/2024:** Boletín Oficial — interoperabilidad de prescripción
