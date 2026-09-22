
import { apiFetch } from "../../infrastructure/api/client";
import type { CTFState } from "../../types";

export async function getCTFState(): Promise<CTFState> {
  try {
    const data = await apiFetch("get_ctf_state", { method: "GET" });
    if (!data.ok) return { gameStarted: false, scrambleStartedAt: "", podiumVisible: false, podiumRevealed: 0, eventTheme: '' };
    const s = data.state as Record<string, unknown>;
    return {
      gameStarted:       Boolean(s.gameStarted),
      scrambleStartedAt: String(s.scrambleStartedAt ?? ""),
      podiumVisible:     Boolean(s.podiumVisible),
      podiumRevealed:    Number(s.podiumRevealed  ?? 0),
      eventTheme:        String(s.eventTheme ?? ''),
    };
  } catch {
    return { gameStarted: false, scrambleStartedAt: "", podiumVisible: false, podiumRevealed: 0, eventTheme: '' };
  }
}

export async function setCTFState(key: string, value: string): Promise<boolean> {
  const data = await apiFetch("set_ctf_state", {
    method: "POST",
    body: JSON.stringify({ key, value }),
  });
  return Boolean(data.ok);
}

export interface PodiumData {
  soloTop3: Array<{
    userId: number;
    username: string;
    flagsFound: number;
    totalPoints: number;
  }>;
  mostFlags: {
    userId: number;
    username: string;
    flagsFound: number;
  } | null;
  mostAchievements: {
    userId: number;
    username: string;
    count: number;
  } | null;
}

export async function getPodium(): Promise<PodiumData> {
  try {
    const data = await apiFetch("get_podium", { method: "GET" });
    if (!data.ok) return { soloTop3: [], mostFlags: null, mostAchievements: null };
    return {
      soloTop3:  (data.soloTop3  as PodiumData["soloTop3"])  ?? [],
      mostFlags: (data.mostFlags as PodiumData["mostFlags"]) ?? null,
      mostAchievements: (data.mostAchievements as PodiumData["mostAchievements"]) ?? null,
    };
  } catch {
    return { soloTop3: [], mostFlags: null, mostAchievements: null };
  }
}

