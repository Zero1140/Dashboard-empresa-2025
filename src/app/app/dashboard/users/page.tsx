'use client';

import { useState } from 'react';
import Layout from '../../ui/Layout';
import Sidebar from '../../ui/Sidebar';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Card from '../../ui/Card';
import Table from '../../ui/Table';


interface User {
  id: number;
  name: string;
  email: string;
  factory: string;
  role: 'admin' | 'usuario';
}

export default function UserDashboard() {
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      name: 'Juan Pérez',
      email: 'juan@example.com',
      factory: 'Fábrica A',
      role: 'usuario',
    },
    {
      id: 2,
      name: 'Ana García',
      email: 'ana@example.com',
      factory: 'Fábrica B',
      role: 'admin',
    },
  ]);

  const [form, setForm] = useState<Omit<User, 'id'>>({
    name: '',
    email: '',
    factory: '',
    role: 'usuario',
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const currentUserRole = 'admin'; // ← Simulación de rol actual

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value as 'admin' | 'usuario' });
  };

  const handleShowForm = () => {
    setForm({
      name: '',
      email: '',
      factory: '',
      role: 'usuario',
    });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (user: User) => {
    setForm({
      name: user.name,
      email: user.email,
      factory: user.factory,
      role: user.role,
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.email.trim() || !form.factory.trim()) {
      alert('Por favor completa todos los campos');
      return;
    }

    if (editingId !== null) {
      setUsers(users.map(u => (u.id === editingId ? { ...u, ...form } : u)));
    } else {
      const newUser: User = {
        id: Date.now(),
        ...form,
      };
      setUsers([...users, newUser]);
    }

    setShowForm(false);
    setForm({ name: '', email: '', factory: '', role: 'usuario' });
    setEditingId(null);
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
        {currentUserRole === 'admin' && (
          <Button label="Agregar Usuario" onClick={handleShowForm} />
        )}
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow mb-8 max-w-xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Editar Usuario' : 'Agregar Usuario'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input label="Nombre" name="name" value={form.name} onChange={handleChange} />
            <Input label="Email" name="email" value={form.email} onChange={handleChange} />
            <Input label="Fábrica" name="factory" value={form.factory} onChange={handleChange} />
            <div>
              <label className="block mb-1 text-sm font-medium">Rol</label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="border rounded p-2 w-full"
              >
                <option value="usuario">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-4">
            <Button
              label={editingId ? 'Actualizar' : 'Guardar'}
              onClick={handleSubmit}
            />
            <Button label="Cancelar" onClick={() => setShowForm(false)} />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg shadow">
          <thead>
            <tr>
              <th className="px-4 py-2 border-b text-left">Nombre</th>
              <th className="px-4 py-2 border-b text-left">Email</th>
              <th className="px-4 py-2 border-b text-left">Fábrica</th>
              <th className="px-4 py-2 border-b text-left">Rol</th>
              <th className="px-4 py-2 border-b text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-500">
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border-b">{user.name}</td>
                  <td className="px-4 py-2 border-b">{user.email}</td>
                  <td className="px-4 py-2 border-b">{user.factory}</td>
                  <td className="px-4 py-2 border-b capitalize">{user.role}</td>
                  <td className="px-4 py-2 border-b text-center">
                    {currentUserRole === 'admin' && (
                      <div className="flex justify-center gap-2">
                        <Button label="✏️ Editar" onClick={() => handleEdit(user)} />
                        <Button label="🗑️ Eliminar" onClick={() => handleDelete(user.id)} />
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}