import Link from "next/link";

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-base py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-2">
          <p className="text-accent text-xs font-mono uppercase tracking-widest">SaludOS Argentina</p>
          <h1 className="text-text text-3xl font-semibold">Política de Privacidad</h1>
          <p className="text-text-3 text-sm">Última actualización: 26 de abril de 2026</p>
        </div>

        <div className="space-y-6 text-text-2 text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-text font-semibold">1. Datos que recopilamos</h2>
            <p>SaludOS Argentina recopila los siguientes datos para prestar sus servicios de infraestructura de salud digital:</p>
            <ul className="list-disc list-inside space-y-1 text-text-3 ml-2">
              <li>Datos de identidad profesional: nombre, apellido, DNI, CUFP, matrícula nacional</li>
              <li>Datos de contacto: dirección de email</li>
              <li>Datos de verificación: estado de matrícula obtenidos de REFEPS/SISA</li>
              <li>Registros de acceso y auditoría (requeridos por Ley 25.326)</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-text font-semibold">2. Base legal del tratamiento</h2>
            <ul className="list-disc list-inside space-y-1 text-text-3 ml-2">
              <li><strong className="text-text">Consentimiento explícito</strong> del titular (Art. 5 Ley 25.326)</li>
              <li><strong className="text-text">Cumplimiento de obligaciones legales</strong> — Ley 27.553, Decreto 98/2023, Res. 5744/2024</li>
              <li><strong className="text-text">Interés legítimo</strong> en la verificación de habilitaciones profesionales</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-text font-semibold">3. Tus derechos (Ley 25.326)</h2>
            <ul className="list-disc list-inside space-y-1 text-text-3 ml-2">
              <li>Acceder a los datos que tenemos sobre vos</li>
              <li>Rectificar datos incorrectos o desactualizados</li>
              <li>Solicitar la supresión de tus datos cuando corresponda</li>
              <li>Oponerte al tratamiento de tus datos personales</li>
            </ul>
            <p>Para ejercer estos derechos contactanos en: <span className="text-accent font-mono">privacidad@saludos.ar</span></p>
          </section>

          <section className="space-y-2">
            <h2 className="text-text font-semibold">4. Seguridad de los datos</h2>
            <p>
              Todos los datos son cifrados en tránsito (HTTPS/TLS) y en reposo. Aplicamos
              aislamiento multi-tenant mediante Row-Level Security en PostgreSQL. Los accesos
              a datos sensibles quedan registrados en nuestro log de auditoría (AuditMiddleware).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-text font-semibold">5. Contacto y autoridad de control</h2>
            <p>
              Responsable: SaludOS Argentina S.R.L. —{" "}
              <span className="text-accent font-mono">privacidad@saludos.ar</span>
            </p>
            <p>
              Podés presentar una reclamación ante la{" "}
              <strong className="text-text">Agencia de Acceso a la Información Pública</strong>{" "}
              (AAIP) — autoridad de control en materia de datos personales en Argentina.
            </p>
          </section>
        </div>

        <div className="pt-4 border-t border-border">
          <Link href="/" className="text-text-3 hover:text-accent text-sm transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
