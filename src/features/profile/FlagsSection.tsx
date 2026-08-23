
import { CATEGORIES } from "../categories/store";
import { formatMs } from "./profileUtils";
import type { FlagSubmission } from "../../types";

export function FlagsSection({ flags }: { flags: FlagSubmission[] }) {
  if (!flags.length) {
    return (
      <div className="rounded-2xl border border-primary bg-card p-10 text-center">
        <p className="text-sm text-tertiary">Aucune énigme résolue pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {CATEGORIES.map((cat) => {
        const catFlags = flags.filter((f) => f.category === cat.id);
        if (!catFlags.length) return null;
        return (
          <section key={cat.id} className="overflow-hidden rounded-2xl border border-primary bg-card shadow-theme">
            <div className="flex items-center gap-3 border-b border-primary px-5 py-3">
              <span className="text-xl">{cat.icon}</span>
              <h3 className="font-bold text-primary">{cat.name}</h3>
              <span className="ml-auto text-xs text-tertiary">{catFlags.length} résolu(s)</span>
            </div>
            <div className="divide-y divide-[var(--border-primary)]">
              {catFlags.map((flag) => (
                <div key={flag.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-primary">{flag.challengeTitle}</p>
                    <p className="mt-0.5 text-xs text-tertiary">
                      {new Date(flag.submittedAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {flag.solveTimeMs && flag.solveTimeMs > 0 ? (
                      <span className="flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 font-mono text-xs font-bold text-emerald-300">
                        ⏱️ {formatMs(flag.solveTimeMs)}
                      </span>
                    ) : (
                      <span className="rounded-lg border border-primary bg-input px-2 py-1 font-mono text-xs text-tertiary">⏱️ —</span>
                    )}
                    <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-300">
                      +{flag.points} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

