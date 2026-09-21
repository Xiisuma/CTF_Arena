import { useCallback, useEffect, useMemo, useState } from "react";
import { getFlagAttempts } from "./attemptsApi";
import { CATEGORIES } from "../categories/store";
import { ErrorMessage } from "../../shared/ui/ErrorMessage";
import type { FlagAttemptGroup } from "../../types";

function formatDate(iso: string): string {
  const d = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AttemptsSection() {
  const [groups, setGroups] = useState<FlagAttemptGroup[]>([]);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const data = await getFlagAttempts();
      setGroups(data);
      setSelected((prev) =>
        data.some((g) => g.challengeId === prev) ? prev : data[0]?.challengeId ?? ""
      );
      setStatus("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de charger vos essais.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = useMemo(
    () => groups.find((g) => g.challengeId === selected) ?? null,
    [groups, selected]
  );

  if (status === "error") return <ErrorMessage message={error ?? ""} onRetry={load} />;

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="text-2xl animate-spin">⚙️</span>
      </div>
    );
  }

  if (!groups.length) {
    return (
      <div className="rounded-2xl border border-primary bg-card p-10 text-center">
        <p className="text-3xl mb-2">🧪</p>
        <p className="text-sm text-tertiary">
          Aucun essai en cours. Les flags que vous tentez apparaissent ici tant que le
          challenge n'est pas résolu.
        </p>
      </div>
    );
  }

  const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-primary bg-card p-5 shadow-theme">
        <label
          htmlFor="attempts-challenge"
          className="mb-2 block text-xs font-semibold uppercase tracking-widest text-tertiary"
        >
          Challenge commencé
        </label>
        <select
          id="attempts-challenge"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-xl border border-secondary bg-input px-4 py-2.5 text-sm text-primary outline-none transition focus:ring-2 focus:ring-accent-primary/40"
        >
          {groups.map((g) => {
            const cat = categoryOf(g.category);
            return (
              <option key={g.challengeId} value={g.challengeId}>
                {cat ? `${cat.icon} ` : ""}
                {g.challengeTitle} — {g.attempts.length} essai
                {g.attempts.length > 1 ? "s" : ""}
              </option>
            );
          })}
        </select>
        <p className="mt-2 text-xs text-tertiary">
          Vous êtes seul à voir ces essais. Un challenge quitte cette liste dès que vous le
          résolvez.
        </p>
      </div>

      {current && (
        <section className="overflow-hidden rounded-2xl border border-primary bg-card shadow-theme">
          <div className="flex items-center gap-3 border-b border-primary px-5 py-3">
            <span className="text-xl">{categoryOf(current.category)?.icon ?? "🏴"}</span>
            <h3 className="font-bold text-primary">{current.challengeTitle}</h3>
            <span className="ml-auto text-xs text-tertiary">
              {current.attempts.length} essai{current.attempts.length > 1 ? "s" : ""}
            </span>
          </div>
          <ul className="divide-y divide-[var(--border-primary)]">
            {current.attempts.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
              >
                <code className="break-all rounded-lg bg-input px-2 py-1 text-sm text-secondary">
                  {a.flag}
                </code>
                <span className="text-xs text-tertiary">{formatDate(a.submittedAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
