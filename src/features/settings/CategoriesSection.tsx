
/**
 * CategoriesSection.tsx
 * Gestion des catégories pour SettingsPage.
 * - Lister / réordonner (drag-and-drop + boutons ▲▼)
 * - Ajouter / modifier / supprimer
 * CategoryModal is extracted to ./settings/CategoryModal.tsx
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { useConfirm } from "../../shared/hooks/useConfirm";
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from "../../db";
import type { CategoryInfo } from "../../types";
import {
  CategoryModal,
  type CategoryFormState,
  EMPTY_FORM,
} from "./CategoryModal";

export default function CategoriesSection() {
  const [categories, setLocalCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CategoryInfo | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const { pendingConfirm, requestConfirm, closeConfirm } = useConfirm();
  const dragId = useRef<string | null>(null);

  const forceRefresh = useCallback(() => setRefresh((x) => x + 1), []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const cats = await getCategories();
      setLocalCategories(cats);
      setLoading(false);
    };
    load();
  }, [refresh]);

  // ── Réordonnancement boutons ▲▼ ───────────────────────────────────────────

  const handleMove = useCallback(
    async (id: string, direction: "up" | "down") => {
      const idx = categories.findIndex((c) => c.id === id);
      if (idx === -1) return;
      if (direction === "up" && idx === 0) return;
      if (direction === "down" && idx === categories.length - 1) return;

      const newCats = [...categories];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      [newCats[idx], newCats[swapIdx]] = [newCats[swapIdx], newCats[idx]];
      setLocalCategories(newCats);
      await reorderCategories(newCats.map((c) => c.id));
    },
    [categories]
  );

  // ── Drag-and-drop ─────────────────────────────────────────────────────────

  const handleDragStart = (id: string) => {
    dragId.current = id;
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOver(id);
  };

  const handleDrop = async (targetId: string) => {
    setDragOver(null);
    const fromId = dragId.current;
    dragId.current = null;
    if (!fromId || fromId === targetId) return;

    const fromIdx = categories.findIndex((c) => c.id === fromId);
    const toIdx = categories.findIndex((c) => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;

    const newCats = [...categories];
    const [moved] = newCats.splice(fromIdx, 1);
    newCats.splice(toIdx, 0, moved);
    setLocalCategories(newCats);
    await reorderCategories(newCats.map((c) => c.id));
  };

  // ── Sauvegarde ─────────────────────────────────────────────────────────────

  const handleSave = useCallback(
    async (data: CategoryFormState) => {
      let result: { ok: boolean; error?: string };
      if (editing) {
        result = await updateCategory({ ...data, id: editing.id });
      } else {
        result = await addCategory(data);
      }
      if (!result.ok) throw new Error(result.error ?? "Erreur inconnue");
      setShowModal(false);
      setEditing(null);
      forceRefresh();
    },
    [editing, forceRefresh]
  );

  // ── Suppression ────────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    (cat: CategoryInfo) => {
      requestConfirm({
        title: "Supprimer la catégorie",
        message: `Supprimer "${cat.name}" ? Impossible si des challenges y sont associés.`,
        confirmLabel: "Supprimer",
        danger: true,
        onConfirm: async () => {
          closeConfirm();
          const result = await deleteCategory(cat.id);
          if (!result.ok) {
            // On ré-ouvre un confirm informatif en cas d'erreur
            requestConfirm({
              title: "Erreur",
              message: result.error ?? "Erreur lors de la suppression.",
              confirmLabel: "OK",
              onConfirm: closeConfirm,
            });
            return;
          }
          forceRefresh();
        },
      });
    },
    [requestConfirm, closeConfirm, forceRefresh]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="text-2xl animate-spin">⚙️</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-primary">🗂️ Catégories</h2>
          <p className="text-sm text-tertiary">
            {categories.length} catégorie{categories.length > 1 ? "s" : ""} ·
            Glissez pour réordonner
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-secondary"
        >
          + Nouvelle catégorie
        </button>
      </div>

      {/* Info */}
      <div className="rounded-xl border border-primary bg-input px-4 py-2.5 text-xs text-tertiary flex items-center gap-2">
        <span>↕️</span>
        <span>
          Glissez les lignes pour réordonner, ou utilisez les boutons ▲▼.
          La suppression est impossible si des challenges utilisent la catégorie.
        </span>
      </div>

      {/* Liste */}
      {categories.length === 0 ? (
        <div className="rounded-2xl border border-primary bg-card p-10 text-center">
          <p className="text-3xl mb-2">🗂️</p>
          <p className="text-sm text-tertiary">Aucune catégorie. Créez-en une !</p>
        </div>
      ) : (
        <div role="list" className="space-y-2">
          {categories.map((cat, i) => (
            <div
              key={cat.id}
              role="listitem"
              draggable
              onDragStart={() => handleDragStart(cat.id)}
              onDragOver={(e) => handleDragOver(e, cat.id)}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(cat.id)}
              className={`group flex items-center gap-4 rounded-2xl border px-5 py-4 shadow-theme cursor-grab active:cursor-grabbing transition-all ${
                dragOver === cat.id
                  ? "border-accent-primary/50 bg-accent-primary/10 scale-[1.01]"
                  : "border-primary bg-card hover:bg-card-hover"
              }`}
            >
              {/* Poignée drag */}
              <div className="text-tertiary opacity-30 group-hover:opacity-80 transition-opacity shrink-0 text-lg select-none">
                ⠿
              </div>

              {/* Numéro d'ordre */}
              <span className="text-xs font-mono text-tertiary shrink-0 w-4 text-center">
                {i + 1}
              </span>

              {/* Icône colorée */}
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                style={{ backgroundColor: cat.color + "33" }}
              >
                {cat.icon}
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-primary">{cat.name}</p>
                  <code className="rounded px-1.5 py-0.5 text-[10px] bg-input border border-primary text-tertiary font-mono">
                    {cat.id}
                  </code>
                  <div
                    className="h-3 w-3 rounded-full border border-primary/20"
                    style={{ backgroundColor: cat.color }}
                    title={cat.color}
                  />
                </div>
                <p className="mt-0.5 text-xs text-tertiary truncate">
                  {cat.description || (
                    <span className="italic opacity-60">Pas de description</span>
                  )}
                </p>
                {cat.descriptionMd && (
                  <p className="mt-0.5 text-[10px] text-accent-primary">
                    📝 Description Markdown configurée
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMove(cat.id, "up")}
                    disabled={i === 0}
                    className="rounded px-1.5 py-0.5 text-xs text-tertiary hover:bg-input disabled:opacity-20 transition"
                    title="Monter"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMove(cat.id, "down")}
                    disabled={i === categories.length - 1}
                    className="rounded px-1.5 py-0.5 text-xs text-tertiary hover:bg-input disabled:opacity-20 transition"
                    title="Descendre"
                  >
                    ▼
                  </button>
                </div>

                <button
                  onClick={() => {
                    setEditing(cat);
                    setShowModal(true);
                  }}
                  className="rounded-lg border border-primary bg-input px-3 py-1.5 text-xs text-secondary transition hover:bg-card"
                >
                  ✏️ Modifier
                </button>
                <button
                  onClick={() => handleDelete(cat)}
                  className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 transition hover:bg-rose-500/20"
                  title="Supprimer (impossible si des challenges y sont liés)"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <CategoryModal
          isNew={!editing}
          initial={
            editing
              ? {
                  id: editing.id,
                  name: editing.name,
                  description: editing.description,
                  descriptionMd: editing.descriptionMd,
                  icon: editing.icon,
                  color: editing.color,
                }
              : { ...EMPTY_FORM }
          }
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
          }}
        />
      )}
      {pendingConfirm && <ConfirmModal {...pendingConfirm} onCancel={closeConfirm} />}
    </div>
  );
}

