
import { useEffect, useRef, useState } from "react";
import type { NotifBox } from "../../types";
import { useNotifications } from "./NotificationSystem";
import { formatNotifTime } from "../../shared/lib/notifUtils";

export function NotificationBell({ onOpenPage }: { onOpenPage: () => void }) {
  const { notifications, unreadCount, unreadPerBox, markRead, markAllRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const recent = notifications.slice(0, 10);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition ${
          open
            ? "border-accent-primary/50 bg-accent-primary/20 text-primary"
            : "border-primary bg-card text-tertiary hover:bg-input hover:text-secondary"
        }`}
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ""}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-primary px-0.5 text-[10px] font-black text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-primary bg-secondary shadow-theme"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}
        >
          <div className="flex items-center justify-between border-b border-primary px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-accent-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-accent-primary">
                  {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-tertiary transition hover:text-secondary"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Badges par boîte */}
          <div className="flex gap-1 border-b border-primary px-3 py-2">
            {(["perso", "amis", "team"] as NotifBox[]).map((box) => {
              const icons: Record<NotifBox, string> = {
                perso: "👤",
                amis: "👥",
                team: "🛡️",
              };
              const labels: Record<NotifBox, string> = {
                perso: "Perso",
                amis: "Amis",
                team: "Team",
              };
              const count = unreadPerBox[box];
              return (
                <div
                  key={box}
                  className="flex items-center gap-1 rounded-lg border border-primary bg-input px-2 py-1 text-xs"
                >
                  <span>{icons[box]}</span>
                  <span className="text-secondary">{labels[box]}</span>
                  {count > 0 && (
                    <span className="rounded-full bg-accent-primary px-1 text-[9px] font-bold text-white">
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {recent.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-sm text-tertiary">Aucune notification</p>
              </div>
            ) : (
              recent.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => {
                    markRead(notif.id);
                    setOpen(false);
                    onOpenPage();
                  }}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-card ${
                    !notif.read ? "bg-accent-primary/5" : ""
                  }`}
                >
                  <span className="mt-0.5 shrink-0 text-lg leading-none">
                    {notif.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs leading-snug ${
                        notif.read
                          ? "text-secondary"
                          : "text-primary font-semibold"
                      }`}
                    >
                      {notif.message}
                    </p>
                    <p className="mt-1 text-[10px] text-tertiary">
                      {formatNotifTime(notif.timestamp)}
                    </p>
                  </div>
                  {!notif.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-primary" />
                  )}
                </button>
              ))
            )}
          </div>

          <div className="border-t border-primary p-2">
            <button
              onClick={() => {
                setOpen(false);
                onOpenPage();
              }}
              className="w-full rounded-xl bg-accent-primary/10 px-3 py-2 text-xs font-semibold text-accent-primary transition hover:bg-accent-primary/20"
            >
              Voir tout l'historique →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

