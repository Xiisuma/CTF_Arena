
import { useCallback, useState } from "react";
import { submitFlagWithValue } from "../../db";
import { useChronoContext } from "../../shared/hooks/ChronoContext";
import { useChronometer } from "../../shared/hooks/useChronometer";
import type { Challenge } from "../../types";
import {
  getDifficulty,
  formatTime,
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
} from "./challengeUtils";

export function ChallengeModal({
  challenge,
  solved,
  onClose,
  onSolved,
}: {
  challenge: Challenge;
  solved: boolean;
  onClose: () => void;
  onSolved: () => void;
}) {
  const [flagInput, setFlagInput] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { setChronoRunning } = useChronoContext();
  const chrono = useChronometer();
  const diff = getDifficulty(
    challenge.points,
    challenge.difficultyMode ?? "auto",
    challenge.difficulty
  );

  const handleSubmit = useCallback(async () => {
    if (!flagInput.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    const solveTimeMs = chrono.stop();
    setChronoRunning(false);
    const result = await submitFlagWithValue(
      challenge.id,
      flagInput.trim(),
      solveTimeMs > 0 ? solveTimeMs : undefined
    );
    if (result.error) {
      setError(result.error);
      chrono.start();
      setChronoRunning(true);
      setSubmitting(false);
      return;
    }
    if (result.correct) {
      setSuccess(true);
      onSolved();
    } else {
      setError("Flag incorrect, réessayez !");
      chrono.start();
      setChronoRunning(true);
    }
    setSubmitting(false);
  }, [flagInput, submitting, chrono, challenge.id, onSolved, setChronoRunning]);

  const handleClose = () => {
    if (chrono.running) {
      chrono.pause();
      setChronoRunning(false);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-primary bg-card shadow-theme">
        <div className="flex items-start justify-between border-b border-primary px-6 py-5">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${DIFFICULTY_COLORS[diff]}`}
              >
                {DIFFICULTY_LABELS[diff]}
              </span>
              <span className="text-xs text-tertiary">{challenge.points} pts</span>
            </div>
            <h2 className="text-xl font-black text-primary">{challenge.title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg border border-primary px-3 py-1.5 text-xs text-tertiary transition hover:bg-input"
          >
            ✕ Fermer
          </button>
        </div>
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-tertiary">
              Description
            </h3>
            <p className="text-sm text-secondary leading-relaxed whitespace-pre-line">
              {challenge.description}
            </p>
          </div>
          {challenge.files && challenge.files.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-tertiary">
                Fichiers
              </h3>
              <div className="flex flex-wrap gap-2">
                {challenge.files.map((file) => (
                  <a
                    key={file.id}
                    href={file.url}
                    download={file.name}
                    className="flex items-center gap-2 rounded-xl border border-primary bg-input px-3 py-2 text-xs font-semibold text-secondary transition hover:bg-card"
                  >
                    📎 {file.name}
                  </a>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-xl border border-primary bg-input p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-tertiary mb-1">
                  Chronomètre
                </p>
                <p
                  className={`font-mono text-2xl font-bold ${
                    chrono.running ? "text-accent-primary" : "text-primary"
                  }`}
                >
                  {formatTime(chrono.elapsed)}
                  {chrono.running && (
                    <span className="ml-2 inline-block h-2 w-2 animate-pulse rounded-full bg-accent-primary align-middle" />
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                {!chrono.running && chrono.elapsed === 0 && !success && (
                  <button
                    onClick={() => {
                      chrono.start();
                      setChronoRunning(true);
                    }}
                    className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-secondary"
                  >
                    ▶ Start
                  </button>
                )}
                {chrono.running && (
                  <button
                    onClick={() => {
                      chrono.pause();
                      setChronoRunning(false);
                    }}
                    className="rounded-lg border border-primary bg-input px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-card"
                  >
                    ⏸ Pause
                  </button>
                )}
                {!chrono.running && chrono.elapsed > 0 && !success && (
                  <button
                    onClick={() => {
                      chrono.start();
                      setChronoRunning(true);
                    }}
                    className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-secondary"
                  >
                    ▶ Reprendre
                  </button>
                )}
              </div>
            </div>
          </div>
          {solved && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-300">
                ✅ Challenge déjà résolu !
              </p>
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-300">
                🎉 Félicitations ! Flag correct !
              </p>
              <p className="mt-1 text-xs text-tertiary">
                +{challenge.points} points ajoutés à votre score.
              </p>
            </div>
          )}
          {!solved && !success && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-tertiary">
                Soumettre le flag
              </h3>
              <div className="flex gap-2">
                <input
                  value={flagInput}
                  onChange={(e) => setFlagInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="flex-1 rounded-xl border border-secondary bg-input px-4 py-2.5 font-mono text-sm text-primary outline-none transition focus:ring-2 focus:ring-accent-primary/40"
                  placeholder="CTF{...}"
                  disabled={submitting}
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !flagInput.trim()}
                  className="rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-secondary disabled:opacity-50"
                >
                  {submitting ? "⏳" : "Valider"}
                </button>
              </div>
              {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

