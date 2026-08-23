
import { useState } from "react";
import { CATEGORIES } from "../categories/store";
import {
  CONDITION_ICONS,
  CONDITION_LABELS,
  DEFAULT_ICONS,
  NO_VALUE_CONDITIONS,
} from "./achievementUtils";
import type { Achievement, AchievementConditionType } from "../../types";

interface FormState {
  title: string;
  description: string;
  icon: string;
  condition: AchievementConditionType;
  conditionValue: number;
  conditionCategory: string;
}

function buildInitialForm(initial: Achievement | null): FormState {
  return {
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    icon: initial?.icon ?? "🏆",
    condition: initial?.condition ?? "flags_count",
    conditionValue: initial?.conditionValue ?? 1,
    conditionCategory: initial?.conditionCategory ?? "",
  };
}

export function AchievementFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial: Achievement | null;
  onSave: (a: Achievement) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => buildInitialForm(initial));

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const valid = form.title.trim() && form.description.trim() && form.icon.trim();
  const inputCls =
    "w-full rounded-xl border border-secondary bg-input px-4 py-2 text-primary outline-none focus:ring-2 focus:ring-accent-primary/40";

  const handleSave = () => {
    if (!valid) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      title: form.title.trim(),
      description: form.description.trim(),
      icon: form.icon.trim(),
      condition: form.condition,
      conditionValue: form.conditionValue,
      conditionCategory:
        form.condition === "category_flags" ? form.conditionCategory : undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-primary bg-card p-6 shadow-theme">
        <h3 className="mb-5 text-xl font-bold text-primary">
          {initial ? "Modifier le succès" : "Nouveau succès"}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
              Icône
            </label>
            <div className="flex flex-wrap gap-2 rounded-xl border border-primary bg-input p-3">
              {DEFAULT_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => set("icon", emoji)}
                  className={`rounded-lg p-1.5 text-xl transition hover:bg-card ${
                    form.icon === emoji ? "bg-accent-primary/30 ring-2 ring-accent-primary" : ""
                  }`}
                >
                  {emoji}
                </button>
              ))}
              <input
                value={form.icon}
                onChange={(e) => set("icon", e.target.value)}
                className="w-16 rounded-lg border border-secondary bg-card px-2 py-1 text-center text-lg text-primary outline-none"
                placeholder="🏅"
                maxLength={4}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
              Titre
            </label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className={inputCls}
              placeholder="Ex : Premier Sang"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className={inputCls}
              placeholder="Ex : Résoudre le premier challenge du CTF"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
              Condition de déblocage
            </label>
            <select
              value={form.condition}
              onChange={(e) => set("condition", e.target.value as AchievementConditionType)}
              className={inputCls}
            >
              {(Object.keys(CONDITION_LABELS) as AchievementConditionType[]).map((key) => (
                <option key={key} value={key}>
                  {CONDITION_ICONS[key]} {CONDITION_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          {!NO_VALUE_CONDITIONS.includes(form.condition) && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                Seuil requis
              </label>
              <input
                type="number"
                min={1}
                value={form.conditionValue}
                onChange={(e) => set("conditionValue", Number(e.target.value))}
                className={inputCls}
              />
            </div>
          )}

          {form.condition === "category_flags" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                Catégorie ciblée
              </label>
              <select
                value={form.conditionCategory}
                onChange={(e) => set("conditionCategory", e.target.value)}
                className={inputCls}
              >
                <option value="">— Choisir —</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-primary px-4 py-2 text-sm text-secondary transition hover:bg-input"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!valid}
            className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-secondary disabled:opacity-40"
          >
            {initial ? "Enregistrer" : "Créer"}
          </button>
        </div>
      </div>
    </div>
  );
}

