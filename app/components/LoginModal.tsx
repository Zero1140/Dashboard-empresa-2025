"use client";

import { useState } from "react";
import { SUPERVISORES, PASSWORD_SUPERVISOR } from "../data";
import VirtualKeyboard from "./VirtualKeyboard";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (supervisor: string) => void;
}

export default function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [supervisorSeleccionado, setSupervisorSeleccionado] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");

  if (!isOpen) return null;

  const performLogin = () => {
    setError("");

    if (!supervisorSeleccionado) {
      setError("Por favor, selecciona un supervisor");
      return;
    }

    if (!password) {
      setError("Por favor, ingresa la contraseña");
      return;
    }

    if (password !== PASSWORD_SUPERVISOR) {
      setError("Contraseña incorrecta");
      setPassword("");
      return;
    }

    // Login exitoso
    onLogin(supervisorSeleccionado);
    setSupervisorSeleccionado("");
    setPassword("");
    setError("");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin();
  };

  const handleClose = () => {
    setSupervisorSeleccionado("");
    setPassword("");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in-up p-4">
      <div 
        className="card-elegant rounded-2xl p-6 lg:p-8 max-w-md w-full border-2 border-[#ffb800]/30 shadow-2xl relative overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#ffb800]/10 via-transparent to-[#ffb800]/5"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffb800]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#ffb800] to-[#ff9500] flex items-center justify-center shadow-xl shadow-[#ffb800]/40 ring-2 ring-[#ffb800]/20">
              <span className="text-2xl">🔐</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Acceso de Supervisor
              </h2>
              <p className="text-[#718096] text-xs mt-1">
                Credenciales requeridas
              </p>
            </div>
          </div>
          <p className="text-[#a0aec0] text-sm mb-6 leading-relaxed">
            Ingresa tus credenciales para acceder al modo supervisor
          </p>

          <form onSubmit={handleLogin}>
            <div className="space-y-5">
              {/* Selector de supervisor */}
              <div>
                <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
                  Supervisor:
                </label>
                <select
                  value={supervisorSeleccionado}
                  onChange={(e) => setSupervisorSeleccionado(e.target.value)}
                  className="w-full bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-[#00d4ff] cursor-pointer font-medium shadow-lg hover:border-[#00d4ff]/50 transition-all duration-200"
                >
                  <option value="">-- Selecciona supervisor --</option>
                  {SUPERVISORES.map((sup) => (
                    <option key={sup} value={sup}>
                      {sup}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campo de contraseña con teclado virtual */}
              <div>
                <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
                  Contraseña:
                </label>
                <VirtualKeyboard
                  value={password}
                  onChange={setPassword}
                  maxLength={50}
                  placeholder="Ingresa la contraseña del supervisor"
                  autoFocus={true}
                  passwordMode={true}
                  numericOnly={true}
                  onEnter={performLogin}
                  onEscape={handleClose}
                />
              </div>

              {/* Mensaje de error */}
              {error && (
                <div className="bg-gradient-to-r from-[#ff4757]/20 to-[#cc3846]/20 border border-[#ff4757]/50 text-[#ff6b7a] px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2">
                  <span>⚠️</span>
                  {error}
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-elegant flex-1 bg-[#2d3748] hover:bg-[#4a5568] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 border border-[#4a5568] hover:border-[#6a7488] hover-lift"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-elegant flex-1 bg-gradient-to-r from-[#ffb800] to-[#ff9500] hover:from-[#ffc933] hover:to-[#ffb800] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 disabled:from-[#2d3748] disabled:to-[#1a2332] disabled:cursor-not-allowed shadow-lg shadow-[#ffb800]/30 hover:shadow-[#ffb800]/50 hover-lift"
                  disabled={!supervisorSeleccionado || !password}
                >
                  Iniciar Sesión
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


