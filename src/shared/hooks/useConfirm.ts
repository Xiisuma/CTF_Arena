
import { useState } from "react";

interface ConfirmConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

/**
 * Gère l'état d'une ConfirmModal.
 * Remplace window.confirm() par un dialog accessible et stylé.
 *
 * Usage :
 *   const { pendingConfirm, requestConfirm, closeConfirm } = useConfirm();
 *
 *   // Pour déclencher :
 *   requestConfirm({ title: "Supprimer", message: "…", danger: true, onConfirm: () => { … } });
 *
 *   // Dans le JSX :
 *   {pendingConfirm && <ConfirmModal {...pendingConfirm} onCancel={closeConfirm} />}
 */
export function useConfirm() {
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmConfig | null>(null);

  const requestConfirm = (config: ConfirmConfig) => setPendingConfirm(config);
  const closeConfirm = () => setPendingConfirm(null);

  return { pendingConfirm, requestConfirm, closeConfirm };
}

