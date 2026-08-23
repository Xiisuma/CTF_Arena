
import { useCallback, useEffect, useRef, useState } from "react";
import { getActivityLogs, LOG_CATEGORIES, type ActivityLogEntry, type LogCategory } from "./activityLogApi";
import { useWebSocket } from "../../shared/hooks/useWebSocket";

// ─── Métadonnées par type ─────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  register_success:     "Inscription réussie",
  register_fail:        "Inscription échouée",
  login_success:        "Connexion réussie",
  login_fail:           "Connexion échouée",
  logout:               "Déconnexion",
  flag_correct:         "Flag correct ✅",
  flag_wrong:           "Flag incorrect ❌",
  challenge_created:    "Challenge créé",
  challenge_updated:    "Challenge modifié",
  challenge_deleted:    "Challenge supprimé",
  achievement_unlocked: "Succès débloqué 🎖️",
  ctf_state_change:     "État CTF modifié ⚙️",
  team_join:            "Rejoint une team",
  team_leave:           "Quitté une team",
  team_kick:            "Membre expulsé",
  team_promote:         "Membre promu ⭐",
  team_demote:          "Membre rétrogradé",
  friend_request_sent:  "Demande d'ami envoyée",
  player_deleted:       "Joueur supprimé 🗑️",
  bonus_added:          "+pts bonus",
  malus_added:          "-pts malus",
  progress_reset:       "Progression réinitialisée",
};

const TYPE_BADGE: Record<string, string> = {
  register_success:     "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  login_success:        "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  flag_correct:         "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  achievement_unlocked: "bg-amber-400/20  text-amber-300  border-amber-400/30",
  team_join:            "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  team_promote:         "bg-sky-500/20    text-sky-300    border-sky-500/30",
  register_fail:        "bg-rose-500/20   text-rose-300   border-rose-500/30",
  login_fail:           "bg-rose-500/20   text-rose-300   border-rose-500/30",
  flag_wrong:           "bg-rose-500/20   text-rose-300   border-rose-500/30",
  challenge_created:    "bg-violet-500/20 text-violet-300 border-violet-500/30",
  challenge_updated:    "bg-violet-500/20 text-violet-300 border-violet-500/30",
  challenge_deleted:    "bg-rose-500/20   text-rose-300   border-rose-500/30",
  ctf_state_change:     "bg-orange-500/20 text-orange-300 border-orange-500/30",
  player_deleted:       "bg-rose-500/20   text-rose-300   border-rose-500/30",
  bonus_added:          "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  malus_added:          "bg-orange-500/20 text-orange-300 border-orange-500/30",
  team_kick:            "bg-orange-500/20 text-orange-300 border-orange-500/30",
  team_demote:          "bg-orange-500/20 text-orange-300 border-orange-500/30",
};
const DEFAULT_BADGE = "bg-blue-500/20 text-blue-300 border-blue-500/30";

function badgeCls(type: string) {
  return (TYPE_BADGE[type] ?? DEFAULT_BADGE) + " border rounded-full px-2 py-0.5 text-xs font-semibold shrink-0";
}

function formatTs(ts: string): string {
  return new Date(ts).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function dataToString(data: Record<string, unknown> | null): string {
  if (!data || Object.keys(data).length === 0) return "";
  return Object.entries(data)
    .map(([k, v]) => {
      if (k === "reason") {
        const reasons: Record<string, string> = {
          not_found: "utilisateur introuvable",
          wrong_password: "mot de passe incorrect",
          username_taken: "pseudo déjà utilisé",
          email_taken: "email déjà utilisé",
          validation: "données invalides",
        };
        return `raison: ${reasons[String(v)] ?? v}`;
      }
      return `${k}: ${v}`;
    })
    .join(" · ");
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function LogRow({ log }: { log: ActivityLogEntry }) {
  const detail = dataToString(log.data);
  return (
    <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-white/[.03] transition group">
      <span className="mt-0.5 text-xs text-tertiary whitespace-nowrap font-mono tabular-nums w-36 shrink-0">
        {formatTs(log.created_at)}
      </span>
      <span className={badgeCls(log.type)}>
        {TYPE_LABEL[log.type] ?? log.type}
      </span>
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-sm text-primary">
          {log.username ?? <span className="text-tertiary italic">inconnu</span>}
        </span>
        {detail && (
          <span className="ml-2 text-xs text-tertiary truncate">{detail}</span>
        )}
      </div>
    </div>
  );
}

// ─── Section principale ───────────────────────────────────────────────────────

const PAGE_SIZE = 100;
const CATEGORY_KEYS = Object.keys(LOG_CATEGORIES) as LogCategory[];

export function ActivityLogSection() {
  const [activeTab, setActiveTab] = useState<LogCategory>("all");
  const [search, setSearch]       = useState("");
  const [logs, setLogs]           = useState<ActivityLogEntry[]>([]);
  const [total, setTotal]         = useState(0);
  const [offset, setOffset]       = useState(0);
  const [loading, setLoading]     = useState(false);

  // Refs stables pour le callback WS
  const tabRef    = useRef(activeTab);  tabRef.current    = activeTab;
  const searchRef = useRef(search);     searchRef.current = search;
  const offsetRef = useRef(offset);     offsetRef.current = offset;

  const load = useCallback(async (
    tab: LogCategory, q: string, off: number, append = false
  ) => {
    setLoading(true);
    try {
      // Pour les catégories non "all", on filtre côté client sur les types
      // après récupération (la table n'a pas de colonne category).
      // On préfère un type="" pour récupérer tout et filtrer côté client.
      const result = await getActivityLogs({ limit: PAGE_SIZE, offset: off, q: q || undefined });
      let entries = result.logs;

      // Filtrage local par catégorie
      if (tab !== "all") {
        const allowed = new Set([...LOG_CATEGORIES[tab].types] as string[]);
        entries = entries.filter(l => allowed.has(l.type));
      }

      setLogs(prev => append ? [...prev, ...entries] : entries);
      setTotal(result.total);
      setOffset(off + result.logs.length); // offset = nb brut récupéré côté serveur
    } catch {
      // silencieux
    } finally {
      setLoading(false);
    }
  }, []);

  // Rechargement quand le tab ou la recherche change
  useEffect(() => {
    setOffset(0);
    load(activeTab, search, 0, false);
  }, [activeTab, search, load]);

  // Temps réel via WS
  useWebSocket((msg) => {
    if (msg.type === "activity_log") {
      load(tabRef.current, searchRef.current, 0, false);
    }
  });

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div>
        <h2 className="text-xl font-black text-primary">📋 Journal d'activité</h2>
        <p className="mt-1 text-sm text-tertiary">
          Audit complet en temps réel — {total.toLocaleString("fr-FR")} entrée{total !== 1 ? "s" : ""} au total
        </p>
      </div>

      {/* Onglets catégorie */}
      <div className="flex rounded-xl bg-input p-1 w-fit gap-1 flex-wrap">
        {CATEGORY_KEYS.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
              activeTab === cat
                ? "bg-accent-primary text-white shadow-md"
                : "text-tertiary hover:text-secondary"
            }`}
          >
            {LOG_CATEGORIES[cat].label}
          </button>
        ))}
      </div>

      {/* Barre de recherche */}
      <input
        type="text"
        placeholder="Rechercher un username…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm rounded-lg bg-input border border-white/10 px-3 py-2 text-sm text-primary placeholder:text-tertiary"
      />

      {/* Info fichier de log */}
      {activeTab !== "all" && (
        <p className="text-xs text-tertiary font-mono">
          📄 /var/log/ctf_arena/{activeTab}.log
        </p>
      )}
      {activeTab === "all" && (
        <p className="text-xs text-tertiary font-mono">
          📄 /var/log/ctf_arena/all.log · auth.log · gameplay.log · teams.log · social.log · admin.log
        </p>
      )}

      {/* Liste */}
      <div className="rounded-2xl border border-primary bg-card overflow-hidden">
        {logs.length === 0 && !loading ? (
          <p className="p-8 text-center text-tertiary text-sm">
            {search ? `Aucune entrée pour "${search}"` : "Aucune entrée dans cette catégorie."}
          </p>
        ) : (
          <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
            {logs.map(log => <LogRow key={log.id} log={log} />)}
            {loading && (
              <p className="px-4 py-3 text-center text-xs text-tertiary">Chargement…</p>
            )}
          </div>
        )}
      </div>

      {/* Charger plus */}
      {offsetRef.current < total && !loading && (
        <button
          onClick={() => load(activeTab, search, offsetRef.current, true)}
          className="w-full rounded-xl border border-primary py-2 text-sm text-tertiary hover:text-primary hover:bg-white/5 transition"
        >
          Charger plus
        </button>
      )}
    </div>
  );
}

