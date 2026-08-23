
import { apiFetch } from "../../infrastructure/api/client";
import { normalizeTeam } from "../teams/api";
import { RankingRowSchema, PlayerWithPointsSchema, TeamRankingRowSchema, validate, toRawArray } from "../../infrastructure/api/schemas";
import type { RankingRow, TeamRankingRow, PlayerWithPoints } from "../../types";

// Re-export for convenience (defined in types.ts)
export type { RankingRow, TeamRankingRow, PlayerWithPoints };

export async function getRanking(): Promise<RankingRow[]> {
  const data = await apiFetch("get_ranking", { method: "GET" });
  if (!data.ok || !Array.isArray(data.ranking)) return [];
  return toRawArray(data.ranking).map((r) => {
    const result = {
      username: String(r.username),
      points: Number(r.total_points ?? r.points ?? 0),
      solved: Number(r.flags_found ?? r.solved ?? 0),
    };
    return validate(RankingRowSchema, result, "RankingRow");
  });
}

export async function getTeamRanking(): Promise<TeamRankingRow[]> {
  const data = await apiFetch("get_team_ranking", { method: "GET" });
  if (!data.ok || !Array.isArray(data.ranking)) return [];
  return toRawArray(data.ranking).map((r) => {
    const result = {
      points: Number(r.points),
      solved: Number(r.solved),
      memberCount: Number(r.memberCount),
    };
    return { team: normalizeTeam(r), ...validate(TeamRankingRowSchema, result, "TeamRankingRow") };
  });
}

export async function getPlayersWithPoints(): Promise<PlayerWithPoints[]> {
  const data = await apiFetch("get_players", { method: "GET" });
  if (!data.ok || !Array.isArray(data.players)) return [];
  return toRawArray(data.players).map((p) => {
    const result = {
      id: String(p.id),
      username: String(p.username),
      isAdmin: Boolean(p.is_admin),
      points: Number(p.points),
      solved: Number(p.solved),
    };
    return validate(PlayerWithPointsSchema, result, "PlayerWithPoints");
  });
}

export async function resetUserProgress(userId: string): Promise<boolean> {
  const data = await apiFetch("reset_user_progress", { method: "POST", body: JSON.stringify({ userId }) });
  return Boolean(data.ok);
}

export async function deleteUser(userId: string): Promise<boolean> {
  const data = await apiFetch("delete_user", { method: "POST", body: JSON.stringify({ userId }) });
  return Boolean(data.ok);
}

export async function setChallengeSolvedForUser(userId: string, challengeId: string, solved: boolean): Promise<boolean> {
  const data = await apiFetch("set_challenge_solved", { method: "POST", body: JSON.stringify({ userId, challengeId, solved }) });
  return Boolean(data.ok);
}

export async function addBonusPoints(userId: string, points: number): Promise<boolean> {
  const data = await apiFetch("add_bonus", { method: "POST", body: JSON.stringify({ userId, points }) });
  return Boolean(data.ok);
}

export async function addMalusPoints(userId: string, points: number): Promise<boolean> {
  const data = await apiFetch("add_malus", { method: "POST", body: JSON.stringify({ userId, points }) });
  return Boolean(data.ok);
}

