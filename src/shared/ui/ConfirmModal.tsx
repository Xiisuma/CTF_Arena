
/**
 * ConfirmModal — remplace window.confirm() pour les suppressions.
 * Accessible (role="dialog", aria-modal, focus piégé), stylé, non bloquant.
 */
import { useEffect, useRef } from "react";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus sur "Annuler" à l'ouverture — évite la suppression accidentelle
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Fermer sur Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-2xl border border-primary bg-card p-6 shadow-theme"
      >
        <h3 id="confirm-title" className="mb-2 text-lg font-bold text-primary">
          {title}
        </h3>
        <p className="text-sm text-tertiary leading-relaxed">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="rounded-lg border border-primary px-4 py-2 text-sm text-secondary transition hover:bg-input"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
              danger
                ? "bg-rose-500 hover:bg-rose-600"
                : "bg-accent-primary hover:bg-accent-secondary"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

