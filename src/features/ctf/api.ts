
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

export async function updatePlayMode(playMode: "solo" | "multiplayer"): Promise<boolean> {
  const data = await apiFetch("update_play_mode", {
    method: "POST",
    body: JSON.stringify({ playMode }),
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
  teamFirst: {
    teamId: string;
    teamName: string;
    emoji: string;
    flagsFound: number;
    totalPoints: number;
    memberCount: number;
  } | null;
  mostFlags: {
    userId: number;
    username: string;
    playMode: string;
    flagsFound: number;
  } | null;
}

export async function getPodium(): Promise<PodiumData> {
  try {
    const data = await apiFetch("get_podium", { method: "GET" });
    if (!data.ok) return { soloTop3: [], teamFirst: null, mostFlags: null };
    return {
      soloTop3:  (data.soloTop3  as PodiumData["soloTop3"])  ?? [],
      teamFirst: (data.teamFirst as PodiumData["teamFirst"]) ?? null,
      mostFlags: (data.mostFlags as PodiumData["mostFlags"]) ?? null,
    };
  } catch {
    return { soloTop3: [], teamFirst: null, mostFlags: null };
  }
}

