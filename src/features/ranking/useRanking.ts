
import { useCallback } from "react";
import { getRanking } from "./api";
import { useFetch } from "../../shared/hooks/useFetch";
import type { AsyncStatus, RankingRow } from "../../types";

interface RankingData {
  ranking: RankingRow[];
}

interface UseRankingResult {
  ranking: RankingRow[];
  status: AsyncStatus;
  error: string | null;
}

const INITIAL: RankingData = { ranking: [] };

export function useRanking(): UseRankingResult {
  const fetcher = useCallback(() => getRanking().then((ranking) => ({ ranking })), []);

  const { data, status, error } = useFetch<RankingData>(fetcher, INITIAL, {
    errorMessage: "Impossible de charger le classement. Vérifiez votre connexion.",
  });

  return { ranking: data.ranking, status, error };
}

