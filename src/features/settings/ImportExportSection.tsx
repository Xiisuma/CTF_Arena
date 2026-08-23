
/**
 * ImportExportSection.tsx
 * Onglet admin "Import / Export" dans SettingsPage.
 * - Export : télécharge un JSON contenant catégories + challenges + achievements
 * - Import : upload d'un JSON, preview des compteurs, confirmation, résultat
 */

import { useRef, useState } from "react";
import {
  exportData,
  importData,
  parseArchiveFile,
  type ArchiveData,
  type ImportResult,
} from "./archive";

type ImportStep = "idle" | "preview" | "loading" | "success" | "error";

export function ImportExportSection() {
  // ── Export ─────────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await exportData();
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setExporting(false);
    }
  };

  // ── Import ─────────────────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>("idle");
  const [importing, setImporting] = useState(false);
  const [parsed, setParsed] = useState<ArchiveData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setParsed(null);
    setStep("idle");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = parseArchiveFile(evt.target?.result as string);
        setParsed(data);
        setStep("preview");
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Fichier invalide");
        setStep("error");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await importData(parsed);
      setResult(res);
      setStep("success");
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Erreur inconnue");
      setStep("error");
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep("idle");
    setParsed(null);
    setParseError(null);
    setImportError(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-lg font-bold text-primary">📦 Import / Export</h2>
        <p className="text-sm text-tertiary mt-1">
          Sauvegardez et restaurez les catégories, challenges, achievements et joueurs dans un
          fichier JSON. Stockez vos exports dans le dossier{" "}
          <code className="text-xs bg-input border border-primary rounded px-1.5 py-0.5 font-mono">
            archive/
          </code>{" "}
          à la racine du projet.
        </p>
      </div>

      {/* ── Section Export ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-primary bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-semibold text-primary">📥 Exporter les données</h3>
            <p className="text-xs text-tertiary mt-0.5">
              Génère un fichier JSON contenant toutes les catégories, challenges
              (avec flags) et achievements de la base de données.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="shrink-0 rounded-xl bg-accent-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-secondary disabled:opacity-60"
          >
            {exporting ? "Export en cours…" : "📥 Exporter"}
          </button>
        </div>

        {exportError && (
          <p className="text-xs text-rose-400 bg-rose-500/10 rounded-lg px-3 py-2">
            ❌ {exportError}
          </p>
        )}

        <div className="rounded-xl bg-input border border-primary px-4 py-3 text-xs text-tertiary space-y-1">
          <p>Le fichier exporté contiendra :</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Toutes les catégories (id, nom, icône, couleur, description)</li>
            <li>Tous les challenges (titre, points, flag en clair, description)</li>
            <li>Tous les achievements (id, titre, condition)</li>
            <li>Tous les joueurs (username, email, hash du mot de passe, mode de jeu)</li>
          </ul>
          <p className="text-rose-400/80 mt-2">
            ⚠️ Le fichier contient les flags en clair et les hashes de mots de passe — conservez-le en lieu sûr.
          </p>
        </div>
      </div>

      {/* ── Section Import ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-primary bg-card p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-primary">📤 Importer des données</h3>
          <p className="text-xs text-tertiary mt-0.5">
            Importez un fichier JSON exporté précédemment. Les catégories et achievements
            existants sont mis à jour. Les challenges déjà présents (même titre + catégorie)
            sont ignorés.
          </p>
        </div>

        {/* Succès */}
        {step === "success" && result && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-emerald-400">✅ Import réussi</p>
            <div className="flex gap-4 text-xs text-emerald-300/80 flex-wrap">
              <span>🗂️ {result.categories} catégorie{result.categories > 1 ? "s" : ""}</span>
              <span>🏴 {result.challenges} challenge{result.challenges > 1 ? "s" : ""}</span>
              <span>🏆 {result.achievements} achievement{result.achievements > 1 ? "s" : ""}</span>
              {result.players > 0 && (
                <span>👤 {result.players} joueur{result.players > 1 ? "s" : ""}</span>
              )}
            </div>
            <button onClick={reset} className="text-xs text-emerald-400/60 hover:text-emerald-400 mt-1 transition">
              Importer un autre fichier →
            </button>
          </div>
        )}

        {/* Erreur parse ou import */}
        {step === "error" && (parseError ?? importError) && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3">
            <p className="text-sm font-semibold text-rose-400">❌ Erreur</p>
            <p className="text-xs text-rose-300/80 mt-0.5">{parseError ?? importError}</p>
            <button onClick={reset} className="text-xs text-rose-400/60 hover:text-rose-400 mt-1 transition">
              Réessayer →
            </button>
          </div>
        )}

        {/* File input */}
        {step !== "success" && (
          <div>
            <label
              htmlFor="import-file"
              className="block text-xs font-medium text-secondary mb-1.5"
            >
              Fichier JSON à importer
            </label>
            <input
              id="import-file"
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="block w-full text-sm text-tertiary file:mr-3 file:rounded-lg file:border-0 file:bg-accent-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-accent-secondary cursor-pointer"
            />
          </div>
        )}

        {/* Preview */}
        {step === "preview" && parsed && (
          <div className="rounded-xl border border-accent-primary/30 bg-accent-primary/5 px-4 py-3 space-y-3">
            <p className="text-sm font-semibold text-primary">
              Aperçu du fichier
              {parsed.exportedAt && (
                <span className="text-xs font-normal text-tertiary ml-2">
                  exporté le {new Date(parsed.exportedAt).toLocaleDateString("fr-FR")}
                </span>
              )}
            </p>
            <div className="flex gap-4 text-xs text-secondary flex-wrap">
              <span className="flex items-center gap-1">
                🗂️ <strong>{parsed.categories.length}</strong> catégorie{parsed.categories.length > 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                🏴 <strong>{parsed.challenges.length}</strong> challenge{parsed.challenges.length > 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                🏆 <strong>{parsed.achievements.length}</strong> achievement{parsed.achievements.length > 1 ? "s" : ""}
              </span>
              {(parsed.players?.length ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  👤 <strong>{parsed.players!.length}</strong> joueur{parsed.players!.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-xs text-tertiary">
              Les catégories et achievements seront créés ou mis à jour. Les challenges
              déjà présents dans la base seront ignorés.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleImport}
                disabled={importing}
                className="rounded-lg bg-accent-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-accent-secondary disabled:opacity-60"
              >
                {importing ? "Import en cours…" : "✅ Confirmer l'import"}
              </button>
              <button
                onClick={reset}
                className="rounded-lg border border-primary bg-input px-4 py-2 text-xs text-secondary transition hover:bg-card"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Hint premier lancement */}
        <div className="rounded-xl bg-input border border-primary px-4 py-3 text-xs text-tertiary">
          💡 Premier lancement ? Importez{" "}
          <code className="font-mono bg-card border border-primary rounded px-1">
            archive/default_data.json
          </code>{" "}
          pour obtenir les 6 catégories par défaut.
        </div>
      </div>
    </div>
  );
}

