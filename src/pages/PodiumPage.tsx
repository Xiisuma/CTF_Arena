
/**
 * PodiumPage.tsx
 * Affiche les 5 gagnants du CTF avec révélation progressive synchronisée.
 * - Affichage : 1er en haut → mostFlags en bas
 * - Révélation : bas → haut (mostFlags d'abord, 1er en dernier)
 * - podiumRevealed est stocké en DB et synchronisé via WebSocket — tous les
 *   navigateurs voient la révélation en même temps quand l'admin clique.
 */

import { useCallback, useEffect, useState } from "react";
import { getPodium, setCTFState } from "../features/ctf/api";
import type { PodiumData } from "../features/ctf/api";
import { useAuth } from "../features/auth/AuthContext";
import { useCTFState } from "../features/ctf/useCTFState";

// Ordre d'affichage (top → bottom). La révélation se fait dans l'ordre inverse
// (de bas en haut) : index 4 révélé en 1er, index 0 révélé en dernier.
const SLOT_LABELS = [
  { rank: 1, label: "1er du classement Solo",              emoji: "🥇" },
  { rank: 2, label: "2ème du classement Solo",             emoji: "🥈" },
  { rank: 3, label: "3ème du classement Solo",             emoji: "🥉" },
  { rank: 4, label: "1ère équipe — Classement Multiplayer", emoji: "🛡️" },
  { rank: 5, label: "Joueur avec le plus de flags",        emoji: "🏴" },
];

function buildSlots(data: PodiumData): Array<{ rank: number; label: string; emoji: string; name: string; detail: string } | null> {
  // Ordre : 1er → 2e → 3e → team → mostFlags
  return [
    data.soloTop3[0]
      ? { ...SLOT_LABELS[0], name: data.soloTop3[0].username, detail: `${data.soloTop3[0].totalPoints} pts · ${data.soloTop3[0].flagsFound} flags` }
      : null,
    data.soloTop3[1]
      ? { ...SLOT_LABELS[1], name: data.soloTop3[1].username, detail: `${data.soloTop3[1].totalPoints} pts · ${data.soloTop3[1].flagsFound} flags` }
      : null,
    data.soloTop3[2]
      ? { ...SLOT_LABELS[2], name: data.soloTop3[2].username, detail: `${data.soloTop3[2].totalPoints} pts · ${data.soloTop3[2].flagsFound} flags` }
      : null,
    data.teamFirst
      ? { ...SLOT_LABELS[3], name: `${data.teamFirst.emoji} ${data.teamFirst.teamName}`, detail: `${data.teamFirst.totalPoints} pts · ${data.teamFirst.flagsFound} flags · ${data.teamFirst.memberCount} membres` }
      : null,
    data.mostFlags
      ? { ...SLOT_LABELS[4], name: data.mostFlags.username, detail: `${data.mostFlags.flagsFound} flags au total` }
      : null,
  ];
}

export default function PodiumPage() {
  const { user } = useAuth();
  const { ctfState } = useCTFState();
  const revealed = ctfState.podiumRevealed; // synchronisé via WebSocket sur tous les navigateurs

  const [podium, setPodium] = useState<PodiumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);

  const load = useCallback(async () => {
    const data = await getPodium();
    setPodium(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleReveal() {
    if (revealing || revealed >= 5) return;
    setRevealing(true);
    try {
      await setCTFState("podium_revealed", String(revealed + 1));
      // CTFStateContext reçoit la notification WS et met à jour podiumRevealed
    } finally {
      setRevealing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-2xl animate-spin">⚙️</span>
      </div>
    );
  }

  const slots = podium ? buildSlots(podium) : [];
  const total  = slots.length; // 5

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black text-primary">🏆 Podium</h1>
        <p className="text-sm text-tertiary">Les vainqueurs du CTF Arena</p>
      </div>

      <div className="space-y-4">
        {slots.map((slot, i) => {
          // Révélation bas → haut : le slot d'indice le plus élevé est révélé en premier
          const isRevealed = i >= total - revealed;
          const meta = SLOT_LABELS[i];
          return (
            <div
              key={i}
              className={`rounded-2xl border transition-all duration-700 ${
                isRevealed
                  ? "border-accent-primary/40 bg-card shadow-theme opacity-100 translate-y-0"
                  : "border-primary bg-card/30 opacity-40"
              }`}
            >
              <div className="flex items-center gap-4 px-6 py-5">
                <span className="text-4xl w-12 text-center">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-tertiary font-semibold uppercase tracking-widest mb-0.5">
                    {meta.label}
                  </p>
                  {isRevealed && slot ? (
                    <>
                      <p className="text-xl font-black text-primary truncate">{slot.name}</p>
                      <p className="text-sm text-tertiary mt-0.5">{slot.detail}</p>
                    </>
                  ) : isRevealed && !slot ? (
                    <p className="text-base text-tertiary italic">Aucun participant</p>
                  ) : (
                    <p className="text-xl font-black text-tertiary">• • •</p>
                  )}
                </div>
                {isRevealed && slot && i === 0 && (
                  <span className="text-3xl">🎉</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {user?.isAdmin && revealed < 5 && (
        <div className="flex justify-center">
          <button
            onClick={handleReveal}
            disabled={revealing}
            className="rounded-2xl bg-accent-primary px-8 py-3 text-sm font-bold text-white
                       shadow-lg shadow-accent-primary/30 transition hover:bg-accent-secondary
                       hover:shadow-accent-primary/50 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {revealing ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                En cours…
              </span>
            ) : revealed === 0 ? "✨ Commencer la révélation"
              : revealed === 4 ? "🥇 Révéler le 1er !"
              : `✨ Révéler le suivant (${revealed + 1}/5)`}
          </button>
        </div>
      )}

      {revealed >= 5 && (
        <div className="text-center py-4 text-2xl animate-bounce">🎊 🎊 🎊</div>
      )}
    </div>
  );
}

