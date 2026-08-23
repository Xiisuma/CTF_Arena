
import { useCallback } from "react";
import { getRanking, getTeamRanking } from "./api";
import { useFetch } from "../../shared/hooks/useFetch";
import type { AsyncStatus, RankingRow, TeamRankingRow } from "../../types";

interface RankingData {
  ranking: RankingRow[];
  teamRanking: TeamRankingRow[];
}

interface UseRankingResult {
  ranking: RankingRow[];
  teamRanking: TeamRankingRow[];
  status: AsyncStatus;
  error: string | null;
}

// Fetcher stable (aucune dépendance externe) — défini au niveau module
const INITIAL: RankingData = { ranking: [], teamRanking: [] };

export function useRanking(): UseRankingResult {
  const fetcher = useCallback(
    () =>
      Promise.all([getRanking(), getTeamRanking()]).then(([ranking, teamRanking]) => ({
        ranking,
        teamRanking,
      })),
    []
  );

  const { data, status, error } = useFetch<RankingData>(fetcher, INITIAL, {
    errorMessage: "Impossible de charger le classement. Vérifiez votre connexion.",
  });

  return { ranking: data.ranking, teamRanking: data.teamRanking, status, error };
}

