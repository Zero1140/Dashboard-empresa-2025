"use client";

import { useState } from "react";

interface VirtualKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  onEscape?: () => void;
  passwordMode?: boolean; // Si es true, muestra puntos en lugar de caracteres
  numericOnly?: boolean; // Si es true, solo muestra números (por defecto: true para contraseñas)
}

export default function VirtualKeyboard({
  value,
  onChange,
  maxLength = 50,
  placeholder = "Ingresa el texto",
  autoFocus = false,
  onEnter,
  onEscape,
  passwordMode = false,
  numericOnly = true, // Por defecto solo números
}: VirtualKeyboardProps) {
  const [isVisible, setIsVisible] = useState(autoFocus);
  const [isUpperCase, setIsUpperCase] = useState(true);

  // Teclas del teclado
  const primeraFila = numericOnly ? [] : ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];
  const segundaFila = numericOnly ? [] : ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
  const terceraFila = numericOnly ? [] : ["Z", "X", "C", "V", "B", "N", "M"];
  const numeros = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

  const handleKeyClick = (key: string) => {
    if (value.length < maxLength) {
      const keyToAdd = isUpperCase && !numericOnly ? key.toUpperCase() : key.toLowerCase();
      onChange(value + keyToAdd);
    }
  };

  const handleNumberClick = (num: string) => {
    if (value.length < maxLength) {
      onChange(value + num);
    }
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange("");
  };

  const handleSpace = () => {
    if (value.length < maxLength) {
      onChange(value + " ");
    }
  };

  const toggleCase = () => {
    setIsUpperCase(!isUpperCase);
  };

  return (
    <div className="space-y-4">
      {/* Campo de entrada visual */}
      <div
        className="w-full bg-[#0f1419] text-white px-5 py-4 rounded-xl border-2 border-[#2d3748] focus-within:border-[#00d4ff] transition-all duration-200 shadow-lg min-h-[60px] flex items-center"
        onClick={() => setIsVisible(true)}
      >
        {value ? (
          <div className="flex items-center gap-1 flex-wrap">
            {passwordMode ? (
              <span className="text-xl font-mono">
                {"•".repeat(value.length)}
              </span>
            ) : (
              <span className="text-lg font-medium">{value}</span>
            )}
          </div>
        ) : (
          <span className="text-[#718096] text-sm">{placeholder}</span>
        )}
        <div className="ml-auto text-[#718096] text-xs">
          {value.length}/{maxLength}
        </div>
      </div>

      {/* Teclado virtual */}
      {isVisible && (
        <div className="bg-[#0f1419] rounded-xl p-4 border border-[#2d3748] shadow-xl">
          {!numericOnly ? (
            <>
              {/* Primera fila */}
              <div className="grid grid-cols-10 gap-2 mb-2">
                {primeraFila.map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKeyClick(key)}
                    className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] hover:from-[#2d3748] hover:to-[#1a2332] text-white font-bold text-lg py-3 px-2 rounded-lg border border-[#2d3748] hover:border-[#00d4ff]/50 transition-all duration-200 shadow-md hover:shadow-lg hover-lift active:scale-95"
                  >
                    {isUpperCase ? key : key.toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Segunda fila */}
              <div className="grid grid-cols-9 gap-2 mb-2 justify-center">
                {segundaFila.map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKeyClick(key)}
                    className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] hover:from-[#2d3748] hover:to-[#1a2332] text-white font-bold text-lg py-3 px-2 rounded-lg border border-[#2d3748] hover:border-[#00d4ff]/50 transition-all duration-200 shadow-md hover:shadow-lg hover-lift active:scale-95"
                  >
                    {isUpperCase ? key : key.toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Tercera fila con Shift */}
              <div className="grid grid-cols-10 gap-2 mb-2">
                <button
                  onClick={toggleCase}
                  className="bg-gradient-to-br from-[#ffb800]/20 to-[#ff9500]/20 hover:from-[#ffb800]/30 hover:to-[#ff9500]/30 text-[#ffb800] font-bold text-sm py-3 px-3 rounded-lg border border-[#ffb800]/30 hover:border-[#ffb800]/50 transition-all duration-200 shadow-md hover:shadow-lg hover-lift active:scale-95"
                  title={isUpperCase ? "Cambiar a minúsculas" : "Cambiar a mayúsculas"}
                >
                  {isUpperCase ? "⇧" : "⇩"}
                </button>
                {terceraFila.map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKeyClick(key)}
                    className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] hover:from-[#2d3748] hover:to-[#1a2332] text-white font-bold text-lg py-3 px-2 rounded-lg border border-[#2d3748] hover:border-[#00d4ff]/50 transition-all duration-200 shadow-md hover:shadow-lg hover-lift active:scale-95"
                  >
                    {isUpperCase ? key : key.toLowerCase()}
                  </button>
                ))}
                <button
                  onClick={handleDelete}
                  className="bg-gradient-to-br from-[#ff4757]/20 to-[#cc3846]/20 hover:from-[#ff4757]/30 hover:to-[#cc3846]/30 text-[#ff6b7a] font-bold text-lg py-3 px-3 rounded-lg border border-[#ff4757]/30 hover:border-[#ff4757]/50 transition-all duration-200 shadow-md hover:shadow-lg hover-lift active:scale-95"
                  title="Borrar"
                >
                  ⌫
                </button>
              </div>

              {/* Números y funciones */}
              <div className="grid grid-cols-10 gap-2 mb-2">
                {numeros.map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumberClick(num)}
                    className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] hover:from-[#2d3748] hover:to-[#1a2332] text-white font-bold text-lg py-3 px-2 rounded-lg border border-[#2d3748] hover:border-[#00d4ff]/50 transition-all duration-200 shadow-md hover:shadow-lg hover-lift active:scale-95"
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Barra espaciadora y funciones */}
              <div className="grid grid-cols-10 gap-2">
                <button
                  onClick={handleClear}
                  className="bg-gradient-to-br from-[#ff4757]/20 to-[#cc3846]/20 hover:from-[#ff4757]/30 hover:to-[#cc3846]/30 text-[#ff6b7a] font-bold text-xs py-3 px-2 rounded-lg border border-[#ff4757]/30 hover:border-[#ff4757]/50 transition-all duration-200 shadow-md hover:shadow-lg hover-lift active:scale-95"
                  title="Limpiar todo"
                >
                  🗑️
                </button>
                <button
                  onClick={handleSpace}
                  className="col-span-8 bg-gradient-to-br from-[#1a2332] to-[#0f1419] hover:from-[#2d3748] hover:to-[#1a2332] text-white font-bold text-sm py-3 px-4 rounded-lg border border-[#2d3748] hover:border-[#00d4ff]/50 transition-all duration-200 shadow-md hover:shadow-lg hover-lift active:scale-95"
                >
                  Espacio
                </button>
                <button
                  onClick={() => setIsVisible(false)}
                  className="bg-[#2d3748] hover:bg-[#4a5568] text-white font-bold text-xs py-3 px-2 rounded-lg border border-[#4a5568] hover:border-[#6a7488] transition-all duration-200 shadow-md hover:shadow-lg hover-lift active:scale-95"
                  title="Ocultar teclado"
                >
                  ⬇️
                </button>
              </div>
            </>
          ) : (
            // Modo numérico (compatible con NumericKeypad)
            <>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumberClick(num.toString())}
                    className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] hover:from-[#2d3748] hover:to-[#1a2332] text-white font-bold text-xl py-4 px-4 rounded-xl border border-[#2d3748] hover:border-[#00d4ff]/50 transition-all duration-200 shadow-md hover:shadow-lg hover-lift active:scale-95"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={handleClear}
                  className="bg-gradient-to-br from-[#ff4757]/20 to-[#cc3846]/20 hover:from-[#ff4757]/30 hover:to-[#cc3846]/30 text-[#ff6b7a] font-bold text-sm py-4 px-4 rounded-xl border border-[#ff4757]/30 hover:border-[#ff4757]/50 transition-all duration-200 shadow-md hover:shadow-lg hover-lift active:scale-95"
                  title="Limpiar"
                >
                  🗑️
                </button>
                <button
                  onClick={() => handleNumberClick("0")}
                  className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] hover:from-[#2d3748] hover:to-[#1a2332] text-white font-bold text-xl py-4 px-4 rounded-xl border border-[#2d3748] hover:border-[#00d4ff]/50 transition-all duration-200 shadow-md hover:shadow-lg hover-lift active:scale-95"
                >
                  0
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-gradient-to-br from-[#ffb800]/20 to-[#ff9500]/20 hover:from-[#ffb800]/30 hover:to-[#ff9500]/30 text-[#ffb800] font-bold text-xl py-4 px-4 rounded-xl border border-[#ffb800]/30 hover:border-[#ffb800]/50 transition-all duration-200 shadow-md hover:shadow-lg hover-lift active:scale-95"
                  title="Borrar"
                >
                  ⌫
                </button>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="w-full bg-[#2d3748] hover:bg-[#4a5568] text-white font-bold text-sm py-3 px-4 rounded-xl border border-[#4a5568] hover:border-[#6a7488] transition-all duration-200 shadow-md hover:shadow-lg hover-lift active:scale-95"
              >
                Ocultar Teclado
              </button>
            </>
          )}

          {/* Botones de acción (Enter y Escape) */}
          {(onEnter || onEscape) && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              {onEscape && (
                <button
                  onClick={onEscape}
                  className="bg-[#2d3748] hover:bg-[#4a5568] text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 border border-[#4a5568] hover:border-[#6a7488] hover-lift"
                >
                  Cancelar
                </button>
              )}
              {onEnter && (
                <button
                  onClick={onEnter}
                  disabled={value.length === 0}
                  className="bg-gradient-to-r from-[#00d4ff] to-[#0099cc] hover:from-[#33ddff] hover:to-[#00b3e6] disabled:from-[#2d3748] disabled:to-[#1a2332] disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#00d4ff]/30 hover:shadow-[#00d4ff]/50 disabled:shadow-none hover-lift"
                >
                  Confirmar
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Botón para mostrar teclado si está oculto */}
      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          className="w-full bg-[#2d3748] hover:bg-[#4a5568] text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 border border-[#4a5568] hover:border-[#6a7488] hover-lift flex items-center justify-center gap-2"
        >
          <span>⌨️</span>
          <span>Mostrar Teclado</span>
        </button>
      )}
    </div>
  );
}

