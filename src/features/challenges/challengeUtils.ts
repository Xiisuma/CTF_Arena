
import type { DifficultyType, DifficultyModeType } from "../../types";

// ─── Difficulté ───────────────────────────────────────────────────────────────

export function getDifficulty(
  points: number,
  mode: DifficultyModeType,
  override?: DifficultyType
): DifficultyType {
  if (mode === "auto" || !override) {
    if (points < 100) return "easy";
    if (points < 200) return "medium";
    return "hard";
  }
  return override;
}

export const DIFFICULTY_LABELS: Record<DifficultyType, string> = {
  easy: "🟢 Facile",
  medium: "🟡 Moyen",
  hard: "🔴 Difficile",
};

export const DIFFICULTY_COLORS: Record<DifficultyType, string> = {
  easy:   "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  hard:   "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

// ─── Formatage temps ──────────────────────────────────────────────────────────

export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── ChallengeFormData ────────────────────────────────────────────────────────

export interface ChallengeFormData {
  title: string;
  points: number;
  description: string;
  flag: string;
  difficultyMode: DifficultyModeType;
  difficulty: DifficultyType;
}

