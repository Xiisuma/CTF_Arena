
import { apiFetch } from "../../infrastructure/api/client";
import { setCategories } from "./store";
import { CategoryInfoSchema, validate, toRawArray } from "../../infrastructure/api/schemas";
import type { CategoryInfo } from "../../types";

function normalizeCategory(raw: Record<string, unknown>): CategoryInfo {
  const result: CategoryInfo = {
    id: String(raw.id),
    name: String(raw.name),
    description: String(raw.description ?? ""),
    descriptionMd: String(raw.descriptionMd ?? raw.description_md ?? ""),
    icon: String(raw.icon ?? "🏴"),
    color: String(raw.color ?? "#8b5cf6"),
    sortOrder: Number(raw.sortOrder ?? raw.sort_order ?? 0),
  };
  return validate(CategoryInfoSchema, result, "CategoryInfo");
}

export async function getCategories(): Promise<CategoryInfo[]> {
  const data = await apiFetch("get_categories", { method: "GET" });
  if (!data.ok || !Array.isArray(data.categories)) return [];
  const cats = toRawArray(data.categories).map(normalizeCategory);
  setCategories(cats);
  return cats;
}

export async function addCategory(category: {
  id: string; name: string; description: string;
  descriptionMd: string; icon: string; color: string;
}): Promise<{ ok: boolean; error?: string }> {
  const data = await apiFetch("add_category", { method: "POST", body: JSON.stringify(category) });
  if (!data.ok) return { ok: false, error: data.error as string };
  return { ok: true };
}

export async function updateCategory(category: {
  id: string; name: string; description: string;
  descriptionMd: string; icon: string; color: string;
}): Promise<{ ok: boolean; error?: string }> {
  const data = await apiFetch("update_category", { method: "POST", body: JSON.stringify(category) });
  if (!data.ok) return { ok: false, error: data.error as string };
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<{ ok: boolean; error?: string }> {
  const data = await apiFetch("delete_category", { method: "POST", body: JSON.stringify({ id }) });
  if (!data.ok) return { ok: false, error: data.error as string };
  return { ok: true };
}

export async function reorderCategories(order: string[]): Promise<boolean> {
  const data = await apiFetch("reorder_categories", { method: "POST", body: JSON.stringify({ order }) });
  return Boolean(data.ok);
}

