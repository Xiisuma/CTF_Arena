
import { useEffect, useRef, useState } from "react";
import type { AppNotification, NotifType } from "../../types";

// ─── Popup accent classes ──────────────────────────────────────────────────────

const POPUP_ACCENT: Record<NotifType, string> = {
  friend_flag:        "border-violet-500/40 bg-violet-500/10",
  friend_achievement: "border-amber-400/40 bg-amber-400/10",
  friend_request:     "border-blue-500/40 bg-blue-500/10",
  team_flag:          "border-emerald-500/40 bg-emerald-500/10",
  team_achievement:   "border-sky-500/40 bg-sky-500/10",
  rank1:              "border-yellow-400/40 bg-yellow-400/10",
  team_join:          "border-pink-500/40 bg-pink-500/10",
  team_role_change:   "border-cyan-500/40 bg-cyan-500/10",
};

const POPUP_LABEL: Record<NotifType, string> = {
  friend_flag:        "Ami · Énigme",
  friend_achievement: "Ami · Succès",
  friend_request:     "Ami · Demande",
  team_flag:          "Team · Énigme",
  team_achievement:   "Team · Succès",
  rank1:              "Classement",
  team_join:          "Team · Nouveau membre",
  team_role_change:   "Team · Rôle",
};

const POPUP_LABEL_COLOR: Record<NotifType, string> = {
  friend_flag:        "text-violet-300",
  friend_achievement: "text-amber-300",
  friend_request:     "text-blue-300",
  team_flag:          "text-emerald-300",
  team_achievement:   "text-sky-300",
  rank1:              "text-yellow-300",
  team_join:          "text-pink-300",
  team_role_change:   "text-cyan-300",
};

// ─── NotificationPopupContainer ───────────────────────────────────────────────

export function NotificationPopupContainer({
  popups,
  onDismiss,
  pendingCount,
  isChronoRunning,
}: {
  popups: AppNotification[];
  onDismiss: (id: string) => void;
  pendingCount: number;
  isChronoRunning: boolean;
}) {
  if (popups.length === 0 && !(isChronoRunning && pendingCount > 0)) return null;
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 pointer-events-none"
      style={{ maxWidth: "340px", width: "calc(100vw - 2rem)" }}
    >
      {isChronoRunning && pendingCount > 0 && (
        <div
          className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 backdrop-blur-xl shadow-theme"
          style={{ animation: "slideInRight 0.3s ease-out" }}
        >
          <span className="text-base shrink-0">⏱️</span>
          <p className="text-xs text-amber-300 font-semibold leading-snug">
            {pendingCount} notification{pendingCount > 1 ? "s" : ""} en attente
            <br />
            <span className="font-normal opacity-75 text-[10px]">
              Affichage après pause ou résolution
            </span>
          </p>
        </div>
      )}
      {popups.map((popup) => (
        <NotificationPopup
          key={popup.id}
          popup={popup}
          onDismiss={() => onDismiss(popup.id)}
        />
      ))}
    </div>
  );
}

// ─── NotificationPopup ────────────────────────────────────────────────────────

function NotificationPopup({
  popup,
  onDismiss,
}: {
  popup: AppNotification;
  onDismiss: () => void;
}) {
  const [progress, setProgress] = useState(100);
  const startTime = useRef(Date.now());
  const DURATION = 5000;

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border backdrop-blur-xl shadow-theme ${POPUP_ACCENT[popup.type]}`}
      style={{ animation: "slideInRight 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/10 text-xl">
          {popup.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-bold uppercase tracking-wider ${POPUP_LABEL_COLOR[popup.type]}`}>
            {POPUP_LABEL[popup.type]}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-primary leading-snug">
            {popup.message}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="ml-1 shrink-0 text-tertiary transition hover:text-secondary text-xs mt-0.5"
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>
      <div className="h-0.5 w-full overflow-hidden bg-black/10">
        <div
          className="h-full bg-current opacity-40 transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(24px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

