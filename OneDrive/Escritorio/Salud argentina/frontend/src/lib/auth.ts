"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";

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

export function getTokenPayload(): { role: string; sub: string; tenant_id: string; exp?: number } | null {
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

export function getTokenExpiry(): number | null {
  const payload = getTokenPayload();
  if (!payload || payload.exp == null) return null;
  return payload.exp;
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  const payload = getTokenPayload();
  if (!payload) {
    clearToken();
    return false;
  }
  const exp = payload.exp;
  if (exp != null && Date.now() / 1000 > exp) {
    clearToken();
    return false;
  }
  return true;
}

export function getRole(): "financiador_admin" | "prestador" | null {
  const payload = getTokenPayload();
  if (!payload) return null;
  const role = payload.role;
  if (role === "financiador_admin" || role === "prestador") return role;
  return null;
}

const POLL_INTERVAL_MS = 30_000;
const WARN_THRESHOLD_SECONDS = 300;

export function useSessionExpiry() {
  const router = useRouter();
  const { addToast } = useToast();
  const warnedRef = useRef(false);

  useEffect(() => {
    const check = () => {
      const exp = getTokenExpiry();
      if (exp == null) return;
      const now = Date.now() / 1000;
      const remaining = exp - now;
      if (remaining <= 0) {
        clearToken();
        router.replace("/login");
        return;
      }
      if (remaining <= WARN_THRESHOLD_SECONDS && !warnedRef.current) {
        warnedRef.current = true;
        addToast("Tu sesión vence en menos de 5 minutos. Guardá tu trabajo.", "info");
      }
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [router, addToast]);
}
