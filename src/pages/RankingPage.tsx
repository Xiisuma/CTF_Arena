
/**
 * RankingPage.tsx v3.1 — 100% API, zéro localStorage
 * - Brouillage des scores pendant phase scramble/grace
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useRanking } from "../features/ranking/useRanking";
import { useCTFState } from "../features/ctf/useCTFState";
import { ErrorMessage } from "../shared/ui/ErrorMessage";
import { EmptyState } from "../shared/ui/EmptyState";

const MEDALS: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };
type SortMode = "points" | "flags";

export default function RankingPage() {
  const [tab, setTab] = useState<"players" | "teams">("players");
  const [sortMode, setSortMode] = useState<SortMode>("points");
  const { ranking, teamRanking, status, error } = useRanking();
  const { phase } = useCTFState();
  const scrambled = phase === "scramble" || phase === "grace";

  const sortedPlayers = useMemo(() => {
    return [...ranking].sort((a, b) => {
      if (sortMode === "points")
        return b.points - a.points || a.username.localeCompare(b.username);
      return b.solved - a.solved || b.points - a.points;
    });
  }, [ranking, sortMode]);

  const sortedTeams = useMemo(() => {
    return [...teamRanking].sort((a, b) => {
      if (sortMode === "points")
        return b.points - a.points || a.team.name.localeCompare(b.team.name);
      return b.solved - a.solved || b.points - a.points;
    });
  }, [teamRanking, sortMode]);

  const SortSelector = () => (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-tertiary">
        Trier par :
      </span>
      <div className="flex rounded-xl bg-input p-1 gap-1">
        {(["points", "flags"] as SortMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              sortMode === mode
                ? "bg-accent-primary text-white shadow-md"
                : "text-tertiary hover:text-secondary"
            }`}
          >
            {mode === "points" ? "⭐ Points" : "🏴 Flags"}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-primary">🏆 Classement</h1>
        <p className="mt-1 text-sm text-tertiary">
          Classement des joueurs et des équipes.
        </p>
      </div>

      {scrambled && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm font-semibold text-amber-300">
          🔀 Classement brouillé — Phase finale en cours
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl bg-input p-1 w-fit gap-1">
          {(["players", "teams"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
                tab === t
                  ? "bg-accent-primary text-white shadow-md"
                  : "text-tertiary hover:text-secondary"
              }`}
            >
              {t === "players"
                ? "👤 Solo"
                : `👥 Teams (${teamRanking.length})`}
            </button>
          ))}
        </div>
        <SortSelector />
      </div>

      {error ? (
        <ErrorMessage message={error} />
      ) : status === "loading" ? (
        <div
          role="status"
          aria-live="polite"
          aria-label="Chargement du classement"
          className="flex items-center justify-center py-16"
        >
          <span className="text-2xl animate-spin" aria-hidden="true">⚙️</span>
        </div>
      ) : tab === "players" ? (
        <div
          aria-live="polite"
          aria-label="Classement des joueurs"
          className="overflow-hidden rounded-2xl border border-primary bg-card shadow-theme"
        >
          {sortedPlayers.length === 0 ? (
            <EmptyState
              icon="🏅"
              message="Aucun score pour le moment."
              hint="Les joueurs apparaîtront ici dès qu'ils auront soumis un flag."
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-primary">
                <tr>
                  <th className="px-4 py-3 text-left text-tertiary font-semibold">
                    Rang
                  </th>
                  <th className="px-4 py-3 text-left text-tertiary font-semibold">
                    Joueur
                  </th>
                  <th
                    className={`px-4 py-3 text-center font-semibold cursor-pointer select-none transition ${
                      sortMode === "flags"
                        ? "text-accent-primary"
                        : "text-tertiary hover:text-secondary"
                    }`}
                    onClick={() => setSortMode("flags")}
                  >
                    Flags {sortMode === "flags" && "▲"}
                  </th>
                  <th
                    className={`px-4 py-3 text-right font-semibold cursor-pointer select-none transition ${
                      sortMode === "points"
                        ? "text-accent-primary"
                        : "text-tertiary hover:text-secondary"
                    }`}
                    onClick={() => setSortMode("points")}
                  >
                    Points {sortMode === "points" && "▲"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {sortedPlayers.map((row, i) => (
                  <tr
                    key={`${row.username}-${i}`}
                    className={`transition ${
                      i === 0 ? "bg-amber-400/5" : "hover:bg-input"
                    }`}
                  >
                    <td className="px-4 py-3 text-lg">
                      {scrambled ? "🔀" : (MEDALS[i] ?? (
                        <span className="text-sm text-tertiary">#{i + 1}</span>
                      ))}
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary">
                      <Link to={`/profile/${row.username}`} className="hover:text-accent-primary transition">
                        {row.username}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center text-secondary">
                      {scrambled ? "?" : row.solved}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-300">
                      {scrambled ? "???" : row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div
          aria-live="polite"
          aria-label="Classement des équipes"
          className="overflow-hidden rounded-2xl border border-primary bg-card shadow-theme"
        >
          {sortedTeams.length === 0 ? (
            <EmptyState
              icon="🛡️"
              message="Aucune team créée pour le moment."
              hint="Les teams apparaîtront ici une fois constituées."
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-primary">
                <tr>
                  <th className="px-4 py-3 text-left text-tertiary font-semibold">Rang</th>
                  <th className="px-4 py-3 text-left text-tertiary font-semibold">Team</th>
                  <th className="px-4 py-3 text-center text-tertiary font-semibold">Membres</th>
                  <th
                    className={`px-4 py-3 text-center font-semibold cursor-pointer select-none transition ${
                      sortMode === "flags" ? "text-accent-primary" : "text-tertiary hover:text-secondary"
                    }`}
                    onClick={() => setSortMode("flags")}
                  >
                    Flags {sortMode === "flags" && "▲"}
                  </th>
                  <th className="px-4 py-3 text-center text-tertiary font-semibold">Créée le</th>
                  <th
                    className={`px-4 py-3 text-right font-semibold cursor-pointer select-none transition ${
                      sortMode === "points" ? "text-accent-primary" : "text-tertiary hover:text-secondary"
                    }`}
                    onClick={() => setSortMode("points")}
                  >
                    Points {sortMode === "points" && "▲"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {sortedTeams.map((row, i) => (
                  <tr
                    key={row.team.id}
                    className={`transition ${i === 0 ? "bg-amber-400/5" : "hover:bg-input"}`}
                  >
                    <td className="px-4 py-3 text-lg">
                      {scrambled ? "🔀" : (MEDALS[i] ?? <span className="text-sm text-tertiary">#{i + 1}</span>)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{row.team.emoji}</span>
                        <span className="font-semibold text-primary">{row.team.name}</span>
                        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${
                          row.team.isPublic
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                        }`}>
                          {row.team.isPublic ? "🌐 Public" : "🔒 Privé"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-secondary">{row.memberCount}</td>
                    <td className="px-4 py-3 text-center text-secondary">{scrambled ? "?" : row.solved}</td>
                    <td className="px-4 py-3 text-center text-tertiary text-xs">
                      {new Date(row.team.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-300">{scrambled ? "???" : row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

