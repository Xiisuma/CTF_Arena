/**
 * playerPreview.ts — aperçu de la vue joueur par un administrateur
 *
 * Bascule d'affichage uniquement : aucun droit serveur n'est accordé ni retiré.
 * L'API continue de voir un administrateur (et refuse toujours ses soumissions
 * de flags). Le choix est mémorisé dans le navigateur et partagé par toutes les
 * pages via un store externe, sans provider supplémentaire.
 */

import { useCallback, useSyncExternalStore } from "react";
import { useAuth, type AuthUser } from "./AuthContext";

const STORAGE_KEY = "ctf-player-preview";

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Un second onglet ouvert sur le même compte suit la même bascule.
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", notify);
  };
}

/** Lu à chaque rendu : le stockage reste la seule source de vérité. */
function getSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Aperçu désactivé hors navigateur (rendu serveur). */
function getServerSnapshot(): boolean {
  return false;
}

function setPreviewing(next: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Stockage indisponible : l'aperçu ne peut pas être mémorisé
  }
  notify();
}

/**
 * Bascule de l'aperçu joueur.
 * `available` n'est vrai que pour un administrateur : pour tous les autres
 * comptes, l'aperçu n'a aucun sens et reste inactif.
 */
export function usePlayerPreview(): {
  previewing: boolean;
  available: boolean;
  toggle: () => void;
} {
  const { user } = useAuth();
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const available = Boolean(user?.isAdmin);
  const toggle = useCallback(() => setPreviewing(!getSnapshot()), []);
  return { previewing: available && stored, available, toggle };
}

/**
 * Utilisateur à afficher : identique à celui de la session, sauf qu'un
 * administrateur en aperçu est présenté comme un joueur ordinaire.
 * À utiliser pour tout ce qui relève de l'affichage ; les vérifications de
 * droits réels continuent de passer par `useAuth().user`.
 */
export function useViewer(): AuthUser | null {
  const { user } = useAuth();
  const { previewing } = usePlayerPreview();
  if (!user) return null;
  if (!previewing) return user;
  return { ...user, isAdmin: false };
}
