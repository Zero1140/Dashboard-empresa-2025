'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [factory, setFactory] = useState('fabrica-1');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Lista simulada de usuarios con roles
  const USERS = [
    {
      email: 'admin@empresa.com',
      password: '123456',
      role: 'admin',
    },
    {
      email: 'usuario@empresa.com',
      password: 'usuario123',
      role: 'usuario',
    },
    // Puedes agregar más usuarios aquí
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    setTimeout(() => {
      const user = USERS.find((u) => u.email === email);

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

      setSuccess('¡Login exitoso!');
      setTimeout(() => {
        router.push(`/dashboard?fabrica=${factory}&rol=${user.role}`);
      }, 1000);
    }, 900);
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center relative bg-gradient-to-br from-blue-900 via-blue-700 to-indigo-900"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1500&q=80')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm"></div>
      <section className="relative z-10 flex flex-col items-center w-full max-w-md">
        <div className="bg-white/90 rounded-2xl shadow-2xl px-10 py-12 w-full">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full p-3 shadow-lg mb-4">
              <svg width="40" height="40" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="12" fill="#fff" />
                <path
                  d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                  fill="#6366f1"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-1 tracking-tight">
              Bienvenido
            </h1>
            <p className="text-gray-500 text-sm font-medium">
              Inicia sesión para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="bg-red-100 border border-red-300 text-red-700 rounded px-3 py-2 text-center text-sm animate-shake">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-100 border border-green-300 text-green-700 rounded px-3 py-2 text-center text-sm">
                {success}
              </div>
            )}

            <div>
              <label className="block text-gray-700 font-semibold mb-1" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                placeholder="ejemplo@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1" htmlFor="factory">
                Selecciona Fábrica
              </label>
              <select
                id="factory"
                value={factory}
                onChange={(e) => setFactory(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              >
                <option value="fabrica-1">Fábrica 1</option>
                <option value="fabrica-2">Fábrica 2</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 mt-2 rounded-lg font-bold text-lg transition bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${
                loading ? 'opacity-60 cursor-not-allowed' : ''
              }`}
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
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>
        <footer className="mt-8 text-gray-300 text-xs text-center w-full">
          &copy; {new Date().getFullYear()} Empresa. Todos los derechos reservados.
        </footer>
      </section>
    </main>
  );
}