"use client";

import { useState, useEffect } from "react";
import { obtenerOperadoresCombinados } from "../utils/operadores";
import { tienePinOperador, verificarPinOperador } from "../utils/pins";

interface CambiarOperadorMaquinaModalProps {
  maquinaId: number;
  operadorActual: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (nuevoOperador: string) => void;
  modoEdicion?: boolean; // Si es supervisor, no requiere PIN
}

export default function CambiarOperadorMaquinaModal({
  maquinaId,
  operadorActual,
  isOpen,
  onClose,
  onConfirm,
  modoEdicion = false,
}: CambiarOperadorMaquinaModalProps) {
  const [nuevoOperador, setNuevoOperador] = useState<string>(operadorActual);
  const [pinOperador, setPinOperador] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [mostrarPin, setMostrarPin] = useState<boolean>(false);

  // Resetear cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setNuevoOperador(operadorActual);
      setPinOperador("");
      setError("");
      setMostrarPin(false);
    }
  }, [isOpen, operadorActual]);

  if (!isOpen) return null;

  const handleOperadorChange = (operador: string) => {
    setNuevoOperador(operador);
    setError("");
    // Si el operador tiene PIN configurado y no es supervisor, mostrar campo de PIN
    if (operador && tienePinOperador(operador) && !modoEdicion) {
      setMostrarPin(true);
      setPinOperador("");
    } else {
      setMostrarPin(false);
      setPinOperador("");
    }
  };

  const handleConfirmarCambio = () => {
    if (!nuevoOperador) {
      setError("Por favor, selecciona un operador");
      return;
    }

    // Si el operador tiene PIN y no es supervisor, verificar PIN
    if (tienePinOperador(nuevoOperador) && !modoEdicion) {
      if (!pinOperador) {
        setError("Por favor, ingresa el PIN del operador");
        return;
      }
      
      if (!verificarPinOperador(nuevoOperador, pinOperador)) {
        setError("PIN incorrecto. Por favor, verifica e intenta nuevamente");
        setPinOperador("");
        return;
      }
    }

    // Confirmar cambio
    onConfirm(nuevoOperador);
    setNuevoOperador(operadorActual);
    setPinOperador("");
    setError("");
    setMostrarPin(false);
  };

  const handleClose = () => {
    setNuevoOperador(operadorActual);
    setPinOperador("");
    setError("");
    setMostrarPin(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in-up p-4">
      <div 
        className="card-elegant rounded-2xl p-6 lg:p-8 max-w-md w-full border-2 border-[#00d4ff]/30 shadow-2xl relative overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#00d4ff]/10 via-transparent to-[#00d4ff]/5"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d4ff]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-xl shadow-[#00d4ff]/40 ring-2 ring-[#00d4ff]/20">
              <span className="text-2xl">👷</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Seleccionar Operador
              </h2>
              <p className="text-[#718096] text-xs mt-1">
                Máquina {maquinaId}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {operadorActual && (
              <div className="bg-[#0f1419]/50 rounded-xl p-3 border border-[#2d3748]">
                <p className="text-[#718096] text-sm">
                  Operador actual: <span className="font-semibold text-white">{operadorActual}</span>
                </p>
              </div>
            )}

            {/* Selector de operador */}
            <div>
              <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
                Nuevo Operador:
              </label>
              <select
                value={nuevoOperador}
                onChange={(e) => handleOperadorChange(e.target.value)}
                className="w-full bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-[#00d4ff] cursor-pointer font-medium shadow-lg hover:border-[#00d4ff]/50 transition-all duration-200"
              >
                <option value="">-- Selecciona operador --</option>
                {obtenerOperadoresCombinados().map((op) => (
                  <option key={op} value={op}>
                    {op} {tienePinOperador(op) && !modoEdicion ? "🔐" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo de PIN (solo si el operador tiene PIN y no es supervisor) */}
            {mostrarPin && nuevoOperador && tienePinOperador(nuevoOperador) && !modoEdicion && (
              <div>
                <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
                  🔐 PIN del Operador {nuevoOperador}:
                </label>
                <input
                  type="password"
                  value={pinOperador}
                  onChange={(e) => {
                    setPinOperador(e.target.value);
                    setError("");
                  }}
                  className="w-full bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-[#00d4ff] placeholder-[#718096] shadow-lg hover:border-[#00d4ff]/50 transition-all duration-200"
                  placeholder="Ingresa el PIN del operador"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && nuevoOperador && pinOperador) {
                      handleConfirmarCambio();
                    }
                    if (e.key === "Escape") {
                      handleClose();
                    }
                  }}
                />
                <p className="text-[#718096] text-xs mt-2">
                  💡 El operador seleccionado tiene PIN configurado. Ingresa su PIN para confirmar.
                </p>
              </div>
            )}

            {/* Mensaje de error */}
            {error && (
              <div className="bg-gradient-to-r from-[#ff4757]/20 to-[#cc3846]/20 border border-[#ff4757]/50 text-[#ff6b7a] px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2">
                <span>⚠️</span>
                {error}
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleClose}
                className="flex-1 bg-[#2d3748] hover:bg-[#4a5568] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 border border-[#4a5568] hover:border-[#6a7488] hover-lift"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarCambio}
                className="flex-1 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] hover:from-[#33ddff] hover:to-[#00b3e6] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#00d4ff]/30 hover:shadow-[#00d4ff]/50 hover-lift disabled:from-[#2d3748] disabled:to-[#1a2332] disabled:cursor-not-allowed"
                disabled={!nuevoOperador || (mostrarPin && !pinOperador)}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
