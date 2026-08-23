
/**
 * settingsUtils.tsx — shared constants and micro-components for SettingsPage sections
 */

import type { TeamRole } from "../../types";

// ─── Couleurs boutons ─────────────────────────────────────────────────────────

export const COLOR_MAP: Record<string, string> = {
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
  orange:  "border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20",
  amber:   "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20",
  rose:    "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
  sky:     "border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20",
  violet:  "border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20",
};

export const ROLE_COLORS: Record<TeamRole, string> = {
  owner:  "border-amber-500/30 bg-amber-500/10 text-amber-300",
  admin:  "border-violet-500/30 bg-violet-500/10 text-violet-300",
  member: "border-primary bg-input text-tertiary",
};

// ─── Shared components ────────────────────────────────────────────────────────

export function ActionButton({ label, color, onClick }: {
  label: string; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${COLOR_MAP[color] ?? ""}`}
    >
      {label}
    </button>
  );
}

export function SearchBar({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-sm">🔍</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Rechercher…"}
        className="w-full rounded-xl border border-secondary bg-input pl-9 pr-4 py-2.5 text-sm text-primary outline-none transition focus:ring-2 focus:ring-accent-primary/40"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary transition"
        >
          ✕
        </button>
      )}
    </div>
  );
}

