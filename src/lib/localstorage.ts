// lib/localUserStorage.ts

export interface LocalUser {
    id: number;
    name: string;
    email: string;
    factory: string;
    role: 'admin' | 'usuario';
    password: string;
  }
  
  const STORAGE_KEY = 'usuarios';
  
  export const getAllUsers = (): LocalUser[] => {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error al leer usuarios:', e);
      return [];
    }
  };
  
  const saveAllUsers = (users: LocalUser[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  };
  
  export const addUser = (user: Omit<LocalUser, 'id'>): LocalUser => {
    const users = getAllUsers();
    const newUser: LocalUser = { id: Date.now(), ...user };
    users.push(newUser);
    saveAllUsers(users);
    return newUser;
  };
  
  export const updateUser = (id: number, updates: Partial<LocalUser>): LocalUser | null => {
    const users = getAllUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;
    users[index] = { ...users[index], ...updates };
    saveAllUsers(users);
    return users[index];
  };
  
  export const deleteUser = (id: number): boolean => {
    const users = getAllUsers();
    const filtered = users.filter(u => u.id !== id);
    if (users.length === filtered.length) return false;
    saveAllUsers(filtered);
    return true;
  };
  
  export const getUserById = (id: number): LocalUser | undefined => {
    return getAllUsers().find(u => u.id === id);
  };
  
  export const getUserByEmail = (email: string): LocalUser | undefined => {
    return getAllUsers().find(u => u.email === email);
  };