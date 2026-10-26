/**
 * HelpPage.tsx — la boîte à outils du joueur.
 *
 * Même esprit que la page Règles : des cartes lisibles, une ligne sur ce que
 * fait l'outil, une ligne sur le moment où y penser, et le lien.
 */

import { useMemo, useState } from "react";
import { TOOLS } from "../features/help/tools";

export default function HelpPage() {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const tags = useMemo(() => {
    const all = new Set<string>();
    for (const tool of TOOLS) for (const tag of tool.tags) all.add(tag);
    return [...all].sort((a, b) => a.localeCompare(b, "fr"));
  }, []);

  const visible = useMemo(
    () => (activeTag ? TOOLS.filter((t) => t.tags.includes(activeTag)) : TOOLS),
    [activeTag]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-primary">🧰 Aide</h1>
        <p className="mt-1 text-sm text-tertiary">
          Les outils qui servent le plus souvent pendant un CTF. Les utiliser est
          autorisé : ce sont des ressources publiques. Chercher la solution toute
          faite d'un challenge ne l'est pas.
        </p>
      </div>

      {/* Filtre par domaine */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTag(null)}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
            activeTag === null
              ? "bg-accent-primary text-white shadow-md"
              : "border border-primary bg-input text-tertiary hover:text-secondary"
          }`}
        >
          Tous
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag === activeTag ? null : tag)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              tag === activeTag
                ? "bg-accent-primary text-white shadow-md"
                : "border border-primary bg-input text-tertiary hover:text-secondary"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {visible.map((tool) => (
          <a
            key={tool.name}
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-3 rounded-2xl border border-primary bg-card p-5 shadow-theme transition hover:border-accent-primary/40 hover:bg-card-hover"
          >
            <div className="flex items-start gap-4">
              <tool.Logo />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-primary">
                  {tool.name}
                  <span className="ml-2 text-[10px] font-semibold text-tertiary group-hover:text-accent-primary">
                    ↗ {tool.host}
                  </span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-secondary">{tool.what}</p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-tertiary">
              <span className="font-semibold text-accent-primary">Quand ?</span>{" "}
              {tool.when}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {tool.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-primary bg-input px-2 py-0.5 text-[10px] font-semibold text-tertiary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </a>
        ))}
      </div>

      <div className="rounded-2xl border border-primary bg-card px-5 py-4 text-center shadow-theme">
        <p className="text-xs text-tertiary">
          Un outil manque à l'appel ? Signalez-le à l'organisateur, il sera ajouté
          à cette page. 🏴
        </p>
      </div>
    </div>
  );
}
