
import { useState } from "react";
import { setCTFState } from "../ctf/api";
import { useCTFState } from "../ctf/useCTFState";

const THEMES = [
  {
    id: "halloween",
    label: "Halloween CTF",
    emoji: "🎃",
    desc: "Ambiance sombre, orange et terrifiante",
    preview: "bg-orange-900/30 border-orange-600/40 text-orange-200",
  },
  {
    id: "noel",
    label: "Noël CTF",
    emoji: "🎄",
    desc: "Ambiance festive vert sapin et rouge",
    preview: "bg-green-900/30 border-green-600/40 text-green-200",
  },
  {
    id: "paques",
    label: "Pâques CTF",
    emoji: "🐣",
    desc: "Ambiance pastel violet et rose",
    preview: "bg-purple-900/30 border-purple-600/40 text-purple-200",
  },
] as const;

type ThemeId = (typeof THEMES)[number]["id"] | "";

export function ThematiqueSection() {
  const { ctfState, refresh } = useCTFState();
  const current = ctfState.eventTheme as ThemeId;
  const [saving, setSaving] = useState(false);

  async function applyTheme(id: ThemeId) {
    setSaving(true);
    await setCTFState("event_theme", id);
    await refresh();
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-primary">🎨 Thématique événementielle</h2>
        <p className="mt-1 text-sm text-tertiary">
          Change l'ambiance visuelle du CTF pour tous les joueurs en temps réel.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {THEMES.map((theme) => {
          const active = current === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => applyTheme(active ? "" : theme.id)}
              disabled={saving}
              className={`relative rounded-2xl border p-5 text-left transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${
                active
                  ? `${theme.preview} ring-2 ring-accent-primary shadow-lg`
                  : "border-primary bg-card hover:bg-card-hover"
              }`}
            >
              {active && (
                <span className="absolute right-3 top-3 rounded-full bg-accent-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Actif
                </span>
              )}
              <p className="text-4xl mb-3">{theme.emoji}</p>
              <p className="font-black text-primary">{theme.label}</p>
              <p className="mt-1 text-xs text-tertiary">{theme.desc}</p>
              <p className="mt-3 text-xs font-semibold text-accent-primary">
                {active ? "Cliquer pour désactiver" : "Cliquer pour activer"}
              </p>
            </button>
          );
        })}
      </div>

      {current && (
        <div className="flex items-center gap-3 rounded-xl border border-accent-primary/30 bg-accent-primary/10 px-4 py-3">
          <span className="text-xl">
            {THEMES.find((t) => t.id === current)?.emoji ?? "🎨"}
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary">
              Thème actif : {THEMES.find((t) => t.id === current)?.label}
            </p>
            <p className="text-xs text-tertiary">Visible par tous les joueurs connectés</p>
          </div>
          <button
            onClick={() => applyTheme("")}
            disabled={saving}
            className="rounded-lg border border-primary px-3 py-1.5 text-xs text-secondary transition hover:bg-input disabled:opacity-60"
          >
            Désactiver
          </button>
        </div>
      )}

      {!current && (
        <div className="rounded-xl border border-primary bg-input px-4 py-3 text-sm text-tertiary">
          Aucun thème actif — interface standard.
        </div>
      )}
    </div>
  );
}

