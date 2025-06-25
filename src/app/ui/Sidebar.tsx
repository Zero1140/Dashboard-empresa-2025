'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

const links = [
  { href: '/dashboard', label: '🏠 Dashboard', roles: ['admin', 'usuario'] },
  { href: '/dashboard/categories', label: '📂 Stock', roles: ['admin', 'usuario'] },
  { href: '/dashboard/operatoruser', label: '👷 Operador de maquina', roles: ['admin','usuario'] },
  { href: '/dashboard/history', label: '📜 Historial', roles: ['admin'] },
  { href: '/dashboard/users', label: '👥 Usuarios', roles: ['admin'] },
  { href: '/configuracion', label: '⚙️ Configuración', roles: ['admin', 'usuario'] },
];

type User = {
  name: string;
  email: string;
  password: string;
  role: string;
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('loggedUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('loggedUser');
    router.push('/login');
  };

  if (!user) {
    return null; // O un loader/spinner si prefieres
  }

  const avatarUrl = `https://i.pravatar.cc/150?u=${user.email}`;

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col justify-between border-r border-gray-800">
      {/* User Info */}
      <div className="px-6 py-8">
        <div className="flex flex-col items-center">
          <img
            src={avatarUrl}
            alt="Avatar"
            className="w-16 h-16 rounded-full object-cover border-2 border-cyan-400"
          />
          <p className="mt-4 font-semibold">{user.name}</p>
          <p className="text-sm text-gray-400">{user.email}</p>
          <span className="mt-2 text-xs px-2 py-0.5 bg-cyan-800 text-white rounded">
            {user.role}
          </span>
        </div>

        {/* Navigation */}
        <nav className="mt-10 flex flex-col gap-2">
          {links
            .filter(link => link.roles.includes(user.role))
            .map(link => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-cyan-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span>{link.label.split(' ')[0]}</span>
                  <span>{link.label.split(' ').slice(1).join(' ')}</span>
                </Link>
              );
            })}
        </nav>
      </div>

      {/* Logout Button */}
      <div className="px-6 pb-6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}