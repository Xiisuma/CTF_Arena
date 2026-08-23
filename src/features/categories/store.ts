
/**
 * categories.ts v3.2
 * Les catégories sont chargées dynamiquement depuis l'API.
 * Ce fichier expose un store en mémoire + les catégories par défaut en fallback.
 */

import { apiFetch } from "../../infrastructure/api/client";
import type { CategoryInfo } from "../../types";

// ─── Catégories par défaut (fallback si API indisponible) ────────────────────

// Les catégories par défaut ont été supprimées (v4.2).
// Elles sont désormais importées via Paramètres → Import / Export
// à partir de archive/default_data.json.
export const DEFAULT_CATEGORIES: CategoryInfo[] = [];

// ─── Store en mémoire ─────────────────────────────────────────────────────────

let _categories: CategoryInfo[] = [...DEFAULT_CATEGORIES];

/** Retourne les catégories en mémoire (synchrone). */
export function getLocalCategories(): CategoryInfo[] {
  return _categories;
}

/** Met à jour le store en mémoire — appelé par db.ts après fetch. */
export function setCategories(cats: CategoryInfo[]): void {
  _categories = [...cats].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Alias CATEGORIES — proxy dynamique sur le store en mémoire.
 * Utilisé dans les composants qui ont besoin d'un accès synchrone
 * après que loadCategories() ait été appelé.
 */
export const CATEGORIES: CategoryInfo[] = new Proxy([] as CategoryInfo[], {
  get(_, prop) {
    const arr = _categories;
    if (prop === "length") return arr.length;
    if (prop === Symbol.iterator) return arr[Symbol.iterator].bind(arr);
    if (typeof prop === "string" && !isNaN(Number(prop))) return arr[Number(prop)];
    if (prop === "map") return arr.map.bind(arr);
    if (prop === "filter") return arr.filter.bind(arr);
    if (prop === "find") return arr.find.bind(arr);
    if (prop === "forEach") return arr.forEach.bind(arr);
    if (prop === "reduce") return arr.reduce.bind(arr);
    if (prop === "some") return arr.some.bind(arr);
    if (prop === "every") return arr.every.bind(arr);
    if (prop === "slice") return arr.slice.bind(arr);
    return (arr as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * Charge les catégories depuis l'API et met à jour le store.
 * À appeler dans App.tsx au montage (une seule fois).
 */
export async function loadCategories(): Promise<CategoryInfo[]> {
  try {
    const data = await apiFetch("get_categories", { method: "GET" });
    if (data.ok && Array.isArray(data.categories) && data.categories.length > 0) {
      const cats: CategoryInfo[] = (data.categories as Array<Record<string, unknown>>).map((c) => ({
        id: String(c.id),
        name: String(c.name),
        description: String(c.description ?? ""),
        descriptionMd: String(c.descriptionMd ?? ""),
        icon: String(c.icon ?? "🏴"),
        color: String(c.color ?? "#8b5cf6"),
        sortOrder: Number(c.sortOrder ?? 0),
      }));
      setCategories(cats);
      return cats;
    }
  } catch {
    // Fallback silencieux sur les catégories par défaut
  }
  return _categories;
}
