// frontend/src/app/(app)/consultas/[id]/page.tsx
"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import StatusBadge from "@/components/ui/StatusBadge";
import MonoId from "@/components/ui/MonoId";
import { api } from "@/lib/api";
import type { Consultation, Prescription } from "@/lib/types";

export default function ConsultaRoomPage() {
  const { id } = useParams<{ id: string }>();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [rxMedCode, setRxMedCode] = useState("");
  const [rxMedNombre, setRxMedNombre] = useState("");
  const [rxCantidad, setRxCantidad] = useState(1);
  const [rxPosologia, setRxPosologia] = useState("");
  const [rxLoading, setRxLoading] = useState(false);
  const [rxError, setRxError] = useState("");
  const [lastCuir, setLastCuir] = useState<string | null>(null);
  const [diagCode, setDiagCode] = useState("");
  const [diagTexto, setDiagTexto] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async () => {
    try {
      const [c, rxs] = await Promise.all([
        api.getConsultation(id),
        api.listPrescriptions(id),
      ]);
      setConsultation(c);
      setDiagCode(c.diagnostico_snomed_code || "");
      setDiagTexto(c.diagnostico_texto || "");
      setNotas(c.notas_clinicas || "");
      setPrescriptions(rxs);
    } catch {
      // handled by empty state
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleUpdateStatus = async (estado: string) => {
    if (!consultation) return;
    try {
      const updated = await api.patchConsultationStatus(id, estado);
      setConsultation(updated);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const updated = await api.updateConsultation(id, {
        diagnostico_snomed_code: diagCode || undefined,
        diagnostico_texto: diagTexto || undefined,
        notas_clinicas: notas || undefined,
      });
      setConsultation(updated);
    } catch {
      setSaveError("Error al guardar — intentá de nuevo");
    }
    setSaving(false);
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setRxError("");
    setRxLoading(true);
    try {
      const rx = await api.createPrescription(id, {
        medicamento_snomed_code: rxMedCode,
        medicamento_nombre: rxMedNombre,
        cantidad: rxCantidad,
        posologia: rxPosologia,
      });
      setPrescriptions((prev) => [...prev, rx]);
      setLastCuir(rx.cuir);
      setRxMedCode(""); setRxMedNombre(""); setRxCantidad(1); setRxPosologia("");
      setShowModal(false);
    } catch (e) {
      setRxError(e instanceof Error ? e.message : "Error al emitir receta");
    } finally {
      setRxLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><span className="spinner" /></div>;
  if (!consultation) return <div className="p-6"><p className="text-text-3">Consulta no encontrada.</p></div>;

  const canEdit = !["cancelada", "completada"].includes(consultation.estado);
  const canPrescribe = ["en_curso", "completada"].includes(consultation.estado);

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar
        title={consultation.tipo === "teleconsulta" ? "Teleconsulta" : "Consulta externa"}
        subtitle={`${consultation.paciente_nombre} · DNI ${consultation.paciente_dni}`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={consultation.estado} />
            {consultation.estado === "programada" && (
              <button onClick={() => handleUpdateStatus("en_curso")} className="btn-primary text-sm px-3 py-1.5">Iniciar</button>
            )}
            {consultation.estado === "en_curso" && (
              <button onClick={() => handleUpdateStatus("completada")} className="btn-secondary text-sm px-3 py-1.5">Finalizar</button>
            )}
          </div>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — video or presencial */}
        <div className="flex-[3] p-4 border-r border-border">
          {consultation.tipo === "teleconsulta" && consultation.sesion_video_url ? (
            <iframe
              src={consultation.sesion_video_url}
              allow="camera; microphone; fullscreen; display-capture"
              className="w-full h-full rounded-lg border border-border min-h-[500px]"
              title="Teleconsulta — Jitsi Meet"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-surface-2 border border-border flex items-center justify-center text-3xl">🏥</div>
              <p className="text-text font-medium">Consulta {consultation.tipo === "externa" ? "externa" : "sin video"}</p>
              <p className="text-text-3 text-sm">Registrá el diagnóstico y las recetas en el panel derecho.</p>
            </div>
          )}
        </div>

        {/* Right panel — clinical data + prescriptions */}
        <div className="flex-[2] p-4 overflow-y-auto space-y-4">
          {/* Patient + coverage */}
          <div className="card p-4 space-y-2">
            <p className="text-text-3 text-[10px] uppercase tracking-widest">Paciente</p>
            <div className="grid grid-cols-2 gap-3">
              <MonoId value={consultation.paciente_dni} label="DNI" dimmed />
              <div>
                <p className="text-text-3 text-[10px] uppercase tracking-widest">Cobertura</p>
                <StatusBadge status={consultation.cobertura_verificada ? "activa" : "mock"} label={consultation.cobertura_verificada ? "Verificada" : "Sin verificar"} />
              </div>
            </div>
          </div>

          {/* Diagnosis + notes */}
          <div className="card p-4 space-y-3">
            <p className="text-text-3 text-[10px] uppercase tracking-widest">Diagnóstico y notas</p>
            <input
              value={diagCode}
              onChange={(e) => setDiagCode(e.target.value)}
              className="input-base font-mono text-sm"
              placeholder="SNOMED CT code (ej: 840539006)"
              disabled={!canEdit}
            />
            <input
              value={diagTexto}
              onChange={(e) => setDiagTexto(e.target.value)}
              className="input-base text-sm"
              placeholder="Diagnóstico en texto libre"
              disabled={!canEdit}
            />
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="input-base text-sm resize-none h-20"
              placeholder="Notas clínicas..."
              disabled={!canEdit}
            />
            {canEdit && (
              <button onClick={handleSaveNotes} disabled={saving} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
                {saving && <span className="spinner" />}
                Guardar notas
              </button>
            )}
            {saveError && <p className="text-danger text-xs">{saveError}</p>}
          </div>

          {/* Prescriptions */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-text-3 text-[10px] uppercase tracking-widest">Recetas emitidas</p>
              {canPrescribe && (
                <button onClick={() => setShowModal(true)} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Nueva receta
                </button>
              )}
            </div>

            {lastCuir && (
              <div className="bg-success-bg border border-success/20 rounded-md px-3 py-2 flex items-center justify-between">
                <div>
                  <p className="text-success text-xs font-medium">✓ Receta emitida</p>
                  <p className="text-success/70 text-xs font-mono">{lastCuir}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/recetas/${lastCuir}`).catch(() => {})}
                  className="text-success/70 text-xs hover:text-success border border-success/20 rounded px-2 py-1"
                >
                  Copiar QR link
                </button>
              </div>
            )}

            {prescriptions.length === 0 ? (
              <p className="text-text-3 text-xs">Sin recetas emitidas aún.</p>
            ) : (
              <div className="space-y-2">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-text text-sm">{rx.medicamento_nombre}</p>
                      <p className="text-text-3 text-xs font-mono">{rx.cuir}</p>
                    </div>
                    <StatusBadge status={rx.estado} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New prescription modal */}
      {showModal && (
        <div className="fixed inset-0 bg-base/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-text font-semibold">Nueva prescripción</h3>
              <button onClick={() => setShowModal(false)} className="text-text-3 hover:text-text">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreatePrescription} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rx-med-code" className="text-text-2 text-xs uppercase tracking-widest block mb-1">SNOMED CT</label>
                  <input id="rx-med-code" value={rxMedCode} onChange={(e) => setRxMedCode(e.target.value)}
                    className="input-base font-mono text-sm" placeholder="Ej: 372687004" required />
                </div>
                <div>
                  <label htmlFor="rx-cantidad" className="text-text-2 text-xs uppercase tracking-widest block mb-1">Cantidad</label>
                  <input id="rx-cantidad" type="number" min={1} value={rxCantidad} onChange={(e) => setRxCantidad(Number(e.target.value))}
                    className="input-base text-sm" required />
                </div>
              </div>
              <div>
                <label htmlFor="rx-med-nombre" className="text-text-2 text-xs uppercase tracking-widest block mb-1">Medicamento</label>
                <input id="rx-med-nombre" value={rxMedNombre} onChange={(e) => setRxMedNombre(e.target.value)}
                  className="input-base text-sm" placeholder="Ej: Amoxicilina 500mg" required />
              </div>
              <div>
                <label htmlFor="rx-posologia" className="text-text-2 text-xs uppercase tracking-widest block mb-1">Posología</label>
                <textarea id="rx-posologia" value={rxPosologia} onChange={(e) => setRxPosologia(e.target.value)}
                  className="input-base text-sm resize-none h-16" placeholder="Ej: 1 comprimido cada 8 horas por 7 días" required />
              </div>
              {rxError && <p className="text-danger text-xs">{rxError}</p>}
              <button type="submit" disabled={rxLoading} className="btn-primary w-full flex items-center justify-center gap-2">
                {rxLoading && <span className="spinner" />}
                {rxLoading ? "Emitiendo receta..." : "Emitir receta"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
