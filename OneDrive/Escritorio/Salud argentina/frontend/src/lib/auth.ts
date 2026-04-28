"use client";

export function saveToken(token: string) {
  localStorage.setItem("saludos_token", token);
}

export function clearToken() {
  localStorage.removeItem("saludos_token");
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("saludos_token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getTokenPayload(): { role: string; sub: string; tenant_id: string } | null {
  const token = getToken();
  if (!token) return null;
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function getRole(): "financiador_admin" | "prestador" | null {
  const payload = getTokenPayload();
  if (!payload) return null;
  const role = payload.role;
  if (role === "financiador_admin" || role === "prestador") return role;
  return null;
}
