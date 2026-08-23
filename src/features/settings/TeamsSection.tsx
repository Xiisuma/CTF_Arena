
/**
 * TeamsSection.tsx — admin section for managing teams
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getTeams,
  getPlayersWithPoints,
  getTeamMembers,
  deleteTeam,
  kickTeamMember,
  promoteTeamMember,
  demoteTeamMember,
  addTeamMemberAdmin,
} from "../../db";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { ErrorMessage } from "../../shared/ui/ErrorMessage";
import { useConfirm } from "../../shared/hooks/useConfirm";
import { ROLE_COLORS, SearchBar } from "./settingsUtils";
import type { Team, TeamRole, PlayerWithPoints, TeamMemberWithStats } from "../../types";

export function TeamsSection() {
  const [search, setSearch] = useState("");
  const [openTeamId, setOpenTeamId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerWithPoints[]>([]);
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMemberWithStats[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { pendingConfirm, requestConfirm, closeConfirm } = useConfirm();
  const [membersKey, setMembersKey] = useState(0);
  const refreshMembers = useCallback(() => setMembersKey((k) => k + 1), []);

  const forceRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, p] = await Promise.all([getTeams(), getPlayersWithPoints()]);
      setTeams(t);
      setAllPlayers(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du chargement des teams");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    forceRefresh();
  }, [forceRefresh]);

  useEffect(() => {
    if (!openTeamId) return;
    getTeamMembers(openTeamId).then((members) => {
      setTeamMembers((prev) => ({ ...prev, [openTeamId]: members }));
    });
  }, [openTeamId, membersKey]);

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter((t) => t.name.toLowerCase().includes(q));
  }, [teams, search]);

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
      <SearchBar value={search} onChange={setSearch} placeholder="Rechercher une team…" />
      {teams.length === 0 && (
        <div className="rounded-2xl border border-primary bg-card p-6 text-sm text-tertiary text-center">
          Aucune team créée pour le moment.
        </div>
      )}

      <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: "60vh" }}>
        {filteredTeams.map((team) => {
          const opened = openTeamId === team.id;
          const members = teamMembers[team.id] ?? [];
          const memberIds = members.map((m) => m.id);

          return (
            <section key={team.id} className="overflow-hidden rounded-2xl border border-primary bg-card shadow-theme">
              <button
                onClick={() => setOpenTeamId(opened ? null : team.id)}
                className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-card-hover transition"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary/20 text-xl border border-primary">
                    {team.emoji}
                  </div>
                  <div>
                    <h2 className="font-bold text-primary">{team.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 border ${
                        team.isPublic
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                      }`}>
                        {team.isPublic ? "🌐 Publique" : "🔒 Privée"}
                      </span>
                      <span className="text-xs text-tertiary">{members.length} membre(s)</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      requestConfirm({
                        title: "Supprimer la team",
                        message: `Supprimer définitivement "${team.name}" ? Tous les membres seront retirés.`,
                        confirmLabel: "Supprimer",
                        danger: true,
                        onConfirm: async () => {
                          closeConfirm();
                          await deleteTeam("", team.id);
                          forceRefresh();
                        },
                      });
                    }}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-300 transition hover:bg-rose-500/20"
                  >
                    🗑️
                  </button>
                  <span className={`text-tertiary transition-transform duration-200 ${opened ? "rotate-180" : ""}`}>▼</span>
                </div>
              </button>

              {opened && (
                <div className="space-y-4 px-5 pb-5">
                  <h3 className="text-sm font-bold text-primary">👥 Membres</h3>
                  {members.length === 0 ? (
                    <p className="text-xs text-tertiary">Aucun membre.</p>
                  ) : (
                    <div className="space-y-2">
                      {members.map((member) => (
                        <div key={member.id} className="flex items-center gap-3 rounded-xl border border-primary bg-input px-4 py-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-primary text-xs font-bold text-white">
                            {member.username.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-primary truncate">{member.username}</p>
                            <p className="text-xs text-tertiary">{member.points} pts · {member.solved} flags</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={member.role}
                              onChange={async (e) => {
                                const newRole = e.target.value as TeamRole;
                                if (newRole === "admin") await promoteTeamMember("", member.id, team.id);
                                else if (newRole === "member") await demoteTeamMember("", member.id, team.id);
                                forceRefresh(); refreshMembers();
                              }}
                              className={`rounded-lg border px-2 py-1 text-xs font-semibold outline-none cursor-pointer transition ${ROLE_COLORS[member.role]}`}
                            >
                              <option value="member">👤 Membre</option>
                              <option value="admin">⭐ Admin</option>
                              <option value="owner">👑 Owner</option>
                            </select>
                            {member.role !== "owner" && (
                              <button
                                onClick={async () => { await kickTeamMember("", member.id, team.id); forceRefresh(); refreshMembers(); }}
                                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-300 transition hover:bg-rose-500/20"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Ajouter un joueur */}
                  <div className="rounded-2xl border border-primary bg-input p-4">
                    <h3 className="mb-3 text-sm font-bold text-primary">➕ Ajouter un joueur</h3>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {allPlayers
                        .filter((p) => !memberIds.includes(p.id))
                        .map((p) => (
                          <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-primary bg-card px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-primary text-xs font-bold text-white">
                                {p.username.slice(0, 1).toUpperCase()}
                              </div>
                              <span className="text-sm font-semibold text-primary">{p.username}</span>
                              <span className="text-xs text-tertiary">{p.points} pts</span>
                            </div>
                            <button
                              onClick={async () => { await addTeamMemberAdmin(team.id, p.id); forceRefresh(); refreshMembers(); }}
                              className="rounded-lg bg-accent-primary px-3 py-1 text-xs font-semibold text-white transition hover:bg-accent-secondary"
                            >
                              Ajouter
                            </button>
                          </div>
                        ))}
                      {allPlayers.filter((p) => !memberIds.includes(p.id)).length === 0 && (
                        <p className="text-xs text-tertiary">Aucun joueur disponible.</p>
                      )}
                    </div>
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

