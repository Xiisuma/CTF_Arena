
import { apiFetch } from "../../infrastructure/api/client";

export interface ActivityLogEntry {
  id: number;
  type: string;
  user_id: number | null;
  username: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
}

// Catégories de logs
export const LOG_CATEGORIES = {
  all:      { label: "Tout",      types: [] as string[] },
  auth:     { label: "Auth",      types: ["register_success","register_fail","login_success","login_fail","logout"] },
  gameplay: { label: "Gameplay",  types: ["flag_correct","flag_wrong","challenge_created","challenge_updated","challenge_deleted","achievement_unlocked","ctf_state_change"] },
  teams:    { label: "Teams",     types: ["team_join","team_leave","team_kick","team_promote","team_demote"] },
  social:   { label: "Social",    types: ["friend_request_sent"] },
  admin:    { label: "Admin",     types: ["player_deleted","bonus_added","malus_added","progress_reset"] },
} as const;

export type LogCategory = keyof typeof LOG_CATEGORIES;

export async function getActivityLogs(params: {
  limit?: number;
  offset?: number;
  type?: string;
  category?: LogCategory;
  q?: string;
} = {}): Promise<{ logs: ActivityLogEntry[]; total: number }> {
  const query: Record<string, string> = {};
  if (params.limit    != null) query.limit  = String(params.limit);
  if (params.offset   != null) query.offset = String(params.offset);
  // Si une catégorie est sélectionnée, on filtre par les types correspondants côté API
  // En attendant un endpoint multi-type, on laisse le filtrage côté client pour la catégorie
  if (params.type)             query.type   = params.type;
  if (params.q)                query.q      = params.q;

  const data = await apiFetch("get_activity_logs", { method: "GET" }, query);
  if (!data.ok) return { logs: [], total: 0 };
  return {
    logs:  (data.logs  as ActivityLogEntry[]) ?? [],
    total: (data.total as number)             ?? 0,
  };
}

