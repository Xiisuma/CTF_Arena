
import { useCallback } from "react";
import { getUserFlags } from "./api";
import { useFetch } from "../../shared/hooks/useFetch";
import type { AsyncStatus } from "../../types";

interface UseSolvedChallengesResult {
  solvedIds: Set<string>;
  status: AsyncStatus;
  error: string | null;
  refresh: () => Promise<void>;
}

const EMPTY_SET = new Set<string>();

export function useSolvedChallenges(userId: string | undefined): UseSolvedChallengesResult {
  const fetcher = useCallback(async () => {
    if (!userId) return EMPTY_SET;
    const flags = await getUserFlags(userId);
    return new Set(flags.map((f) => f.challengeId));
  }, [userId]);

  const { data: solvedIds, status, error, refresh } = useFetch<Set<string>>(
    fetcher,
    EMPTY_SET,
    {
      enabled: !!userId,
      errorMessage: "Impossible de charger les flags résolus.",
    }
  );

  return { solvedIds, status, error, refresh };
}

