
import { useRef, useState } from "react";
import { renderMarkdown } from "../../shared/lib/renderMarkdown";

// ─── Constants ────────────────────────────────────────────────────────────────

export const SUGGESTED_ICONS = [
  "🔍","🕵️","🔐","🌐","🔬","🎲","💻","🧩","🛡️","⚔️",
  "🔑","🗡️","🧠","💀","🤖","🔧","🎯","🚩","🏴","📡",
  "🧬","🔭","📱","🖥️","🕹️","🔒","🔓","⚡","🌍","🎖️",
];

export const SUGGESTED_COLORS = [
  "#3B82F6","#8B5CF6","#EF4444","#10B981","#14B8A6","#6B7280",
  "#F59E0B","#EC4899","#06B6D4","#84CC16","#F97316","#6366F1",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryFormState {
  id: string;
  name: string;
  description: string;
  descriptionMd: string;
  icon: string;
  color: string;
}

export const EMPTY_FORM: CategoryFormState = {
  id: "",
  name: "",
  description: "",
  descriptionMd: "",
  icon: "🏴",
  color: "#8b5cf6",
};

// ─── CategoryModal ────────────────────────────────────────────────────────────

export function CategoryModal({
  initial,
  isNew,
  onSave,
  onClose,
}: {
  initial: CategoryFormState;
  isNew: boolean;
  onSave: (data: CategoryFormState) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CategoryFormState>(initial);
  const [previewMd, setPreviewMd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const inputCls =
    "w-full rounded-xl border border-secondary bg-input px-4 py-2.5 text-primary outline-none focus:ring-2 focus:ring-accent-primary/40 text-sm";

  const isValid =
    form.name.trim().length >= 2 &&
    form.icon.trim().length > 0 &&
    /^#[0-9A-Fa-f]{6}$/.test(form.color);

  const isIdValid =
    !isNew ||
    (/^[A-ZÀ-Ÿa-z0-9_\-]+$/u.test(form.id.trim()) && form.id.trim().length >= 2);

  const handleSave = async () => {
    if (!isValid || !isIdValid) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setSaving(false);
    }
  };

  const insertMd = (snippet: string, placeholder: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = form.descriptionMd.slice(start, end) || placeholder;
    const before = form.descriptionMd.slice(0, start);
    const after = form.descriptionMd.slice(end);
    const inserted = snippet.replace("$1", selected);
    setForm((f) => ({ ...f, descriptionMd: before + inserted + after }));
    setTimeout(() => {
      ta.focus();
      const s = before.length + inserted.indexOf(selected);
      ta.setSelectionRange(s, s + selected.length);
    }, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-2xl flex-col rounded-2xl border border-primary bg-card shadow-theme max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-primary px-6 py-4">
          <h3 className="text-xl font-bold text-primary">
            {isNew ? "✨ Nouvelle catégorie" : `✏️ Modifier "${initial.name}"`}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg border border-primary px-3 py-1.5 text-xs text-tertiary hover:bg-input transition"
          >
            ✕ Fermer
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* ID (uniquement à la création) */}
          {isNew && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                Identifiant unique <span className="text-rose-400">*</span>
              </label>
              <input
                value={form.id}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    id: e.target.value.toUpperCase().replace(/[^A-ZÀ-Ÿ0-9_\-]/gi, ""),
                  }))
                }
                className={inputCls}
                placeholder="Ex: PWNING, REVERSE, CRYPTO2"
                maxLength={30}
              />
              <p className="mt-1 text-[11px] text-tertiary">
                Lettres, chiffres, _ et - uniquement.{" "}
                <strong>Non modifiable après création.</strong>
              </p>
            </div>
          )}

          {/* Nom */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
              Nom affiché <span className="text-rose-400">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputCls}
              placeholder="Ex: Reverse Engineering"
              maxLength={60}
            />
          </div>

          {/* Icône + Couleur */}
          <div className="grid grid-cols-2 gap-4">
            {/* Icône */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                Icône <span className="text-rose-400">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5 rounded-xl border border-primary bg-input p-3 mb-2">
                {SUGGESTED_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, icon: ic }))}
                    className={`rounded-lg p-1.5 text-xl transition hover:bg-card ${
                      form.icon === ic
                        ? "bg-accent-primary/30 ring-2 ring-accent-primary"
                        : ""
                    }`}
                    title={ic}
                  >
                    {ic}
                  </button>
                ))}
              </div>
              <input
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                className={inputCls}
                placeholder="Ou saisir un emoji…"
                maxLength={10}
              />
              <div className="mt-2 flex items-center gap-2">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl"
                  style={{ backgroundColor: form.color + "33" }}
                >
                  {form.icon}
                </div>
                <span className="text-sm text-secondary font-semibold">
                  {form.name || "Aperçu"}
                </span>
              </div>
            </div>

            {/* Couleur */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                Couleur <span className="text-rose-400">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5 rounded-xl border border-primary bg-input p-3 mb-2">
                {SUGGESTED_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={`h-7 w-7 rounded-lg transition hover:scale-110 ${
                      form.color === c
                        ? "ring-2 ring-white ring-offset-1 ring-offset-card"
                        : ""
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color: e.target.value }))
                  }
                  className="h-9 w-9 cursor-pointer rounded-lg border border-secondary bg-input p-0.5"
                />
                <input
                  value={form.color}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, color: e.target.value }))
                  }
                  className={inputCls}
                  placeholder="#8b5cf6"
                  maxLength={7}
                />
              </div>
              <p className="mt-1 text-[11px] text-tertiary">Format #RRGGBB</p>
            </div>
          </div>

          {/* Description courte */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
              Description courte (texte brut)
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={2}
              className={inputCls}
              placeholder="Affiché dans les cartes et la page Règles…"
              maxLength={500}
            />
            <p className="mt-1 text-[11px] text-tertiary">
              {form.description.length}/500 caractères
            </p>
          </div>

          {/* Description Markdown */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-tertiary">
                Description riche (Markdown)
              </label>
              <button
                type="button"
                onClick={() => setPreviewMd((v) => !v)}
                className={`rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                  previewMd
                    ? "border-accent-primary/50 bg-accent-primary/20 text-accent-primary"
                    : "border-primary bg-input text-tertiary hover:bg-card"
                }`}
              >
                {previewMd ? "✏️ Éditer" : "👁️ Aperçu"}
              </button>
            </div>

            {!previewMd && (
              <div className="mb-2 flex flex-wrap gap-1">
                {[
                  { label: "## H2",      action: () => insertMd("## $1", "Titre") },
                  { label: "### H3",     action: () => insertMd("### $1", "Sous-titre") },
                  { label: "**Gras**",   action: () => insertMd("**$1**", "texte") },
                  { label: "*Italique*", action: () => insertMd("*$1*", "texte") },
                  { label: "- Liste",    action: () => insertMd("- $1", "élément") },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={btn.action}
                    className="rounded-lg border border-primary bg-input px-2.5 py-1 text-xs font-mono text-secondary hover:bg-card transition"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            )}

            {previewMd ? (
              <div
                className="min-h-[120px] rounded-xl border border-primary bg-input px-4 py-3"
                dangerouslySetInnerHTML={{
                  __html:
                    renderMarkdown(form.descriptionMd) ||
                    '<p class="text-tertiary text-sm italic">Aucun contenu…</p>',
                }}
              />
            ) : (
              <textarea
                ref={textareaRef}
                value={form.descriptionMd}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descriptionMd: e.target.value }))
                }
                rows={6}
                className={`${inputCls} font-mono`}
                placeholder={`## ${form.name || "Titre"}\n\nDescription de la catégorie…\n\n- Point 1\n- Point 2`}
              />
            )}
            <p className="mt-1 text-[11px] text-tertiary">
              Supporte : ## titres, **gras**, *italique*, - listes
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-primary px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-primary px-4 py-2 text-sm text-secondary transition hover:bg-input"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isValid || !isIdValid}
            className="rounded-lg bg-accent-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-accent-secondary disabled:opacity-40"
          >
            {saving ? "⏳ Enregistrement…" : isNew ? "✨ Créer" : "💾 Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

