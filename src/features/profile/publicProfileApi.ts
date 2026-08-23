
import { apiFetch } from "../../infrastructure/api/client";

export interface PublicProfile {
  id: number;
  username: string;
  avatarEmoji: string;
  bio: string;
  playMode: "solo" | "multiplayer";
  createdAt: string;
  points: number;
  solved: number;
  rank: number | null;
  recentFlags: Array<{
    id: number;
    title: string;
    category: string;
    points: number;
    submittedAt: string;
  }>;
  categoryProgress: Record<string, number>;
  achievements: Array<{
    id: string;
    title: string;
    icon: string;
    unlockedAt: string;
  }>;
}

export async function getPublicProfile(username: string): Promise<PublicProfile | null> {
  const data = await apiFetch("get_public_profile", { method: "GET" }, { username });
  if (!data.ok) return null;
  return data.profile as PublicProfile;
}

export async function updateProfile(avatarEmoji: string, bio: string): Promise<boolean> {
  const data = await apiFetch("update_profile", {
    method: "POST",
    body: JSON.stringify({ avatarEmoji, bio }),
  });
  return Boolean(data.ok);
}

