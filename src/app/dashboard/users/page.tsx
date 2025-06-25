'use client';

import { useEffect, useState } from 'react';
import { userService, User, UserInput } from '../../../lib/userService';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Sidebar from '../../ui/Sidebar';

export default function UserDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserInput>({
    name: '',
    email: '',
    factory: '',
    role: 'usuario',
    password: '',
  });

  const fetchUsers = async () => {
    const data = await userService.getAllUsers();
    setUsers(data);
  };

  useEffect(() => {
    const stored = localStorage.getItem('loggedUser');
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    }
    fetchUsers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!currentUser || currentUser.role !== 'admin') return;

    if (editingId) {
      await userService.updateUser({ ...form, id: editingId });
    } else {
      await userService.addUser(form);
    }
    setForm({ name: '', email: '', factory: '', role: 'usuario', password: '' });
    setEditingId(null);
    fetchUsers();
  };

  const handleEdit = (user: User) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    setForm({ ...user });
    setEditingId(user.id);
  };

  const handleDelete = async (id: number) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    await userService.deleteUser(id);
    fetchUsers();
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">👥 Gestión de Usuarios</h2>

        {currentUser?.role !== 'admin' && (
          <p className="text-red-500 mb-6">No tienes permisos para modificar los usuarios.</p>
        )}

        {/* Formulario solo visible para admins */}
        {currentUser?.role === 'admin' && (
          <div className="space-y-4 max-w-2xl">
            <Input label="Nombre" name="name" value={form.name} onChange={handleChange} />
            <Input label="Email" name="email" value={form.email} onChange={handleChange} />
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Fábrica
              <select
                name="factory"
                value={form.factory}
                onChange={handleChange}
                className="mt-1 w-full border border-gray-300 p-2 rounded dark:bg-gray-800 dark:border-gray-700"
              >
                <option value="">Selecciona una fábrica</option>
                <option value="1">Fábrica 1</option>
                <option value="2">Fábrica 2</option>
              </select>
            </label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded dark:bg-gray-800 dark:border-gray-700"
            >
              <option value="admin">Admin</option>
              <option value="usuario">Usuario</option>
            </select>
            <Input
              label="Contraseña"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
            />
            <Button onClick={handleSubmit}>
              {editingId ? 'Actualizar' : 'Agregar'} Usuario
            </Button>
          </div>
        )}

        {/* Tabla de usuarios */}
        <div className="mt-10 overflow-x-auto">
          <table className="w-full table-auto border border-gray-300 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="p-2 text-left">Nombre</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Fábrica</th>
                <th className="p-2 text-left">Rol</th>
                <th className="p-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="p-2">{u.name}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.factory}</td>
                  <td className="p-2 capitalize">{u.role}</td>
                  <td className="p-2 space-x-2">
                    {currentUser?.role === 'admin' && (
                      <>
                        <Button onClick={() => handleEdit(u)} size="sm">Editar</Button>
                        <Button onClick={() => handleDelete(u.id)} variant="destructive" size="sm">Eliminar</Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}