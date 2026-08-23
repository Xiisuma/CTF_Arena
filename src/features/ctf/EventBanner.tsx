
import { useEffect, useState } from "react";
import type { ActiveEvent } from "./activeEventApi";

function useCountdown(endsAt: string): string {
  const [label, setLabel] = useState("");
  useEffect(() => {
    function update() {
      const msLeft = new Date(endsAt).getTime() - Date.now();
      if (msLeft <= 0) { setLabel("Terminé"); return; }
      const s = Math.floor(msLeft / 1000);
      const m = Math.floor(s / 60);
      const sec = s % 60;
      setLabel(`${m}:${String(sec).padStart(2, "0")}`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return label;
}

interface EventBannerProps {
  event: ActiveEvent;
  onMysterySubmit?: (flag: string) => Promise<{ correct: boolean; points?: number; boost?: number }>;
}

export function EventBanner({ event, onMysterySubmit }: EventBannerProps) {
  const countdown = useCountdown(event.endsAt);
  const [flag, setFlag] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; points?: number; boost?: number } | null>(null);

  if (event.isMystery) {
    return (
      <div className="rounded-2xl border border-violet-500/40 bg-violet-500/10 p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🎭</span>
              <span className="text-xs font-bold uppercase tracking-widest text-violet-300">Challenge Mystère</span>
              <span className="rounded-full bg-violet-500/30 px-2 py-0.5 text-xs font-bold text-violet-200">×{event.multiplier} pts</span>
            </div>
            <p className="text-sm text-secondary">Un challenge secret est disponible pendant <strong>{countdown}</strong> — le premier à trouver le flag remporte le double des points !</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-black text-violet-300 tabular-nums">{countdown}</p>
            <p className="text-xs text-tertiary">restantes</p>
          </div>
        </div>

        {!result && (
          <form
            className="mt-4 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!flag.trim() || !onMysterySubmit) return;
              setSubmitting(true);
              const r = await onMysterySubmit(flag.trim());
              setResult(r);
              setSubmitting(false);
              if (r.correct) setFlag("");
            }}
          >
            <input
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
              placeholder="CTF{...}"
              className="flex-1 rounded-xl border border-violet-500/40 bg-input px-4 py-2 text-sm text-primary placeholder:text-tertiary outline-none focus:ring-2 focus:ring-violet-500/40"
            />
            <button
              type="submit"
              disabled={submitting || !flag.trim()}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-violet-500 disabled:opacity-50"
            >
              {submitting ? "…" : "Tenter"}
            </button>
          </form>
        )}
        {result && result.correct && (
          <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300">
            🎉 Correct ! +{result.points} pts {result.boost && result.boost > 1 ? `(×${result.boost} boost !)` : ""}
          </div>
        )}
        {result && !result.correct && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
            <span className="text-sm font-semibold text-rose-300">❌ Mauvaise réponse</span>
            <button onClick={() => setResult(null)} className="text-xs text-tertiary hover:text-secondary transition">Réessayer</button>
          </div>
        )}
      </div>
    );
  }

  // Événement normal
  const chal = event.challenge;
  return (
    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">⚡</span>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-300">Événement en cours</span>
            <span className="rounded-full bg-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-200">×{event.multiplier} pts</span>
          </div>
          {chal ? (
            <>
              <p className="font-black text-primary text-lg">{chal.title}</p>
              <p className="text-sm text-tertiary mt-0.5">
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300 mr-2">{chal.category}</span>
                {chal.points} pts → <strong className="text-amber-300">{chal.points * event.multiplier} pts</strong> pendant l'événement
              </p>
            </>
          ) : (
            <p className="text-sm text-secondary">Résous ce challenge pendant l'événement pour doubler tes points !</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black text-amber-300 tabular-nums">{countdown}</p>
          <p className="text-xs text-tertiary">restantes</p>
        </div>
      </div>
    </div>
  );
}

