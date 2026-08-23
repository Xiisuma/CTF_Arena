
import { useCallback, useEffect, useState } from "react";
import { getTeamMembers, getTeams } from "../teams/api";
import { getPlayersWithPoints } from "../ranking/api";
import { useFetch } from "../../shared/hooks/useFetch";
import type { AsyncStatus, PlayerWithPoints, Team, TeamMemberWithStats } from "../../types";

interface TeamsAdminData {
  teams: Team[];
  allPlayers: PlayerWithPoints[];
}

interface UseTeamsAdminResult {
  teams: Team[];
  allPlayers: PlayerWithPoints[];
  teamMembers: Record<string, TeamMemberWithStats[]>;
  status: AsyncStatus;
  error: string | null;
  openTeamId: string | null;
  setOpenTeamId: (id: string | null) => void;
  forceRefresh: () => Promise<void>;
}

const INITIAL: TeamsAdminData = { teams: [], allPlayers: [] };

const loadAll = () =>
  Promise.all([getTeams(), getPlayersWithPoints()]).then(([teams, allPlayers]) => ({
    teams,
    allPlayers,
  }));

export function useTeamsAdmin(): UseTeamsAdminResult {
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMemberWithStats[]>>({});
  const [openTeamId, setOpenTeamId] = useState<string | null>(null);

  const { data, status, error, refresh: forceRefresh } = useFetch<TeamsAdminData>(
    loadAll,
    INITIAL,
    { errorMessage: "Impossible de charger les teams." }
  );

  const loadMembers = useCallback(async (teamId: string) => {
    const members = await getTeamMembers(teamId);
    setTeamMembers((prev) => ({ ...prev, [teamId]: members }));
  }, []);

  useEffect(() => {
    if (!openTeamId) return;
    loadMembers(openTeamId);
  }, [openTeamId, loadMembers, forceRefresh]);

  return {
    teams: data.teams,
    allPlayers: data.allPlayers,
    teamMembers,
    status,
    error,
    openTeamId,
    setOpenTeamId,
    forceRefresh,
  };
}

