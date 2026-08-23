
/**
 * CTFStateContext.tsx v3.1 — polling 5 min + bail-out sur état inchangé
 *
 * Polling toutes les POLL_MS millisecondes via get_ctf_state (endpoint public).
 *
 * Optimisation clé : applyState compare le nouvel état avec le précédent.
 * Si identique, le setState est annulé (React reçoit la même référence → pas
 * de re-render sur les consommateurs comme HomePage ou Layout).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getCTFState } from "./api";
import { useWebSocket } from "../../shared/hooks/useWebSocket";
import type { CTFState, CTFPhase } from "../../types";

/** Intervalle de polling (ms) */
const POLL_MS = 300000;

export function computePhase(state: CTFState): CTFPhase {
  if (!state.gameStarted) return "not_started";
  if (!state.scrambleStartedAt) return "running";
  const elapsed = (Date.now() - new Date(state.scrambleStartedAt).getTime()) / 1000;
  if (elapsed < 15 * 60) return "scramble";
  if (elapsed < 18 * 60) return "grace";
  return "ended";
}

export function phaseSecondsLeft(state: CTFState, phase: CTFPhase): number | null {
  if (!state.scrambleStartedAt) return null;
  const elapsed = (Date.now() - new Date(state.scrambleStartedAt).getTime()) / 1000;
  if (phase === "scramble") return Math.max(0, 15 * 60 - elapsed);
  if (phase === "grace")    return Math.max(0, 18 * 60 - elapsed);
  return null;
}

interface CTFStateContextValue {
  ctfState: CTFState;
  phase: CTFPhase;
  loading: boolean;
  refresh: () => Promise<void>;
}

const CTFStateContext = createContext<CTFStateContextValue | null>(null);

export function CTFStateProvider({ children }: { children: ReactNode }) {
  const [ctfState, setCTFStateLocal] = useState<CTFState>({
    gameStarted: false,
    scrambleStartedAt: "",
    podiumVisible: false,
    podiumRevealed: 0,
    eventTheme: '',
  });
  const [phase, setPhase] = useState<CTFPhase>("not_started");
  const [loading, setLoading] = useState(true);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Met à jour le state React depuis la réponse API.
   * Bail-out : si les valeurs sont identiques, setState est appelé avec
   * la même référence → React ne déclenche pas de re-render.
   */
  const applyState = useCallback((raw: Record<string, unknown>) => {
    const next: CTFState = {
      gameStarted:       Boolean(raw.gameStarted),
      scrambleStartedAt: String(raw.scrambleStartedAt ?? ""),
      podiumVisible:     Boolean(raw.podiumVisible),
      podiumRevealed:    Number(raw.podiumRevealed  ?? 0),
      eventTheme:        String(raw.eventTheme ?? ''),
    };
    const nextPhase = computePhase(next);

    // Bail-out si rien n'a changé — évite les re-renders inutiles
    // (toutes les 5s sinon, même si le CTF est en pause)
    setCTFStateLocal((prev) => {
      if (
        prev.gameStarted       === next.gameStarted &&
        prev.scrambleStartedAt === next.scrambleStartedAt &&
        prev.podiumVisible     === next.podiumVisible     &&
        prev.podiumRevealed    === next.podiumRevealed &&
        prev.eventTheme        === next.eventTheme
      ) {
        return prev; // même référence → React ne re-rend pas
      }
      return next;
    });
    // setPhase : React compare les primitives automatiquement (pas de re-render
    // si la valeur est identique — ex. "running" → "running")
    setPhase(nextPhase);
    setLoading(false);
  }, []);

  /** Refresh manuel (utilisé par DeroulementSection + polling) */
  const refresh = useCallback(async () => {
    const data = await getCTFState();
    applyState(data as unknown as Record<string, unknown>);
  }, [applyState]);

  // Rafraîchissement instantané quand PHP notifie un changement d'état CTF
  useWebSocket((msg) => {
    if (msg.type === "ctf_state") refresh();
  });

  // ── Polling simple ────────────────────────────────────────────────────────
  useEffect(() => {
    refresh().catch(() => {});
    pollRef.current = setInterval(() => { refresh().catch(() => {}); }, POLL_MS);
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [refresh]);

  // ── Tick local pendant scramble/grace (pas de requête réseau) ─────────────
  useEffect(() => {
    if (phase !== "scramble" && phase !== "grace") return;
    const t = setInterval(() => {
      setCTFStateLocal((s) => { setPhase(computePhase(s)); return s; });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  return (
    <CTFStateContext.Provider value={{ ctfState, phase, loading, refresh }}>
      {children}
    </CTFStateContext.Provider>
  );
}

export function useCTFState(): CTFStateContextValue {
  const ctx = useContext(CTFStateContext);
  if (!ctx) throw new Error("useCTFState must be used inside CTFStateProvider");
  return ctx;
}

