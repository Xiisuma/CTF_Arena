
import { useCallback } from "react";
import { getAchievements, getAllUserAchievements } from "./api";
import { getPlayersWithPoints } from "../ranking/api";
import { useFetch } from "../../shared/hooks/useFetch";
import type { Achievement, AsyncStatus, PlayerWithPoints, UserAchievement } from "../../types";

interface AchievementsData {
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  players: PlayerWithPoints[];
}

interface UseAchievementsResult {
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  players: PlayerWithPoints[];
  status: AsyncStatus;
  error: string | null;
  refresh: () => Promise<void>;
}

const INITIAL: AchievementsData = {
  achievements: [],
  userAchievements: [],
  players: [],
};

export function useAchievements(
  userId: string | undefined,
  isAdmin: boolean,
  asPlayer = false
): UseAchievementsResult {
  const fetcher = useCallback(async () => {
    const [achievements, userAchievements, players] = await Promise.all([
      getAchievements(asPlayer),
      getAllUserAchievements(),
      isAdmin ? getPlayersWithPoints() : Promise.resolve([]),
    ]);
    return { achievements, userAchievements, players };
  }, [isAdmin, asPlayer]);

  const { data, status, error, refresh } = useFetch<AchievementsData>(
    fetcher,
    INITIAL,
    {
      enabled: !!userId,
      errorMessage: "Impossible de charger les succès. Vérifiez votre connexion.",
    }
  );

  return {
    achievements: data.achievements,
    userAchievements: data.userAchievements,
    players: data.players,
    status,
    error,
    refresh,
  };
}

