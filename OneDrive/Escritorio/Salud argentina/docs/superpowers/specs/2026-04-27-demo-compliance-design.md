# Spec: Demo funcional + Compliance layer — SaludOS Argentina

**Fecha:** 2026-04-27  
**Estado:** Aprobado  
**Rama:** `feat/conectores-reales`

---

## Contexto

El backend monolito modular está ~70% funcional (FastAPI + PostgreSQL RLS + Redis + Celery). Los tres conectores externos (REFEPS, OSDE, Farmalink) están en modo MOCK. El frontend Next.js tiene todas las rutas declaradas pero las páginas dentro de `(app)/` nunca fueron levantadas ni verificadas.

El objetivo es llegar a un estado donde la plataforma sea:
1. **Demostrable end-to-end** — flujo completo admin + prestador sin errores
2. **Legalmente sólida** — encriptación en reposo, derechos Ley 25.326 con UI, compliance documentado
3. **Migrable** — cada componente tiene una interfaz que permite swappear la implementación sin tocar el core

---

## División en Tracks

### Track 1 — Demo funcional
Objetivo: demo corriendo sin errores en `docker compose up`.  
Prioridad: días.

### Track 2 — Compliance
Objetivo: cero baches legales antes de ir al mundo físico.  
Prioridad: semanas, puede avanzar en paralelo con Track 1.

**Dependencia:** Las pantallas de compliance de Track 2 se construyen sobre las páginas que Track 1 completa. Los demás ítems de Track 2 son independientes.

---

## Track 1 — Demo funcional

### 1.1 Verificar stack Docker

Levantar `docker compose up --build` y confirmar que los 4 servicios (api, db, redis, celery) arrancan sin errores. Aplicar las 5 migraciones SQL. Correr `scripts/seed_demo.py`.

**Credenciales demo:**
| Rol | Email | Password |
|---|---|---|
| `financiador_admin` | `admin@dev.saludos.ar` | `dev123` |
| `prestador` | `medico@dev.saludos.ar` | `dev123` |

**Resultado esperado:** `GET /health` retorna `{"status": "ok"}` con `mock_warnings` para los 3 conectores.

---

### 1.2 Auditar y completar páginas frontend

Cada página dentro de `frontend/src/app/(app)/` debe auditarse: si es stub vacío, completarla. Si ya funciona, verificar que consume el endpoint correcto del API client.

**Páginas a auditar y especificación mínima:**

#### `/dashboard`
- Stats en tiempo real desde DB: total practitioners, pendientes de aprobación, consultas hoy, recetas emitidas
- Banner prominente "MODO DEMO — conectores en simulación" si algún `*_MOCK_MODE=true`
- Cards de health de conectores (REFEPS, OSDE, Farmalink) con estado mock/real

#### `/prestadores`
- Tabla de practitioners del tenant con columnas: nombre, especialidad, estado matrícula, estado (pendiente/aprobado/rechazado)
- Filtros: especialidad, estado
- Botón "Invitar prestador" → `/prestadores/invitar`
- Acciones inline: aprobar, rechazar

#### `/prestadores/invitar`
- Formulario: email, especialidad
- Submit → `POST /v1/practitioners/invite`
- Si no hay `RESEND_API_KEY`: mostrar el link de registro en pantalla en un cuadro copiable (no silenciar el error)

#### `/prestadores/[id]`
- Header: nombre completo, especialidad, estado matrícula nacional
- Grid 24 provincias: estado `pendiente` / `tramitando` / `habilitado` con color
- Botones: Aprobar, Rechazar (si está pendiente), Re-verificar REFEPS
- Links a pantallas de compliance: "Ver consentimientos", "Solicitar supresión"
- Sección de rectificación inline (Track 2 — ver 3.4)

#### `/registro/[token]`
- Página pública (fuera del grupo `(app)`)
- Formulario: nombre completo, DNI, CUFP, matrícula nacional, especialidad, contraseña, confirmar contraseña
- Checkbox obligatorio: "Acepto los términos y la política de privacidad" con links
- Submit → `POST /v1/practitioners/register/{token}`
- Muestra resultado de verificación REFEPS inmediatamente (mock: matrícula encontrada/no encontrada)
- Si OK: mensaje "Registro enviado, el administrador revisará tu solicitud"
- Si token expirado: mensaje claro con instrucción de contactar al admin

#### `/consultas`
- Lista consultas del médico autenticado (o todas si es admin)
- Columnas: fecha, paciente DNI (ofuscado: primeros 3 dígitos + ***), tipo, estado
- Filtros: estado, tipo (teleconsulta / externa)
- Botón "Nueva consulta"

#### `/consultas/nueva`
- Form: DNI paciente, tipo (teleconsulta/externa), fecha/hora
- Si teleconsulta: mostrar room Jitsi generado automáticamente
- Verificar elegibilidad en tiempo real al ingresar DNI (llamada a `/v1/eligibility/check`, resultado visible)
- Submit → `POST /v1/consultations`

#### `/consultas/[id]`
- Header: datos de la consulta, estado
- Sección diagnóstico/notas: textarea editable, guardado con `PATCH /v1/consultations/{id}`
- Si teleconsulta: botón "Iniciar videoconsulta" → abre Jitsi en nueva pestaña
- Botón "Emitir receta" → abre modal con form (medicamento, dosis, indicaciones)
- Lista de recetas emitidas con CUIRs, estado y link `/recetas/{cuir}`

#### `/recetas/[cuir]` (público, sin autenticación)
- Vista para farmacias
- Datos: medicamento (nombre + código SNOMED), dosis, indicaciones, fecha emisión, vencimiento
- Datos del paciente: DNI ofuscado (***XXXX), nombre si está disponible
- Datos del prestador: nombre, matrícula, especialidad
- Estado destacado: VIGENTE (verde) / VENCIDA (rojo) / CANCELADA (gris)
- Nota legal: "Verificación CUIR — Decreto 98/2023"

#### `/credenciales`
- Buscador por DNI, CUFP o matrícula nacional
- Resultado: datos del profesional desde REFEPS (mock), estado por provincia
- Historial de verificaciones del tenant (últimas 10)

#### `/elegibilidad`
- Form: ID afiliado, financiador (dropdown de `GET /v1/eligibility/financiadores`), código prestación
- Resultado: estado cobertura, plan, copago estimado
- Badge "mock" visible mientras los conectores no sean reales

#### `/integraciones`
- Estado de los 3 conectores con semáforo
- Checklist de pasos para activar cada integración real
- Tiempos estimados de homologación

---

### 1.3 Flujo demo end-to-end

El flujo completo que debe funcionar sin errores:

```
[Admin]
  1. Login en /login como admin@dev.saludos.ar
  2. Dashboard → ver stats + banner DEMO
  3. /prestadores/invitar → ingresar email, especialidad → copiar link

[Médico]
  4. Abrir /registro/{token} → completar formulario
  5. REFEPS verifica matrícula (mock, < 200ms)
  6. Acepta términos → consent_event registrado en DB
  7. Mensaje "Pendiente de aprobación"

[Admin]
  8. /prestadores → ver médico con estado "pendiente"
  9. Aprobar → médico aparece en cartilla

[Médico]
  10. Login como medico@dev.saludos.ar
  11. /consultas/nueva → ingresar DNI paciente → elegibilidad OK (mock)
  12. Crear consulta teleconsulta → link Jitsi generado
  13. /consultas/{id} → agregar diagnóstico → emitir receta
  14. Receta creada con CUIR

[Farmacia]
  15. Abrir /recetas/{cuir} sin login → ver receta VIGENTE

[Admin]
  16. /admin/audit → ver audit log de todas las operaciones
```

---

### 1.4 Reglas de UI (migrabilidad frontend)

- **Sin fetch directo en páginas.** Todo pasa por `lib/api.ts`.
- **Lógica en hooks custom** (`useConsultations`, `usePractitioners`, etc.) en `lib/hooks/`. Las páginas son thin wrappers.
- **Types desde `lib/types.ts`** derivados del schema OpenAPI del backend. Un script `npm run types` los regenera.
- **No lógica de negocio en componentes.** Reglas de estado, validaciones, transiciones → en hooks o en el backend.

---

## Track 2 — Compliance

### 2.1 Encriptación en reposo (Ley 25.326)

**Campos sensibles a encriptar:**
- `practitioners`: `nombre`, `dni`, `cufp`, `matricula_nacional`
- `consultations`: `paciente_dni`

`users.email` queda fuera: no es dato de salud bajo Ley 25.326 y encriptarlo rompería las queries de login (`WHERE email = ?`).

**Arquitectura — KeyProvider pluggable:**

```python
# app/core/encryption.py
class KeyProvider(ABC):
    @abstractmethod
    def get_key(self) -> bytes: ...

class FernetKeyProvider(KeyProvider):
    # Usa ENCRYPTION_KEY del .env (32 bytes base64)
    # Arrancamos con esta

class AWSKMSKeyProvider(KeyProvider):
    # Swap futuro sin tocar modelos

class HashiCorpVaultKeyProvider(KeyProvider):
    # Swap futuro sin tocar modelos
```

**Implementación en modelos:**

```python
# Usando sqlalchemy-utils EncryptedType
from sqlalchemy_utils import EncryptedType, StringEncryptedType
from app.core.encryption import get_key_provider

dni = Column(StringEncryptedType(String, get_key_provider().get_key))
```

**Migración 006:** Script que lee registros existentes, los encripta con Fernet y reescribe. Transaccional — si falla en el medio, rollback.

**Variable de entorno nueva:** `ENCRYPTION_KEY` (32 bytes en base64). Obligatoria en producción. Si no está definida en staging, arranca con advertencia (no bloquea desarrollo).

**Búsquedas:** Fernet usa IV aleatorio — el mismo valor encripta diferente cada vez, por lo que no se puede hacer `WHERE encrypted_dni = ?`. Solución: columna de búsqueda adicional con HMAC-SHA256 determinístico.

```python
# Para cada campo buscable, agregar columna _hash en la migración 006
dni_hash = Column(String(64), index=True)  # HMAC-SHA256(dni, HMAC_SECRET)

# Al guardar: calcular hash antes de encriptar
practitioner.dni_hash = hmac_sha256(dni, settings.hmac_secret)
practitioner.dni = dni  # EncryptedType lo encripta automáticamente

# Al buscar por DNI:
search_hash = hmac_sha256(input_dni, settings.hmac_secret)
results = await db.execute(select(Practitioner).where(Practitioner.dni_hash == search_hash))
```

Variable de entorno nueva adicional: `HMAC_SECRET` (32 bytes en base64). Distinto de `ENCRYPTION_KEY`.

---

### 2.2 OSDE Connector OAuth2

El único conector con `raise NotImplementedError`. Implementar el OAuth2 client credentials flow completo:

```python
# app/connectors/osde/client.py
async def _get_token(self) -> str:
    # POST /oauth2/token con client_id + client_secret
    # Cache del token en Redis con TTL = expires_in - 60s
    ...

async def check_coverage(self, ...) -> CoverageResult:
    # GET /Coverage?patient={dni} con Bearer token
    # Parseo de FHIR R4 Coverage resource
    ...
```

**Sandbox:** `https://sandbox.farmalink.com.ar/apis-docs/FARMALINK_RE/farmalink/v3` — disponible sin credenciales.

**Variables de entorno:** `OSDE_CLIENT_ID`, `OSDE_CLIENT_SECRET`, `OSDE_BASE_URL`.

Cuando lleguen las credenciales reales: cambiar las vars. Cero cambios de código.

---

### 2.3 Tres pantallas de derechos (Ley 25.326)

#### Pantalla 1: Historial de consentimientos
**Ruta:** `/(app)/prestadores/[id]/consentimientos`  
**Endpoint:** `GET /v1/practitioners/{id}/consent-history` (ya existe)  
**Muestra:** Tabla con columnas: acción (aceptó/revocó), versión TOS, fecha, IP, user agent  
**Exportar:** Botón "Descargar CSV" — genera CSV del historial completo

#### Pantalla 2: Export audit log
**Ruta:** `/(app)/admin/audit`  
**Endpoint:** `GET /v1/admin/audit-log` (ya existe)  
**Muestra:** Tabla con filtros: acción, recurso, usuario, rango de fechas  
**Exportar:** Botón "Exportar CSV" — descarga filtrado actual  
**RBAC:** Solo `financiador_admin` y `platform_admin`  
**Agregar al API client frontend:** `api.getAuditLog(filters)`

#### Pantalla 3: Solicitar supresión de datos
**Ruta:** Botón en `/(app)/prestadores/[id]` (no página separada)  
**Endpoint:** `DELETE /v1/practitioners/{id}` (ya existe — soft erasure)  
**Flujo:** Botón → modal de confirmación con texto "Esta acción anonimiza los datos personales del prestador. No se puede deshacer." → confirmar → soft erasure  
**Agregar al API client frontend:** `api.erasePractitioner(id)`

---

### 2.4 Derecho de rectificación

**Backend — endpoint nuevo:**
```
PATCH /v1/practitioners/{id}/profile
Body: { nombre?, especialidad?, matricula_nacional?, cufp? }
Auth: financiador_admin del mismo tenant
```
Cada campo modificado genera un `audit_log` entry con `action="update"`, `resource="practitioner"`, detalle del campo cambiado (sin valor anterior — privacidad).

**Frontend:** Formulario inline en `/prestadores/[id]` con campos editables (nombre, especialidad). Guardado con PATCH.

---

### 2.5 Password reset

**Backend — 2 endpoints nuevos:**
```
POST /v1/auth/password-reset/request
Body: { email }
→ Genera token (SHA256, TTL 1h), guarda en tabla password_reset_tokens
→ Envía email via Resend con link /reset-password/{token}

POST /v1/auth/password-reset/confirm
Body: { token, new_password }
→ Valida token, actualiza password (bcrypt), invalida token
```

**Frontend — página nueva:**  
`/reset-password/[token]` — pública, formulario nueva contraseña + confirmar.

**Link desde `/login`:** "¿Olvidaste tu contraseña?" → `/reset-password` (solo email).

**Migración 007:** Tabla `password_reset_tokens (id, user_id, token_hash, expires_at, used_at)`.

---

### 2.6 Firma digital — stub documentado

No se implementa en esta iteración. Se deja en código con documentación explícita:

```python
# app/api/v1/endpoints/prescriptions.py — al crear prescripción

# FIRMA DIGITAL — PENDIENTE (Ley 27.553 Art. 4)
# Requiere certificado digital emitido por CA habilitada por ANMAT.
# Proceso de homologación: ~3-4 meses.
# Implementación futura:
#   1. Firmar el payload FHIR MedicationRequest con clave privada del prescriptor
#   2. Adjuntar certificado público en la receta
#   3. Verificar firma en GET /recetas/{cuir} (endpoint público)
# Mientras tanto: timestamp + audit_log proveen trazabilidad básica.
prescription.firma_digital = None
```

**Campo en modelo:** `prescriptions.firma_digital VARCHAR(2048) NULL` — migración 006 lo agrega.

---

## Migrabilidad — Decisiones transversales

### Backend

| Componente | Hoy | Migración futura |
|---|---|---|
| Encriptación | Fernet + `KeyProvider` interface | Swap a AWS KMS: solo cambiar implementación de `KeyProvider` |
| Migraciones | SQL manual → **migrar a Alembic** | `alembic upgrade head` funciona en cualquier PostgreSQL managed |
| Conectores | Abstract base + registry | Nuevo financiador = nueva clase, sin tocar core |
| Queue | Redis + Celery | Tasks no importan FastAPI — portables a AWS Lambda o Prefect |
| Auth | JWT HS256 | Cambiar a RS256 o Auth0: solo tocar `app/core/security.py` |
| Video | Jitsi stub | Swap a Daily.co: solo `app/services/video.py` |
| Email | Resend | Swap a SES/SendGrid: solo `app/services/email.py` |

### Frontend

| Componente | Hoy | Migración futura |
|---|---|---|
| API calls | Centralizadas en `lib/api.ts` | Swap a GraphQL: solo reescribir `lib/api.ts` |
| Lógica de negocio | Hooks en `lib/hooks/` | Reutilizables si se migra a Remix, Vite, etc. |
| Types | `lib/types.ts` regenerado desde OpenAPI | `npm run types` siempre sincronizado con backend |
| Auth state | `lib/auth.ts` con localStorage | Swap a `next-auth` o cookies: solo `lib/auth.ts` |

### Alembic — migración de SQL manual (incluido en este plan)

Convertir las 5 migraciones SQL existentes a versiones Alembic. Todas las migraciones nuevas (006, 007) se escriben directamente en Alembic. Esto habilita:
- Rollback automático
- Ambientes múltiples (dev, staging, prod)
- CI que valida que migraciones aplican limpio

---

## Orden de implementación recomendado

### Fase A — Fundación (primero, desbloquea todo lo demás)
1. Levantar docker + seed → confirmar que todo arranca
2. Migrar a Alembic (antes de agregar migraciones 006 y 007)

### Fase B — Track 1 (demo funcional)
3. Auditar todas las páginas `(app)/` — identificar cuáles son stubs
4. Completar páginas stubs (en paralelo: se pueden trabajar con subagentes)
5. Agregar hooks `lib/hooks/` para lógica de negocio
6. Validar flujo end-to-end completo (admin + prestador + farmacia)

### Fase C — Track 2 (compliance, paralelo a B desde el punto 4)
7. `KeyProvider` interface + `FernetKeyProvider` + migración 006 (encriptación)
8. OSDE OAuth2 connector real (sandbox)
9. Endpoints nuevos: `PATCH /practitioners/{id}/profile`, password reset
10. Migración 007 (password_reset_tokens)
11. Pantallas de compliance: consentimientos, audit log, supresión, rectificación
12. Actualizar `lib/api.ts` con métodos faltantes (erasure, consent history, audit log)

### Fase D — Integración final
13. Password reset flow completo (backend + frontend)
14. Stub firma digital documentado
15. Test suite: agregar tests para encriptación, endpoints nuevos, pantallas compliance
16. Smoke test del flujo end-to-end con encriptación activa

---

## Qué queda fuera de scope

| Item | Por qué |
|---|---|
| Firma digital real | Requiere CA argentino + homologación ANMAT (~3-4 meses) |
| Conectores REFEPS/Farmalink reales | Esperando credenciales burocráticas (4-12 semanas) |
| 2FA/TOTP | Nice-to-have, no blocker para demo ni compliance inicial |
| Hash DNI con salt en erasure | Mejora menor — el hash plano actual cumple el objetivo de anonimización |
| Penetration test | Requiere auditor externo — siguiente iteración |
| ReNaPDiS registro | Proceso burocrático, no código |

---

## Archivos clave a crear/modificar

**Nuevos:**
- `app/core/encryption.py` — KeyProvider + FernetKeyProvider
- `app/connectors/osde/client.py` — OAuth2 flow completo (reemplaza stub)
- `app/api/v1/endpoints/admin.py` — agregar export CSV
- `frontend/src/lib/hooks/` — hooks por dominio
- `frontend/src/app/(app)/admin/audit/page.tsx`
- `frontend/src/app/(app)/prestadores/[id]/consentimientos/page.tsx`
- `frontend/src/app/reset-password/[token]/page.tsx`
- `alembic/` — setup Alembic + versiones 001-005 + 006 + 007

**Modificados:**
- `app/models/practitioner.py` — campos con EncryptedType
- `app/models/consultation.py` — paciente_dni con EncryptedType
- `app/models/prescription.py` — firma_digital NULL field
- `app/api/v1/endpoints/practitioners.py` — agregar `PATCH /profile`
- `app/api/v1/endpoints/auth.py` — agregar password reset endpoints
- `frontend/src/lib/api.ts` — agregar métodos faltantes
- `frontend/src/lib/types.ts` — tipos nuevos
- Todas las páginas `(app)/` que sean stubs
