
/**
 * NotificationsPage.tsx v3.0 — zéro localStorage, notifications en mémoire
 */

import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AppNotification, NotifBox } from "../types";
import { useNotifications, NOTIF_BOX_MAP } from "../features/notifications/NotificationSystem";
import {
  formatNotifTimeFull,
  NOTIF_TYPE_LABEL,
  NOTIF_TYPE_COLOR,
  NOTIF_TYPE_BG,
} from "../shared/lib/notifUtils";

// ─── Snackbar Undo ─────────────────────────────────────────────────────────────

interface UndoToast {
  notif: AppNotification;
  timeoutId: ReturnType<typeof setTimeout>;
}

// ─── Box configuration ────────────────────────────────────────────────────────

const BOX_CONFIG: Record<NotifBox, { label: string; icon: string; description: string; color: string }> = {
  perso: {
    label: "Boîte Perso",
    icon: "👤",
    description: "Classement et événements personnels",
    color: "border-yellow-500/30 bg-yellow-500/5",
  },
  amis: {
    label: "Boîte Amis",
    icon: "👥",
    description: "Activités et demandes de vos amis",
    color: "border-violet-500/30 bg-violet-500/5",
  },
  team: {
    label: "Boîte Team",
    icon: "🛡️",
    description: "Activités de votre équipe",
    color: "border-emerald-500/30 bg-emerald-500/5",
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const navigate = useNavigate();
  const {
    notifications,
    markRead,
    markAllRead,
    markBoxRead,
    deleteNotification,
    restoreNotification,
    clearAll,
  } = useNotifications();

  const [activeBox, setActiveBox] = useState<NotifBox>("amis");
  const [undoToasts, setUndoToasts] = useState<UndoToast[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const toastsRef = useRef(undoToasts);
  toastsRef.current = undoToasts;

  const handleDelete = useCallback(
    (notif: AppNotification) => {
      deleteNotification(notif.id);
      const timeoutId = setTimeout(() => {
        setUndoToasts((prev) => prev.filter((t) => t.notif.id !== notif.id));
      }, 5000);
      setUndoToasts((prev) => [...prev, { notif, timeoutId }]);
    },
    [deleteNotification]
  );

  const handleUndo = useCallback(
    (notif: AppNotification) => {
      const toast = toastsRef.current.find((t) => t.notif.id === notif.id);
      if (toast) clearTimeout(toast.timeoutId);
      setUndoToasts((prev) => prev.filter((t) => t.notif.id !== notif.id));
      restoreNotification(notif);
    },
    [restoreNotification]
  );

  const handleClearAll = useCallback(() => {
    const all = [...notifications];
    clearAll();
    setShowClearConfirm(false);
    const timeoutId = setTimeout(() => {
      setUndoToasts((prev) => prev.filter((t) => t.notif.id !== "__clearall__"));
    }, 6000);
    setUndoToasts((prev) => [
      ...prev.filter((t) => t.notif.id !== "__clearall__"),
      {
        notif: {
          id: "__clearall__",
          type: "rank1",
          icon: "🗑️",
          message: `${all.length} notification${all.length > 1 ? "s" : ""} supprimée${all.length > 1 ? "s" : ""}`,
          timestamp: Date.now(),
          read: true,
          _allNotifs: all,
        } as AppNotification & { _allNotifs: AppNotification[] },
        timeoutId,
      },
    ]);
  }, [notifications, clearAll]);

  const handleUndoClearAll = useCallback(
    (toast: UndoToast) => {
      clearTimeout(toast.timeoutId);
      setUndoToasts((prev) => prev.filter((t) => t.notif.id !== "__clearall__"));
      const allNotifs = (toast.notif as AppNotification & { _allNotifs?: AppNotification[] })._allNotifs;
      if (allNotifs) {
        for (const n of allNotifs) restoreNotification(n);
      }
    },
    [restoreNotification]
  );

  const handleNotifClick = useCallback(
    (notif: AppNotification) => {
      markRead(notif.id);
      if (notif.type === "friend_request") {
        navigate("/profile#friend-requests");
      }
    },
    [markRead, navigate]
  );

  const handleBoxChange = useCallback(
    (box: NotifBox) => {
      setActiveBox(box);
      markBoxRead(box);
    },
    [markBoxRead]
  );

  const boxNotifications = notifications.filter(
    (n) => NOTIF_BOX_MAP[n.type] === activeBox
  );
  const unreadTotal = notifications.filter((n) => !n.read).length;
  const unreadByBox: Record<NotifBox, number> = {
    perso: notifications.filter((n) => !n.read && NOTIF_BOX_MAP[n.type] === "perso").length,
    amis:  notifications.filter((n) => !n.read && NOTIF_BOX_MAP[n.type] === "amis").length,
    team:  notifications.filter((n) => !n.read && NOTIF_BOX_MAP[n.type] === "team").length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary">🔔 Notifications</h1>
          <p className="mt-1 text-sm text-tertiary">
            Historique de vos notifications de session.
            {unreadTotal > 0 && (
              <span className="ml-2 font-semibold text-accent-primary">
                {unreadTotal} non lue{unreadTotal > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={markAllRead}
              className="rounded-xl border border-primary bg-card px-3 py-2 text-xs font-semibold text-secondary transition hover:bg-input"
            >
              ✓ Tout marquer lu
            </button>
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20"
              >
                🗑️ Tout supprimer
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2">
                <span className="text-xs text-rose-200">Confirmer ?</span>
                <button
                  onClick={handleClearAll}
                  className="rounded-lg bg-rose-500 px-3 py-1 text-xs font-bold text-white transition hover:bg-rose-600"
                >
                  Oui
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="rounded-lg border border-rose-500/30 px-3 py-1 text-xs text-rose-300 transition hover:bg-rose-500/10"
                >
                  Non
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Boxes tabs */}
      <div className="grid grid-cols-3 gap-3">
        {(["perso", "amis", "team"] as NotifBox[]).map((box) => {
          const cfg = BOX_CONFIG[box];
          const count = notifications.filter((n) => NOTIF_BOX_MAP[n.type] === box).length;
          const unread = unreadByBox[box];
          const isActive = activeBox === box;
          return (
            <button
              key={box}
              onClick={() => handleBoxChange(box)}
              className={`relative flex flex-col items-start gap-1.5 rounded-2xl border p-4 text-left transition ${
                isActive ? `${cfg.color} shadow-theme` : "border-primary bg-card hover:bg-input"
              }`}
            >
              {unread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-primary px-1 text-[10px] font-black text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
              <span className="text-2xl">{cfg.icon}</span>
              <div>
                <p className={`text-sm font-bold ${isActive ? "text-primary" : "text-secondary"}`}>
                  {cfg.label}
                </p>
                <p className="text-xs text-tertiary">
                  {count} notification{count > 1 ? "s" : ""}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Description boîte active */}
      <div className={`rounded-xl border px-4 py-2.5 ${BOX_CONFIG[activeBox].color}`}>
        <p className="text-xs font-semibold text-secondary">
          {BOX_CONFIG[activeBox].icon} {BOX_CONFIG[activeBox].label} —{" "}
          {BOX_CONFIG[activeBox].description}
        </p>
      </div>

      {/* Liste notifications */}
      {boxNotifications.length === 0 ? (
        <div className="rounded-2xl border border-primary bg-card p-12 text-center">
          <p className="text-4xl mb-3">🔕</p>
          <p className="text-sm font-semibold text-primary">Aucune notification</p>
          <p className="mt-1 text-xs text-tertiary">
            Aucune notification dans cette boîte pour le moment.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {boxNotifications.map((notif) => (
            <NotifRow
              key={notif.id}
              notif={notif}
              onMarkRead={() => markRead(notif.id)}
              onDelete={() => handleDelete(notif)}
              onClick={() => handleNotifClick(notif)}
            />
          ))}
        </div>
      )}

      {/* Undo Toasts */}
      <div className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2 pointer-events-none">
        {undoToasts.map((toast) => (
          <div
            key={toast.notif.id}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-primary bg-secondary px-4 py-3 shadow-theme backdrop-blur-xl"
            style={{ animation: "slideUp 0.25s ease-out" }}
          >
            <span className="text-base">{toast.notif.icon}</span>
            <p className="text-sm text-primary">{toast.notif.message}</p>
            <button
              onClick={() =>
                toast.notif.id === "__clearall__"
                  ? handleUndoClearAll(toast)
                  : handleUndo(toast.notif)
              }
              className="ml-2 rounded-lg border border-accent-primary/30 bg-accent-primary/10 px-3 py-1 text-xs font-bold text-accent-primary transition hover:bg-accent-primary/20"
            >
              Annuler
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─── NotifRow ─────────────────────────────────────────────────────────────────

function NotifRow({
  notif, onMarkRead, onDelete, onClick,
}: {
  notif: AppNotification;
  onMarkRead: () => void;
  onDelete: () => void;
  onClick?: () => void;
}) {
  const isFriendRequest = notif.type === "friend_request";
  const rowClass = `group flex items-start gap-4 rounded-2xl border px-5 py-4 transition ${
    notif.read
      ? "border-primary bg-card"
      : `border ${NOTIF_TYPE_BG[notif.type]} shadow-theme`
  } ${isFriendRequest ? "cursor-pointer hover:bg-card-hover" : ""}`;

  // Seules les demandes d'ami sont cliquables : le rôle et les gestionnaires
  // sont statiques dans chaque branche plutôt que conditionnels sur un seul div.
  const body = (
    <>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xl ${
          notif.read ? "border-primary bg-input" : NOTIF_TYPE_BG[notif.type]
        }`}
      >
        {notif.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${NOTIF_TYPE_BG[notif.type]} ${NOTIF_TYPE_COLOR[notif.type]}`}
          >
            {NOTIF_TYPE_LABEL[notif.type]}
          </span>
          {!notif.read && <span className="h-2 w-2 rounded-full bg-accent-primary" />}
          {isFriendRequest && (
            <span className="text-[10px] text-blue-300 font-semibold">→ Voir les demandes</span>
          )}
        </div>
        <p className={`mt-1.5 text-sm leading-snug ${notif.read ? "text-secondary" : "text-primary font-semibold"}`}>
          {notif.message}
        </p>
        <p className="mt-1 text-xs text-tertiary">
          {formatNotifTimeFull(notif.timestamp)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notif.read && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkRead(); }}
            title="Marquer comme lu"
            className="rounded-lg border border-primary bg-input p-1.5 text-xs text-tertiary transition hover:bg-card hover:text-secondary"
          >
            ✓
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Supprimer"
          className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-xs text-rose-300 transition hover:bg-rose-500/20"
        >
          🗑️
        </button>
      </div>
    </>
  );

  if (isFriendRequest) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={rowClass}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        {body}
      </div>
    );
  }

  return <div className={rowClass}>{body}</div>;
}
