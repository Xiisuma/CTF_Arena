
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "violet" | "light" | "auto";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Thème réellement appliqué (résout "auto" → "violet" | "light") */
  resolvedTheme: "violet" | "light";
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = "ctf_arena_theme";

function getSystemTheme(): "violet" | "light" {
  if (typeof window === "undefined") return "violet";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "violet";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "auto") return saved;
    return "violet";
  });

  const [systemTheme, setSystemTheme] = useState<"violet" | "light">(getSystemTheme);

  // Écoute les changements du thème système
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "light" : "violet");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolvedTheme: "violet" | "light" =
    theme === "auto" ? systemTheme : theme;

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [theme, resolvedTheme]);

  const setTheme = (newTheme: Theme) => setThemeState(newTheme);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme doit etre utilise dans ThemeProvider");
  return context;
}
