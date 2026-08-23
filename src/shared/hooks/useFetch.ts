
import { useCallback, useEffect, useRef, useState } from "react";
import type { AsyncStatus } from "../../types";

export interface FetchState<T> {
  data: T;
  status: AsyncStatus;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook générique qui encapsule le cycle chargement/succès/erreur.
 *
 * Comportement :
 * - Premier fetch  → status passe à "loading" (spinner visible)
 * - Re-fetches suivants → les données se mettent à jour silencieusement
 *   (status reste "success", pas de flash de spinner)
 *
 * Le `fetcher` doit être stable (défini au niveau module ou mémoïsé avec
 * useCallback) — si son identité change, un nouveau fetch est déclenché.
 *
 * @param fetcher  Fonction async qui retourne la donnée.
 * @param initial  Valeur initiale avant le premier fetch.
 * @param options
 *   - enabled      (défaut true) — si false, aucun fetch n'est lancé.
 *   - errorMessage — message affiché en cas d'erreur.
 */
export function useFetch<T>(
  fetcher: () => Promise<T>,
  initial: T,
  options: {
    enabled?: boolean;
    errorMessage?: string;
  } = {}
): FetchState<T> {
  const { enabled = true, errorMessage = "Impossible de charger les données." } = options;

  const [data, setData] = useState<T>(initial);
  const [status, setStatus] = useState<AsyncStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Après le premier succès, les re-fetches sont silencieux (pas de spinner).
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    // Spinner uniquement sur le premier chargement
    if (!hasLoadedRef.current) setStatus("loading");
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
      setStatus("success");
      hasLoadedRef.current = true;
    } catch (e) {
      console.error("[useFetch]", e);
      setError(errorMessage);
      setStatus("error");
    }
  }, [fetcher, enabled, errorMessage]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, status, error, refresh };
}

