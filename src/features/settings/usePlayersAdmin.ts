
import { useCallback, useState } from "react";
import { getAchievements, isAchievementUnlocked } from "../achievements/api";
import { getChallenges, getUserFlags } from "../challenges/api";
import { getPlayersWithPoints } from "../ranking/api";
import { useFetch } from "../../shared/hooks/useFetch";
import type { Achievement, AsyncStatus, Challenge, PlayerWithPoints } from "../../types";

interface PlayersAdminData {
  players: PlayerWithPoints[];
  challenges: Challenge[];
  achievements: Achievement[];
}

interface UsePlayersAdminResult {
  players: PlayerWithPoints[];
  challenges: Challenge[];
  achievements: Achievement[];
  userUnlocked: Record<string, Record<string, boolean>>;
  userSolved: Record<string, Record<string, boolean>>;
  status: AsyncStatus;
  error: string | null;
  forceRefresh: () => Promise<void>;
  loadUserDetails: (userId: string) => Promise<void>;
}

const INITIAL: PlayersAdminData = { players: [], challenges: [], achievements: [] };

const loadAll = () =>
  Promise.all([getPlayersWithPoints(), getChallenges(), getAchievements()]).then(
    ([players, challenges, achievements]) => ({ players, challenges, achievements })
  );

export function usePlayersAdmin(): UsePlayersAdminResult {
  const [userUnlocked, setUserUnlocked] = useState<Record<string, Record<string, boolean>>>({});
  const [userSolved, setUserSolved] = useState<Record<string, Record<string, boolean>>>({});

  const { data, status, error, refresh: forceRefresh } = useFetch<PlayersAdminData>(
    loadAll,
    INITIAL,
    { errorMessage: "Impossible de charger les joueurs." }
  );

  const loadUserDetails = useCallback(
    async (userId: string) => {
      const [flags, ...unlockResults] = await Promise.all([
        getUserFlags(userId),
        ...data.achievements.map((a) => isAchievementUnlocked(userId, a.id)),
      ]);
      const unlocked: Record<string, boolean> = {};
      data.achievements.forEach((a, i) => {
        unlocked[a.id] = unlockResults[i] as boolean;
      });
      const solved: Record<string, boolean> = {};
      for (const f of flags) solved[f.challengeId] = true;
      setUserUnlocked((prev) => ({ ...prev, [userId]: unlocked }));
      setUserSolved((prev) => ({ ...prev, [userId]: solved }));
    },
    [data.achievements]
  );

  return {
    players: data.players,
    challenges: data.challenges,
    achievements: data.achievements,
    userUnlocked,
    userSolved,
    status,
    error,
    forceRefresh,
    loadUserDetails,
  };
}

