// frontend/src/app/(app)/consultas/[id]/page.tsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import StatusBadge from "@/components/ui/StatusBadge";
import MonoId from "@/components/ui/MonoId";
import { Tooltip } from "@/components/ui/Tooltip";
import { GLOSARIO } from "@/data/glosario";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import type { Consultation, Prescription } from "@/lib/types";
import { MEDICAMENTOS } from "@/data/medicamentos";
import { DIAGNOSTICOS } from "@/data/diagnosticos";
import ConfirmModal from "@/components/ui/ConfirmModal";

export default function ConsultaRoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useToast();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Prescription modal state
  const [rxMedCode, setRxMedCode] = useState("");
  const [rxMedNombre, setRxMedNombre] = useState("");
  const [rxSearch, setRxSearch] = useState("");
  const [rxSuggestions, setRxSuggestions] = useState<typeof MEDICAMENTOS>([]);
  const [rxSuggestionOpen, setRxSuggestionOpen] = useState(false);
  const [rxCantidad, setRxCantidad] = useState(1);
  const [rxPosologia, setRxPosologia] = useState("");
  const [rxLoading, setRxLoading] = useState(false);
  const [rxError, setRxError] = useState("");
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const [lastCuir, setLastCuir] = useState<string | null>(null);

  // Cancel prescription state
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Confirm modal state
  const [showFinalizarConfirm, setShowFinalizarConfirm] = useState(false);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  // Diagnosis + notes state
  const [diagCode, setDiagCode] = useState("");
  const [diagTexto, setDiagTexto] = useState("");
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Diagnosis autocomplete state
  const [diagSearch, setDiagSearch] = useState("");
  const [diagSuggestions, setDiagSuggestions] = useState<typeof DIAGNOSTICOS>([]);
  const [diagSuggestionOpen, setDiagSuggestionOpen] = useState(false);
  const diagRef = useRef<HTMLDivElement>(null);

  // Dirty flag — unsaved changes
  const isDirty =
    consultation !== null &&
    !["cancelada", "completada"].includes(consultation.estado) &&
    (diagCode !== (consultation?.diagnostico_snomed_code ?? "") ||
      diagTexto !== (consultation?.diagnostico_texto ?? "") ||
      notas !== (consultation?.notas_clinicas ?? ""));

  // Browser beforeunload warning when there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Close medication suggestion dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setRxSuggestionOpen(false);
      }
      if (diagRef.current && !diagRef.current.contains(e.target as Node)) {
        setDiagSuggestionOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Medication autocomplete handlers
  const handleRxSearchChange = (value: string) => {
    setRxSearch(value);
    if (rxMedNombre || rxMedCode) {
      setRxMedNombre("");
      setRxMedCode("");
    }
    if (value.trim().length === 0) {
      setRxSuggestions([]);
      setRxSuggestionOpen(false);
      return;
    }
    const q = value.toLowerCase();
    const filtered = MEDICAMENTOS.filter(
      (m) => m.nombre.toLowerCase().includes(q) || m.snomed_code.includes(q)
    ).slice(0, 8);
    setRxSuggestions(filtered);
    setRxSuggestionOpen(filtered.length > 0);
  };

  const handleSelectSuggestion = (item: (typeof MEDICAMENTOS)[number]) => {
    setRxMedNombre(item.nombre);
    setRxMedCode(item.snomed_code);
    setRxSearch(item.nombre);
    setRxSuggestions([]);
    setRxSuggestionOpen(false);
  };

  const handleClearSelection = () => {
    setRxMedNombre("");
    setRxMedCode("");
    setRxSearch("");
    setRxSuggestions([]);
    setRxSuggestionOpen(false);
  };

  // Diagnosis autocomplete handlers
  const handleDiagSearchChange = (value: string) => {
    setDiagSearch(value);
    if (diagCode) {
      setDiagCode("");
      setDiagTexto("");
    }
    if (value.trim().length === 0) {
      setDiagSuggestions([]);
      setDiagSuggestionOpen(false);
      return;
    }
    const q = value.toLowerCase();
    const filtered = DIAGNOSTICOS.filter(
      (d) => d.nombre.toLowerCase().includes(q) || d.snomed_code.includes(q)
    ).slice(0, 6);
    setDiagSuggestions(filtered);
    setDiagSuggestionOpen(filtered.length > 0);
  };

  const handleSelectDiag = (item: (typeof DIAGNOSTICOS)[number]) => {
    setDiagCode(item.snomed_code);
    setDiagTexto(item.nombre);
    setDiagSearch(item.nombre);
    setDiagSuggestions([]);
    setDiagSuggestionOpen(false);
  };

  const handleClearDiag = () => {
    setDiagCode("");
    setDiagTexto("");
    setDiagSearch("");
    setDiagSuggestions([]);
    setDiagSuggestionOpen(false);
  };

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
      // Pre-fill diag search input if a code was already saved
      if (c.diagnostico_texto) {
        setDiagSearch(c.diagnostico_texto);
      } else if (c.diagnostico_snomed_code) {
        setDiagSearch(c.diagnostico_snomed_code);
      }
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
      addToast(e instanceof Error ? e.message : "Error al cambiar estado", "error");
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
    if (!rxMedCode || !rxMedNombre) {
      setRxError("Seleccioná un medicamento del listado");
      setRxLoading(false);
      return;
    }
    try {
      const rx = await api.createPrescription(id, {
        medicamento_snomed_code: rxMedCode,
        medicamento_nombre: rxMedNombre,
        cantidad: rxCantidad,
        posologia: rxPosologia,
      });
      setPrescriptions((prev) => [...prev, rx]);
      setLastCuir(rx.cuir);
      setRxMedCode(""); setRxMedNombre(""); setRxSearch(""); setRxCantidad(1); setRxPosologia("");
      setShowModal(false);
    } catch (e) {
      setRxError(e instanceof Error ? e.message : "Error al emitir receta");
    } finally {
      setRxLoading(false);
    }
  };

  const handleCancelPrescription = async (prescriptionId: string) => {
    setCancellingId(prescriptionId);
    try {
      const updated = await api.cancelPrescription(prescriptionId);
      setPrescriptions((prev) =>
        prev.map((rx) => (rx.id === prescriptionId ? updated : rx))
      );
    } catch {
      addToast("Error al anular receta", "error");
    } finally {
      setCancellingId(null);
      setCancelConfirmId(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><span className="spinner" /></div>;
  if (!consultation) return <div className="p-6"><p className="text-text-3">Consulta no encontrada.</p></div>;

  const canEdit = !["cancelada", "completada"].includes(consultation.estado);
  const canPrescribe = ["en_curso", "completada"].includes(consultation.estado);

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-4 pt-3 pb-0">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-text-3 hover:text-text text-sm transition-colors mb-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          ← Consultas
        </button>
      </div>
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
              <button onClick={() => setShowFinalizarConfirm(true)} className="btn-secondary text-sm px-3 py-1.5">Finalizar</button>
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
            <div className="grid grid-cols-3 gap-3">
              <MonoId value={consultation.paciente_dni} label="DNI" dimmed />
              <div>
                <p className="text-text-3 text-[10px] uppercase tracking-widest">Cobertura</p>
                <StatusBadge status={consultation.cobertura_verificada ? "activa" : "mock"} label={consultation.cobertura_verificada ? "Verificada" : "Sin verificar"} />
              </div>
              <div>
                <p className="text-text-3 text-[10px] uppercase tracking-widest">Consentimiento</p>
                <StatusBadge
                  status={consultation.paciente_consentimiento_informado ? "activa" : "mock"}
                  label={consultation.paciente_consentimiento_informado ? "Informado (Ley 26.529)" : "Pendiente"}
                />
              </div>
            </div>
          </div>

          {/* Diagnosis + notes */}
          <div className="card p-4 space-y-3">
            {/* Card header with dirty flag */}
            <div className="flex items-center gap-2">
              <p className="text-text-3 text-[10px] uppercase tracking-widest">Diagnóstico y notas</p>
              {isDirty && (
                <span className="text-[10px] bg-warning-bg border border-warning/20 text-warning rounded px-2 py-0.5">
                  Cambios sin guardar
                </span>
              )}
            </div>

            {/* Diagnosis autocomplete */}
            <div ref={diagRef} className="relative">
              <input
                value={diagSearch}
                onChange={(e) => handleDiagSearchChange(e.target.value)}
                onFocus={() => diagSuggestions.length > 0 && setDiagSuggestionOpen(true)}
                className="input-base text-sm w-full"
                placeholder="Buscar diagnóstico (ej: hipertensión)"
                disabled={!canEdit}
                autoComplete="off"
              />
              {diagSuggestionOpen && diagSuggestions.length > 0 && (
                <ul className="absolute left-0 right-0 top-full mt-1 bg-surface-2 border border-border rounded-md shadow-lg z-50 max-h-56 overflow-y-auto">
                  {diagSuggestions.map((item, idx) => (
                    <li
                      key={`${item.snomed_code}-${idx}`}
                      onMouseDown={() => handleSelectDiag(item)}
                      className="hover:bg-accent/10 cursor-pointer px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="text-text text-sm font-medium block truncate">{item.nombre}</span>
                        <span className="text-text-3 text-[10px]">{item.categoria}</span>
                      </div>
                      <span className="text-text-3 text-xs font-mono shrink-0">{item.snomed_code}</span>
                    </li>
                  ))}
                </ul>
              )}
              {/* Selection confirmation */}
              {diagCode && diagTexto && (
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <p className="text-xs text-success truncate">
                    ✓ {diagTexto} — <Tooltip content={GLOSARIO.SNOMED}><span className="underline decoration-dotted cursor-help">SNOMED</span></Tooltip>: <span className="font-mono">{diagCode}</span>
                  </p>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleClearDiag}
                      className="text-text-3 hover:text-text text-xs shrink-0"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Free-text diagnosis override */}
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
                    <div className="flex items-center gap-2">
                      <StatusBadge status={rx.estado} />
                      {rx.estado === "activa" && (
                        <button
                          onClick={() => setCancelConfirmId(rx.id)}
                          disabled={cancellingId === rx.id}
                          className="text-danger text-xs hover:underline disabled:opacity-50"
                        >
                          {cancellingId === rx.id ? "Anulando..." : "Anular"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Finalizar consulta confirm */}
      <ConfirmModal
        open={showFinalizarConfirm}
        title="Finalizar consulta"
        description="La consulta quedará marcada como completada. Aún podés emitir recetas después de finalizar."
        confirmLabel="Finalizar"
        onConfirm={() => { setShowFinalizarConfirm(false); handleUpdateStatus("completada"); }}
        onCancel={() => setShowFinalizarConfirm(false)}
      />

      {/* Anular receta confirm */}
      <ConfirmModal
        open={cancelConfirmId !== null}
        title="Anular receta"
        description="Esta receta quedará anulada y no podrá dispensarse en farmacia. Esta acción no se puede deshacer."
        confirmLabel="Anular receta"
        danger
        loading={cancellingId === cancelConfirmId}
        onConfirm={() => { if (cancelConfirmId) handleCancelPrescription(cancelConfirmId); }}
        onCancel={() => setCancelConfirmId(null)}
      />

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
              {/* Medication autocomplete */}
              <div>
                <label htmlFor="rx-search" className="text-text-2 text-xs uppercase tracking-widest block mb-1">Medicamento</label>
                <div ref={autocompleteRef} className="relative">
                  <input
                    id="rx-search"
                    value={rxSearch}
                    onChange={(e) => handleRxSearchChange(e.target.value)}
                    onFocus={() => rxSuggestions.length > 0 && setRxSuggestionOpen(true)}
                    className="input-base text-sm w-full"
                    placeholder="Buscar medicamento (ej: amox)"
                    autoComplete="off"
                  />
                  {rxSuggestionOpen && rxSuggestions.length > 0 && (
                    <ul className="absolute left-0 right-0 top-full mt-1 bg-surface-2 border border-border rounded-md shadow-lg z-50 max-h-56 overflow-y-auto">
                      {rxSuggestions.map((item, idx) => (
                        <li
                          key={`${item.snomed_code}-${idx}`}
                          onMouseDown={() => handleSelectSuggestion(item)}
                          className="hover:bg-accent/10 cursor-pointer px-3 py-2 flex items-center justify-between gap-2"
                        >
                          <span className="text-text text-sm font-medium">{item.nombre}</span>
                          <span className="text-text-3 text-xs font-mono shrink-0">{item.snomed_code}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* Selection confirmation */}
                {rxMedNombre && rxMedCode && (
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <p className="text-xs text-success">
                      ✓ {rxMedNombre} — <Tooltip content={GLOSARIO.SNOMED}><span className="underline decoration-dotted cursor-help">SNOMED</span></Tooltip>: <span className="font-mono">{rxMedCode}</span>
                    </p>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="text-text-3 hover:text-text text-xs shrink-0"
                    >
                      Limpiar
                    </button>
                  </div>
                )}
              </div>

              {/* Hidden validation — require a selection */}
              <input type="hidden" value={rxMedCode} required />
              <input type="hidden" value={rxMedNombre} required />

              <div>
                  <label htmlFor="rx-cantidad" className="text-text-2 text-xs uppercase tracking-widest block mb-1">Cantidad</label>
                  <input id="rx-cantidad" type="number" min={1} value={rxCantidad} onChange={(e) => setRxCantidad(Number(e.target.value))}
                    className="input-base text-sm" required />
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
