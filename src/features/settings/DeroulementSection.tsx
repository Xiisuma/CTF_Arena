
/**
 * DeroulementSection.tsx
 * Section admin dans Paramètres pour contrôler le déroulement du CTF.
 * 3 actions : Début du jeu / Brouillage / Afficher le Podium
 */

import { useState } from "react";
import { setCTFState } from "../ctf/api";
import { triggerEvent, triggerMystery, cancelEvent } from "../ctf/activeEventApi";
import { useActiveEvent } from "../ctf/useActiveEvent";
import { useCTFState } from "../ctf/useCTFState";

function ControlCard({
  title,
  description,
  buttonLabel,
  buttonDanger,
  buttonDisabled,
  activeLabel,
  isActive,
  loading,
  onAction,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  buttonDanger?: boolean;
  buttonDisabled?: boolean;
  activeLabel: string;
  isActive: boolean;
  loading: boolean;
  onAction: () => void;
}) {
  return (
    <div className="rounded-2xl border border-primary bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-primary">{title}</h3>
          <p className="text-sm text-tertiary mt-1 leading-relaxed">{description}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isActive
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              : "bg-input text-tertiary border border-primary"
          }`}
        >
          {isActive ? activeLabel : "Inactif"}
        </span>
      </div>
      <button
        onClick={onAction}
        disabled={buttonDisabled || loading}
        className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200
          disabled:cursor-not-allowed disabled:opacity-50 ${
          buttonDanger
            ? "bg-gradient-to-r from-rose-600 to-orange-500 text-white shadow-[0_2px_8px_rgba(239,68,68,0.35)] hover:brightness-110 active:scale-95"
            : "bg-gradient-to-r from-emerald-500 to-green-400 text-white shadow-[0_2px_8px_rgba(16,185,129,0.35)] hover:brightness-110 active:scale-95"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            En cours…
          </span>
        ) : (
          buttonLabel
        )}
      </button>
    </div>
  );
}

export function DeroulementSection() {
  const { ctfState, phase, refresh } = useCTFState();
  const { event: activeEvent, refresh: refreshEvent } = useActiveEvent();
  const [eventLoading, setEventLoading] = useState<"event"|"mystery"|"cancel"|null>(null);
  const [eventMsg, setEventMsg] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(key: string, value: string, label: string) {
    setLoadingKey(label);
    setError(null);
    try {
      await setCTFState(key, value);
      // Refresh en arrière-plan : le bouton se libère dès que l'API confirme.
      // CTFStateContext (polling 5 s) propagera aussi le nouvel état automatiquement.
      refresh().catch(console.error);
    } catch {
      setError(`Impossible de mettre à jour : ${label}`);
    } finally {
      setLoadingKey(null);
    }
  }

  const scrambleActive = !!ctfState.scrambleStartedAt;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-primary">⚙️ Déroulement du CTF</h2>
        <p className="text-sm text-tertiary mt-1">
          Contrôlez les phases de la compétition. Ces actions sont irréversibles.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          ⚠️ {error}
        </div>
      )}

      {/* 1. Début du jeu */}
      <ControlCard
        title="🚀 Début du jeu"
        description="Lance officiellement la compétition. Avant activation, les joueurs peuvent se connecter mais ne peuvent pas soumettre de flags."
        buttonLabel={ctfState.gameStarted ? "Jeu en cours…" : "🚀 Lancer le CTF"}
        buttonDisabled={ctfState.gameStarted}
        activeLabel="En cours"
        isActive={ctfState.gameStarted}
        loading={loadingKey === "game_started"}
        onAction={() => handle("game_started", "1", "game_started")}
      />

      {/* 2. Brouillage */}
      <ControlCard
        title="🔀 Brouillage (phase finale)"
        description="Masque les classements et démarre un compte à rebours de 15 min. Après 15 min, les énigmes sont progressivement fermées (3 min de grâce). Action irréversible."
        buttonLabel={scrambleActive ? "Brouillage actif" : "🔀 Démarrer le brouillage"}
        buttonDanger
        buttonDisabled={!ctfState.gameStarted || scrambleActive}
        activeLabel={phase === "scramble" ? "Brouillage" : phase === "grace" ? "Grâce (3 min)" : phase === "ended" ? "Terminé" : "Actif"}
        isActive={scrambleActive}
        loading={loadingKey === "scramble_started_at"}
        onAction={() => {
          const iso = new Date().toISOString().replace("T", " ").substring(0, 19);
          handle("scramble_started_at", iso, "scramble_started_at");
        }}
      />

      {/* 3. Afficher le Podium */}
      <ControlCard
        title="🏆 Afficher le Podium"
        description="Remplace la page d'accueil par la page Podium pour tous les joueurs. Permet la révélation progressive des gagnants."
        buttonLabel={ctfState.podiumVisible ? "Masquer le Podium" : "🏆 Afficher le Podium"}
        buttonDisabled={false}
        activeLabel="Visible"
        isActive={ctfState.podiumVisible}
        loading={loadingKey === "podium_visible"}
        onAction={() =>
          handle("podium_visible", ctfState.podiumVisible ? "0" : "1", "podium_visible")
        }
      />

      {/* 4. Événements */}
      <div className="rounded-2xl border border-primary bg-card p-5 shadow-theme space-y-4">
        <div>
          <h3 className="text-base font-black text-primary">⚡ Événements</h3>
          <p className="mt-1 text-sm text-tertiary">Lance un événement de 10 min avec points x2 pour tous les joueurs.</p>
        </div>

        {activeEvent && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <span className="text-xl">{activeEvent.isMystery ? "🎭" : "⚡"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary">
                {activeEvent.isMystery ? "Challenge Mystère actif" : `Événement actif${activeEvent.challenge ? ` — ${activeEvent.challenge.title}` : ""}`}
              </p>
              <p className="text-xs text-tertiary">
                Expire à {new Date(activeEvent.endsAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <button
              onClick={async () => {
                setEventLoading("cancel");
                await cancelEvent();
                await refreshEvent();
                setEventLoading(null);
                setEventMsg("Événement annulé.");
                setTimeout(() => setEventMsg(null), 3000);
              }}
              disabled={eventLoading !== null}
              className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
            >
              {eventLoading === "cancel" ? "…" : "Annuler"}
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={async () => {
              setEventLoading("event");
              setEventMsg(null);
              const title = await triggerEvent();
              await refreshEvent();
              setEventLoading(null);
              setEventMsg(title ? `⚡ Événement lancé : "${title}" — 10 min, ×2 pts` : "Erreur lors du lancement.");
              setTimeout(() => setEventMsg(null), 6000);
            }}
            disabled={eventLoading !== null}
            className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
          >
            {eventLoading === "event" ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300" />
            ) : "⚡"}
            Événement aléatoire
          </button>

          <button
            onClick={async () => {
              setEventLoading("mystery");
              setEventMsg(null);
              await triggerMystery();
              await refreshEvent();
              setEventLoading(null);
              setEventMsg("🎭 Challenge Mystère lancé — 10 min, ×2 pts");
              setTimeout(() => setEventMsg(null), 6000);
            }}
            disabled={eventLoading !== null}
            className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-300 transition hover:bg-violet-500/20 disabled:opacity-50"
          >
            {eventLoading === "mystery" ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-300/30 border-t-violet-300" />
            ) : "🎭"}
            Challenge Mystère
          </button>
        </div>

        {eventMsg && (
          <p className="text-sm font-semibold text-emerald-400">{eventMsg}</p>
        )}
      </div>

      {/* Récapitulatif d'état */}
      <div className="rounded-2xl border border-primary bg-input p-4 text-xs text-tertiary space-y-1 font-mono">
        <p>game_started: <span className="text-accent-secondary">{ctfState.gameStarted ? "true" : "false"}</span></p>
        <p>scramble_started_at: <span className="text-accent-secondary">{ctfState.scrambleStartedAt || "—"}</span></p>
        <p>podium_visible: <span className="text-accent-secondary">{ctfState.podiumVisible ? "true" : "false"}</span></p>
        <p>phase: <span className="text-accent-secondary">{phase}</span></p>
      </div>
    </div>
  );
}

