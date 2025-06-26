'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { userService } from '../../lib/userService';
import Button from '../ui/Button';
import Input from '../ui/Input';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const user = await userService.getUserByEmail(email);

    setTimeout(() => {
      if (!user) {
        setError('Usuario no encontrado');
        setLoading(false);
        return;
      }

      if (user.password !== password) {
        setError('Contraseña incorrecta');
        setLoading(false);
        return;
      }

      // ✅ Guardar en localStorage el usuario logueado
      localStorage.setItem('loggedUser', JSON.stringify(user));

      setSuccess('¡Login exitoso!');
      setTimeout(() => {
        router.push(`/dashboard?rol=${user.role}`);
      }, 1000);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="relative w-full max-w-md">
        <div className="absolute -inset-1 bg-gradient-to-tr from-blue-400 via-blue-200 to-blue-600 dark:from-blue-900 dark:via-blue-800 dark:to-blue-700 rounded-2xl blur-lg opacity-60"></div>
        <form
          onSubmit={handleSubmit}
          className="relative z-10 bg-white/90 dark:bg-gray-900/90 shadow-2xl rounded-2xl px-10 pt-10 pb-8 w-full border border-gray-200 dark:border-gray-800"
        >
          <div className="flex flex-col items-center mb-6">
            <svg
              className="w-16 h-16 mb-2 text-blue-500 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path
                stroke="currentColor"
                strokeWidth="1.5"
                d="M4 20c0-3.314 3.134-6 7-6s7 2.686 7 6"
              />
            </svg>
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-1">
              Iniciar Sesión
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Accede a tu panel de control
            </p>
          </div>
          <div className="space-y-4">
            <Input
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus:ring-2 focus:ring-blue-400"
              autoComplete="email"
              required
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="focus:ring-2 focus:ring-blue-400"
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <div className="mt-4 flex items-center gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded px-3 py-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0z" />
              </svg>
              <span className="text-red-600 dark:text-red-300 text-sm">{error}</span>
            </div>
          )}
          {success && (
            <div className="mt-4 flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded px-3 py-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-600 dark:text-green-300 text-sm">{success}</span>
            </div>
          )}
          <Button
            type="submit"
            className="mt-8 w-full py-3 text-lg font-semibold rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Cargando...
              </span>
            ) : (
              'Entrar'
            )}
          </Button>
          <div className="mt-6 text-center text-xs text-gray-400 dark:text-gray-600">
            © {new Date().getFullYear()} Tu Empresa. Todos los derechos reservados.
          </div>
        </form>
      </div>
    </div>
  );
}