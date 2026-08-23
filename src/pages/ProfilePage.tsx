
/**
 * ProfilePage.tsx v4.0 — delegated to src/components/profile/
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getChallenges, getUserFlags } from "../features/challenges/api";
import { useAuth } from "../features/auth/AuthContext";
import { getRankProgress } from "../features/ranking/ranks";
import { StatCard, StatsContent } from "../features/profile/ProfileCharts";
import { FlagsSection } from "../features/profile/FlagsSection";
import { FriendsSection } from "../features/friends/FriendsSection";
import { TeamSection } from "../features/teams/TeamSection";
import { formatMs } from "../features/profile/profileUtils";
import { updateProfile } from "../features/profile/publicProfileApi";
import type { FlagSubmission } from "../types";

type ProfileTab = "flags" | "stats" | "friends" | "team" | "edit";
const PROFILE_TABS = new Set<ProfileTab>(["flags", "stats", "friends", "team", "edit"]);

export default function ProfilePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [flags, setFlags] = useState<FlagSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarEmoji, setAvatarEmoji] = useState(user?.avatarEmoji ?? "🎯");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);

  // Support legacy #friend-requests anchor for backwards compat
  useEffect(() => {
    if (window.location.hash === "#friend-requests" && !searchParams.get("tab")) {
      setSearchParams((prev) => { prev.set("tab", "friends"); return prev; }, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rawTab = searchParams.get("tab") as ProfileTab | null;
  const tab: ProfileTab = rawTab && PROFILE_TABS.has(rawTab) ? rawTab : "flags";

  const setTab = (next: ProfileTab) =>
    setSearchParams((prev) => { prev.set("tab", next); return prev; });

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([getUserFlags(user.id), getChallenges()]).then(([fl]) => {
      setFlags(fl);
      setLoading(false);
    });
  }, [user]);

  const headerStats = useMemo(() => {
    const timedFlags = flags.filter((f) => f.solveTimeMs && f.solveTimeMs > 0);
    const bestTime = [...timedFlags].sort((a, b) => (a.solveTimeMs ?? Infinity) - (b.solveTimeMs ?? Infinity))[0];
    return {
      totalPoints: flags.reduce((s, f) => s + f.points, 0),
      bestTime,
      categories: new Set(flags.map((f) => f.category)).size,
    };
  }, [flags]);

  const { current: rank, next: nextRank, progress, flagsNeeded } = getRankProgress(flags.length);

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-2xl animate-spin">⚙️</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header profil */}
      <div className="rounded-2xl border border-primary bg-card p-6 shadow-theme">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-primary text-2xl font-black text-white shadow-lg">
            {user.username.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black text-primary">{user.username}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className={`text-sm font-bold ${rank.textColor}`}>
                {rank.icon} {rank.label}
              </span>
              {user.isAdmin && (
                <span className="text-xs text-tertiary">· Administrateur</span>
              )}
            </div>
          </div>
        </div>

        {!user.isAdmin && nextRank && (
          <div className="mt-5">
            <div className="mb-1 flex justify-between text-[11px] text-tertiary">
              <span>{rank.icon} {rank.label}</span>
              <span>{progress}% · {flagsNeeded} flag{flagsNeeded > 1 ? "s" : ""} pour {nextRank.label}</span>
              <span>{nextRank.icon} {nextRank.label}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-input">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${rank.color}, ${nextRank.color})`,
                }}
              />
            </div>
          </div>
        )}
        {!user.isAdmin && !nextRank && (
          <p className={`mt-3 text-xs font-bold ${rank.textColor}`}>
            🎉 Rang maximum atteint !
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Points" value={headerStats.totalPoints} color="text-amber-300" />
          <StatCard label="Flags trouvés" value={flags.length} />
          <StatCard label="Catégories" value={headerStats.categories} />
          <StatCard
            label="Meilleur temps"
            value={headerStats.bestTime?.solveTimeMs ? formatMs(headerStats.bestTime.solveTimeMs) : "—"}
            color="text-emerald-300"
          />
        </div>
      </div>

      {/* Onglets */}
      <div className="flex rounded-xl bg-input p-1 w-fit flex-wrap gap-1">
        {(["flags", "stats", "friends", "team", "edit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === t ? "bg-accent-primary text-white shadow-md" : "text-tertiary hover:text-secondary"
            }`}
          >
            {t === "flags" ? "🏅 Mes Flags" : t === "stats" ? "📊 Mes Stats" : t === "friends" ? "👥 Amis" : t === "team" ? "🛡️ Ma Team" : "✏️ Mon Profil"}
          </button>
        ))}
      </div>

      {tab === "flags" && <FlagsSection flags={flags} />}
      {tab === "stats" && <StatsContent flags={flags} userId={user.id} />}
      {tab === "friends" && <FriendsSection userId={user.id} />}
      {tab === "team" && !user.isAdmin && <TeamSection userId={user.id} />}
      {tab === "edit" && (
        <EditProfileSection
          avatarEmoji={avatarEmoji}
          setAvatarEmoji={setAvatarEmoji}
          bio={bio}
          setBio={setBio}
          saving={saving}
          saveOk={saveOk}
          onSave={async () => {
            setSaving(true); setSaveOk(false);
            await updateProfile(avatarEmoji, bio);
            setSaving(false); setSaveOk(true);
            setTimeout(() => setSaveOk(false), 2500);
          }}
        />
      )}
      {tab === "team" && user.isAdmin && (
        <div className="rounded-2xl border border-primary bg-card p-6 text-center">
          <p className="text-sm text-tertiary">
            Les administrateurs ne peuvent pas rejoindre une team.
          </p>
        </div>
      )}
    </div>
  );
}


// ─── EditProfileSection ───────────────────────────────────────────────────────

const AVATAR_EMOJIS = ["🎯","🏴","⚔️","🔥","💎","🚀","🐉","🦅","🌟","💀","🤖","🔮","🦾","🧠","🌊","⚡","🎖️","🏆","👾","🕵️","🐺","🦁","🐼","🐸","🎃","🌈","🎸","🎮","🧩","🎲"];

interface EditProfileProps {
  avatarEmoji: string;
  setAvatarEmoji: (e: string) => void;
  bio: string;
  setBio: (b: string) => void;
  saving: boolean;
  saveOk: boolean;
  onSave: () => void;
}

function EditProfileSection({ avatarEmoji, setAvatarEmoji, bio, setBio, saving, saveOk, onSave }: EditProfileProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary bg-card p-5 shadow-theme">
        <h2 className="text-base font-black text-primary mb-4">✏️ Modifier mon profil</h2>

        {/* Avatar picker */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-tertiary">
            Avatar
          </label>
          <div className="flex flex-wrap gap-2 rounded-xl border border-primary bg-input p-3">
            {AVATAR_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setAvatarEmoji(e)}
                className={`rounded-lg p-1.5 text-2xl transition hover:bg-card ${avatarEmoji === e ? "bg-accent-primary/30 ring-2 ring-accent-primary" : ""}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className="mb-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-tertiary">
            Biographie <span className="normal-case font-normal">({bio.length}/200)</span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 200))}
            rows={3}
            placeholder="Quelques mots sur toi…"
            className="w-full rounded-xl border border-secondary bg-input px-4 py-2.5 text-sm text-primary placeholder:text-tertiary outline-none focus:ring-2 focus:ring-accent-primary/40 resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-xl bg-accent-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent-primary/20 transition hover:bg-accent-secondary disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Enregistrement…
              </span>
            ) : "Enregistrer"}
          </button>
          {saveOk && (
            <span className="text-sm text-emerald-400 font-semibold">✓ Profil mis à jour !</span>
          )}
        </div>
      </div>

      {/* Aperçu */}
      <div className="rounded-2xl border border-primary bg-card p-5 shadow-theme">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-tertiary mb-3">Aperçu</h3>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent-primary/20 text-4xl border border-primary">
            {avatarEmoji}
          </div>
          <div>
            <p className="font-black text-primary text-lg">Ton pseudo</p>
            {bio ? <p className="text-sm text-secondary mt-0.5">{bio}</p> : <p className="text-sm text-tertiary italic mt-0.5">Aucune biographie</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

