
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getPublicProfile, type PublicProfile } from "../features/profile/publicProfileApi";
import { getRankProgress } from "../features/ranking/ranks";

const CATEGORY_COLORS: Record<string, string> = {
  Web:    "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Crypto: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  OSINT:  "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Pwn:    "bg-rose-500/20 text-rose-300 border-rose-500/30",
  Misc:   "bg-amber-500/20 text-amber-300 border-amber-500/30",
};
const DEFAULT_CAT_COLOR = "bg-input text-secondary border-primary";

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? DEFAULT_CAT_COLOR;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    getPublicProfile(username).then((p) => {
      if (!p) setNotFound(true);
      else setProfile(p);
      setLoading(false);
    });
  }, [username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-2xl animate-spin">⚙️</span>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-5xl">🕵️</p>
        <p className="text-xl font-black text-primary">Joueur introuvable</p>
        <p className="text-sm text-tertiary">Ce profil n'existe pas ou appartient à un admin.</p>
        <Link to="/ranking" className="mt-2 rounded-xl bg-accent-primary px-5 py-2 text-sm font-semibold text-white hover:bg-accent-secondary transition">
          Voir le classement
        </Link>
      </div>
    );
  }

  const { current: rank, next: nextRank, progress, flagsNeeded } = getRankProgress(profile.solved);
  const categoryEntries = Object.entries(profile.categoryProgress).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-primary bg-card p-6 shadow-theme">
        <div className="flex items-start gap-5">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-accent-primary/20 text-5xl border border-primary select-none">
            {profile.avatarEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-primary truncate">{profile.username}</h1>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-bold ${rank.textColor}`}>{rank.icon} {rank.label}</span>
              {profile.rank && (
                <span className="text-xs text-tertiary">· #{profile.rank} du classement</span>
              )}
              <span className="text-xs text-tertiary">· {profile.playMode === "multiplayer" ? "🛡️ Multiplayer" : "🎯 Solo"}</span>
            </div>
            {profile.bio && (
              <p className="mt-2 text-sm text-secondary leading-relaxed">{profile.bio}</p>
            )}
            <p className="mt-2 text-xs text-tertiary">Membre depuis {formatDate(profile.createdAt)}</p>
          </div>
        </div>

        {/* Barre de progression */}
        {nextRank && (
          <div className="mt-5">
            <div className="mb-1 flex justify-between text-[11px] text-tertiary">
              <span>{rank.icon} {rank.label}</span>
              <span>{progress}% · {flagsNeeded} flag{flagsNeeded > 1 ? "s" : ""} pour {nextRank.label}</span>
              <span>{nextRank.icon} {nextRank.label}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-input">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${rank.color}, ${nextRank.color})` }}
              />
            </div>
          </div>
        )}
        {!nextRank && (
          <p className={`mt-3 text-xs font-bold ${rank.textColor}`}>🎉 Rang maximum atteint !</p>
        )}

        {/* Stats */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-input border border-primary px-4 py-3 text-center">
            <p className="text-xl font-black text-amber-300">{profile.points}</p>
            <p className="text-xs text-tertiary mt-0.5">Points</p>
          </div>
          <div className="rounded-xl bg-input border border-primary px-4 py-3 text-center">
            <p className="text-xl font-black text-primary">{profile.solved}</p>
            <p className="text-xs text-tertiary mt-0.5">Flags</p>
          </div>
          <div className="rounded-xl bg-input border border-primary px-4 py-3 text-center">
            <p className="text-xl font-black text-violet-300">{profile.achievements.length}</p>
            <p className="text-xs text-tertiary mt-0.5">Succès</p>
          </div>
        </div>
      </div>

      {/* ── Succès ─────────────────────────────────────────────────────────── */}
      {profile.achievements.length > 0 && (
        <div className="rounded-2xl border border-primary bg-card p-5 shadow-theme">
          <h2 className="text-sm font-bold text-primary mb-3">🎖️ Succès débloqués</h2>
          <div className="flex flex-wrap gap-2">
            {profile.achievements.map((a) => (
              <div
                key={a.id}
                title={`${a.title} — ${formatDate(a.unlockedAt)}`}
                className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300"
              >
                <span>{a.icon}</span>
                <span>{a.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Progression par catégorie ────────────────────────────────────── */}
      {categoryEntries.length > 0 && (
        <div className="rounded-2xl border border-primary bg-card p-5 shadow-theme">
          <h2 className="text-sm font-bold text-primary mb-3">📂 Par catégorie</h2>
          <div className="flex flex-wrap gap-2">
            {categoryEntries.map(([cat, count]) => (
              <div
                key={cat}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${categoryColor(cat)}`}
              >
                <span>{cat}</span>
                <span className="opacity-70">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Derniers flags ──────────────────────────────────────────────────── */}
      {profile.recentFlags.length > 0 && (
        <div className="rounded-2xl border border-primary bg-card shadow-theme">
          <div className="border-b border-primary px-5 py-3">
            <h2 className="text-sm font-bold text-primary">🏅 Derniers flags</h2>
          </div>
          <div className="divide-y divide-[var(--border-primary)]">
            {profile.recentFlags.map((f) => (
              <div key={f.id} className="flex items-center gap-3 px-5 py-3">
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${categoryColor(f.category)}`}>
                  {f.category}
                </span>
                <span className="flex-1 min-w-0 text-sm text-primary truncate">{f.title}</span>
                <span className="shrink-0 text-sm font-bold text-amber-300">+{f.points}</span>
                <span className="shrink-0 text-xs text-tertiary">{formatDate(f.submittedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {profile.solved === 0 && (
        <div className="rounded-2xl border border-primary bg-card p-10 text-center">
          <p className="text-3xl mb-2">🏴</p>
          <p className="text-sm text-tertiary">Aucun flag résolu pour l'instant.</p>
        </div>
      )}
    </div>
  );
}

