
// eslint.config.js — flat config (ESLint 9+)
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  // Base JS rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,

  // React Hooks + jsx-a11y rules for .tsx/.ts files
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // ─── React Hooks (non négociable) ─────────────────────────────────────
      // Hooks appelés uniquement au top-level, jamais dans une condition/boucle
      "react-hooks/rules-of-hooks": "error",
      // Dépendances manquantes ou superflues dans useEffect/useCallback/useMemo
      "react-hooks/exhaustive-deps": "error",
    },
  },

  // jsx-a11y rules for .tsx files
  {
    files: ["**/*.tsx"],
    plugins: { "jsx-a11y": jsxA11y },
    rules: {
      // ─── Accessibilité (WCAG 2.1 AA) ─────────────────────────────────────
      // Boutons/liens interactifs sans label accessible → error
      "jsx-a11y/interactive-supports-focus": "error",
      // Éléments cliquables non-interactifs sans rôle ARIA
      "jsx-a11y/no-static-element-interactions": "warn",
      // Clic sans événement clavier (nécessaire pour les non-souris)
      "jsx-a11y/click-events-have-key-events": "warn",
      // <img> sans alt
      "jsx-a11y/alt-text": "error",
      // <a> sans contenu ni aria-label
      "jsx-a11y/anchor-has-content": "error",
      // Attributs ARIA invalides
      "jsx-a11y/aria-props": "error",
      // Valeurs ARIA invalides
      "jsx-a11y/aria-proptypes": "error",
      // Rôles ARIA valides uniquement
      "jsx-a11y/aria-role": "error",
      // aria-* sur éléments qui ne les supportent pas
      "jsx-a11y/aria-unsupported-elements": "error",
      // Contrôle de formulaire associé à un label
      "jsx-a11y/label-has-associated-control": "error",
      // tabIndex positif (nuit à l'ordre de navigation)
      "jsx-a11y/tabindex-no-positive": "warn",

      // ─── TypeScript : relâché pour migration progressive ──────────────────
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  },

  // Global ignores
  {
    ignores: ["dist/**", "node_modules/**", "*.config.*"],
  }
);

