"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { getRole } from "@/lib/auth";
import { usePendingCount } from "@/context/PendingCountContext";

const NAV_PRESTADOR = [
  {
    href: "/dashboard",
    label: "Inicio",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/consultas",
    label: "Consultas",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 12h6M9 16h6M9 8h6" strokeLinecap="round"/>
        <rect x="3" y="3" width="18" height="18" rx="2"/>
      </svg>
    ),
  },
  {
    href: "/elegibilidad",
    label: "Cobertura",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.66 0 3.22.45 4.55 1.24" />
      </svg>
    ),
  },
  {
    href: "/credenciales",
    label: "Matrícula",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M16 11l1.5 1.5L21 9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: "/perfil",
    label: "Perfil",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

const NAV_ADMIN_MAIN = [
  {
    href: "/dashboard",
    label: "Inicio",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/prestadores",
    label: "Médicos",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/admin/audit",
    label: "Audit",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 12h6M9 16h6M9 8h6" strokeLinecap="round"/>
        <rect x="3" y="3" width="18" height="18" rx="2"/>
      </svg>
    ),
  },
  {
    href: "/elegibilidad",
    label: "Cobertura",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.66 0 3.22.45 4.55 1.24" />
      </svg>
    ),
  },
];

const NAV_ADMIN_MORE = [
  { href: "/integraciones", label: "Integraciones" },
  { href: "/admin/tenants",  label: "Organizaciones" },
  { href: "/credenciales",   label: "Credenciales" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const role = getRole();
  const pendingCount = usePendingCount();
  const [showMore, setShowMore] = useState(false);

  if (role === "prestador") {
    return (
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center md:hidden z-40">
        {NAV_PRESTADOR.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors min-h-[44px] ${
                active ? "text-accent" : "text-text-3"
              }`}
            >
              <span>{item.icon}</span>
              <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  // financiador_admin (default when role is null too — safe fallback)
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center md:hidden z-40">
      {NAV_ADMIN_MAIN.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors min-h-[44px] ${
              active ? "text-accent" : "text-text-3"
            }`}
          >
            <div className="relative">
              <span>{item.icon}</span>
              {item.href === "/prestadores" && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] rounded-full bg-danger text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </div>
            <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
          </Link>
        );
      })}

      {/* Más slot */}
      <div className="flex-1 relative flex flex-col items-center justify-center h-full min-h-[44px]">
        <button
          onClick={() => setShowMore((v) => !v)}
          className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
            showMore ? "text-accent" : "text-text-3"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
            <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>
          </svg>
          <span className="text-[9px] font-medium tracking-wide">Más</span>
        </button>

        {showMore && (
          <>
            {/* backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMore(false)}
            />
            {/* mini menu */}
            <div className="absolute bottom-[calc(100%+8px)] right-0 z-50 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
              {NAV_ADMIN_MORE.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className="flex items-center px-4 py-3 text-sm text-text-2 hover:text-text hover:bg-surface-2 transition-colors min-h-[44px]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
