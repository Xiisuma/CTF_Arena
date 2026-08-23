
import type { NotifType } from "../../types";

export function formatNotifTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "À l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Il y a ${d}j`;
  return new Date(timestamp).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function formatNotifTimeFull(timestamp: number): string {
  return new Date(timestamp).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const NOTIF_TYPE_LABEL: Record<NotifType, string> = {
  friend_flag:        "Ami • Énigme",
  friend_achievement: "Ami • Succès",
  friend_request:     "Ami • Demande",
  team_flag:          "Team • Énigme",
  team_achievement:   "Team • Succès",
  rank1:              "Classement",
  team_join:          "Team • Nouveau membre",
  team_role_change:   "Team • Rôle",
};

export const NOTIF_TYPE_COLOR: Record<NotifType, string> = {
  friend_flag:        "text-violet-300",
  friend_achievement: "text-amber-300",
  friend_request:     "text-blue-300",
  team_flag:          "text-emerald-300",
  team_achievement:   "text-sky-300",
  rank1:              "text-yellow-300",
  team_join:          "text-pink-300",
  team_role_change:   "text-cyan-300",
};

export const NOTIF_TYPE_BG: Record<NotifType, string> = {
  friend_flag:        "bg-violet-500/10 border-violet-500/20",
  friend_achievement: "bg-amber-400/10 border-amber-400/20",
  friend_request:     "bg-blue-500/10 border-blue-500/20",
  team_flag:          "bg-emerald-500/10 border-emerald-500/20",
  team_achievement:   "bg-sky-500/10 border-sky-500/20",
  rank1:              "bg-yellow-400/10 border-yellow-400/20",
  team_join:          "bg-pink-500/10 border-pink-500/20",
  team_role_change:   "bg-cyan-500/10 border-cyan-500/20",
};

