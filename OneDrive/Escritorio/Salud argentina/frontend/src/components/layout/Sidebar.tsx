"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken } from "@/lib/auth";

const NAV = [
  {
    href: "/dashboard",
    label: "Panel Principal",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/credenciales",
    label: "Credencialización",
    sublabel: "Motor OpenLoop",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M16 11l1.5 1.5L21 9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: "/elegibilidad",
    label: "Elegibilidad",
    sublabel: "Motor CareValidate",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c1.66 0 3.22.45 4.55 1.24" />
      </svg>
    ),
  },
  {
    href: "/consultas",
    label: "Consultas",
    sublabel: "Receta Electrónica",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 12h6M9 16h6M9 8h6" strokeLinecap="round"/>
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M15 3v4H9V3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: "/prestadores",
    label: "Red de Prestadores",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/integraciones",
    label: "Integraciones",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
];

const NAV_ADMIN = [
  {
    href: "/admin/audit",
    label: "Audit Log",
    sublabel: "Ley 25.326",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 12h6M9 16h6M9 8h6" strokeLinecap="round"/>
        <rect x="3" y="3" width="18" height="18" rx="2"/>
      </svg>
    ),
  },
  {
    href: "/admin/tenants",
    label: "Tenants",
    sublabel: "Obras sociales",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="16" strokeLinecap="round"/>
        <line x1="10" y1="14" x2="14" y2="14" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-surface border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-accent flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#080C18" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div className="text-text font-semibold text-sm leading-tight">SaludOS</div>
            <div className="text-text-3 text-[10px] tracking-wider uppercase">Argentina</div>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-text-3 text-[10px] font-medium tracking-widest uppercase px-2 pb-2">Sistema</p>
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-2.5 py-2.5 rounded-md text-sm transition-all duration-150 group ${
                active
                  ? "bg-accent-glow text-accent border border-border-bright"
                  : "text-text-2 hover:text-text hover:bg-surface-2"
              }`}
            >
              <span className={active ? "text-accent" : "text-text-3 group-hover:text-text-2"}>
                {item.icon}
              </span>
              <div className="min-w-0">
                <div className="leading-tight truncate">{item.label}</div>
                {item.sublabel && (
                  <div className={`text-[10px] tracking-wide ${active ? "text-accent-dim" : "text-text-3"}`}>
                    {item.sublabel}
                  </div>
                )}
              </div>
              {active && (
                <div className="ml-auto w-1 h-1 rounded-full bg-accent flex-shrink-0" />
              )}
            </Link>
          );
        })}

        <div className="pt-3 mt-2 border-t border-border/50">
          <p className="text-text-3 text-[10px] font-medium tracking-widest uppercase px-2 pb-2">Admin</p>
          {NAV_ADMIN.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-2.5 py-2.5 rounded-md text-sm transition-all duration-150 group ${
                  active
                    ? "bg-accent-glow text-accent border border-border-bright"
                    : "text-text-2 hover:text-text hover:bg-surface-2"
                }`}
              >
                <span className={active ? "text-accent" : "text-text-3 group-hover:text-text-2"}>
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <div className="leading-tight truncate">{item.label}</div>
                  {item.sublabel && (
                    <div className={`text-[10px] tracking-wide ${active ? "text-accent-dim" : "text-text-3"}`}>
                      {item.sublabel}
                    </div>
                  )}
                </div>
                {active && <div className="ml-auto w-1 h-1 rounded-full bg-accent flex-shrink-0" />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-2.5 py-2.5 rounded-md text-sm text-text-2 hover:text-danger hover:bg-danger-bg w-full transition-all duration-150"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
