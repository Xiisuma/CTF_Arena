
import { apiFetch } from "../../infrastructure/api/client";

export interface ActiveEventChallenge {
  id: number;
  title: string;
  category: string;
  points: number;
}

export interface ActiveEvent {
  id: number;
  isMystery: boolean;
  multiplier: number;
  startedAt: string;
  endsAt: string;
  challenge: ActiveEventChallenge | null;
}

export async function getActiveEvent(): Promise<ActiveEvent | null> {
  try {
    const data = await apiFetch("get_active_event", { method: "GET" });
    if (!data.ok) return null;
    return (data.event as ActiveEvent) ?? null;
  } catch {
    return null;
  }
}

export async function triggerEvent(): Promise<string | null> {
  const data = await apiFetch("trigger_event", { method: "POST", body: JSON.stringify({}) });
  if (!data.ok) return null;
  return (data.challengeTitle as string) ?? null;
}

export async function triggerMystery(): Promise<boolean> {
  const data = await apiFetch("trigger_mystery", { method: "POST", body: JSON.stringify({}) });
  return Boolean(data.ok);
}

export async function cancelEvent(): Promise<boolean> {
  const data = await apiFetch("cancel_event", { method: "POST", body: JSON.stringify({}) });
  return Boolean(data.ok);
}

