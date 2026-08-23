
/**
 * HomePage.tsx v4.1
 * - Composants extraits : ChallengeModal, ChallengeFormModal, ChallengeCard
 * - Utils extraits : challengeUtils.ts, useChronometer.ts
 * - CTF phase gate + ScrambleCountdown
 */

import { useCallback, useMemo, useState } from "react";
import { removeChallenge, addChallenge, updateChallenge } from "../db";
import { useAuth } from "../features/auth/AuthContext";
import { useChallenges } from "../features/challenges/useChallenges";
import { useSolvedChallenges } from "../features/challenges/useSolvedChallenges";
import { ErrorMessage } from "../shared/ui/ErrorMessage";
import { getRankProgress } from "../features/ranking/ranks";
import { ChallengeModal } from "../features/challenges/ChallengeModal";
import { ChallengeFormModal } from "../features/challenges/ChallengeFormModal";
import { ChallengeCard } from "../features/challenges/ChallengeCard";
import { ConfirmModal } from "../shared/ui/ConfirmModal";
import { useConfirm } from "../shared/hooks/useConfirm";
import { RankProgressBar } from "../features/ranking/RankProgressBar";
import { useCTFState, phaseSecondsLeft } from "../features/ctf/useCTFState";
import { useActiveEvent } from "../features/ctf/useActiveEvent";
import { EventBanner } from "../features/ctf/EventBanner";
import { submitMysteryFlag } from "../features/challenges/api";
import type { Challenge, CategoryType, ChallengeFile } from "../types";
import type { ChallengeFormData } from "../features/challenges/challengeUtils";

type CardsPerLine = 1 | 2 | 3 | 4;

function ScrambleCountdown({ secondsLeft }: { secondsLeft: number }) {
  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const secs = Math.floor(secondsLeft % 60).toString().padStart(2, "0");
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-4 text-center">
      <p className="text-sm font-semibold text-amber-300 mb-1">⏳ Phase finale — Brouillage</p>
      <p className="text-4xl font-black text-amber-200 tabular-nums">{mins}:{secs}</p>
      <p className="text-xs text-amber-400/80 mt-1">
        Les classements sont masqués. Continuez à jouer !
      </p>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const {
    categories,
    challenges,
    status,
    error: challengeError,
    refresh: refreshAll,
  } = useChallenges();
  const {
    solvedIds,
    status: solvedStatus,
    error: solvedError,
    refresh: refreshSolved,
  } = useSolvedChallenges(user?.id);

  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [cardsPerLine, setCardsPerLine] = useState<CardsPerLine>(2);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const { pendingConfirm, requestConfirm, closeConfirm } = useConfirm();

  const { ctfState, phase } = useCTFState();
  const { event: activeEvent } = useActiveEvent();

  const challengesByCategory = useMemo(() => {
    return categories.reduce<Record<string, Challenge[]>>((acc, cat) => {
      acc[cat.id] = challenges.filter((c) => c.category === cat.id);
      return acc;
    }, {});
  }, [categories, challenges]);

  const rankData = useMemo(() => {
    if (!user || user.isAdmin) return null;
    return getRankProgress(solvedIds.size);
  }, [user, solvedIds.size]);

  const handleAddChallenge = useCallback(
    async (
      category: string,
      data: ChallengeFormData,
      files: { id: string; name: string; content: string; url?: string }[]
    ) => {
      setMutationError(null);
      try {
        await addChallenge({
          title: data.title.trim(),
          category: category as CategoryType,
          points: data.points,
          description: data.description.trim(),
          flag: data.flag.trim(),
          files,
          difficultyMode: data.difficultyMode,
          difficulty: data.difficultyMode === "auto" ? undefined : data.difficulty,
        });
        setAddingToCategory(null);
        await refreshAll();
      } catch (e) {
        console.error("[handleAddChallenge]", e);
        setMutationError("Impossible d'ajouter le challenge. Réessayez.");
      }
    },
    [refreshAll]
  );

  const handleEditChallenge = useCallback(
    async (
      data: ChallengeFormData,
      files: { id: string; name: string; content: string; url?: string }[]
    ) => {
      if (!editingChallenge) return;
      setMutationError(null);
      try {
        const normalizedFiles = files.map((f) => ({
          id: f.id,
          name: f.name,
          url: f.url ?? "",
          content: f.content,
        }));
        await updateChallenge({
          ...editingChallenge,
          title: data.title.trim(),
          points: data.points,
          description: data.description.trim(),
          flag: data.flag.trim(),
          files: normalizedFiles as ChallengeFile[],
          difficultyMode: data.difficultyMode,
          difficulty: data.difficultyMode === "auto" ? undefined : data.difficulty,
        });
        setEditingChallenge(null);
        await refreshAll();
      } catch (e) {
        console.error("[handleEditChallenge]", e);
        setMutationError("Impossible de modifier le challenge. Réessayez.");
      }
    },
    [editingChallenge, refreshAll]
  );

  const handleDeleteChallenge = useCallback(
    (id: string) => {
      requestConfirm({
        title: "Supprimer le challenge",
        message: "Cette action est irréversible.",
        confirmLabel: "Supprimer",
        danger: true,
        onConfirm: async () => {
          closeConfirm();
          setMutationError(null);
          try {
            await removeChallenge(id);
            await refreshAll();
          } catch (e) {
            console.error("[handleDeleteChallenge]", e);
            setMutationError("Impossible de supprimer le challenge. Réessayez.");
          }
        },
      });
    },
    [requestConfirm, closeConfirm, refreshAll]
  );

  if (!user) return null;

  // Phase "ended" — CTF terminé
  if (phase === "ended") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <div className="text-6xl">🏁</div>
        <h2 className="text-2xl font-black text-primary">Le CTF est terminé !</h2>
        <p className="text-sm text-tertiary max-w-sm">
          Les soumissions sont maintenant fermées. Le podium sera bientôt révélé.
        </p>
      </div>
    );
  }

  const secondsLeft = phaseSecondsLeft(ctfState, phase);
  const isBlocked = (phase === "grace" || phase === "not_started") && !user.isAdmin;

  const cardsGridClass: Record<CardsPerLine, string> = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className="space-y-6">
      {activeEvent && (
        <EventBanner
          event={activeEvent}
          onMysterySubmit={async (flag) => {
            if (!user) return { correct: false };
            const res = await submitMysteryFlag(flag);
            return { correct: res.correct, points: res.points, boost: res.boost };
          }}
        />
      )}
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary">🏴 Énigmes</h1>
          <p className="mt-1 text-sm text-tertiary">
            {status === "loading"
              ? "Chargement…"
              : `${challenges.length} challenge${challenges.length > 1 ? "s" : ""} disponible${challenges.length > 1 ? "s" : ""}${
                  !user.isAdmin
                    ? ` · ${solvedIds.size} résolu${solvedIds.size > 1 ? "s" : ""}`
                    : ""
                }`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-tertiary hidden sm:block">
            Cartes par ligne :
          </span>
          <div className="flex rounded-xl bg-input p-1 gap-1">
            {([1, 2, 3, 4] as CardsPerLine[]).map((n) => (
              <button
                key={n}
                onClick={() => setCardsPerLine(n)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  cardsPerLine === n
                    ? "bg-accent-primary text-white shadow-md"
                    : "text-tertiary hover:text-secondary"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bannière pré-démarrage */}
      {phase === "not_started" && (
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-6 py-4 text-center">
          <p className="text-sm font-semibold text-sky-300 mb-1">🔒 Le CTF commence bientôt</p>
          <p className="text-sky-200/80 text-sm">
            Les énigmes sont visibles mais les soumissions seront ouvertes par l'administrateur.
          </p>
        </div>
      )}

      {/* Countdown brouillage */}
      {(phase === "scramble" || phase === "grace") && secondsLeft !== null && (
        <ScrambleCountdown secondsLeft={secondsLeft} />
      )}

      {/* Barre de progression du rang */}
      {rankData && (
        <RankProgressBar rankData={rankData} solvedCount={solvedIds.size} />
      )}

      {/* Erreur de mutation */}
      {mutationError && (
        <ErrorMessage message={mutationError} onRetry={() => setMutationError(null)} />
      )}

      {/* Chargement / Erreur de fetch */}
      {challengeError || solvedError ? (
        <ErrorMessage message={challengeError ?? solvedError ?? ""} onRetry={refreshAll} />
      ) : status === "loading" || solvedStatus === "loading" ? (
        <div className="flex items-center justify-center py-16">
          <span className="text-2xl animate-spin">⚙️</span>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.length === 0 ? (
            <div className="rounded-2xl border border-primary bg-card p-10 text-center">
              <p className="text-3xl mb-2">🗂️</p>
              <p className="text-sm text-tertiary">
                Aucune catégorie disponible.
                {user.isAdmin
                  ? " Créez-en dans Paramètres → Catégories."
                  : ""}
              </p>
            </div>
          ) : (
            categories.map((category) => {
              const catChallenges = challengesByCategory[category.id] ?? [];
              const catSolved = catChallenges.filter((c) =>
                solvedIds.has(c.id)
              ).length;
              const isOpen = openCategory === category.id;

              return (
                <div
                  key={category.id}
                  className="overflow-hidden rounded-2xl border border-primary bg-card shadow-theme"
                >
                  <button
                    onClick={() =>
                      setOpenCategory(isOpen ? null : category.id)
                    }
                    className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-card-hover transition"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl"
                        style={{ backgroundColor: category.color + "22" }}
                      >
                        {category.icon}
                      </span>
                      <div>
                        <h2 className="font-bold text-primary">
                          {category.name}
                        </h2>
                        <p className="text-xs text-tertiary">
                          {catChallenges.length} challenge
                          {catChallenges.length > 1 ? "s" : ""}
                          {!user.isAdmin && catChallenges.length > 0 &&
                            ` · ${catSolved}/${catChallenges.length} résolu${catSolved > 1 ? "s" : ""}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!user.isAdmin && catChallenges.length > 0 && (
                        <div className="hidden sm:flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-input">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${(catSolved / catChallenges.length) * 100}%`,
                                backgroundColor: category.color,
                              }}
                            />
                          </div>
                          <span className="text-xs text-tertiary">
                            {catSolved}/{catChallenges.length}
                          </span>
                        </div>
                      )}
                      {user.isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddingToCategory(category.id);
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-400 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_2px_8px_rgba(16,185,129,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(16,185,129,0.55)] hover:brightness-110 active:scale-95"
                        >
                          <span className="text-sm font-bold leading-none">+</span>{" "}
                          Ajouter
                        </button>
                      )}
                      <span
                        className={`text-tertiary transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      >
                        ▼
                      </span>
                    </div>
                  </button>

                  {isOpen && (
                    <div
                      className={`border-t border-primary p-4 grid gap-3 ${cardsGridClass[cardsPerLine]}`}
                    >
                      {catChallenges.length === 0 ? (
                        <p className="col-span-full text-sm text-tertiary py-4 text-center">
                          Aucun challenge dans cette catégorie.
                        </p>
                      ) : (
                        catChallenges.map((challenge) => (
                          <ChallengeCard
                            key={challenge.id}
                            challenge={challenge}
                            solved={solvedIds.has(challenge.id)}
                            onOpen={isBlocked ? () => {} : () => setSelectedChallenge(challenge)}
                            onEdit={() => setEditingChallenge(challenge)}
                            onDelete={() =>
                              handleDeleteChallenge(challenge.id)
                            }
                            isAdmin={user.isAdmin}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {pendingConfirm && <ConfirmModal {...pendingConfirm} onCancel={closeConfirm} />}

      {selectedChallenge && (
        <ChallengeModal
          challenge={selectedChallenge}
          solved={solvedIds.has(selectedChallenge.id)}
          onClose={() => setSelectedChallenge(null)}
          onSolved={async () => {
            await refreshSolved();
            setSelectedChallenge(null);
          }}
        />
      )}
      {addingToCategory && (
        <ChallengeFormModal
          category={addingToCategory}
          onSave={(data, files) =>
            handleAddChallenge(addingToCategory, data, files)
          }
          onClose={() => setAddingToCategory(null)}
        />
      )}
      {editingChallenge && (
        <ChallengeFormModal
          category={editingChallenge.category}
          initial={editingChallenge}
          onSave={(data, files) => handleEditChallenge(data, files)}
          onClose={() => setEditingChallenge(null)}
        />
      )}
    </div>
  );
}

