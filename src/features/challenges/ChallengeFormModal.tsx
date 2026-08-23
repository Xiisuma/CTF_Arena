
import { type ChangeEvent, useState } from "react";
import type { Challenge, DifficultyType } from "../../types";
import {
  getDifficulty,
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
  type ChallengeFormData,
} from "./challengeUtils";

export type { ChallengeFormData };

type FileEntry = { id: string; name: string; content: string; url?: string };

export function ChallengeFormModal({
  category,
  initial,
  onSave,
  onClose,
}: {
  category: string;
  initial?: Challenge;
  onSave: (data: ChallengeFormData, files: FileEntry[]) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ChallengeFormData>({
    title: initial?.title ?? "",
    points: initial?.points ?? 100,
    description: initial?.description ?? "",
    flag: "",
    difficultyMode: initial?.difficultyMode ?? "auto",
    difficulty: initial?.difficulty ?? "medium",
  });

  // Fichiers existants : content vide + url ; nouveaux uploads : content base64
  const [files, setFiles] = useState<FileEntry[]>(
    initial?.files?.map((f) => ({ id: f.id, name: f.name, content: "", url: f.url })) ?? []
  );

  const valid = form.title.trim() && form.flag.trim() && form.description.trim();
  const inputCls =
    "w-full rounded-xl border border-secondary bg-input px-4 py-2.5 text-primary outline-none focus:ring-2 focus:ring-accent-primary/40 text-sm";
  const autoCalc = getDifficulty(form.points, "auto");

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1] ?? "";
        setFiles((prev) => [
          ...prev,
          { id: crypto.randomUUID(), name: file.name, content: base64 },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-primary bg-card p-6 shadow-theme max-h-[90vh] overflow-y-auto">
        <h3 className="mb-5 text-xl font-bold text-primary">
          {initial ? "Modifier" : "Ajouter"} une énigme — {category}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
              Titre
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
              Points
            </label>
            <input
              type="number"
              min={1}
              value={form.points}
              onChange={(e) =>
                setForm((f) => ({ ...f, points: Number(e.target.value) }))
              }
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
              Difficulté
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, difficultyMode: "auto" }))}
                className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                  form.difficultyMode === "auto"
                    ? "border-accent-primary/50 bg-accent-primary/20 text-primary"
                    : "border-primary bg-input text-tertiary hover:bg-card"
                }`}
              >
                🤖 Auto ({DIFFICULTY_LABELS[autoCalc]})
              </button>
              {(["easy", "medium", "hard"] as DifficultyType[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, difficultyMode: d, difficulty: d }))
                  }
                  className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                    form.difficultyMode === d
                      ? DIFFICULTY_COLORS[d]
                      : "border-primary bg-input text-tertiary hover:bg-card"
                  }`}
                >
                  {DIFFICULTY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={4}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
              Flag {initial ? "(laisser vide pour conserver)" : ""}
            </label>
            <input
              value={form.flag}
              onChange={(e) => setForm((f) => ({ ...f, flag: e.target.value }))}
              className={inputCls}
              placeholder="CTF{...}"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
              Fichiers
            </label>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="text-xs text-tertiary"
            />
            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {files.map((f) => (
                  <span
                    key={f.id}
                    className="flex items-center gap-1 rounded-lg border border-primary bg-input px-2 py-1 text-xs text-secondary"
                  >
                    📎 {f.name}
                    <button
                      onClick={() =>
                        setFiles((prev) => prev.filter((x) => x.id !== f.id))
                      }
                      className="ml-1 text-rose-400 hover:text-rose-300"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-primary px-4 py-2 text-sm text-secondary transition hover:bg-input"
          >
            Annuler
          </button>
          <button
            onClick={() => valid && onSave(form, files)}
            disabled={!valid}
            className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-secondary disabled:opacity-40"
          >
            {initial ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </div>
    </div>
  );
}

