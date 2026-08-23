
import { apiFetch } from "../../infrastructure/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExportedCategory {
  id: string;
  name: string;
  description: string;
  descriptionMd: string;
  icon: string;
  color: string;
  sortOrder: number;
}

export interface ExportedChallenge {
  title: string;
  category: string;
  points: number;
  description: string;
  flag: string;
  difficulty: string;
  difficultyMode: string;
}

export interface ExportedAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: string;
  conditionValue: number;
  conditionCategory: string | null;
}

export interface ExportedPlayer {
  username: string;
  email: string | null;
  passwordHash: string;
  age: number | null;
  gender: "male" | "female" | "other" | null;
  playMode: "solo" | "multiplayer";
}

export interface ArchiveData {
  version: string;
  exportedAt: string;
  categories: ExportedCategory[];
  challenges: ExportedChallenge[];
  achievements: ExportedAchievement[];
  players?: ExportedPlayer[];
}

export interface ImportResult {
  categories: number;
  challenges: number;
  achievements: number;
  players: number;
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Déclenche le téléchargement du fichier JSON d'export.
 * L'API retourne directement le fichier en attachment.
 */
export async function exportData(): Promise<void> {
  const API_BASE = import.meta.env.VITE_API_URL ?? "/api.php";
  const res = await fetch(`${API_BASE}?action=export_data`, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Erreur lors de l'export");

  const blob = await res.blob();
  const filename =
    res.headers.get("Content-Disposition")?.match(/filename="?([^"]+)"?/)?.[1] ??
    `ctf_export_${new Date().toISOString().slice(0, 10)}.json`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Import ───────────────────────────────────────────────────────────────────

export async function importData(data: ArchiveData): Promise<ImportResult> {
  const result = await apiFetch("import_data", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!result.ok) throw new Error((result.error as string) ?? "Erreur lors de l'import");
  const imported = result.imported as ImportResult;
  return imported;
}

// ─── Parse ────────────────────────────────────────────────────────────────────

export function parseArchiveFile(json: string): ArchiveData {
  const data = JSON.parse(json) as unknown;
  if (
    typeof data !== "object" ||
    data === null ||
    !("version" in data) ||
    !Array.isArray((data as Record<string, unknown>).categories) ||
    !Array.isArray((data as Record<string, unknown>).challenges) ||
    !Array.isArray((data as Record<string, unknown>).achievements)
  ) {
    throw new Error("Format invalide : version, categories, challenges et achievements requis");
  }
  // players est optionnel (rétrocompatibilité avec les exports avant v1.1)
  return data as ArchiveData;
}

