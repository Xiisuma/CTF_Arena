
import type { Achievement } from "../../types";
import {
  CONDITION_ICONS,
  CONDITION_LABELS,
  NO_VALUE_CONDITIONS,
} from "./achievementUtils";

export function AchievementCard({
  achievement,
  unlocked,
  unlockedAt,
}: {
  achievement: Achievement;
  unlocked: boolean;
  unlockedAt?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 transition ${
        unlocked
          ? "border-amber-400/30 bg-amber-400/10 shadow-lg"
          : "border-primary bg-card opacity-50 grayscale"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-3xl ${
            unlocked ? "bg-amber-400/20" : "bg-input"
          }`}
        >
          {achievement.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold ${unlocked ? "text-amber-200" : "text-primary"}`}>
            {achievement.title}
          </h3>
          <p className="mt-0.5 text-sm text-tertiary">{achievement.description}</p>
          <div className="mt-2 text-xs text-tertiary">
            {CONDITION_ICONS[achievement.condition]} {CONDITION_LABELS[achievement.condition]}
            {!NO_VALUE_CONDITIONS.includes(achievement.condition) && (
              <> — seuil : <strong>{achievement.conditionValue}</strong></>
            )}
            {achievement.conditionCategory && <> ({achievement.conditionCategory})</>}
          </div>
          {unlocked && unlockedAt && (
            <p className="mt-1.5 text-xs font-semibold text-amber-400">
              ✅ Débloqué le {new Date(unlockedAt).toLocaleDateString("fr-FR")}
            </p>
          )}
        </div>
      </div>
      {!unlocked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/10">
          <span className="text-2xl">🔒</span>
        </div>
      )}
    </div>
  );
}

