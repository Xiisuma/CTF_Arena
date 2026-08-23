
import { useTheme } from "./ThemeContext";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center gap-1 rounded-lg border border-primary bg-card p-1">
      <button
        onClick={() => setTheme("violet")}
        className={`rounded px-2 py-1 text-xs transition ${
          theme === "violet" ? "bg-accent-primary text-white" : "text-tertiary hover:text-secondary"
        }`}
        title="Thème Violet"
      >
        🟣
      </button>
      <button
        onClick={() => setTheme("light")}
        className={`rounded px-2 py-1 text-xs transition ${
          theme === "light" ? "bg-accent-primary text-white" : "text-tertiary hover:text-secondary"
        }`}
        title="Thème Clair"
      >
        ☀️
      </button>
      <button
        onClick={() => setTheme("auto")}
        className={`rounded px-2 py-1 text-xs font-semibold transition ${
          theme === "auto" ? "bg-accent-primary text-white" : "text-tertiary hover:text-secondary"
        }`}
        title="Thème Auto"
      >
        Auto
      </button>
    </div>
  );
}

