
/**
 * AchievementsPage.tsx v4.0
 * Composants extraits : AchievementCard, AchievementFormModal (→ components/)
 * Constantes extraites : achievementUtils.ts
 */

import { useCallback, useMemo, useState } from "react";
import {
  addAchievement,
  evaluateAchievements,
  removeAchievement,
  updateAchievement,
} from "../db";
import { useAuth } from "../features/auth/AuthContext";
import { useAchievements } from "../features/achievements/useAchievements";
import { AchievementCard } from "../features/achievements/AchievementCard";
import { AchievementFormModal } from "../features/achievements/AchievementFormModal";
import { ConfirmModal } from "../shared/ui/ConfirmModal";
import { useConfirm } from "../shared/hooks/useConfirm";
import { ErrorMessage } from "../shared/ui/ErrorMessage";
import { EmptyState } from "../shared/ui/EmptyState";
import {
  CONDITION_ICONS,
  CONDITION_LABELS,
  NO_VALUE_CONDITIONS,
} from "../features/achievements/achievementUtils";
import type { Achievement } from "../types";

export default function AchievementsPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const { pendingConfirm, requestConfirm, closeConfirm } = useConfirm();

  const { achievements, userAchievements, players, status, error, refresh: forceRefresh } =
    useAchievements(user?.id, user?.isAdmin ?? false);

  const myAchievements = useMemo(
    () => userAchievements.filter((ua) => ua.userId === user?.id),
    [userAchievements, user]
  );

  const handleSave = useCallback(
    async (a: Achievement) => {
      setMutationError(null);
      try {
        if (editing) await updateAchievement(a);
        else await addAchievement(a);
        setShowModal(false);
        setEditing(null);
        forceRefresh();
      } catch (e) {
        console.error("[handleSave]", e);
        setMutationError("Impossible de sauvegarder le succès. Réessayez.");
      }
    },
    [editing, forceRefresh]
  );

  const handleDelete = useCallback(
    (id: string) => {
      requestConfirm({
        title: "Supprimer le succès",
        message: "Les joueurs qui l'ont débloqué le perdront définitivement.",
        confirmLabel: "Supprimer",
        danger: true,
        onConfirm: async () => {
          closeConfirm();
          setMutationError(null);
          try {
            await removeAchievement(id);
            forceRefresh();
          } catch (e) {
            console.error("[handleDelete]", e);
            setMutationError("Impossible de supprimer le succès. Réessayez.");
          }
        },
      });
    },
    [requestConfirm, closeConfirm, forceRefresh]
  );

  const handleEvaluateAll = useCallback(async () => {
    setMutationError(null);
    try {
      await Promise.all(players.map((p) => evaluateAchievements(p.id)));
      forceRefresh();
    } catch (e) {
      console.error("[handleEvaluateAll]", e);
      setMutationError("Impossible d'évaluer les succès. Réessayez.");
    }
  }, [players, forceRefresh]);

  if (!user) return null;

  if (error) return <ErrorMessage message={error} />;

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-2xl animate-spin">⚙️</span>
      </div>
    );
  }

  // ── Vue joueur ──
  if (!user.isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-primary">🎖️ Succès</h1>
          <p className="mt-1 text-sm text-tertiary">
            Débloquez des succès en progressant dans le CTF.
          </p>
        </div>
        {achievements.length === 0 ? (
          <EmptyState
            icon="🎖️"
            message="Aucun succès disponible pour le moment."
            hint="L'administrateur peut en créer depuis Paramètres."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {achievements.map((a) => {
              const ua = myAchievements.find((x) => x.achievementId === a.id);
              return (
                <AchievementCard
                  key={a.id}
                  achievement={a}
                  unlocked={!!ua}
                  unlockedAt={ua?.unlockedAt}
                />
              );
            })}
          </div>
        )}
        <p className="text-xs text-tertiary">
          {myAchievements.length} / {achievements.length} succès débloqués
        </p>
      </div>
    );
  }

  // ── Vue admin ──
  return (
    <div className="space-y-6">
      {mutationError && (
        <ErrorMessage message={mutationError} onRetry={() => setMutationError(null)} />
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary">🎖️ Succès</h1>
          <p className="mt-1 text-sm text-tertiary">
            Gérez les succès disponibles. L'attribution aux joueurs se fait
            dans la page <strong className="text-secondary">Paramètres</strong>.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEvaluateAll}
            className="rounded-xl border border-primary bg-card px-3 py-2 text-sm font-semibold text-secondary transition hover:bg-input"
          >
            🔄 Réévaluer tout
          </button>
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-secondary"
          >
            + Nouveau succès
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {achievements.length === 0 && (
          <EmptyState
            icon="🎖️"
            message="Aucun succès créé."
            hint="Utilisez le formulaire ci-dessus pour en ajouter."
          />
        )}
        {achievements.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-4 rounded-2xl border border-primary bg-card px-5 py-4 shadow-theme"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-input text-2xl">
              {a.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-primary">{a.title}</p>
              <p className="text-sm text-tertiary truncate">{a.description}</p>
              <p className="mt-0.5 text-xs text-tertiary">
                {CONDITION_ICONS[a.condition]} {CONDITION_LABELS[a.condition]}
                {!NO_VALUE_CONDITIONS.includes(a.condition) && (
                  <> — seuil : <strong className="text-secondary">{a.conditionValue}</strong></>
                )}
                {a.conditionCategory && <> ({a.conditionCategory})</>}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => { setEditing(a); setShowModal(true); }}
                aria-label={`Modifier ${a.title}`}
                className="rounded-lg border border-primary bg-input px-3 py-1.5 text-xs text-secondary transition hover:bg-card"
              >
                ✏️ Modifier
              </button>
              <button
                onClick={() => handleDelete(a.id)}
                aria-label={`Supprimer ${a.title}`}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 transition hover:bg-rose-500/20"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {pendingConfirm && <ConfirmModal {...pendingConfirm} onCancel={closeConfirm} />}

      {showModal && (
        <AchievementFormModal
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

