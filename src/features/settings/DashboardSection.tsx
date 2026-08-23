
/**
 * DashboardSection.tsx — admin live dashboard with stats, top players, charts
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES } from "../categories/store";
import { getPlayersWithPoints, getAllFlags, getChallenges } from "../../db";
import { ErrorMessage } from "../../shared/ui/ErrorMessage";
import type { PlayerWithPoints, FlagSubmission, Challenge } from "../../types";

export function DashboardSection() {
  const [players, setPlayers] = useState<PlayerWithPoints[]>([]);
  const [flags, setFlags] = useState<FlagSubmission[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [pl, fl, ch] = await Promise.all([
        getPlayersWithPoints(),
        getAllFlags(),
        getChallenges(),
      ]);
      setPlayers(pl);
      setFlags(fl);
      setChallenges(ch);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors du chargement du dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (autoRefresh) intervalRef.current = setInterval(loadData, 300000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, loadData]);

  const totalPlayers = players.length;
  const activePlayers = players.filter((p) => p.solved > 0).length;
  const totalFlags = flags.length;

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of flags) map[f.category] = (map[f.category] ?? 0) + 1;
    return Object.entries(map).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [flags]);

  const hardest = useMemo(() => {
    return challenges
      .map((c) => {
        const solves = flags.filter((f) => f.challengeId === c.id).length;
        const rate = totalPlayers > 0 ? Math.round((solves / totalPlayers) * 100) : 0;
        return { id: c.id, title: c.title, category: c.category, points: c.points, solves, rate };
      })
      .filter((c) => c.solves > 0)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 5);
  }, [challenges, flags, totalPlayers]);

  const handleExport = () => {
    const rows = [
      ["Username", "Points", "Flags résolus"],
      ...players.map((p) => [p.username, String(p.points), String(p.solved)]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `ctf_arena_export_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (error) return <ErrorMessage message={error} onRetry={loadData} />;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="text-2xl animate-spin">⚙️</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-primary">📊 Tableau de bord</h2>
          <p className="text-xs text-tertiary">
            Dernière mise à jour : {lastUpdate.toLocaleTimeString("fr-FR")}
            {autoRefresh && <span className="ml-2 text-emerald-400">● Live</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              autoRefresh
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-primary bg-input text-tertiary"
            }`}
          >
            {autoRefresh ? "⏸ Pause" : "▶ Live"}
          </button>
          <button onClick={loadData} className="rounded-xl border border-primary bg-input px-3 py-1.5 text-xs font-semibold text-secondary transition hover:bg-card">
            🔄 Actualiser
          </button>
          <button onClick={handleExport} className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/20">
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: "👤", label: "Joueurs inscrits",    value: totalPlayers,    sub: `${activePlayers} actifs`,          color: "border-violet-500/20" },
          { icon: "🏴", label: "Flags validés",       value: totalFlags,       sub: `${challenges.length} challenges`,  color: "border-emerald-500/20" },
          { icon: "🎯", label: "Taux participation",  value: `${totalPlayers > 0 ? Math.round((activePlayers / totalPlayers) * 100) : 0}%`, sub: "avec ≥1 flag", color: "border-amber-500/20" },
          { icon: "🗂️", label: "Catégories",          value: CATEGORIES.length, sub: `${challenges.length} challenges`, color: "border-sky-500/20" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border bg-card p-5 shadow-theme ${s.color}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-tertiary">{s.label}</p>
                <p className="mt-1 text-3xl font-black text-primary">{s.value}</p>
                {s.sub && <p className="mt-0.5 text-xs text-tertiary">{s.sub}</p>}
              </div>
              <span className="text-3xl">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Challenges difficiles */}
      {hardest.length > 0 && (
        <div className="rounded-2xl border border-primary bg-card p-5 shadow-theme">
          <h3 className="mb-4 text-sm font-bold text-primary">💀 Challenges les plus difficiles</h3>
          <div className="space-y-2">
            {hardest.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-primary bg-input px-4 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary truncate">{c.title}</p>
                  <p className="text-xs text-tertiary">{c.category} · {c.points} pts</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-rose-300">{c.rate}%</p>
                  <p className="text-xs text-tertiary">{c.solves}/{totalPlayers}</p>
                </div>
                <div className="w-20 h-2 rounded-full bg-input border border-primary overflow-hidden">
                  <div className="h-full rounded-full bg-rose-500" style={{ width: `${c.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top joueurs */}
      {players.length > 0 && (
        <div className="rounded-2xl border border-primary bg-card p-5 shadow-theme">
          <h3 className="mb-4 text-sm font-bold text-primary">🏆 Top joueurs</h3>
          <div className="space-y-2">
            {players.slice(0, 5).map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-primary bg-input px-4 py-2.5">
                <span className="text-lg w-6 text-center">{["🥇","🥈","🥉","4️⃣","5️⃣"][i]}</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-primary text-xs font-bold text-white">
                  {p.username.slice(0, 1).toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-semibold text-primary">{p.username}</span>
                <span className="text-sm font-bold text-accent-secondary">{p.points} pts</span>
                <span className="text-xs text-tertiary">{p.solved} flags</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flags par catégorie */}
      {byCategory.length > 0 && (
        <div className="rounded-2xl border border-primary bg-card p-5 shadow-theme">
          <h3 className="mb-4 text-sm font-bold text-primary">📈 Flags par catégorie</h3>
          <div className="space-y-2">
            {byCategory.map(({ label, value }) => {
              const cat = CATEGORIES.find((c) => c.id === label);
              const max = byCategory[0]?.value ?? 1;
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-6 text-center">{cat?.icon ?? "🗂️"}</span>
                  <span className="w-28 text-xs text-secondary truncate">{cat?.name ?? label}</span>
                  <div className="flex-1 h-2 rounded-full bg-input overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(value / max) * 100}%`, backgroundColor: cat?.color ?? "#8b5cf6" }}
                    />
                  </div>
                  <span className="text-xs font-bold text-amber-300 w-8 text-right">{value}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

