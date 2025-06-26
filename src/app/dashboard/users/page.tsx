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
    // Aseguramos que el formulario tenga las mismas claves que UserInput
    setForm({
      name: user.name || '',
      email: user.email || '',
      factory: user.factory || '',
      role: user.role || 'usuario',
      password: '', // No rellenar la contraseña al editar
    });
    setEditingId(user.id);
  };

  const handleDelete = async (id: number) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    await userService.deleteUser(id);
    fetchUsers();
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <Sidebar />
      <main className="flex-1 p-0 md:p-10 flex flex-col items-center justify-start bg-transparent">
        <div className="w-full max-w-6xl">
          <div className="flex items-center justify-between mb-10 mt-8">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
              <span className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full p-2 shadow">
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.418 0-8 2.239-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.761-3.582-5-8-5Z"/></svg>
              </span>
              Gestión de Usuarios
            </h2>
            {currentUser?.role === 'admin' && (
              <div className="hidden md:block">
                <Button
                  onClick={() => {
                    setForm({ name: '', email: '', factory: '', role: 'usuario', password: '' });
                    setEditingId(null);
                  }}
                  variant="secondary"
                >
                  Nuevo Usuario
                </Button>
              </div>
            )}
          </div>

          {currentUser?.role !== 'admin' && (
            <div className="mb-8">
              <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 px-6 py-4 flex items-center gap-3 shadow-sm">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm1 14v2h-2v-2h2Zm0-8v6h-2V8h2Z"/></svg>
                <span className="text-red-700 dark:text-red-300 font-medium">
                  No tienes permisos para modificar los usuarios.
                </span>
              </div>
            </div>
          )}

          {/* Formulario solo visible para admins */}
          {currentUser?.role === 'admin' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-12 border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Nombre"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="col-span-1 rounded-lg"
                />
                <Input
                  label="Email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="col-span-1 rounded-lg"
                />
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Fábrica
                  </label>
                  <select
                    name="factory"
                    value={form.factory}
                    onChange={handleChange}
                    className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded-lg bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">Selecciona una fábrica</option>
                    <option value="1">Fábrica 1</option>
                    <option value="2">Fábrica 2</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                    Rol
                  </label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full border border-gray-300 dark:border-gray-700 p-2 rounded-lg bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="admin">Admin</option>
                    <option value="usuario">Usuario</option>
                  </select>
                </div>
                <Input
                  label="Contraseña"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  className="col-span-1 md:col-span-2 rounded-lg"
                />
              </div>
              <div className="flex justify-end mt-8">
                <Button
                  onClick={handleSubmit}
                  className="px-8 py-2 text-lg rounded-lg shadow transition-all duration-150"
                >
                  {editingId ? (
                    <>
                      <svg className="inline w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M5 13l4 4L19 7"/></svg>
                      Actualizar Usuario
                    </>
                  ) : (
                    <>
                      <svg className="inline w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4v16m8-8H4"/></svg>
                      Agregar Usuario
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Tabla de usuarios */}
          <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gradient-to-r from-blue-100 via-blue-50 to-blue-200 dark:from-blue-900 dark:via-gray-900 dark:to-blue-950">
                  <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-200">Nombre</th>
                  <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-200">Email</th>
                  <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-200">Fábrica</th>
                  <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-200">Rol</th>
                  <th className="p-4 text-left font-semibold text-gray-700 dark:text-gray-200">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400 dark:text-gray-500">
                      No hay usuarios registrados.
                    </td>
                  </tr>
                ) : (
                  users.map((u, idx) => (
                    <tr
                      key={u.id}
                      className={`transition-colors duration-100 ${
                        idx % 2 === 0
                          ? 'bg-gray-50 dark:bg-gray-900'
                          : 'bg-white dark:bg-gray-800'
                      } border-t border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-950`}
                    >
                      <td className="p-4 font-medium text-gray-900 dark:text-gray-100">{u.name}</td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">{u.email}</td>
                      <td className="p-4 text-gray-700 dark:text-gray-300">{u.factory}</td>
                      <td className="p-4 capitalize">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            u.role === 'admin'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 space-x-2">
                        {currentUser?.role === 'admin' && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEdit(u)}
                              size="sm"
                              variant="secondary"
                              className="rounded-lg border-blue-400 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-900"
                            >
                              <svg className="inline w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M4 21h17M17.5 6.5l-11 11a2.121 2.121 0 0 1-3-3l11-11a2.121 2.121 0 0 1 3 3Z"/></svg>
                              Editar
                            </Button>
                            <Button
                              onClick={() => handleDelete(u.id)}
                              variant="destructive"
                              size="sm"
                              className="rounded-lg"
                            >
                              <svg className="inline w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12ZM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4Z"/></svg>
                              Eliminar
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}