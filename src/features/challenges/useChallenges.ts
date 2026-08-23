
import { useCallback } from "react";
import { getCategories } from "../categories/api";
import { getChallenges } from "./api";
import { useFetch } from "../../shared/hooks/useFetch";
import type { AsyncStatus, CategoryInfo, Challenge } from "../../types";

interface ChallengesData {
  categories: CategoryInfo[];
  challenges: Challenge[];
}

interface UseChallengesResult {
  categories: CategoryInfo[];
  challenges: Challenge[];
  status: AsyncStatus;
  error: string | null;
  refresh: () => Promise<void>;
}

const INITIAL: ChallengesData = { categories: [], challenges: [] };

export function useChallenges(): UseChallengesResult {
  const fetcher = useCallback(
    () =>
      Promise.all([getCategories(), getChallenges()]).then(([categories, challenges]) => ({
        categories,
        challenges,
      })),
    []
  );

  const { data, status, error, refresh } = useFetch<ChallengesData>(fetcher, INITIAL, {
    errorMessage: "Impossible de charger les challenges. Vérifiez votre connexion.",
  });

  return { categories: data.categories, challenges: data.challenges, status, error, refresh };
}

