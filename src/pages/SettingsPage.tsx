
/**
 * SettingsPage.tsx v4.1 — tab state dans l'URL (?tab=players)
 */

import { useSearchParams } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import CategoriesSection from "../features/settings/CategoriesSection";
import { PlayersSection } from "../features/settings/PlayersSection";
import { TeamsSection } from "../features/settings/TeamsSection";
import { DashboardSection } from "../features/settings/DashboardSection";
import { ImportExportSection } from "../features/settings/ImportExportSection";
import { DeroulementSection } from "../features/settings/DeroulementSection";
import { ActivityLogSection } from "../features/settings/ActivityLogSection";
import { ThematiqueSection } from "../features/settings/ThematiqueSection";

type Tab = "players" | "teams" | "dashboard" | "categories" | "import-export" | "deroulement" | "journal" | "thematique";

const TABS: { id: Tab; label: string }[] = [
  { id: "players",    label: "👤 Joueurs" },
  { id: "teams",      label: "🛡️ Teams" },
  { id: "dashboard",  label: "📊 Dashboard" },
  { id: "categories",    label: "🗂️ Catégories" },
  { id: "import-export", label: "📦 Import / Export" },
  { id: "deroulement",   label: "⚙️ Déroulement" },
  { id: "journal",       label: "📋 Journal" },
  { id: "thematique",    label: "🎨 Thématique" },
];

const VALID_TABS = new Set<Tab>(TABS.map((t) => t.id));

export default function SettingsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get("tab") as Tab | null;
  const tab: Tab = rawTab && VALID_TABS.has(rawTab) ? rawTab : "players";

  const setTab = (next: Tab) =>
    setSearchParams((prev) => { prev.set("tab", next); return prev; });

  if (!user?.isAdmin) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-rose-200">
        Cette page est réservée à l'administrateur.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-primary">⚙️ Paramètres</h1>
        <p className="mt-1 text-sm text-tertiary">
          Administration complète : joueurs, teams, statistiques et catégories.
        </p>
      </div>

      <div className="flex rounded-xl bg-input p-1 w-fit gap-1 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? "bg-accent-primary text-white shadow-md"
                : "text-tertiary hover:text-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "players"    && <PlayersSection />}
      {tab === "teams"      && <TeamsSection />}
      {tab === "dashboard"  && <DashboardSection />}
      {tab === "categories"    && <CategoriesSection />}
      {tab === "import-export" && <ImportExportSection />}
      {tab === "deroulement"   && <DeroulementSection />}
      {tab === "journal"       && <ActivityLogSection />}
      {tab === "thematique"    && <ThematiqueSection />}
    </div>
  );
}

