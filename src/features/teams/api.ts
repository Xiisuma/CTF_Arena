
import { apiFetch } from "../../infrastructure/api/client";
import { TeamSchema, TeamMemberWithStatsSchema, validate, toRawArray } from "../../infrastructure/api/schemas";
import type { Team, TeamRole, TeamMemberWithStats } from "../../types";

export function normalizeTeam(raw: Record<string, unknown>): Team {
  const t = (raw.team ?? raw) as Record<string, unknown>;
  const result: Team = {
    id: String(t.id),
    name: String(t.name),
    description: String(t.description ?? ""),
    emoji: String(t.emoji ?? "🛡️"),
    isPublic: Boolean(t.isPublic ?? t.is_public),
    ownerId: String(t.ownerId ?? t.owner_id),
    createdAt: String(t.createdAt ?? t.created_at ?? ""),
  };
  return validate(TeamSchema, result, "Team");
}

export async function createTeam(
  _ownerId: string, name: string, description: string,
  emoji: string, isPublic: boolean
): Promise<Team | null> {
  const data = await apiFetch("create_team", {
    method: "POST",
    body: JSON.stringify({ name, description, emoji, isPublic }),
  });
  if (!data.ok) return null;
  return await getUserTeam();
}

export async function getTeams(): Promise<Team[]> {
  const data = await apiFetch("get_teams", { method: "GET" });
  if (!data.ok || !Array.isArray(data.teams)) return [];
  return toRawArray(data.teams).map(normalizeTeam);
}

export async function getUserTeam(userId?: string): Promise<Team | null> {
  const params: Record<string, string> = {};
  if (userId) params.userId = userId;
  const data = await apiFetch("get_user_team", { method: "GET" }, params);
  if (!data.ok || !data.team) return null;
  return normalizeTeam(data.team as Record<string, unknown>);
}

export async function getUserTeamRole(_userId: string, _teamId: string): Promise<TeamRole | null> {
  const data = await apiFetch("get_user_team", { method: "GET" });
  if (!data.ok || !data.role) return null;
  return data.role as TeamRole;
}

export async function getTeamMembers(teamId: string): Promise<TeamMemberWithStats[]> {
  const data = await apiFetch("get_team_members", { method: "GET" }, { teamId });
  if (!data.ok || !Array.isArray(data.members)) return [];
  return toRawArray(data.members).map((m): TeamMemberWithStats => {
    const result: TeamMemberWithStats = {
      id: String(m.id),
      username: String(m.username),
      role: (m.role ?? "member") as TeamRole,
      points: Number(m.points ?? 0),
      solved: Number(m.solved ?? 0),
      joinedAt: String(m.joined_at ?? m.joinedAt ?? ""),
    };
    return validate(TeamMemberWithStatsSchema, result, "TeamMemberWithStats");
  });
}

export async function joinTeam(_userId: string, teamId: string): Promise<boolean> {
  const data = await apiFetch("join_team", { method: "POST", body: JSON.stringify({ teamId }) });
  return Boolean(data.ok);
}

export async function leaveTeam(_userId?: string): Promise<boolean> {
  const data = await apiFetch("leave_team", { method: "POST", body: "{}" });
  return Boolean(data.ok);
}

export async function kickTeamMember(_actorId: string, targetUserId: string, teamId: string): Promise<boolean> {
  const data = await apiFetch("kick_member", { method: "POST", body: JSON.stringify({ targetId: targetUserId, teamId }) });
  return Boolean(data.ok);
}

export async function banTeamMember(_actorId: string, targetUserId: string, teamId: string): Promise<boolean> {
  const data = await apiFetch("ban_member", { method: "POST", body: JSON.stringify({ targetId: targetUserId, teamId }) });
  return Boolean(data.ok);
}

export async function promoteTeamMember(_ownerId: string, targetUserId: string, teamId: string): Promise<boolean> {
  const data = await apiFetch("promote_member", { method: "POST", body: JSON.stringify({ targetId: targetUserId, teamId }) });
  return Boolean(data.ok);
}

export async function demoteTeamMember(_ownerId: string, targetUserId: string, teamId: string): Promise<boolean> {
  const data = await apiFetch("demote_member", { method: "POST", body: JSON.stringify({ targetId: targetUserId, teamId }) });
  return Boolean(data.ok);
}

export async function updateTeam(
  _actorId: string, teamId: string,
  updates: Partial<Pick<Team, "name" | "description" | "emoji" | "isPublic">>
): Promise<boolean> {
  const data = await apiFetch("update_team", { method: "POST", body: JSON.stringify({ teamId, ...updates }) });
  return Boolean(data.ok);
}

export async function deleteTeam(_ownerId: string, teamId: string): Promise<boolean> {
  const data = await apiFetch("delete_team", { method: "POST", body: JSON.stringify({ teamId }) });
  return Boolean(data.ok);
}

export async function searchTeams(query: string, filterPublic?: boolean): Promise<Team[]> {
  const params: Record<string, string> = { q: query };
  if (filterPublic === true) params.filter = "public";
  else if (filterPublic === false) params.filter = "private";
  const data = await apiFetch("search_teams", { method: "GET" }, params);
  if (!data.ok || !Array.isArray(data.teams)) return [];
  return toRawArray(data.teams).map(normalizeTeam);
}

export async function isTeamBanned(_userId: string, _teamId: string): Promise<boolean> {
  return false; // Géré côté serveur lors de join_team
}

export async function addTeamMemberAdmin(teamId: string, userId: string): Promise<boolean> {
  const data = await apiFetch("add_team_member_admin", { method: "POST", body: JSON.stringify({ teamId, userId }) });
  return Boolean(data.ok);
}

