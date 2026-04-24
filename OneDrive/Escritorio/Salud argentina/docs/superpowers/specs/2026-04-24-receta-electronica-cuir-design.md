# Spec: Módulo Receta Electrónica + CUIR

**Fecha:** 2026-04-24
**Estado:** Aprobado — pendiente de implementación
**Proyecto:** SaludOS Argentina

---

## Resumen

Implementar el módulo de Receta Electrónica conforme a Ley 27.553 + Decreto 98/2023, usando **Consulta como entidad central**. Cada prescripción pertenece a una consulta (teleconsulta integrada o externa). El médico (role=prestador) es el prescriptor. Cada receta recibe una CUIR generada internamente antes de persistir.

---

## Modelos de Datos

### Tabla `consultas`

```sql
CREATE TABLE consultas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    tipo            TEXT NOT NULL CHECK (tipo IN ('teleconsulta', 'externa')),
    estado          TEXT NOT NULL DEFAULT 'programada'
                    CHECK (estado IN ('programada','en_curso','completada','cancelada')),
    medico_id       UUID NOT NULL REFERENCES users(id),
    medico_cufp     TEXT NOT NULL,
    paciente_dni    TEXT NOT NULL,
    paciente_nombre TEXT NOT NULL,
    paciente_afiliado_id  TEXT,
    financiador_id        TEXT,
    cobertura_verificada  BOOLEAN NOT NULL DEFAULT false,
    sesion_video_id       TEXT,           -- solo si tipo=teleconsulta
    fecha_consulta        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    diagnostico_snomed_code TEXT,
    diagnostico_texto       TEXT,
    notas_clinicas          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- RLS: tenant_id = current_tenant_id
```

**Notas:**
- `sesion_video_id`: nombre de sala Jitsi (`saludos-{uuid12}`). La URL se construye en runtime como `https://meet.jit.si/{sesion_video_id}` — no se persiste.
- `medico_cufp`: denormalizado para auditoría legal (si el médico cambia su CUFP, la consulta histórica conserva el valor al momento de creación).
- `cobertura_verificada`: se setea `true` automáticamente si hay `paciente_afiliado_id` + `financiador_id` y el conector responde activa.

### Tabla `prescripciones` (ampliar existente)

Campos nuevos a agregar a la tabla existente:

```sql
ALTER TABLE prescripciones ADD COLUMN consulta_id        UUID NOT NULL REFERENCES consultas(id);
ALTER TABLE prescripciones ADD COLUMN medicamento_nombre TEXT NOT NULL;
ALTER TABLE prescripciones ADD COLUMN cantidad           INTEGER NOT NULL DEFAULT 1;
ALTER TABLE prescripciones ADD COLUMN posologia          TEXT NOT NULL;
ALTER TABLE prescripciones ADD COLUMN fecha_vencimiento  DATE NOT NULL;
-- fecha_vencimiento = created_at::date + 30 días (Decreto 98/2023)
```

**Campos ya existentes relevantes:**
- `cuir` TEXT UNIQUE NOT NULL — generado internamente antes de INSERT
- `prescriber_id` FK → users
- `prescriber_cufp` TEXT — denormalizado
- `medicamento_snomed_code` TEXT
- `estado` CHECK IN ('activa','dispensada','anulada','vencida')
- `cobertura_verificada` BOOLEAN

---

## CUIR — Servicio de Generación

**Formato:** 27 caracteres

```
{TENANT_PREFIX(4)}{TIMESTAMP_MS(13)}{RAND_HEX(8)}{CHECKSUM(2)}
```

Ejemplo: `DEVP1745494827341a3f9c21AB`

**Implementación:**

```python
# app/services/cuir.py
import hashlib, secrets, time

def generate_cuir(tenant_prefix: str) -> str:
    prefix = tenant_prefix[:4].upper().ljust(4, "X")
    ts = str(int(time.time() * 1000))          # 13 dígitos
    rand = secrets.token_hex(4)                 # 8 chars
    raw = f"{prefix}{ts}{rand}"
    checksum = hashlib.md5(raw.encode()).hexdigest()[:2].upper()
    return f"{raw}{checksum}"                   # 27 chars total
```

**Unicidad:** Garantizada por constraint `UNIQUE` en DB. Si hay colisión (improbable), el endpoint reintenta hasta 3 veces antes de retornar error 500.

---

## Video — Jitsi Meet (free-first)

```python
# app/services/video.py
import uuid

def create_jitsi_room() -> dict:
    room_id = f"saludos-{uuid.uuid4().hex[:12]}"
    return {
        "sesion_video_id": room_id,
        "url": f"https://meet.jit.si/{room_id}",
    }
```

Sin API key. Sin SDK. Sin costo. La URL se devuelve al frontend pero no se persiste en DB.

**Migración futura:** Cuando se requiera grabación, waiting rooms o compliance HIPAA → Daily.co REST API. Solo cambia `create_jitsi_room()`.

---

## Endpoints Backend

### Consultas

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/v1/consultations` | Bearer (prestador) | Crear consulta. Dispara verificación de cobertura + creación de sala si teleconsulta |
| GET | `/v1/consultations` | Bearer (prestador) | Listar consultas del médico autenticado. Query params: `tipo`, `estado`, `fecha_desde` |
| GET | `/v1/consultations/{id}` | Bearer (prestador) | Detalle de consulta + lista de prescripciones |
| PATCH | `/v1/consultations/{id}/status` | Bearer (prestador) | Cambiar estado: `en_curso` \| `completada` \| `cancelada` |
| PATCH | `/v1/consultations/{id}` | Bearer (prestador) | Actualizar diagnóstico + notas clínicas |

### Prescripciones

| Método | Path | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/v1/consultations/{id}/prescriptions` | Bearer (prestador) | Crear Rx. Genera CUIR, verifica cobertura si no verificada, envía a Farmalink mock |
| GET | `/v1/consultations/{id}/prescriptions` | Bearer (prestador) | Listar Rx de la consulta |
| DELETE | `/v1/prescriptions/{prescription_id}/cancel` | Bearer (prestador) | Anular Rx (estado → anulada, no elimina) |
| GET | `/v1/prescriptions/{cuir}` | Público (sin auth) | Lookup por CUIR para farmacias + QR |

---

## Flujo de Datos Completo

```
1. POST /v1/consultations
   Body: { tipo, paciente_dni, paciente_nombre, paciente_afiliado_id?, financiador_id? }
   ├── Valida que medico tiene CUFP vigente (consulta Practitioner en DB)
   ├── Si tipo=teleconsulta → create_jitsi_room() → sesion_video_id
   ├── Si afiliado_id + financiador_id → eligibility_connector.check_coverage()
   │   └── cobertura_verificada = result.activa
   └── INSERT consulta → 201 { id, sesion_video_url? }

2. GET /v1/consultations/{id}
   └── Retorna consulta + prescripciones[] + sesion_video_url (construida desde sesion_video_id)

3. PATCH /v1/consultations/{id}/status
   Body: { estado: "en_curso" | "completada" | "cancelada" }
   └── Valida transición válida: programada→en_curso, en_curso→completada|cancelada

4. PATCH /v1/consultations/{id}
   Body: { diagnostico_snomed_code?, diagnostico_texto?, notas_clinicas? }
   └── Solo si estado != cancelada

5. POST /v1/consultations/{id}/prescriptions
   Body: { medicamento_snomed_code, medicamento_nombre, cantidad, posologia }
   ├── Valida consulta existe y pertenece al médico autenticado
   ├── Valida consulta.estado IN ('en_curso', 'completada')
   ├── Genera CUIR (retry x3 si colisión)
   ├── fecha_vencimiento = today + 30 días
   ├── Si cobertura no verificada → intenta verificar ahora
   ├── farmalink_connector.route_prescription()
   └── INSERT prescripcion → 201 { cuir, qr_url: "/v1/prescriptions/{cuir}" }

6. GET /v1/prescriptions/{cuir}  (público, sin auth)
   └── Retorna: paciente_nombre_parcial, medicamento, posologia, cantidad,
               estado, prescriber_nombre, prescriber_cufp, fecha_vencimiento
       paciente_nombre_parcial = nombre[:3] + "***" (privacidad Ley 25.326)
```

---

## Páginas Frontend

### `/consultas` — Lista de consultas

- Tabla: fecha_consulta, paciente_nombre, tipo (badge), estado (StatusBadge), cant. Rx
- Filtros: tipo, estado, rango de fechas
- Botón "Nueva consulta" → `/consultas/nueva`
- Click en fila → `/consultas/{id}`

### `/consultas/nueva` — Wizard 3 pasos

**Paso 1 — Tipo:**
- Dos cards seleccionables: Teleconsulta (con icono video) | Externa (con icono persona)

**Paso 2 — Paciente:**
- DNI (input, validación numérica)
- Nombre completo (input)
- Financiador (select, carga desde `/v1/eligibility/financiadores`)
- ID Afiliado (input, opcional)
- Al completar afiliado_id + financiador_id → badge "Verificando cobertura..." → resultado inline

**Paso 3 — Confirmación:**
- Resumen: tipo, paciente, estado cobertura
- [Iniciar consulta] → POST /v1/consultations → redirect /consultas/{id}

### `/consultas/[id]` — Sala de consulta

**Layout dos paneles:**

Panel izquierdo (60%):
- Si teleconsulta: `<iframe src="https://meet.jit.si/{room}" allow="camera; microphone" />`
- Si externa: card con ícono presencial + datos de la cita

Panel derecho (40%) — scrollable:
- Header: nombre paciente + estado cobertura (StatusBadge)
- Sección diagnóstico: SNOMED code input + texto libre + notas clínicas
- Sección prescripciones: lista de Rx emitidas (CUIR + medicamento + estado)
- Botón "+ Nueva prescripción" → abre modal
- Botón "Finalizar consulta" → PATCH status → completada

**Modal "Nueva prescripción":**
- Medicamento (SNOMED code + nombre)
- Cantidad (number input, min 1)
- Posología (textarea)
- [Emitir receta] → POST → muestra card con CUIR generada + botón "Copiar link QR"

### `/recetas/[cuir]` — Landing pública (farmacias)

- Sin sidebar, sin auth
- Logo + "SaludOS — Verificación de Receta"
- Badge estado prominente (activa / dispensada / anulada / vencida)
- Datos: paciente (nombre parcial), medicamento, posología, cantidad, prescriptor, CUFP, vencimiento
- Footer: "Verificado por SaludOS Argentina — Ley 27.553"

---

## Error Handling

| Caso | HTTP | Mensaje |
|------|------|---------|
| Médico sin CUFP vigente | 403 | "Matrícula no vigente — no puede emitir recetas" |
| Consulta no encontrada | 404 | "Consulta no encontrada" |
| Consulta de otro médico | 403 | "Sin permisos sobre esta consulta" |
| Consulta cancelada | 422 | "No se pueden emitir recetas en una consulta cancelada" |
| CUIR colisión x3 | 500 | "Error generando CUIR — reintentar" |
| CUIR no encontrada (GET público) | 404 | "Receta no encontrada" |

---

## Tests Requeridos (≥ 90% cobertura en servicios críticos)

```
tests/unit/services/test_cuir.py
  - genera CUIR de 27 chars
  - prefijo tenant se incluye
  - dos CUIRs generadas consecutivamente son distintas
  - checksum es los últimos 2 chars

tests/unit/api/test_consultations.py
  - crear teleconsulta → sesion_video_id presente
  - crear externa → sesion_video_id ausente
  - cobertura verificada automáticamente si afiliado_id presente
  - médico sin CUFP → 403

tests/unit/api/test_prescriptions.py
  - CUIR generada y única
  - fecha_vencimiento = created_at + 30 días
  - consulta cancelada → 422
  - GET /{cuir} público retorna nombre parcial (privacidad)
  - GET /{cuir} inexistente → 404
```

---

## Dependencias / Sin cambios requeridos

- **Sin librerías nuevas** — Jitsi es URL pura, CUIR es stdlib Python
- **Sin variables de entorno nuevas** — Jitsi no requiere API key
- **Alembic migration:** `migrations/versions/002_add_consultas_prescriptions_cuir.py`
- **Conector Farmalink mock:** ya implementado, `route_prescription()` ya existe

---

## Fuera de scope (próximas iteraciones)

- Notificación al paciente por email (Resend) con link a receta
- Descarga PDF de la receta
- Historial de recetas del paciente
- Integración SNOMED CT search API (por ahora: input libre + código manual)
- Grabación de teleconsulta (requiere Daily.co)
