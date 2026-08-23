
/**
 * ChronoContext.tsx
 *
 * Contexte partagé permettant à n'importe quel composant de savoir
 * si un chrono est actuellement en cours (challenge ouvert + chrono démarré).
 *
 * Utilisé par NotificationSystem pour retarder les popups pendant une énigme.
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface ChronoContextValue {
  /** true si un chrono tourne EN CE MOMENT (challenge ouvert et non pausé) */
  isChronoRunning: boolean;
  /** Appelé par HomePage quand un chrono démarre */
  setChronoRunning: (running: boolean) => void;
}

const ChronoContext = createContext<ChronoContextValue | null>(null);

export function ChronoProvider({ children }: { children: ReactNode }) {
  const [isChronoRunning, setIsChronoRunning] = useState(false);

  const setChronoRunning = useCallback((running: boolean) => {
    setIsChronoRunning(running);
  }, []);

  return (
    <ChronoContext.Provider value={{ isChronoRunning, setChronoRunning }}>
      {children}
    </ChronoContext.Provider>
  );
}

export function useChronoContext(): ChronoContextValue {
  const ctx = useContext(ChronoContext);
  if (!ctx) throw new Error("useChronoContext must be used within ChronoProvider");
  return ctx;
}
