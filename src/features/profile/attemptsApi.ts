import { apiFetch } from "../../infrastructure/api/client";
import { toRawArray } from "../../infrastructure/api/schemas";
import type { CategoryType, FlagAttempt, FlagAttemptGroup } from "../../types";

/**
 * Essais du joueur connecté, regroupés par challenge commencé mais pas résolu.
 * L'API ne renvoie jamais ceux d'un autre joueur.
 */
export async function getFlagAttempts(): Promise<FlagAttemptGroup[]> {
  const data = await apiFetch("get_flag_attempts", { method: "GET" });
  if (!data.ok || !Array.isArray(data.challenges)) return [];
  return toRawArray(data.challenges).map((raw) => ({
    challengeId: String(raw.challengeId),
    challengeTitle: String(raw.challengeTitle),
    category: String(raw.category) as CategoryType,
    attempts: toRawArray(raw.attempts).map(
      (a): FlagAttempt => ({
        id: String(a.id),
        flag: String(a.flag),
        submittedAt: String(a.submittedAt),
      })
    ),
  }));
}
