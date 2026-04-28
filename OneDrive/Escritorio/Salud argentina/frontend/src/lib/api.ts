const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("saludos_token");
}

async function attemptTokenRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem("saludos_refresh_token");
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem("saludos_token", data.access_token);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const makeHeaders = (t: string | null) => ({
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...options.headers,
  });

  const res = await fetch(`${BASE}${path}`, { ...options, headers: makeHeaders(token) });

  if (res.status === 401) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      const newToken = localStorage.getItem("saludos_token");
      const retryRes = await fetch(`${BASE}${path}`, { ...options, headers: makeHeaders(newToken) });
      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({ detail: retryRes.statusText }));
        throw new Error(err.detail || `HTTP ${retryRes.status}`);
      }
      return retryRes.json();
    }
    // Refresh failed — clear tokens and redirect
    localStorage.removeItem("saludos_token");
    localStorage.removeItem("saludos_refresh_token");
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Sesión expirada");
  }

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
    const data = await res.json();
    localStorage.setItem("saludos_token", data.access_token);
    if (data.refresh_token) {
      localStorage.setItem("saludos_refresh_token", data.refresh_token);
    }
    return data;
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem("saludos_refresh_token");
    if (refreshToken) {
      try {
        await fetch(`${BASE}/v1/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch { /* ignore network errors on logout */ }
    }
    localStorage.removeItem("saludos_token");
    localStorage.removeItem("saludos_refresh_token");
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
    paciente_consentimiento_informado?: boolean;
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
      acepta_terminos: boolean;
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

  async erasePractitioner(id: string): Promise<{ message: string }> {
    return request(`/v1/practitioners/${id}`, { method: "DELETE" });
  },

  async getConsentHistory(practitionerId: string): Promise<import("./types").ConsentEvent[]> {
    return request(`/v1/practitioners/${practitionerId}/consent-history`);
  },

  async getAuditLog(params?: {
    limit?: number;
    offset?: number;
    action?: string;
  }): Promise<import("./types").AuditLogEntry[]> {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.offset) q.set("offset", String(params.offset));
    if (params?.action) q.set("action", params.action);
    return request(`/v1/admin/audit-log${q.toString() ? `?${q}` : ""}`);
  },

  async updatePractitionerProfile(
    id: string,
    data: import("./types").PractitionerProfileUpdate
  ): Promise<{ message: string; fields_updated: string[] }> {
    return request(`/v1/practitioners/${id}/profile`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    return request("/v1/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async confirmPasswordReset(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    return request("/v1/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    });
  },

  async getDashboardStats(): Promise<import("./types").DashboardStats> {
    return request("/v1/admin/stats");
  },

  async listTenants(): Promise<import("./types").Tenant[]> {
    return request("/v1/admin/tenants");
  },

  async createTenant(body: import("./types").TenantCreate): Promise<import("./types").Tenant> {
    return request("/v1/admin/tenants", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
