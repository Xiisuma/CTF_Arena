
/**
 * PlayersSection.tsx — admin section for managing players
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES } from "../categories/store";
import {
  addBonusPoints,
  addMalusPoints,
  deleteUser,
  evaluateAchievements,
  getAchievements,
  getChallenges,
  getPlayersWithPoints,
  isAchievementUnlocked,
  resetUserProgress,
  revokeAchievement,
  setChallengeSolvedForUser,
  unlockAchievement,
} from "../../db";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { ErrorMessage } from "../../shared/ui/ErrorMessage";
import { useConfirm } from "../../shared/hooks/useConfirm";
import { ActionButton, SearchBar } from "./settingsUtils";
import { useWebSocket } from "../../shared/hooks/useWebSocket";
import type { Achievement, Challenge, PlayerWithPoints } from "../../types";

export function PlayersSection() {
  const [search, setSearch] = useState("");
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerWithPoints[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userUnlocked, setUserUnlocked] = useState<Record<string, Record<string, boolean>>>({});
  const [userSolved, setUserSolved] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { pendingConfirm, requestConfirm, closeConfirm } = useConfirm();

  const hasLoadedRef = useRef(false);

  const forceRefresh = useCallback(async () => {
    // Spinner uniquement au premier chargement — les refresh post-mutation sont silencieux
    if (!hasLoadedRef.current) setLoading(true);
    setError(null);
    try {
      const [pl, ch, ach] = await Promise.all([
        getPlayersWithPoints(),
        getChallenges(),
        getAchievements(),
      ]);
      setPlayers(pl);
      setChallenges(ch);
      setAchievements(ach);
      hasLoadedRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du chargement des joueurs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    forceRefresh();
  }, [forceRefresh]);

  // Rafraîchissement instantané via WebSocket — 0 polling, 0 spinner
  useWebSocket((msg) => {
    if (msg.type === "players") forceRefresh();
  });

  useEffect(() => {
    if (!openUserId) return;
    const load = async () => {
      const unlocked: Record<string, boolean> = {};
      await Promise.all(
        achievements.map(async (a) => {
          unlocked[a.id] = await isAchievementUnlocked(openUserId, a.id);
        })
      );
      setUserUnlocked((prev) => ({ ...prev, [openUserId]: unlocked }));

      const { getUserFlags } = await import("../../db");
      const flags = await getUserFlags(openUserId);
      const solved: Record<string, boolean> = {};
      for (const f of flags) solved[f.challengeId] = true;
      setUserSolved((prev) => ({ ...prev, [openUserId]: solved }));
    };
    load();
  }, [openUserId, achievements, forceRefresh]);

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => p.username.toLowerCase().includes(q));
  }, [players, search]);

  const challengesByCategory = useMemo(() => {
    return CATEGORIES.reduce<Record<string, Challenge[]>>((acc, cat) => {
      acc[cat.id] = challenges.filter((c) => c.category === cat.id);
      return acc;
    }, {});
  }, [challenges]);

  if (error) return <ErrorMessage message={error} onRetry={forceRefresh} />;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="text-2xl animate-spin">⚙️</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} placeholder="Rechercher un joueur…" />

      {players.length === 0 && (
        <div className="rounded-2xl border border-primary bg-card p-6 text-sm text-tertiary text-center">
          Aucun joueur inscrit pour le moment.
        </div>
      )}
      {filteredPlayers.length === 0 && players.length > 0 && (
        <div className="rounded-2xl border border-primary bg-card p-6 text-sm text-tertiary text-center">
          Aucun joueur ne correspond à "<strong>{search}</strong>".
        </div>
      )}

      <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: "60vh" }}>
        {filteredPlayers.map((player) => {
          const opened = openUserId === player.id;
          const unlockedMap = userUnlocked[player.id] ?? {};
          const solvedMap = userSolved[player.id] ?? {};

          return (
            <section key={player.id} className="overflow-hidden rounded-2xl border border-primary bg-card shadow-theme">
              <button
                onClick={() => setOpenUserId(opened ? null : player.id)}
                className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-card-hover transition"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-primary text-sm font-bold text-white">
                    {player.username.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-bold text-primary">{player.username}</h2>
                    <p className="text-xs text-tertiary">{player.points} pts · {player.solved} énigme(s)</p>
                  </div>
                </div>
                <span className={`text-tertiary transition-transform duration-200 ${opened ? "rotate-180" : ""}`}>▼</span>
              </button>

              {opened && (
                <div className="space-y-4 px-5 pb-5">
                  <div className="flex flex-wrap gap-2">
                    <ActionButton label="+25 pts (Bonus)" color="emerald" onClick={async () => {
                      await addBonusPoints(player.id, 25); forceRefresh();
                    }} />
                    <ActionButton label="-25 pts (Malus)" color="orange" onClick={async () => {
                      await addMalusPoints(player.id, 25); forceRefresh();
                    }} />
                    <ActionButton label="Réinitialiser" color="amber" onClick={async () => {
                      requestConfirm({
                        title: "Réinitialiser le joueur",
                        message: `Réinitialiser tous les points et flags de ${player.username} ?`,
                        confirmLabel: "Réinitialiser",
                        danger: true,
                        onConfirm: async () => { closeConfirm(); await resetUserProgress(player.id); forceRefresh(); },
                      });
                    }} />
                    <ActionButton label="Supprimer" color="rose" onClick={async () => {
                      requestConfirm({
                        title: "Supprimer le joueur",
                        message: `Supprimer définitivement ${player.username} ? Cette action est irréversible.`,
                        confirmLabel: "Supprimer",
                        danger: true,
                        onConfirm: async () => { closeConfirm(); await deleteUser(player.id); setOpenUserId(null); forceRefresh(); },
                      });
                    }} />
                  </div>

                  {achievements.length > 0 && (
                    <div className="rounded-2xl border border-primary bg-input p-4">
                      <h3 className="mb-3 text-sm font-bold text-primary">🎖️ Succès</h3>
                      <div className="space-y-1.5">
                        {achievements.map((a) => {
                          const unlocked = unlockedMap[a.id] ?? false;
                          return (
                            <label key={a.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-primary bg-card px-3 py-2 text-sm transition hover:bg-input">
                              <span className="text-lg">{a.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-primary truncate">{a.title}</p>
                                <p className="text-xs text-tertiary truncate">{a.description}</p>
                              </div>
                              {unlocked && <span className="text-xs font-semibold text-amber-400 shrink-0">✅</span>}
                              <input
                                type="checkbox"
                                checked={unlocked}
                                onChange={async (e) => {
                                  if (e.target.checked) await unlockAchievement(player.id, a.id);
                                  else await revokeAchievement(player.id, a.id);
                                  forceRefresh();
                                }}
                                className="h-4 w-4 accent-violet-500 shrink-0"
                              />
                            </label>
                          );
                        })}
                      </div>
                      <button
                        onClick={async () => { await evaluateAchievements(player.id); forceRefresh(); }}
                        className="mt-3 rounded-xl border border-primary bg-card px-3 py-1.5 text-xs font-semibold text-secondary transition hover:bg-input"
                      >
                        🔄 Réévaluer automatiquement
                      </button>
                    </div>
                  )}

                  <div className="space-y-3">
                    {CATEGORIES.map((category) => {
                      const categoryChallenges = challengesByCategory[category.id] ?? [];
                      if (!categoryChallenges.length) return null;
                      return (
                        <div key={category.id} className="rounded-2xl border border-primary bg-input p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="text-xl">{category.icon}</span>
                            <h3 className="text-sm font-bold text-primary">{category.name}</h3>
                          </div>
                          <div className="space-y-2">
                            {categoryChallenges.map((challenge) => {
                              const solved = solvedMap[challenge.id] ?? false;
                              return (
                                <label key={challenge.id} className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-primary bg-card px-3 py-2 text-sm hover:bg-input transition">
                                  <span className="flex-1 text-secondary">
                                    {challenge.title}
                                    <span className="ml-2 text-tertiary">({challenge.points} pts)</span>
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={solved}
                                    onChange={async (e) => {
                                      await setChallengeSolvedForUser(player.id, challenge.id, e.target.checked);
                                      forceRefresh();
                                    }}
                                    className="h-4 w-4 accent-violet-500"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
      {pendingConfirm && <ConfirmModal {...pendingConfirm} onCancel={closeConfirm} />}
    </div>
  );
}

