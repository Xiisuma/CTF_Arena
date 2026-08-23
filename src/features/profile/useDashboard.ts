
import { useCallback, useEffect, useRef, useState } from "react";
import { getAllFlags, getChallenges } from "../challenges/api";
import { getPlayersWithPoints } from "../ranking/api";
import type { AsyncStatus, Challenge, FlagSubmission, PlayerWithPoints } from "../../types";

interface UseDashboardResult {
  players: PlayerWithPoints[];
  flags: FlagSubmission[];
  challenges: Challenge[];
  status: AsyncStatus;
  error: string | null;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
  lastUpdate: Date;
  reload: () => void;
}

export function useDashboard(): UseDashboardResult {
  const [players, setPlayers] = useState<PlayerWithPoints[]>([]);
  const [flags, setFlags] = useState<FlagSubmission[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    // Background reloads keep status as "success" to avoid spinner flash
    setStatus((prev) => prev === "idle" ? "loading" : prev);
    setError(null);
    try {
      const [pl, fl, ch] = await Promise.all([
        getPlayersWithPoints(),
        getAllFlags(),
        getChallenges(),
      ]);
      setPlayers(pl);
      setFlags(fl);
      setChallenges(ch);
      setLastUpdate(new Date());
      setStatus("success");
    } catch (e) {
      console.error("[useDashboard]", e);
      setError("Impossible de charger le dashboard.");
      setStatus("error");
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh) intervalRef.current = setInterval(loadData, 300000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, loadData]);

  return { players, flags, challenges, status, error, autoRefresh, setAutoRefresh, lastUpdate, reload: loadData };
}

