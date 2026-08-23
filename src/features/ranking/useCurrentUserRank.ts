
import { useCallback } from "react";
import { getUserFlags } from "../challenges/api";
import { getRankProgress } from "./ranks";
import { useFetch } from "../../shared/hooks/useFetch";
import type { RankInfo } from "./ranks";
import type { User } from "../../types";

/**
 * Retourne le rang actuel de l'utilisateur connecté.
 * Retourne null si l'utilisateur est admin ou non défini.
 */
export function useCurrentUserRank(user: User | null): RankInfo | null {
  const shouldFetch = !!user && !user.isAdmin;

  const fetcher = useCallback(async () => {
    if (!user || user.isAdmin) return null;
    const flags = await getUserFlags(user.id);
    const { current } = getRankProgress(flags.length);
    return current;
  }, [user]);

  const { data } = useFetch<RankInfo | null>(fetcher, null, {
    enabled: shouldFetch,
    errorMessage: "Impossible de charger le rang.",
  });

  return data;
}

