import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base px-4">
      <div className="text-center space-y-4">
        <p className="font-mono text-text-3 text-sm">404</p>
        <h1 className="text-text text-2xl font-semibold">Página no encontrada</h1>
        <p className="text-text-2 text-sm">Esta ruta no existe en SaludOS Argentina.</p>
        <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2 mt-2 px-4 py-2 text-sm">
          Volver al panel principal
        </Link>
      </div>
    </div>
  );
}
