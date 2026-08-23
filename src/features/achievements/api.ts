
import { apiFetch } from "../../infrastructure/api/client";
import { AchievementSchema, UserAchievementSchema, validate, toRawArray } from "../../infrastructure/api/schemas";
import type { Achievement, UserAchievement } from "../../types";

function normalizeAchievement(raw: Record<string, unknown>): Achievement {
  const result: Achievement = {
    id: String(raw.id),
    title: String(raw.title),
    description: String(raw.description),
    icon: String(raw.icon),
    condition: String(raw.condition ?? raw.condition_type) as Achievement["condition"],
    conditionValue: Number(raw.conditionValue ?? raw.condition_value ?? 1),
    conditionCategory: (raw.conditionCategory ?? raw.condition_category)
      ? String(raw.conditionCategory ?? raw.condition_category)
      : undefined,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
  };
  return validate(AchievementSchema, result, "Achievement");
}

export async function getAchievements(): Promise<Achievement[]> {
  const data = await apiFetch("get_achievements", { method: "GET" });
  if (!data.ok || !Array.isArray(data.achievements)) return [];
  return toRawArray(data.achievements).map(normalizeAchievement);
}

export async function addAchievement(achievement: Achievement): Promise<boolean> {
  const data = await apiFetch("add_achievement", {
    method: "POST",
    body: JSON.stringify({
      id: achievement.id, title: achievement.title, description: achievement.description,
      icon: achievement.icon, condition: achievement.condition,
      conditionValue: achievement.conditionValue, conditionCategory: achievement.conditionCategory ?? null,
    }),
  });
  return Boolean(data.ok);
}

export async function updateAchievement(achievement: Achievement): Promise<boolean> {
  const data = await apiFetch("update_achievement", {
    method: "POST",
    body: JSON.stringify({
      id: achievement.id, title: achievement.title, description: achievement.description,
      icon: achievement.icon, condition: achievement.condition,
      conditionValue: achievement.conditionValue, conditionCategory: achievement.conditionCategory ?? null,
    }),
  });
  return Boolean(data.ok);
}

export async function removeAchievement(id: string): Promise<boolean> {
  const data = await apiFetch("delete_achievement", { method: "POST", body: JSON.stringify({ id }) });
  return Boolean(data.ok);
}

export async function getUserAchievements(userId?: string): Promise<UserAchievement[]> {
  const params: Record<string, string> = {};
  if (userId) params.userId = userId;
  const data = await apiFetch("get_user_achievements", { method: "GET" }, params);
  if (!data.ok || !Array.isArray(data.userAchievements)) return [];
  return toRawArray(data.userAchievements).map((ua): UserAchievement => {
    const result: UserAchievement = {
      id: String(ua.id),
      userId: String(ua.user_id ?? ua.userId),
      achievementId: String(ua.achievement_id ?? ua.achievementId),
      unlockedAt: String(ua.unlocked_at ?? ua.unlockedAt ?? ""),
    };
    return validate(UserAchievementSchema, result, "UserAchievement");
  });
}

export async function getAllUserAchievements(): Promise<UserAchievement[]> {
  const data = await apiFetch("get_all_user_achievements", { method: "GET" });
  if (!data.ok || !Array.isArray(data.userAchievements)) return [];
  return toRawArray(data.userAchievements).map((ua): UserAchievement => {
    const result: UserAchievement = {
      id: String(ua.id),
      userId: String(ua.user_id ?? ua.userId),
      achievementId: String(ua.achievement_id ?? ua.achievementId),
      unlockedAt: String(ua.unlocked_at ?? ua.unlockedAt ?? ""),
    };
    return validate(UserAchievementSchema, result, "UserAchievement");
  });
}

export async function isAchievementUnlocked(userId: string, achievementId: string): Promise<boolean> {
  const uas = await getUserAchievements(userId);
  return uas.some((ua) => ua.achievementId === achievementId);
}

export async function unlockAchievement(userId: string, achievementId: string): Promise<boolean> {
  const data = await apiFetch("unlock_achievement", { method: "POST", body: JSON.stringify({ userId, achievementId }) });
  return Boolean(data.ok);
}

export async function revokeAchievement(userId: string, achievementId: string): Promise<boolean> {
  const data = await apiFetch("revoke_achievement", { method: "POST", body: JSON.stringify({ userId, achievementId }) });
  return Boolean(data.ok);
}

export async function evaluateAchievements(userId: string): Promise<boolean> {
  const data = await apiFetch("evaluate_achievements", { method: "GET" }, { userId });
  return Boolean(data.ok);
}

