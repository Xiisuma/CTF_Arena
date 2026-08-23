
import { apiFetch } from "../../infrastructure/api/client";
import { ChallengeSchema, FlagSubmissionSchema, validate, toRawArray } from "../../infrastructure/api/schemas";
import type { Challenge, FlagSubmission, CategoryType } from "../../types";

function normalizeChallenge(raw: Record<string, unknown>): Challenge {
  const result: Challenge = {
    id: String(raw.id),
    title: String(raw.title),
    category: raw.category as CategoryType,
    points: Number(raw.points),
    description: String(raw.description),
    files: Array.isArray(raw.files)
      ? toRawArray(raw.files).map((f) => ({
          id: String(f.id),
          name: String(f.name),
          url: String(f.url ?? ""),
        }))
      : [],
    difficultyMode: (raw.difficulty_mode ?? raw.difficultyMode ?? "auto") as "auto" | "easy" | "medium" | "hard",
    difficulty: (raw.difficulty ?? undefined) as "easy" | "medium" | "hard" | undefined,
    createdAt: String(raw.created_at ?? raw.createdAt ?? ""),
  };
  return validate(ChallengeSchema, result, "Challenge");
}

function normalizeFlag(raw: Record<string, unknown>): FlagSubmission {
  const result: FlagSubmission = {
    id: String(raw.id),
    userId: String(raw.user_id ?? raw.userId),
    username: String(raw.username),
    challengeId: String(raw.challenge_id ?? raw.challengeId),
    challengeTitle: String(raw.challenge_title ?? raw.challengeTitle),
    category: (raw.category ?? "") as CategoryType,
    points: Number(raw.points),
    submittedAt: String(raw.submitted_at ?? raw.submittedAt),
    solveTimeMs: raw.solve_time_ms != null ? Number(raw.solve_time_ms) : undefined,
  };
  return validate(FlagSubmissionSchema, result, "FlagSubmission");
}

export async function getChallenges(): Promise<Challenge[]> {
  const data = await apiFetch("get_challenges", { method: "GET" });
  if (!data.ok || !Array.isArray(data.challenges)) return [];
  return toRawArray(data.challenges).map(normalizeChallenge);
}

export async function addChallenge(challenge: {
  title: string; category: CategoryType; points: number;
  description: string; flag: string;
  files: Array<{ id: string; name: string; content: string; url?: string }>;
  difficultyMode?: string; difficulty?: string;
}): Promise<boolean> {
  const data = await apiFetch("add_challenge", {
    method: "POST",
    body: JSON.stringify({
      title: challenge.title, category: challenge.category, points: challenge.points,
      description: challenge.description, flag: challenge.flag, files: challenge.files,
      difficultyMode: challenge.difficultyMode ?? "auto", difficulty: challenge.difficulty,
    }),
  });
  return Boolean(data.ok);
}

export async function updateChallenge(challenge: Challenge & { flag: string }): Promise<boolean> {
  const data = await apiFetch("update_challenge", {
    method: "POST",
    body: JSON.stringify({
      id: challenge.id, title: challenge.title, category: challenge.category,
      points: challenge.points, description: challenge.description,
      flag: challenge.flag ?? "", files: challenge.files ?? [],
      difficultyMode: challenge.difficultyMode ?? "auto", difficulty: challenge.difficulty,
    }),
  });
  return Boolean(data.ok);
}

export async function removeChallenge(id: string): Promise<boolean> {
  const data = await apiFetch("delete_challenge", { method: "POST", body: JSON.stringify({ id }) });
  return Boolean(data.ok);
}

export async function alreadySolved(userId: string, challengeId: string): Promise<boolean> {
  const flags = await getUserFlags(userId);
  return flags.some((f) => f.challengeId === challengeId);
}

export async function submitFlagWithValue(
  challengeId: string,
  flagValue: string,
  solveTimeMs?: number
): Promise<{ correct: boolean; points?: number; boost?: number; error?: string }> {
  const data = await apiFetch("submit_flag", {
    method: "POST",
    body: JSON.stringify({ challengeId, flag: flagValue, solveTimeMs: solveTimeMs ?? null }),
  });
  if (!data.ok && data.error) return { correct: false, error: data.error as string };
  return { correct: Boolean(data.correct), points: data.points as number | undefined, boost: data.boost as number | undefined };
}

export async function submitMysteryFlag(
  flag: string,
  solveTimeMs?: number
): Promise<{ correct: boolean; points?: number; boost?: number; error?: string }> {
  const data = await apiFetch("submit_mystery_flag", {
    method: "POST",
    body: JSON.stringify({ flag, solveTimeMs: solveTimeMs ?? null }),
  });
  if (!data.ok && data.error) return { correct: false, error: data.error as string };
  return { correct: Boolean(data.correct), points: data.points as number | undefined, boost: data.boost as number | undefined };
}

export async function getUserFlags(userId?: string): Promise<FlagSubmission[]> {
  const params: Record<string, string> = {};
  if (userId) params.userId = userId;
  const data = await apiFetch("get_user_flags", { method: "GET" }, params);
  if (!data.ok || !Array.isArray(data.flags)) return [];
  return toRawArray(data.flags).map(normalizeFlag);
}

export async function getAllFlags(): Promise<FlagSubmission[]> {
  const data = await apiFetch("get_all_flags", { method: "GET" });
  if (!data.ok || !Array.isArray(data.flags)) return [];
  return toRawArray(data.flags).map(normalizeFlag);
}

