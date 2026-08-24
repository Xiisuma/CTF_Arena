
import { useEffect, useId, useRef, useState } from "react";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { useConfirm } from "../../shared/hooks/useConfirm";
import {
  createTeam,
  deleteTeam,
  getTeamMembers,
  getUserTeam,
  getUserTeamRole,
  joinTeam,
  leaveTeam,
  searchTeams,
} from "./api";
import { getRankProgress } from "../ranking/ranks";
import type { Team, TeamRole, TeamMemberWithStats } from "../../types";

const TEAM_EMOJIS = ["🛡️","⚔️","🔥","💎","🎯","🚀","🐉","🦅","🌟","💀","🤖","🔮","🏴","🦾","🧠","🌊","⚡","🎖️","🏆","👾"];

export function TeamSection({ userId }: { userId: string }) {
  const uid = useId();
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [myRole, setMyRole] = useState<TeamRole | null>(null);
  const [members, setMembers] = useState<TeamMemberWithStats[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPublic, setFilterPublic] = useState<"all" | "public" | "private">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", emoji: "🛡️", isPublic: true });
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const { pendingConfirm, requestConfirm, closeConfirm } = useConfirm();
  const forceRefresh = () => setRefresh((x) => x + 1);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const team = await getUserTeam(userId);
      setMyTeam(team);
      if (team) {
        const [role, mems] = await Promise.all([
          getUserTeamRole(userId, team.id),
          getTeamMembers(team.id),
        ]);
        setMyRole(role);
        setMembers(mems);
      } else {
        const filter = filterPublic === "all" ? undefined : filterPublic === "public" ? true : false;
        const teams = await searchTeams(searchQuery, filter);
        setAllTeams(teams);
      }
      setLoading(false);
    };
    load();
  }, [userId, refresh, searchQuery, filterPublic]);

  // Polling toutes les 15s — actualise les équipes en temps réel
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    pollRef.current = setInterval(() => forceRefresh(), 300000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="text-2xl animate-spin">⚙️</span>
      </div>
    );
  }

  if (myTeam) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-primary bg-card p-5 shadow-theme">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-primary/20 text-4xl border border-primary">
                {myTeam.emoji}
              </div>
              <div>
                <h2 className="text-xl font-black text-primary">{myTeam.name}</h2>
                {myTeam.description && <p className="mt-0.5 text-sm text-tertiary">{myTeam.description}</p>}
                <div className="mt-1.5 flex items-center gap-2">
                  <span className={`text-xs font-semibold rounded-full px-2 py-0.5 border ${
                    myTeam.isPublic ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  }`}>{myTeam.isPublic ? "🌐 Publique" : "🔒 Privée"}</span>
                  <span className="text-xs text-tertiary">{members.length} membre(s)</span>
                  <span className={`text-xs font-semibold rounded-full px-2 py-0.5 border ${
                    myRole === "owner" ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : myRole === "admin" ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                    : "border-primary bg-input text-tertiary"
                  }`}>{myRole === "owner" ? "👑 Owner" : myRole === "admin" ? "⭐ Admin" : "👤 Membre"}</span>
                </div>
              </div>
            </div>
            {myRole !== "owner" && (
              <button
                onClick={async () => {
                  requestConfirm({
                    title: "Quitter la team",
                    message: "Quitter cette team ? Vous pourrez en rejoindre une autre.",
                    confirmLabel: "Quitter",
                    danger: true,
                    onConfirm: async () => { closeConfirm(); await leaveTeam(userId); forceRefresh(); },
                  });
                }}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 transition hover:bg-rose-500/20"
              >
                Quitter
              </button>
            )}
            {myRole === "owner" && (
              <button
                onClick={async () => {
                  requestConfirm({
                    title: "Supprimer la team",
                    message: "Supprimer définitivement cette team ? Tous les membres seront retirés.",
                    confirmLabel: "Supprimer",
                    danger: true,
                    onConfirm: async () => { closeConfirm(); await deleteTeam(userId, myTeam.id); forceRefresh(); },
                  });
                }}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 transition hover:bg-rose-500/20"
              >
                🗑️ Supprimer
              </button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-primary bg-card shadow-theme">
          <div className="border-b border-primary px-5 py-3">
            <h3 className="text-sm font-bold text-primary">🏆 Classement de la team</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-primary">
              <tr>
                <th className="px-4 py-3 text-left text-tertiary font-semibold">Rang</th>
                <th className="px-4 py-3 text-left text-tertiary font-semibold">Joueur</th>
                <th className="px-4 py-3 text-center text-tertiary font-semibold">Flags</th>
                <th className="px-4 py-3 text-right text-tertiary font-semibold">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
              {members.map((member, i) => {
                const { current: memberRank } = getRankProgress(member.solved);
                const medals: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };
                const isMe = member.id === userId;
                return (
                  <tr key={member.id} className={`transition ${isMe ? "bg-accent-primary/5" : "hover:bg-input"}`}>
                    <td className="px-4 py-3 text-lg">{medals[i] ?? <span className="text-sm text-tertiary">#{i + 1}</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-primary text-xs font-bold text-white">
                          {member.username.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className={`font-semibold text-sm ${isMe ? "text-accent-primary" : "text-primary"}`}>
                              {member.username}
                            </span>
                            {member.role === "owner" && <span>👑</span>}
                            {member.role === "admin" && <span>⭐</span>}
                          </div>
                          <p className={`text-[10px] font-semibold ${memberRank.textColor}`}>
                            {memberRank.icon} {memberRank.label}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-secondary">{member.solved}</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-300">{member.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pendingConfirm && <ConfirmModal {...pendingConfirm} onCancel={closeConfirm} />}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <select
          value={filterPublic}
          onChange={(e) => setFilterPublic(e.target.value as "all" | "public" | "private")}
          className="rounded-xl border border-primary bg-card px-3 py-2.5 text-sm text-primary outline-none"
        >
          <option value="all">🔎 Toutes</option>
          <option value="public">🌐 Publiques</option>
          <option value="private">🔒 Privées</option>
        </select>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher une team…"
          className="flex-1 rounded-xl border border-secondary bg-input px-4 py-2.5 text-sm text-primary outline-none transition focus:ring-2 focus:ring-accent-primary/40"
        />
        <button
          onClick={() => setShowCreate(true)}
          className="shrink-0 rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-secondary"
        >
          + Créer
        </button>
      </div>

      <div className="space-y-3">
        {allTeams.length === 0 ? (
          <div className="rounded-2xl border border-primary bg-card p-10 text-center">
            <p className="text-3xl mb-2">🛡️</p>
            <p className="text-sm text-tertiary">Aucune team trouvée.</p>
          </div>
        ) : (
          allTeams.map((team) => (
            <div key={team.id} className="flex items-center gap-4 rounded-2xl border border-primary bg-card px-5 py-4 shadow-theme">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-primary/10 text-2xl border border-primary">
                {team.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-primary truncate">{team.name}</p>
                  <span className={`shrink-0 text-xs rounded-full px-2 py-0.5 border ${
                    team.isPublic ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  }`}>{team.isPublic ? "🌐" : "🔒"}</span>
                </div>
                {team.description && <p className="mt-0.5 text-xs text-tertiary truncate">{team.description}</p>}
              </div>
              {team.isPublic && (
                <button
                  onClick={async () => { await joinTeam(userId, team.id); forceRefresh(); }}
                  className="shrink-0 rounded-xl bg-accent-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-accent-secondary"
                >
                  Rejoindre
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-primary bg-card p-6 shadow-theme">
            <h3 className="mb-5 text-xl font-bold text-primary">Créer une team</h3>
            <div className="space-y-4">
              <div>
                <span id={`${uid}-emoji`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">Icône</span>
                <div
                  role="group"
                  aria-labelledby={`${uid}-emoji`}
                  className="flex flex-wrap gap-2 rounded-xl border border-primary bg-input p-3"
                >
                  {TEAM_EMOJIS.map((e) => (
                    <button key={e} type="button"
                      onClick={() => setCreateForm((f) => ({ ...f, emoji: e }))}
                      className={`rounded-lg p-1.5 text-xl transition hover:bg-card ${createForm.emoji === e ? "bg-accent-primary/30 ring-2 ring-accent-primary" : ""}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor={`${uid}-name`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">Nom</label>
                <input id={`${uid}-name`} value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-secondary bg-input px-4 py-2 text-primary outline-none focus:ring-2 focus:ring-accent-primary/40"
                  maxLength={40} />
              </div>
              <div>
                <label htmlFor={`${uid}-description`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">Description</label>
                <textarea id={`${uid}-description`} value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl border border-secondary bg-input px-4 py-2 text-primary outline-none focus:ring-2 focus:ring-accent-primary/40"
                  maxLength={200} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setCreateForm((f) => ({ ...f, isPublic: true }))}
                  className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${createForm.isPublic ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300" : "border-primary bg-input text-tertiary hover:bg-card"}`}>
                  🌐 Publique
                </button>
                <button type="button" onClick={() => setCreateForm((f) => ({ ...f, isPublic: false }))}
                  className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${!createForm.isPublic ? "border-amber-500/40 bg-amber-500/20 text-amber-300" : "border-primary bg-input text-tertiary hover:bg-card"}`}>
                  🔒 Privée
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="rounded-lg border border-primary px-4 py-2 text-sm text-secondary transition hover:bg-input">Annuler</button>
              <button
                onClick={async () => {
                  if (createForm.name.trim().length < 2) return;
                  await createTeam(userId, createForm.name, createForm.description, createForm.emoji, createForm.isPublic);
                  setShowCreate(false);
                  forceRefresh();
                }}
                disabled={createForm.name.trim().length < 2}
                className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-secondary disabled:opacity-40"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingConfirm && <ConfirmModal {...pendingConfirm} onCancel={closeConfirm} />}
    </div>
  );
}

