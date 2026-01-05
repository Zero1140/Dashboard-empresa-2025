"use client";

import { useState, useEffect } from "react";
import { obtenerAlertasStock } from "../utils/stockMinimos";
import { obtenerStockSync } from "../utils/stock";
import { obtenerStockCategoriasSync } from "../utils/stockCategorias";
import { obtenerCategoriasArraySync } from "../utils/categorias";
import { obtenerColoresCombinadosSync } from "../utils/colores";

interface SidebarProps {
  paginaActual: "maquinas" | "informacion" | "stock" | "materiales";
  onCambiarPagina: (pagina: "maquinas" | "informacion" | "stock" | "materiales") => void;
  modoEdicion: boolean;
  supervisorActual: string | null;
  onShowLogin: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  paginaActual,
  onCambiarPagina,
  modoEdicion,
  supervisorActual,
  onShowLogin,
  onLogout,
}: SidebarProps) {
  const [alertasCount, setAlertasCount] = useState<number>(0);

  // Calcular alertas periódicamente
  useEffect(() => {
    const calcularAlertas = () => {
      if (modoEdicion) {
        const stock = obtenerStockSync();
        const stockCategorias = obtenerStockCategoriasSync();
        const categorias = obtenerCategoriasArraySync();
        const coloresCombinados = obtenerColoresCombinadosSync();
        const alertas = obtenerAlertasStock(stock, stockCategorias, coloresCombinados, categorias);
        setAlertasCount(alertas.length);
      } else {
        setAlertasCount(0);
      }
    };

    calcularAlertas();
    const interval = setInterval(calcularAlertas, 2000);
    return () => clearInterval(interval);
  }, [modoEdicion]);
  return (
    <div className="w-64 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f1419] min-h-screen p-6 border-r border-[#2d3748] flex flex-col shadow-2xl relative z-10 backdrop-blur-sm">
      {/* Efecto de brillo sutil en el borde */}
      <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-[rgba(0,212,255,0.4)] to-transparent"></div>
      
      {/* Logo y título mejorado */}
      <div className="mb-8 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-xl shadow-[#00d4ff]/40 ring-2 ring-[#00d4ff]/20">
            <span className="text-2xl">⚙️</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              <span className="bg-gradient-to-r from-white via-[#00d4ff] to-white bg-clip-text text-transparent">
                GST3D
              </span>
            </h1>
            <p className="text-[#718096] text-xs font-medium">Fábrica de Filamentos 3D</p>
          </div>
        </div>
      </div>

      {/* Indicador de modo mejorado */}
      <div className={`mb-6 p-4 rounded-xl transition-all duration-300 card-elegant ${
        modoEdicion 
          ? "border-[#ffb800]/50 shadow-lg shadow-[#ffb800]/20" 
          : ""
      }`}>
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
            modoEdicion ? "bg-[#ffb800]/20 ring-2 ring-[#ffb800]/30" : "bg-[#2d3748]"
          }`}>
            <span className={modoEdicion ? "text-[#ffb800] text-lg" : "text-[#718096] text-lg"}>
              {modoEdicion ? "⚡" : "👤"}
            </span>
          </div>
          <span className={`text-sm font-bold ${modoEdicion ? "text-[#ffb800]" : "text-[#a0aec0]"}`}>
            {modoEdicion ? "Supervisor" : "Operador"}
          </span>
        </div>
        <p className="text-[#718096] text-xs mt-2 leading-relaxed">
          {modoEdicion ? "Control total del sistema" : "Solo impresión disponible"}
        </p>
        {modoEdicion && supervisorActual && (
          <div className="mt-3 pt-3 border-t border-[#2d3748]">
            <p className="text-[#ffb800] text-xs font-semibold flex items-center gap-2">
              <span className="text-[#00d4ff]">🔑</span>
              <span className="truncate">{supervisorActual}</span>
            </p>
          </div>
        )}
      </div>

      <nav className="space-y-2.5 flex-1">
        <button
          onClick={() => onCambiarPagina("maquinas")}
          className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 hover-lift btn-elegant relative ${
            paginaActual === "maquinas"
              ? "bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-white font-semibold shadow-lg shadow-[#00d4ff]/30 ring-2 ring-[#00d4ff]/20"
              : "card-elegant text-[#a0aec0] hover:text-white"
          }`}
        >
          <div className="flex items-center gap-3 relative z-10">
            <span className="text-lg">{paginaActual === "maquinas" ? "🏭" : "⚙️"}</span>
            <span className="font-medium">Máquinas</span>
          </div>
        </button>

        {modoEdicion && (
          <>
            <button
              onClick={() => onCambiarPagina("informacion")}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 hover-lift btn-elegant relative ${
                paginaActual === "informacion"
                  ? "bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-white font-semibold shadow-lg shadow-[#00d4ff]/30 ring-2 ring-[#00d4ff]/20"
                  : "card-elegant text-[#a0aec0] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3 relative z-10">
                <span className="text-lg">{paginaActual === "informacion" ? "📊" : "📈"}</span>
                <span className="font-medium">Información</span>
              </div>
            </button>

            <button
              onClick={() => onCambiarPagina("stock")}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 hover-lift btn-elegant relative ${
                paginaActual === "stock"
                  ? "bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-white font-semibold shadow-lg shadow-[#00d4ff]/30 ring-2 ring-[#00d4ff]/20"
                  : alertasCount > 0
                  ? "card-elegant text-[#a0aec0] hover:text-white border-[#ff4757]/30"
                  : "card-elegant text-[#a0aec0] hover:text-white"
              }`}
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{paginaActual === "stock" ? "📦" : "📋"}</span>
                  <span className="font-medium">Stock</span>
                </div>
                {alertasCount > 0 && (
                  <div className="bg-gradient-to-r from-[#ff4757] to-[#cc3846] text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center animate-pulse">
                    {alertasCount > 99 ? "99+" : alertasCount}
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={() => onCambiarPagina("materiales")}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 hover-lift btn-elegant relative ${
                paginaActual === "materiales"
                  ? "bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-white font-semibold shadow-lg shadow-[#00d4ff]/30 ring-2 ring-[#00d4ff]/20"
                  : "card-elegant text-[#a0aec0] hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3 relative z-10">
                <span className="text-lg">{paginaActual === "materiales" ? "🎨" : "🖌️"}</span>
                <span className="font-medium">Materiales</span>
              </div>
            </button>
          </>
        )}
      </nav>

      {/* Botones de autenticación mejorados */}
      <div className="mt-auto pt-6 border-t border-[#2d3748]">
        {modoEdicion ? (
          <button
            onClick={onLogout}
            className="w-full btn-elegant bg-[#2d3748] hover:bg-[#4a5568] text-white font-semibold px-4 py-3 rounded-xl transition-all duration-200 hover-lift border border-[#4a5568]"
          >
            Cerrar Sesión
          </button>
        ) : (
          <button
            onClick={onShowLogin}
            className="w-full btn-elegant bg-gradient-to-r from-[#ffb800] to-[#ff9500] hover:from-[#ffc933] hover:to-[#ffb800] text-white font-bold px-4 py-3 rounded-xl transition-all duration-200 hover-lift shadow-lg shadow-[#ffb800]/30"
          >
            🔐 Iniciar Sesión
          </button>
        )}
      </div>
    </div>
  );
}

