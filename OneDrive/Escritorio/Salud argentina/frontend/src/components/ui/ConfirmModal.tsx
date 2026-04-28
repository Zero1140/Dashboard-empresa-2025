"use client";
import { useEffect } from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ open, title, description, confirmLabel = "Confirmar", cancelLabel = "Cancelar", danger = false, loading = false, onConfirm, onCancel }: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-surface-1 border border-border rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4 animate-fadeIn">
        <h2 className="text-text font-semibold text-base">{title}</h2>
        <p className="text-text-2 text-sm leading-relaxed">{description}</p>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onCancel} disabled={loading} className="btn-secondary text-sm px-4 py-2">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`text-sm px-4 py-2 rounded-lg border font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
              danger
                ? "bg-danger/10 border-danger/30 text-danger hover:bg-danger/20"
                : "btn-primary"
            }`}
          >
            {loading && <span className="spinner w-3.5 h-3.5" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
