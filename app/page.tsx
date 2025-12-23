"use client";

import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import MaquinasPage from "./components/MaquinasPage";
import InformacionPage from "./components/InformacionPage";
import StockPage from "./components/StockPage";
import MaterialesPage from "./components/MaterialesPage";
import LoginModal from "./components/LoginModal";

const STORAGE_KEY_SUPERVISOR = "gst3d_supervisor";

export default function Home() {
  const [paginaActual, setPaginaActual] = useState<"maquinas" | "informacion" | "stock" | "materiales">("maquinas");
  const [modoEdicion, setModoEdicion] = useState<boolean>(false);
  const [supervisorActual, setSupervisorActual] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // Cargar estado de supervisor al iniciar
  useEffect(() => {
    const supervisorData = localStorage.getItem(STORAGE_KEY_SUPERVISOR);
    if (supervisorData) {
      try {
        const parsed = JSON.parse(supervisorData);
        if (parsed.supervisor && parsed.timestamp) {
          // Verificar que no haya pasado más de 8 horas
          const ahora = Date.now();
          const tiempoTranscurrido = ahora - parsed.timestamp;
          const horasTranscurridas = tiempoTranscurrido / (1000 * 60 * 60);
          
          if (horasTranscurridas < 8) {
            setSupervisorActual(parsed.supervisor);
            setModoEdicion(true);
          } else {
            // Sesión expirada
            localStorage.removeItem(STORAGE_KEY_SUPERVISOR);
          }
        }
      } catch (e) {
        console.error("Error al cargar supervisor:", e);
      }
    }
  }, []);

  // Si no está en modo edición, solo puede ver máquinas
  useEffect(() => {
    if (!modoEdicion && paginaActual !== "maquinas") {
      setPaginaActual("maquinas");
    }
  }, [modoEdicion, paginaActual]);

  const handleLogin = (supervisor: string) => {
    setSupervisorActual(supervisor);
    setModoEdicion(true);
    localStorage.setItem(STORAGE_KEY_SUPERVISOR, JSON.stringify({
      supervisor: supervisor,
      timestamp: Date.now(),
    }));
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    setSupervisorActual(null);
    setModoEdicion(false);
    localStorage.removeItem(STORAGE_KEY_SUPERVISOR);
    setPaginaActual("maquinas");
  };

  return (
    <div className="min-h-screen text-white flex relative overflow-hidden">
      {/* Fondo con efecto de fábrica */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#0f1419] z-0"></div>
      <div className="fixed inset-0 opacity-10 z-0" style={{
        backgroundImage: `radial-gradient(circle at 20% 50%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
                          radial-gradient(circle at 80% 80%, rgba(255, 184, 0, 0.1) 0%, transparent 50%)`
      }}></div>
      
      {/* Sidebar */}
      <div className="relative z-10">
        <Sidebar
          paginaActual={paginaActual}
          onCambiarPagina={setPaginaActual}
          modoEdicion={modoEdicion}
          supervisorActual={supervisorActual}
          onShowLogin={() => setShowLoginModal(true)}
          onLogout={handleLogout}
        />
      </div>

      {/* Contenido Principal */}
      <div className="flex-1 overflow-auto relative z-10">
        {paginaActual === "maquinas" && <MaquinasPage modoEdicion={modoEdicion} supervisorActual={supervisorActual} />}
        {paginaActual === "informacion" && modoEdicion && <InformacionPage />}
        {paginaActual === "stock" && modoEdicion && <StockPage />}
        {paginaActual === "materiales" && modoEdicion && <MaterialesPage />}
      </div>

      {/* Modal de Login */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />
    </div>
  );
}
