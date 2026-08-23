
import type { Challenge } from "../../types";
import {
  getDifficulty,
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
} from "./challengeUtils";

export function ChallengeCard({
  challenge,
  solved,
  onOpen,
  onEdit,
  onDelete,
  isAdmin,
}: {
  challenge: Challenge;
  solved: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isAdmin: boolean;
}) {
  const diff = getDifficulty(
    challenge.points,
    challenge.difficultyMode ?? "auto",
    challenge.difficulty
  );

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border p-5 shadow-theme transition cursor-pointer ${
        solved
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-primary bg-card hover:bg-card-hover"
      }`}
      onClick={onOpen}
    >
      {solved && (
        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs">
          ✅
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${DIFFICULTY_COLORS[diff]}`}
          >
            {DIFFICULTY_LABELS[diff]}
          </span>
          <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-300">
            {challenge.points} pts
          </span>
          {challenge.files && challenge.files.length > 0 && (
            <span className="text-xs text-tertiary">
              📎 {challenge.files.length}
            </span>
          )}
        </div>
        {isAdmin && (
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onEdit}
              aria-label="Modifier le challenge"
              className="rounded-lg border border-primary bg-input px-2 py-1 text-xs text-secondary hover:bg-card"
            >
              ✏️
            </button>
            <button
              onClick={onDelete}
              aria-label="Supprimer le challenge"
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/20"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
      <h3 className={`font-bold ${solved ? "text-emerald-200" : "text-primary"}`}>
        {challenge.title}
      </h3>
      <p className="mt-1 text-xs text-tertiary line-clamp-2 flex-1">
        {challenge.description}
      </p>
    </div>
  );
}

