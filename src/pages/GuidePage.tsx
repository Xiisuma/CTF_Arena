
/**
 * GuidePage.tsx v3.1
 * - Catégories chargées depuis l'API (dynamiques)
 * - Rendu de descriptionMd (Markdown) pour chaque catégorie
 * - Accordéon pour les règles + section catégories enrichie
 */

import { useEffect, useState } from "react";
import { getCategories } from "../db";
import type { CategoryInfo } from "../types";
import { renderMarkdown } from "../shared/lib/renderMarkdown";

const RULES = [
  { id: "fair-play", icon: "🤝", title: "Fair-play & Intégrité", content: `La compétition repose entièrement sur l'honnêteté de chaque participant. Tout comportement visant à fausser les résultats est strictement interdit et entraîne une disqualification immédiate.` },
  { id: "no-sharing", icon: "🔇", title: "Divulgation de flags — STRICTEMENT INTERDIT", highlight: true, content: `Il est STRICTEMENT INTERDIT de divulguer, partager, communiquer ou transmettre un flag ou la réponse à une énigme par quelque moyen que ce soit.\n\nToute divulgation, même involontaire ou partielle, est considérée comme une triche et entraîne la disqualification définitive du ou des joueurs concernés.` },
  { id: "no-attack", icon: "🛡️", title: "Infrastructure & Autres joueurs", content: `Il est interdit d'attaquer, de perturber ou de tenter de compromettre l'infrastructure de la plateforme, les serveurs des challenges ou les comptes des autres participants.` },
  { id: "teamwork", icon: "👥", title: "Collaboration & Teams", content: `La collaboration au sein d'une même team est autorisée et encouragée. En revanche, l'entraide inter-teams ou la communication de solutions à des joueurs hors de votre team est assimilée à de la triche.` },
  { id: "accounts", icon: "🔑", title: "Comptes & Identité", content: `Chaque participant ne doit posséder qu'un seul compte. La création de comptes multiples pour gonfler un score, contourner une sanction ou toute autre raison est interdite.` },
  { id: "hints", icon: "💡", title: "Indices & Ressources externes", content: `L'utilisation de ressources publiques (documentation, tutoriels, outils open-source) est autorisée. Il est en revanche interdit d'utiliser des solutions de challenges identiques publiées en ligne.` },
  { id: "scoring", icon: "⭐", title: "Scores & Classement", content: `Les points sont attribués automatiquement à la validation d'un flag correct. Les administrateurs peuvent appliquer des bonus ou malus. Le classement est mis à jour en temps réel.` },
  { id: "decisions", icon: "⚖️", title: "Décisions des organisateurs", content: `Les décisions des organisateurs et administrateurs de la plateforme sont finales et sans appel. Tout comportement abusif envers l'équipe organisatrice entraîne une exclusion immédiate.` },
];

function CategoryCard({ cat }: { cat: CategoryInfo }) {
  const [expanded, setExpanded] = useState(false);
  const hasMd = Boolean(cat.descriptionMd?.trim());

  return (
    <div className={`overflow-hidden rounded-2xl border border-primary bg-card shadow-theme transition-all duration-200 ${expanded ? "md:col-span-2" : ""}`}>
      <button
        onClick={() => hasMd && setExpanded((v) => !v)}
        className={`flex w-full items-center gap-4 px-5 py-4 text-left transition ${hasMd ? "hover:bg-card-hover cursor-pointer" : "cursor-default"}`}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: cat.color + "22" }}>
          {cat.icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-primary">{cat.name}</p>
          <p className="mt-0.5 text-xs text-tertiary leading-relaxed line-clamp-2">{cat.description}</p>
          {hasMd && !expanded && (
            <p className="mt-1 text-[10px] text-accent-primary">📝 Cliquer pour plus de détails</p>
          )}
        </div>
        {hasMd && (
          <span className={`text-tertiary transition-transform duration-200 shrink-0 ${expanded ? "rotate-180" : ""}`}>▼</span>
        )}
      </button>

      {expanded && hasMd && (
        <div className="border-t border-primary px-5 pb-5 pt-3">
          <div
            className="prose-sm"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(cat.descriptionMd) }}
          />
        </div>
      )}
    </div>
  );
}

export default function GuidePage() {
  const [open, setOpen] = useState<string | null>("no-sharing");
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  useEffect(() => {
    getCategories().then((cats) => {
      setCategories(cats);
      setLoadingCats(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-primary">📜 Règles</h1>
        <p className="mt-1 text-sm text-tertiary">
          Lisez attentivement les règles avant de participer. Leur non-respect entraîne des sanctions pouvant aller jusqu'à la disqualification.
        </p>
      </div>

      <div className="space-y-3">
        {RULES.map((rule) => {
          const opened = open === rule.id;
          return (
            <article
              key={rule.id}
              className={`overflow-hidden rounded-2xl border transition-all duration-200 ${
                (rule as { highlight?: boolean }).highlight
                  ? opened ? "border-rose-500/50 bg-rose-500/5 shadow-lg" : "border-rose-500/30 bg-rose-500/5"
                  : "border-primary bg-card shadow-theme"
              }`}
            >
              <button
                aria-expanded={opened}
                className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-card-hover transition"
                onClick={() => setOpen(opened ? null : rule.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{rule.icon}</span>
                  <div>
                    <h2 className={`font-bold ${(rule as { highlight?: boolean }).highlight ? "text-rose-300" : "text-primary"}`}>
                      {rule.title}
                    </h2>
                    <p className="text-xs text-tertiary">{opened ? "Cliquez pour réduire" : "Cliquez pour afficher"}</p>
                  </div>
                </div>
                <span className={`transition-transform duration-200 ${opened ? "rotate-180" : ""} ${(rule as { highlight?: boolean }).highlight ? "text-rose-400" : "text-tertiary"}`} aria-hidden>▼</span>
              </button>
              {opened && (
                <div className="px-5 pb-5 pt-1">
                  <div className={`mb-3 h-1 w-12 rounded-full ${(rule as { highlight?: boolean }).highlight ? "bg-rose-500" : "bg-accent-primary"}`} />
                  <p className="whitespace-pre-line text-sm text-secondary leading-relaxed">{rule.content}</p>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div>
        <h2 className="mb-2 text-xl font-black text-primary">🗂️ Catégories de challenges</h2>
        <p className="mb-4 text-sm text-tertiary">
          {loadingCats
            ? "Chargement des catégories…"
            : `${categories.length} catégorie${categories.length > 1 ? "s" : ""} disponible${categories.length > 1 ? "s" : ""}. Cliquez sur une carte pour afficher la description complète.`}
        </p>

        {loadingCats ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-2xl animate-spin">⚙️</span>
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-2xl border border-primary bg-card p-8 text-center">
            <p className="text-sm text-tertiary">Aucune catégorie disponible.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {categories.map((cat) => (
              <CategoryCard key={cat.id} cat={cat} />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-primary bg-card px-5 py-4 text-center shadow-theme">
        <p className="text-xs text-tertiary">
          En participant au CTF Arena, vous acceptez l'intégralité de ces règles. Bonne chance à tous les participants ! 🏴
        </p>
      </div>
    </div>
  );
}
