"use client";

import { useState, useEffect } from "react";

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  onEscape?: () => void;
}

export default function NumericKeypad({
  value,
  onChange,
  maxLength = 10,
  placeholder = "Ingresa el PIN",
  autoFocus = false,
  onEnter,
  onEscape,
}: NumericKeypadProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (autoFocus) {
      setIsVisible(true);
    }
  }, [autoFocus]);

  const handleNumberClick = (num: number) => {
    if (value.length < maxLength) {
      onChange(value + num.toString());
    }
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onEnter) {
      onEnter();
    } else if (e.key === "Escape" && onEscape) {
      onEscape();
    } else if (e.key >= "0" && e.key <= "9" && value.length < maxLength) {
      onChange(value + e.key);
    } else if (e.key === "Backspace") {
      handleDelete();
    }
  };

  return (
    <div className="space-y-4">
      {/* Campo de entrada (oculto pero funcional para accesibilidad) */}
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const newValue = e.target.value.replace(/\D/g, "").slice(0, maxLength);
          onChange(newValue);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsVisible(true)}
        className="sr-only"
        autoFocus={autoFocus}
        aria-label={placeholder}
      />

      {/* Display del PIN */}
      <div className="relative">
        <div
          className="w-full bg-[#0f1419] text-white px-5 py-4 rounded-xl border-2 border-[#2d3748] focus-within:border-[#00d4ff] transition-all duration-200 shadow-lg min-h-[60px] flex items-center justify-center"
          onClick={() => setIsVisible(true)}
        >
          {value ? (
            <div className="flex items-center gap-2">
              {value.split("").map((digit, index) => (
                <div
                  key={index}
                  className="w-10 h-10 rounded-lg bg-[#1a2332] border border-[#2d3748] flex items-center justify-center text-xl font-bold text-[#00d4ff]"
                >
                  {digit}
                </div>
              ))}
              {Array.from({ length: maxLength - value.length }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="w-10 h-10 rounded-lg bg-[#0f1419] border border-[#2d3748] flex items-center justify-center"
                >
                  <div className="w-2 h-2 rounded-full bg-[#2d3748]"></div>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-[#718096] text-sm">{placeholder}</span>
          )}
        </div>
      </div>

      {/* Teclado numérico */}
      {isVisible && (
        <div className="bg-[#0f1419] rounded-xl p-4 border border-[#2d3748] shadow-xl">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num)}
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
              onClick={() => handleNumberClick(0)}
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
          {(onEnter || onEscape) && (
            <div className="grid grid-cols-2 gap-3 mt-3">
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
                  disabled={value.length < 4}
                  className="bg-gradient-to-r from-[#00d4ff] to-[#0099cc] hover:from-[#33ddff] hover:to-[#00b3e6] disabled:from-[#2d3748] disabled:to-[#1a2332] disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#00d4ff]/30 hover:shadow-[#00d4ff]/50 disabled:shadow-none hover-lift"
                >
                  Confirmar
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


