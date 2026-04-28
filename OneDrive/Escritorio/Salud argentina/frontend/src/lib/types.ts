export interface HealthResponse {
  status: "ok" | "degraded";
  version: string;
  environment: string;
  connectors: {
    credential_engine: "ok" | "error";
    eligibility_engine: "ok" | "error";
  };
  mock_warnings: Record<string, string> | null;
}

export interface CredentialResult {
  found: boolean;
  estado_matricula: string | null;
  cufp: string | null;
  nombre_completo: string | null;
  especialidad: string | null;
  provincias_habilitadas: string[];
  fuente: string;
  fhir_resource: Record<string, unknown> | null;
}

export interface EligibilityResult {
  found: boolean;
  activa: boolean;
  afiliado_id: string | null;
  financiador_id: string | null;
  financiador_nombre: string | null;
  plan: string | null;
  estado: string;
  fuente: string;
  pmo_cubierto: boolean;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface ConsultationPrescriptionSummary {
  id: string;
  cuir: string;
  medicamento_nombre: string | null;
  estado: string;
}

export interface Consultation {
  id: string;
  tipo: "teleconsulta" | "externa";
  estado: "programada" | "en_curso" | "completada" | "cancelada";
  medico_id: string;
  medico_cufp: string;
  paciente_dni: string;
  paciente_nombre: string;
  paciente_afiliado_id: string | null;
  financiador_id: string | null;
  cobertura_verificada: boolean;
  sesion_video_id: string | null;
  sesion_video_url: string | null;
  fecha_consulta: string;
  diagnostico_snomed_code: string | null;
  diagnostico_texto: string | null;
  notas_clinicas: string | null;
  paciente_consentimiento_informado: boolean;
  created_at: string;
  prescriptions: ConsultationPrescriptionSummary[];
}

export interface Prescription {
  id: string;
  cuir: string;
  consulta_id: string;
  medicamento_snomed_code: string | null;
  medicamento_nombre: string | null;
  cantidad: number | null;
  posologia: string | null;
  fecha_vencimiento: string | null;
  estado: string;
  cobertura_verificada: boolean;
  qr_url: string;
  created_at: string;
}

export interface PublicPrescription {
  cuir: string;
  paciente_nombre_parcial: string;
  medicamento_nombre: string | null;
  medicamento_snomed_code: string | null;
  posologia: string | null;
  cantidad: number | null;
  estado: string;
  prescriber_cufp: string | null;
  fecha_vencimiento: string | null;
  cobertura_verificada: boolean;
}

export interface PractitionerProvince {
  provincia: string;
  estado: "pendiente" | "tramitando" | "habilitado";
}

export interface Practitioner {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  cufp: string | null;
  matricula_nacional: string | null;
  especialidad: string | null;
  estado_matricula: "vigente" | "suspendida" | "inhabilitada" | "desconocido";
  provincias_habilitadas: string[];
  fuente_verificacion: string;
  aprobado: boolean;
  provinces: PractitionerProvince[];
}

export interface PractitionerInvitation {
  id: string;
  email: string;
  estado: string;
  expires_at: string;
}

export interface InvitationInfo {
  email: string;
  expires_at: string;
  tenant_id: string;
}

export interface DashboardStats {
  tenants_total: number;
  practitioners_total: number;
  practitioners_aprobados: number;
  consultations_total: number;
  prescriptions_activas: number;
  verificaciones_hoy: number;
  cobertura_mercado_pct: number;
}

export interface Tenant {
  id: string;
  nombre: string;
  tipo: string;
  activo: boolean;
  created_at: string;
}

export interface TenantCreate {
  nombre: string;
  tipo?: string;
  admin_email: string;
  admin_password: string;
}

export interface ConsentEvent {
  id: string;
  action: string;
  tos_version: string;
  ip_address: string | null;
  user_agent: string | null;
  recorded_at: string;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  resource: string | null;
  user_id: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface PractitionerProfileUpdate {
  nombre?: string;
  apellido?: string;
  especialidad?: string;
  matricula_nacional?: string;
}
