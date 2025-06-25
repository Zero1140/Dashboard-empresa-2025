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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-900">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow-md rounded px-8 pt-6 pb-8 w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-4 text-center">Iniciar Sesión</h2>
        <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {success && <p className="text-green-500 text-sm mt-2">{success}</p>}

        <Button type="submit" className="mt-4 w-full" disabled={loading}>
          {loading ? 'Cargando...' : 'Entrar'}
        </Button>
      </form>
    </div>
  );
}