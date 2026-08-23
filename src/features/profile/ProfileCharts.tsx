
import { useEffect, useMemo, useState } from "react";
import { CATEGORIES } from "../categories/store";
import { getAllFlags } from "../challenges/api";
import { getRanking } from "../ranking/api";
import { formatMs } from "./profileUtils";
import type { FlagSubmission } from "../../types";

// ─── Shared UI ────────────────────────────────────────────────────────────────

export function StatCard({
  label, value, sub, color = "text-primary",
}: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-xl border border-primary bg-input p-4 text-center">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-accent-primary">{sub}</p>}
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-tertiary">
        {label}
      </p>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-xl border border-primary bg-input">
      <p className="text-xs text-tertiary">{label}</p>
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function PointsBarChart({ flags }: { flags: FlagSubmission[] }) {
  const W = 560, H = 160, PAD = { t: 10, r: 10, b: 30, l: 40 };
  const data = useMemo(() => {
    const map = new Map<string, number>();
    flags.forEach((f) => {
      const d = new Date(f.submittedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      map.set(key, (map.get(key) ?? 0) + f.points);
    });
    const days: { label: string; pts: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, pts: map.get(key) ?? 0 });
    }
    return days;
  }, [flags]);

  if (data.every((d) => d.pts === 0))
    return <EmptyChart label="Aucune donnée sur les 14 derniers jours" />;

  const maxPts = Math.max(...data.map((d) => d.pts), 1);
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const barW = Math.floor(innerW / data.length) - 3;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: "visible" }}>
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
        const y = PAD.t + innerH * (1 - frac);
        return (
          <g key={frac}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="var(--border-primary)" strokeWidth="1" />
            {frac > 0 && (
              <text x={PAD.l - 4} y={y + 4} textAnchor="end" fontSize="9" fill="var(--text-tertiary)">
                {Math.round(maxPts * frac)}
              </text>
            )}
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = PAD.l + i * (innerW / data.length) + 1.5;
        const barH = (d.pts / maxPts) * innerH;
        const y = PAD.t + innerH - barH;
        return (
          <g key={i}>
            <rect x={x} y={d.pts > 0 ? y : PAD.t + innerH - 2} width={barW}
              height={d.pts > 0 ? barH : 2} rx="3"
              fill={d.pts > 0 ? "var(--accent-primary)" : "var(--border-primary)"}
              opacity={d.pts > 0 ? 0.85 : 0.4} />
            {d.pts > 0 && (
              <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="9" fill="var(--accent-secondary)">
                {d.pts}
              </text>
            )}
            {i % 2 === 0 && (
              <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--text-tertiary)">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function RadarChart({ flags }: { flags: FlagSubmission[] }) {
  const cx = 130, cy = 115, r = 90;
  const n = CATEGORIES.length;
  const data = CATEGORIES.map((cat) => ({
    cat,
    pts: flags.filter((f) => f.category === cat.id).reduce((s, f) => s + f.points, 0),
  }));
  const maxPts = Math.max(...data.map((d) => d.pts), 1);

  function polarToXY(index: number, value: number): [number, number] {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2;
    return [cx + r * value * Math.cos(angle), cy + r * value * Math.sin(angle)];
  }

  const playerPoints = data.map((d, i) => polarToXY(i, d.pts / maxPts));
  const playerPath = playerPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + " Z";

  return (
    <svg viewBox="0 0 260 230" className="w-full max-w-[260px] mx-auto">
      {[0.25, 0.5, 0.75, 1].map((frac) => (
        <polygon key={frac}
          points={CATEGORIES.map((_, i) => polarToXY(i, frac).join(",")).join(" ")}
          fill="none" stroke="var(--border-primary)" strokeWidth="1" />
      ))}
      {CATEGORIES.map((_, i) => {
        const [x, y] = polarToXY(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border-primary)" strokeWidth="1" />;
      })}
      <path d={playerPath} fill="var(--accent-primary)" fillOpacity="0.25" stroke="var(--accent-primary)" strokeWidth="2" />
      {playerPoints.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" fill="var(--accent-primary)" />)}
      {CATEGORIES.map((cat, i) => {
        const [x, y] = polarToXY(i, 1.22);
        return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="var(--text-secondary)">{cat.icon}</text>;
      })}
    </svg>
  );
}

// ─── StatsContent ─────────────────────────────────────────────────────────────

export function StatsContent({ flags, userId }: { flags: FlagSubmission[]; userId: string }) {
  const [allFlags, setAllFlags] = useState<FlagSubmission[]>([]);
  const [ranking, setRanking] = useState<Array<{ username: string; points: number; solved: number }>>([]);

  useEffect(() => {
    Promise.all([getAllFlags(), getRanking()]).then(([af, r]) => {
      setAllFlags(af);
      setRanking(r);
    });
  }, []);

  const stats = useMemo(() => {
    const timedFlags = flags.filter((f) => f.solveTimeMs && f.solveTimeMs > 0);
    const avgTimeMs = timedFlags.length
      ? timedFlags.reduce((s, f) => s + f.solveTimeMs!, 0) / timedFlags.length
      : 0;
    const bestTime = [...timedFlags].sort((a, b) => (a.solveTimeMs ?? Infinity) - (b.solveTimeMs ?? Infinity))[0];
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const ptsThisWeek = flags
      .filter((f) => new Date(f.submittedAt).getTime() > weekAgo)
      .reduce((s, f) => s + f.points, 0);
    return { timedFlags, avgTimeMs, bestTime, ptsThisWeek };
  }, [flags]);

  const userPoints = flags.reduce((s, f) => s + f.points, 0);
  const playerIds = [...new Set(allFlags.map((f) => f.userId))];
  const nbPlayers = Math.max(playerIds.length, 1);
  const avgPts = playerIds.reduce((s, pid) =>
    s + allFlags.filter((f) => f.userId === pid).reduce((ss, f) => ss + f.points, 0), 0) / nbPlayers;
  const avgSolved = playerIds.reduce((s, pid) =>
    s + allFlags.filter((f) => f.userId === pid).length, 0) / nbPlayers;
  const userRankIndex = ranking.findIndex((r) =>
    allFlags.find((f) => f.userId === userId)?.username === r.username
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Cette semaine" value={`+${stats.ptsThisWeek}`} sub="points gagnés" color="text-accent-primary" />
        <StatCard label="Temps moyen"
          value={stats.avgTimeMs > 0 ? formatMs(stats.avgTimeMs) : "—"}
          sub={stats.timedFlags.length > 0 ? `sur ${stats.timedFlags.length} chronos` : undefined} />
        <StatCard label="Meilleur temps"
          value={stats.bestTime?.solveTimeMs ? formatMs(stats.bestTime.solveTimeMs) : "—"}
          sub={stats.bestTime ? stats.bestTime.challengeTitle.slice(0, 16) + (stats.bestTime.challengeTitle.length > 16 ? "…" : "") : undefined}
          color="text-emerald-300" />
      </div>

      <div className="rounded-2xl border border-primary bg-card p-5 shadow-theme">
        <h3 className="mb-4 text-sm font-bold text-primary">📈 Points (14 derniers jours)</h3>
        {flags.length === 0 ? <EmptyChart label="Aucun flag résolu" /> : <PointsBarChart flags={flags} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-primary bg-card p-5 shadow-theme">
          <h3 className="mb-3 text-sm font-bold text-primary">🕸️ Par catégorie</h3>
          {flags.length === 0 ? <EmptyChart label="Aucun flag résolu" /> : <RadarChart flags={flags} />}
        </div>
        <div className="rounded-2xl border border-primary bg-card p-5 shadow-theme">
          <h3 className="mb-3 text-sm font-bold text-primary">📊 Comparaison</h3>
          {ranking.length > 1 && (
            <div className="flex items-center gap-3 rounded-xl border border-primary bg-input px-4 py-2.5 mb-3">
              <span className="text-lg">
                {userRankIndex === 0 ? "🥇" : userRankIndex === 1 ? "🥈" : userRankIndex === 2 ? "🥉" : `#${userRankIndex + 1}`}
              </span>
              <div>
                <p className="text-sm font-bold text-primary">
                  {userRankIndex >= 0 ? `${userRankIndex + 1}ème sur ${ranking.length}` : "Non classé"}
                </p>
                <p className="text-xs text-tertiary">Classement global</p>
              </div>
            </div>
          )}
          {[
            { label: "Points", user: userPoints, avg: avgPts, unit: "pts" },
            { label: "Flags", user: flags.length, avg: avgSolved, unit: "" },
          ].map((row) => (
            <div key={row.label} className="grid grid-cols-3 items-center gap-2 rounded-xl border border-primary bg-input px-4 py-3 mb-2">
              <div className="text-center">
                <span className={`text-lg font-black ${row.user > row.avg ? "text-emerald-300" : row.user === row.avg ? "text-secondary" : "text-rose-300"}`}>
                  {Math.round(row.user)}{row.unit}
                </span>
              </div>
              <div className="text-center text-xs font-semibold text-tertiary">{row.label}</div>
              <div className="text-center">
                <span className="text-lg font-black text-tertiary">{Math.round(row.avg)}{row.unit}</span>
              </div>
            </div>
          ))}
          <div className="flex justify-between text-xs text-tertiary px-1">
            <span className="text-accent-primary font-semibold">Vous</span>
            <span>Moyenne</span>
          </div>
        </div>
      </div>
    </div>
  );
}

