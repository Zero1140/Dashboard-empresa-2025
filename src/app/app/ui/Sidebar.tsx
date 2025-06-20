'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';

const links = [
  { href: '/dashboard', label: '🏠 Dashboard', roles: ['admin', 'usuario'] },
  { href: '/dashboard/categories', label: '📂 Productos', roles: ['admin', 'usuario'] },
  { href: '/dashboard/operators', label: '👷 Operarios', roles: ['admin'] },
  { href: '/dashboard/history', label: '📜 Historial', roles: ['admin'] },
  { href: '/dashboard/users', label: '👥 Usuarios', roles: ['admin'] },
  { href: '/configuracion', label: '⚙️ Configuración', roles: ['admin', 'usuario'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const currentUserRole = 'admin'; // Simulado
  const currentUser = {
    name: 'Juan Pérez',
    email: 'juan@gst3d.eu',
    avatar: 'https://i.pravatar.cc/150?u=juan',
  };

  const handleLogout = () => {
    console.log('Cerrar sesión');
  };

  return (
    <aside className="w-72 min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-800 text-white p-0 flex flex-col justify-between shadow-2xl border-r border-gray-800">
      {/* Header */}
      <div>
        <div className="flex flex-col items-center py-8 bg-gray-950 border-b border-gray-800 shadow-md">
          <div className="flex items-center gap-3">
            <img
              src="/logo-gst3d.png"
              alt="Logo"
              className="w-10 h-10 rounded-full bg-white object-contain shadow-lg border-2 border-primary-500"
              style={{ boxShadow: '0 2px 8px 0 #0004' }}
              onError={e => (e.currentTarget.style.display = 'none')}
            />
            <h2 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-lg">
              GST3D Panel
            </h2>
          </div>
        </div>

        {/* User Card */}
        <div className="flex flex-col items-center gap-2 py-6 px-4 bg-gradient-to-r from-gray-900/80 to-gray-800/80 rounded-b-2xl shadow-inner mb-8">
          <div className="relative">
            <img
              src={currentUser.avatar}
              alt="Avatar"
              className="w-20 h-20 rounded-full border-4 border-primary-500 object-cover shadow-lg"
              style={{ borderColor: '#38bdf8' }}
            />
            <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 border-2 border-gray-900 rounded-full shadow-md"></span>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg text-white">{currentUser.name}</p>
            <p className="text-xs text-white">{currentUser.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-primary-900 text-white font-semibold uppercase tracking-wide">
              {currentUserRole}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 px-2">
          {links
            .filter((link) => link.roles.includes(currentUserRole))
            .map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-5 py-3 rounded-lg text-base font-medium transition-all duration-200
                    ${
                      isActive
                        ? 'bg-primary-700/90 text-white shadow-md border-l-4 border-primary-400'
                        : 'text-white hover:bg-primary-800/60 hover:text-white hover:shadow'
                    }
                  `}
                  style={{
                    background:
                      isActive
                        ? 'linear-gradient(90deg, #38bdf8 0%, #0ea5e9 100%)'
                        : undefined,
                    color: '#fff',
                  }}
                >
                  <span className="text-xl">{link.label.split(' ')[0]}</span>
                  <span className="ml-1">{link.label.split(' ').slice(1).join(' ')}</span>
                </Link>
              );
            })}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="px-4 pb-8 pt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-base font-semibold bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <LogOut className="w-5 h-5" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}