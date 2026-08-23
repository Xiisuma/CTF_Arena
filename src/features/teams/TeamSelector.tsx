
/**
 * TeamSelector.tsx v3.0 — 100% API, zéro localStorage
 */

import { useCallback, useEffect, useState } from "react";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { useConfirm } from "../../shared/hooks/useConfirm";
import {
  createTeam,
  getUserTeam,
  getTeamRanking,
  joinTeam,
  leaveTeam,
} from "../../db";
import type { Team, TeamRankingRow } from "../../types";

interface TeamSelectorProps {
  userId: string;
  onTeamChange?: () => void;
}

type PanelMode = "none" | "join" | "create";
type VisibilityMode = "public" | "private";

export default function TeamSelector({ userId, onTeamChange }: TeamSelectorProps) {
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("none");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);

  // Champs création
  const [createName, setCreateName] = useState("");
  const [createVisibility, setCreateVisibility] = useState<VisibilityMode>("public");

  // Champs rejoindre
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [joinNameInput, setJoinNameInput] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { pendingConfirm, requestConfirm, closeConfirm } = useConfirm();

  // Top teams ranking
  const [topTeams, setTopTeams] = useState<TeamRankingRow[]>([]);

  const doRefresh = useCallback(() => setRefresh((x) => x + 1), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [team, ranking] = await Promise.all([
        getUserTeam(userId),
        getTeamRanking(),
      ]);
      setCurrentTeam(team);
      setTopTeams(ranking.slice(0, 10));
      setLoading(false);
    };
    load();
  }, [userId, refresh]);

  const resetForms = () => {
    setCreateName("");
    setCreateVisibility("public");
    setJoinNameInput("");
    setSelectedTeamId("");
    setError(null);
  };

  // ── Création ──────────────────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    setError(null);
    const trimmed = createName.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      setError("Le nom doit contenir entre 2 et 30 caractères");
      return;
    }
    setSubmitting(true);
    try {
      const team = await createTeam(
        userId,
        trimmed,
        "",
        "🛡️",
        createVisibility === "public"
      );
      if (!team) {
        setError("Impossible de créer la team (vous êtes peut-être déjà dans une team)");
        return;
      }
      resetForms();
      setPanelMode("none");
      doRefresh();
      onTeamChange?.();
    } finally {
      setSubmitting(false);
    }
  }, [createName, createVisibility, userId, doRefresh, onTeamChange]);

  // ── Rejoindre ─────────────────────────────────────────────────────────────
  const handleJoin = useCallback(async () => {
    setError(null);
    if (!selectedTeamId) {
      setError("Sélectionnez une team");
      return;
    }
    const targetRow = topTeams.find((r) => r.team.id === selectedTeamId);
    if (!targetRow?.team.isPublic) {
      setError("Cette team est privée, vous ne pouvez pas la rejoindre directement");
      return;
    }
    setSubmitting(true);
    try {
      const success = await joinTeam(userId, selectedTeamId);
      if (!success) {
        setError("Impossible de rejoindre cette team (banni ou déjà membre)");
        return;
      }
      resetForms();
      setPanelMode("none");
      doRefresh();
      onTeamChange?.();
    } finally {
      setSubmitting(false);
    }
  }, [selectedTeamId, userId, topTeams, doRefresh, onTeamChange]);

  // ── Quitter ───────────────────────────────────────────────────────────────
  const handleLeave = useCallback(() => {
    requestConfirm({
      title: "Quitter la team",
      message: "Quitter votre team actuelle ?",
      confirmLabel: "Quitter",
      danger: true,
      onConfirm: async () => {
        closeConfirm();
        const ok = await leaveTeam(userId);
        if (!ok) {
          requestConfirm({
            title: "Action impossible",
            message: "Le propriétaire ne peut pas quitter la team. Supprimez-la depuis votre profil.",
            confirmLabel: "OK",
            onConfirm: closeConfirm,
          });
          return;
        }
        doRefresh();
        onTeamChange?.();
      },
    });
  }, [requestConfirm, closeConfirm, userId, doRefresh, onTeamChange]);

  const inputCls =
    "w-full rounded-xl border border-secondary bg-input px-4 py-2.5 text-primary outline-none focus:ring-2 focus:ring-accent-primary/40 text-sm";

  if (loading) {
    return (
      <div className="rounded-2xl border border-primary bg-card p-5 shadow-theme flex items-center justify-center">
        <span className="text-xl animate-spin">⚙️</span>
      </div>
    );
  }

  // ── Vue si déjà dans une team ─────────────────────────────────────────────
  if (currentTeam) {
    return (
      <div className="rounded-2xl border border-primary bg-card p-5 shadow-theme">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/20 text-xl">
              {currentTeam.emoji}
            </span>
            <div>
              <p className="font-bold text-primary">{currentTeam.name}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${
                  currentTeam.isPublic
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                }`}>
                  {currentTeam.isPublic ? "🌐 Publique" : "🔒 Privée"}
                </span>
                <span className="text-xs text-tertiary">
                  Créée le {new Date(currentTeam.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLeave}
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
          >
            Quitter
          </button>
        </div>
      </div>
    );
  }

  // ── Vue si pas de team ────────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-primary bg-card p-5 shadow-theme space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-xl">👥</span>
        <div>
          <p className="font-semibold text-primary">Rejoindre ou créer une team</p>
          <p className="text-xs text-tertiary">Collaborez et grimpez au classement ensemble</p>
        </div>
      </div>

      {/* Boutons d'action */}
      {panelMode === "none" && (
        <div className="flex gap-2">
          <button
            onClick={() => { resetForms(); setPanelMode("join"); }}
            className="flex-1 rounded-xl border border-accent-primary/30 bg-accent-primary/10 px-3 py-2.5 text-sm font-semibold text-accent-secondary transition hover:bg-accent-primary/20"
          >
            🔍 Rejoindre une team
          </button>
          <button
            onClick={() => { resetForms(); setPanelMode("create"); }}
            className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
          >
            ✨ Créer une team
          </button>
        </div>
      )}

      {/* Panel Rejoindre */}
      {panelMode === "join" && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-tertiary">
            Rejoindre une team
          </p>

          {topTeams.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-tertiary">
                Sélectionnez une team publique (classées par points) :
              </p>
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {topTeams.map((row, i) => {
                  const isSelected = selectedTeamId === row.team.id;
                  return (
                    <button
                      key={row.team.id}
                      onClick={() => {
                        setSelectedTeamId(row.team.id);
                        setJoinNameInput(row.team.name);
                      }}
                      disabled={!row.team.isPublic}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                        !row.team.isPublic
                          ? "border-primary bg-input opacity-50 cursor-not-allowed"
                          : isSelected
                          ? "border-accent-primary/50 bg-accent-primary/15 ring-1 ring-accent-primary/30"
                          : "border-primary bg-input hover:bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="shrink-0 text-base">
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (
                              <span className="text-xs text-tertiary font-mono">#{i + 1}</span>
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-primary text-sm">
                              {row.team.emoji} {row.team.name}
                            </p>
                            <p className="text-[11px] text-tertiary">
                              {row.memberCount} membre{row.memberCount > 1 ? "s" : ""} · {row.solved} flag{row.solved > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${
                            row.team.isPublic
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                          }`}>
                            {row.team.isPublic ? "🌐" : "🔒"}
                          </span>
                          <span className="text-sm font-bold text-amber-300">{row.points} pts</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-primary bg-input px-4 py-3 text-sm text-tertiary">
              Aucune team disponible pour l'instant.
            </p>
          )}

          {/* Recherche par nom */}
          <div className="pt-2">
            <input
              value={joinNameInput}
              onChange={(e) => {
                setJoinNameInput(e.target.value);
                const match = topTeams.find(
                  (r) => r.team.name.toLowerCase() === e.target.value.toLowerCase()
                );
                setSelectedTeamId(match?.team.id ?? "");
              }}
              className={inputCls}
              placeholder="Ou entrer le nom exact de la team…"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { setPanelMode("none"); resetForms(); }}
              className="flex-1 rounded-xl border border-primary px-3 py-2 text-sm text-secondary transition hover:bg-input"
            >
              Annuler
            </button>
            <button
              onClick={handleJoin}
              disabled={submitting || !selectedTeamId}
              className="flex-1 rounded-xl bg-accent-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-secondary disabled:opacity-40"
            >
              {submitting ? "⏳ …" : "Rejoindre"}
            </button>
          </div>
        </div>
      )}

      {/* Panel Créer */}
      {panelMode === "create" && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-tertiary">
            Créer une team
          </p>

          <input
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            className={inputCls}
            placeholder="Nom de la team (2–30 caractères)"
            maxLength={30}
          />

          <div className="grid grid-cols-2 gap-2">
            {(["public", "private"] as VisibilityMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setCreateVisibility(v)}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition text-left ${
                  createVisibility === v
                    ? v === "public"
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                      : "border-amber-500/50 bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
                    : "border-primary bg-input text-tertiary hover:bg-card"
                }`}
              >
                <span className="block text-lg mb-0.5">{v === "public" ? "🌐" : "🔒"}</span>
                <span className="block">{v === "public" ? "Publique" : "Privée"}</span>
                <span className="block text-[11px] font-normal mt-0.5 opacity-75">
                  {v === "public" ? "Tout le monde peut rejoindre" : "Rejoindre via le profil seulement"}
                </span>
              </button>
            ))}
          </div>

          {error && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { setPanelMode("none"); resetForms(); }}
              className="flex-1 rounded-xl border border-primary px-3 py-2 text-sm text-secondary transition hover:bg-input"
            >
              Annuler
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting || !createName.trim()}
              className="flex-1 rounded-xl bg-accent-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-secondary disabled:opacity-40"
            >
              {submitting ? "⏳ …" : "Créer"}
            </button>
          </div>
        </div>
      )}
      {pendingConfirm && <ConfirmModal {...pendingConfirm} onCancel={closeConfirm} />}
    </div>
  );
}
