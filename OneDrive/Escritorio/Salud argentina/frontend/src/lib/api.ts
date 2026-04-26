const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("saludos_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  async login(email: string, password: string) {
    const body = new URLSearchParams({ username: email, password });
    const res = await fetch(`${BASE}/v1/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Credenciales incorrectas");
    }
    return res.json();
  },

  health: () => request<import("./types").HealthResponse>("/v1/health"),

  verifyCredential: (params: { dni?: string; matricula?: string; cufp?: string; include_fhir?: boolean }) => {
    const q = new URLSearchParams();
    if (params.dni) q.set("dni", params.dni);
    if (params.matricula) q.set("matricula", params.matricula);
    if (params.cufp) q.set("cufp", params.cufp);
    if (params.include_fhir) q.set("include_fhir", "true");
    return request<import("./types").CredentialResult>(`/v1/credentials/verify?${q}`);
  },

  checkEligibility: (params: { afiliado_id: string; financiador_id: string; prestacion_code?: string }) => {
    const q = new URLSearchParams({
      afiliado_id: params.afiliado_id,
      financiador_id: params.financiador_id,
    });
    if (params.prestacion_code) q.set("prestacion_code", params.prestacion_code);
    return request<import("./types").EligibilityResult>(`/v1/eligibility/check?${q}`);
  },

  listFinanciadores: () =>
    request<{ financiadores: { id: string; nombre: string }[]; total: number; nota: string }>(
      "/v1/eligibility/financiadores"
    ),

  listConsultations: (params?: { tipo?: string; estado?: string }) => {
    const q = new URLSearchParams();
    if (params?.tipo) q.set("tipo", params.tipo);
    if (params?.estado) q.set("estado", params.estado);
    return request<import("./types").Consultation[]>(`/v1/consultations${q.toString() ? `?${q}` : ""}`);
  },

  getConsultation: (id: string) =>
    request<import("./types").Consultation>(`/v1/consultations/${id}`),

  createConsultation: (body: {
    tipo: string;
    paciente_dni: string;
    paciente_nombre: string;
    paciente_afiliado_id?: string;
    financiador_id?: string;
  }) =>
    request<import("./types").Consultation>("/v1/consultations", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  patchConsultationStatus: (id: string, estado: string) =>
    request<import("./types").Consultation>(`/v1/consultations/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    }),

  updateConsultation: (id: string, body: { diagnostico_snomed_code?: string; diagnostico_texto?: string; notas_clinicas?: string }) =>
    request<import("./types").Consultation>(`/v1/consultations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  listPrescriptions: (consultationId: string) =>
    request<import("./types").Prescription[]>(`/v1/consultations/${consultationId}/prescriptions`),

  createPrescription: (consultationId: string, body: {
    medicamento_snomed_code: string;
    medicamento_nombre: string;
    cantidad: number;
    posologia: string;
  }) =>
    request<import("./types").Prescription>(`/v1/consultations/${consultationId}/prescriptions`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  cancelPrescription: (prescriptionId: string) =>
    request<import("./types").Prescription>(`/v1/prescriptions/${prescriptionId}/cancel`, {
      method: "DELETE",
    }),

  getPublicPrescription: (cuir: string) =>
    fetch(`${BASE}/v1/prescriptions/${cuir}`).then(async (res) => {
      if (!res.ok) throw new Error((await res.json()).detail || `HTTP ${res.status}`);
      return res.json() as Promise<import("./types").PublicPrescription>;
    }),

  // ── Practitioners ──────────────────────────────────────────────────────
  async invitePractitioner(email: string): Promise<import("./types").PractitionerInvitation> {
    return request("/v1/practitioners/invite", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async getInvitationInfo(token: string): Promise<import("./types").InvitationInfo> {
    return request(`/v1/practitioners/register/${token}`);
  },

  async registerPractitioner(
    token: string,
    data: {
      nombre: string;
      apellido: string;
      dni: string;
      especialidad: string;
      password: string;
    }
  ): Promise<{ message: string; refeps_verificado: boolean; estado_matricula: string }> {
    return request(`/v1/practitioners/register/${token}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async listPractitioners(soloAprobados = true): Promise<import("./types").Practitioner[]> {
    return request(`/v1/practitioners?solo_aprobados=${soloAprobados}`);
  },

  async getPractitioner(id: string): Promise<import("./types").Practitioner> {
    return request(`/v1/practitioners/${id}`);
  },

  async approvePractitioner(id: string): Promise<{ message: string }> {
    return request(`/v1/practitioners/${id}/approve`, { method: "POST" });
  },

  async patchPractitionerProvince(
    practitionerId: string,
    provincia: string,
    estado: "pendiente" | "tramitando" | "habilitado"
  ): Promise<{ provincia: string; estado: string }> {
    return request(`/v1/practitioners/${practitionerId}/provinces/${encodeURIComponent(provincia)}`, {
      method: "PATCH",
      body: JSON.stringify({ estado }),
    });
  },

  async verifyPractitioner(id: string): Promise<{ verificado: boolean; estado_matricula: string }> {
    return request(`/v1/practitioners/${id}/verify`, { method: "POST" });
  },
};
