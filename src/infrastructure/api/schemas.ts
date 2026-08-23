
/**
 * schemas.ts — Zod schemas for all API response types.
 *
 * Used to validate normalized data coming from the API.
 * Failures are logged as warnings but never crash the UI (safeParse).
 */

import { z } from "zod";

// ─── Primitives ───────────────────────────────────────────────────────────────

const str = z.coerce.string();
const num = z.coerce.number();
const bool = z.coerce.boolean();
const optStr = z.coerce.string().optional();
const optNum = z.coerce.number().optional();

// ─── Entities ─────────────────────────────────────────────────────────────────

export const CategoryInfoSchema = z.object({
  id: str,
  name: str,
  description: str,
  descriptionMd: str,
  icon: str,
  color: str,
  sortOrder: num,
});

export const ChallengeFileSchema = z.object({
  id: str,
  name: str,
  url: str,
});

export const ChallengeSchema = z.object({
  id: str,
  title: str,
  category: str,
  points: num,
  description: str,
  files: z.array(ChallengeFileSchema),
  // flag_encrypted n'est jamais renvoyé par l'API — pas de champ flag ici.
  difficultyMode: z.enum(["auto", "easy", "medium", "hard"]).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  createdAt: str,
});

export const FlagSubmissionSchema = z.object({
  id: str,
  userId: str,
  username: str,
  challengeId: str,
  challengeTitle: str,
  category: str,
  points: num,
  submittedAt: str,
  solveTimeMs: optNum,
});

export const AchievementSchema = z.object({
  id: str,
  title: str,
  description: str,
  icon: str,
  condition: z.enum([
    "flags_count", "points_total", "category_flags", "first_blood",
    "speed_runner", "category_perfect", "night_owl", "all_categories",
    "top3", "all_challenges", "manual",
  ]),
  conditionValue: num,
  conditionCategory: optStr,
  createdAt: str,
});

export const UserAchievementSchema = z.object({
  id: str,
  userId: str,
  achievementId: str,
  unlockedAt: str,
});

export const FriendRequestSchema = z.object({
  id: str,
  fromUserId: str,
  toUserId: str,
  status: z.enum(["pending", "accepted", "rejected"]),
  createdAt: str,
});

export const TeamSchema = z.object({
  id: str,
  name: str,
  description: str,
  emoji: str,
  isPublic: bool,
  ownerId: str,
  createdAt: str,
});

export const TeamMemberWithStatsSchema = z.object({
  id: str,
  username: str,
  role: z.enum(["owner", "admin", "member"]),
  points: num,
  solved: num,
  joinedAt: str,
});

export const PlayerWithPointsSchema = z.object({
  id: str,
  username: str,
  isAdmin: bool,
  points: num,
  solved: num,
});

export const RankingRowSchema = z.object({
  username: str,
  points: num,
  solved: num,
});

export const UserSearchResultSchema = z.object({
  id: str,
  username: str,
});

export const TeamRankingRowSchema = z.object({
  points: num,
  solved: num,
  memberCount: num,
});

// ─── Validation helper ────────────────────────────────────────────────────────

/**
 * Validates `data` against `schema`. On failure, logs a warning and returns
 * the original data unchanged (non-breaking for the UI).
 */
export function validate<T>(
  schema: z.ZodType<T>,
  data: T,
  context: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn(
      `[CTF Arena] Schema validation failed (${context}):`,
      result.error.issues
    );
    return data; // graceful fallback — UI reste fonctionnel
  }
  return result.data; // valeur normalisée par Zod (coercions appliquées)
}

/**
 * Converts an unknown API response field to a typed array of plain objects.
 * Replaces all `as Array<Record<string, unknown>>` unsafe casts.
 * Items that are not plain objects are silently skipped.
 */
export function toRawArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      item !== null && typeof item === "object" && !Array.isArray(item)
  );
}

