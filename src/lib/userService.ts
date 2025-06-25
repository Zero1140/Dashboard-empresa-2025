// lib/userService.ts

export interface User {
    id: number;
    name: string;
    email: string;
    factory: string; // debe ser "1" o "2"
    role: 'admin' | 'usuario';
    password: string;
  }
  
  export interface UserInput extends Omit<User, 'id'> {}
  
  const LOCAL_STORAGE_KEY = 'usuarios';
  
  // Leer usuarios del localStorage
  const readUsers = (): User[] => {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error('Error leyendo usuarios del localStorage:', error);
      return [];
    }
  };
  
  // Guardar usuarios en el localStorage
  const writeUsers = (users: User[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(users));
  };
  
  // Agregar nuevo usuario
  const addUser = (user: UserInput): User => {
    const users = readUsers();
    const newUser: User = {
      ...user,
      id: Date.now(),
    };
    writeUsers([...users, newUser]);
    return newUser;
  };
  
  // Actualizar un usuario existente
  const updateUser = (user: User): User => {
    const users = readUsers().map((u) => (u.id === user.id ? user : u));
    writeUsers(users);
    return user;
  };
  
  // Eliminar un usuario por ID
  const deleteUser = (id: number): boolean => {
    const users = readUsers();
    const updated = users.filter((u) => u.id !== id);
    if (updated.length === users.length) return false;
    writeUsers(updated);
    return true;
  };
  
  // Obtener un usuario por email
  const getUserByEmail = (email: string): User | undefined => {
    return readUsers().find((u) => u.email === email);
  };
  
  // Obtener un usuario por ID
  const getUserById = (id: number): User | undefined => {
    return readUsers().find((u) => u.id === id);
  };
  
  // Exportar el servicio
  export const userService = {
    getAllUsers: readUsers,
    addUser,
    updateUser,
    deleteUser,
    getUserByEmail,
    getUserById,
  };