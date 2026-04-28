import Link from "next/link";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
  variable: "--font-playfair",
});

const FINANCIADORES = [
  "OSDE", "Swiss Medical", "IOMA", "PAMI", "Galeno",
  "Medifé", "Sancor Salud", "Accordia", "OSECAC", "OSSEG",
  "Omint", "Premedic", "APROSS", "OSPE", "OSPEDYC",
  "OSSIMRA", "Jerarquía", "Prudencia", "OSMATA", "OSPAT",
];

const STATS = [
  { value: "800+", label: "Financiadores",  sub: "obras sociales y prepagas" },
  { value: "24",   label: "Provincias",     sub: "habilitación multi-jurisdicción" },
  { value: "<2s",  label: "Verificación",   sub: "cobertura en tiempo real" },
];

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
        <path d="M16 11l1.5 1.5L21 9" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Credencialización multi-provincia",
    subtitle: "Motor OpenLoop",
    desc: "Verificación de matrículas contra REFEPS/SISA en las 24 provincias. CUFP, estado, habilitaciones provinciales — en una sola consulta.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9"/>
      </svg>
    ),
    title: "Elegibilidad en tiempo real",
    subtitle: "Motor CareValidate",
    desc: "Verificación de cobertura PMO contra 800+ financiadores. Una integración cubre Swiss Medical, IOMA, PAMI, Galeno y 25+ más via Farmalink Hub.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12h6M9 16h6M9 8h6" strokeLinecap="round"/>
        <rect x="3" y="3" width="18" height="18" rx="2"/>
      </svg>
    ),
    title: "Receta electrónica (CUIR)",
    subtitle: "Ley 27.553",
    desc: "Prescripción digital con CUIR único, verificación de cobertura y QR farmacia. Flujo completo: teleconsulta → diagnóstico → receta → dispensación.",
  },
];

const COMPLIANCE = ["Ley 27.553", "Decreto 98/2023", "FHIR R4", "SNOMED CT", "Ley 25.326", "Ley 26.529"];

export default function LandingPage() {
  return (
    <div className={`${playfair.variable} min-h-screen bg-base text-text`}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border/50 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-accent flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#080C18" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <span className="text-text font-semibold text-sm leading-none">SaludOS</span>
            <span className="text-text-3 text-[10px] tracking-widest uppercase ml-1.5">Argentina</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/privacidad" className="text-text-3 text-sm hover:text-text transition-colors">
            Privacidad
          </Link>
          <Link
            href="/dashboard"
            className="text-sm px-4 py-2 bg-accent text-base rounded font-medium hover:bg-accent/90 transition-colors"
          >
            Acceder →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-8 pt-20 pb-16">
        <div className="max-w-4xl">
          <p className="text-accent text-xs font-mono uppercase tracking-widest mb-6">
            Infraestructura B2B · Salud Digital · Argentina
          </p>
          <h1
            className="text-5xl md:text-7xl font-semibold leading-[1.08] tracking-tight mb-8"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            Infraestructura
            <br />
            <span className="text-text-2">de salud digital</span>
            <br />
            para Argentina.
          </h1>
          <p className="text-text-2 text-lg max-w-xl leading-relaxed mb-10">
            El stack B2B que conecta obras sociales, prepagas y prestadores con la
            infraestructura regulatoria argentina — credencialización, elegibilidad y
            prescripción electrónica en un solo sistema.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-accent text-base text-sm font-medium rounded hover:bg-accent/90 transition-colors"
            >
              Acceder al sistema
            </Link>
            <Link
              href="/recetas/CUIR-2026-DEMO-001"
              className="px-6 py-3 border border-border text-text-2 text-sm rounded hover:border-accent/40 hover:text-text transition-colors"
            >
              Ver receta demo →
            </Link>
          </div>
        </div>

        {/* Numbers */}
        <div className="grid grid-cols-3 gap-px bg-border/30 border border-border/30 rounded-lg overflow-hidden mt-16">
          {STATS.map((s) => (
            <div key={s.label} className="bg-base px-8 py-8">
              <p
                className="text-5xl font-bold text-accent mb-2 tabular-nums"
                style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
              >
                {s.value}
              </p>
              <p className="text-text font-medium text-sm">{s.label}</p>
              <p className="text-text-3 text-xs mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ticker */}
      <div className="border-y border-border/30 py-3 overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee">
          {[...FINANCIADORES, ...FINANCIADORES, ...FINANCIADORES].map((name, i) => (
            <span key={i} className="inline-flex items-center gap-4 px-6">
              <span className="text-text-3 text-xs font-mono uppercase tracking-widest">{name}</span>
              <span className="text-border text-xs">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-8 py-20">
        <p className="text-text-3 text-[10px] uppercase tracking-widest mb-10">Tres motores. Una integración.</p>
        <div className="grid md:grid-cols-3 gap-px bg-border/20 border border-border/20 rounded-lg overflow-hidden">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-surface p-8 space-y-4">
              <div className="text-accent">{f.icon}</div>
              <div>
                <p
                  className="text-text font-semibold text-lg leading-snug"
                  style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
                >
                  {f.title}
                </p>
                <p className="text-accent text-[10px] font-mono uppercase tracking-widest mt-1">{f.subtitle}</p>
              </div>
              <p className="text-text-2 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance strip */}
      <section className="max-w-7xl mx-auto px-8 pb-16">
        <div className="border border-border/30 rounded-lg px-8 py-6 flex flex-wrap items-center gap-4">
          <p className="text-text-3 text-xs uppercase tracking-widest mr-4">Cumplimiento regulatorio</p>
          {COMPLIANCE.map((c) => (
            <span
              key={c}
              className="text-[10px] px-2.5 py-1 bg-success-bg border border-success/20 rounded text-success font-mono"
            >
              {c}
            </span>
          ))}
          <span className="text-[10px] px-2.5 py-1 bg-warning-bg border border-warning/20 rounded text-warning font-mono ml-auto">
            ReNaPDiS ⏳
          </span>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 px-8 py-8 max-w-7xl mx-auto flex items-center justify-between">
        <p className="text-text-3 text-xs font-mono">SaludOS Argentina — Infraestructura de salud digital B2B</p>
        <div className="flex gap-6">
          <Link href="/privacidad" className="text-text-3 text-xs hover:text-text transition-colors">Privacidad</Link>
          <Link href="/dashboard" className="text-text-3 text-xs hover:text-accent transition-colors">Acceder →</Link>
        </div>
      </footer>
    </div>
  );
}
