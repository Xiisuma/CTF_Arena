
/**
 * renderMarkdown.ts
 *
 * Convertit un sous-ensemble Markdown (titres, gras, italique, listes, paragraphes)
 * en HTML Tailwind-friendly, puis sanitize le résultat avec DOMPurify pour
 * éliminer tout vecteur XSS avant injection via dangerouslySetInnerHTML.
 *
 * Règle : toute utilisation de dangerouslySetInnerHTML dans le projet DOIT
 * passer par cette fonction — jamais de HTML brut non sanitizé.
 */

import DOMPurify from "dompurify";

/**
 * Transforme le Markdown simplifié en HTML sanitizé.
 * @returns Chaîne HTML sûre à injecter via dangerouslySetInnerHTML.__html
 */
export function renderMarkdown(md: string): string {
  if (!md) return "";

  const raw = md
    // Échapper d'abord les caractères HTML du texte source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Titres
    .replace(/^## (.+)$/gm,  '<h2 class="text-base font-bold text-primary mt-3 mb-1">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-secondary mt-2 mb-1">$1</h3>')
    // Gras / italique
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-primary font-bold">$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em class="italic text-secondary">$1</em>')
    // Listes
    .replace(/^- (.+)$/gm, '<li class="text-sm text-secondary ml-4 list-disc">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul class="space-y-0.5 my-2">$&</ul>')
    // Paragraphes
    .replace(/\n{2,}/g, '</p><p class="text-sm text-tertiary mt-2">')
    .replace(/\n/g, "<br/>")
    .replace(/^(?!<[hup])(.+)$/gm, '<p class="text-sm text-tertiary">$1</p>');

  // Sanitization finale : supprime tout attribut ou balise non autorisé
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ["h2", "h3", "strong", "em", "ul", "li", "p", "br"],
    ALLOWED_ATTR: ["class"],
  });
}

