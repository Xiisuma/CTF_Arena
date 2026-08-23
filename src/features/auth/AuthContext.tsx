
/**
 * AuthContext.tsx v3.0
 * - Admin : ALPHATEN (identifiant chiffré côté serveur)
 * - Zéro localStorage — sessions PHP HttpOnly
 * - CSRF token stocké en mémoire + synchronisé avec db.ts
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { setCsrfToken } from "../../db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  age: number | null;
  gender: "male" | "female" | "other" | null;
  playMode: 'solo' | 'multiplayer';
  isAdmin: boolean;
  avatarEmoji: string;
  bio: string;
  // password n'est jamais renvoyé par l'API — ne pas l'inclure dans le type client
  createdAt: string;
}

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  age: number;
  gender: "male" | "female" | "other";
  playMode: 'solo' | 'multiplayer';
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<string | null>;
  register: (payload: RegisterPayload) => Promise<string | null>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (token: string, password: string) => Promise<string | null>;
  validateResetToken: (token: string) => Promise<boolean>;
}

// ─── URL de base ──────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? "/api.php";

// ─── Helper fetch ─────────────────────────────────────────────────────────────

let _csrfMem: string | null = null;

async function apiFetch(
  action: string,
  options: RequestInit = {},
  extraParams: Record<string, string> = {}
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({ action, ...extraParams });
  const url = `${API_BASE}?${params}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (_csrfMem) headers["X-CSRF-Token"] = _csrfMem;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
    const data = await res.json();
    // Synchroniser le CSRF token dans les deux modules
    if (data.csrf) {
      _csrfMem = data.csrf as string;
      setCsrfToken(data.csrf as string);
    }
    return data;
  } catch {
    return { ok: false, error: "Erreur réseau" };
  }
}

// ─── Normalisation ────────────────────────────────────────────────────────────

interface RawApiUser {
  id: number | string;
  username: string;
  email?: string | null;
  age?: number | null;
  gender?: string | null;
  isAdmin?: boolean;
  playMode?: string;
  play_mode?: string;
  avatarEmoji?: string;
  avatar_emoji?: string;
  bio?: string;
}

function normalizeUser(raw: RawApiUser): AuthUser {
  return {
    id: String(raw.id),
    username: raw.username,
    email: raw.email ?? null,
    age: raw.age ?? null,
    gender: (raw.gender as AuthUser["gender"]) ?? null,
    playMode: (raw.playMode ?? raw.play_mode ?? 'solo') as 'solo' | 'multiplayer',
    isAdmin: Boolean(raw.isAdmin),
    avatarEmoji: (raw.avatarEmoji ?? raw.avatar_emoji ?? '🎯'),
    bio: raw.bio ?? '',
    createdAt: new Date().toISOString(),
  };
}

// ─── Contexte ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restauration de session au montage
  useEffect(() => {
    const restore = async () => {
      try {
        const data = await apiFetch("me", { method: "GET" });
        if (data.ok && data.user) {
          setUser(normalizeUser(data.user as RawApiUser));
        }
      } catch {
        // Pas de session active
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = useCallback(
    async (identifier: string, password: string): Promise<string | null> => {
      try {
        const data = await apiFetch("login", {
          method: "POST",
          body: JSON.stringify({ identifier, password }),
        });
        if (!data.ok) return (data.error as string) ?? "Erreur de connexion";
        setUser(normalizeUser(data.user as RawApiUser));
        return null;
      } catch {
        return "Erreur réseau, veuillez réessayer";
      }
    },
    []
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<string | null> => {
      try {
        const data = await apiFetch("register", {
          method: "POST",
          body: JSON.stringify({ ...payload, play_mode: payload.playMode }),
        });
        if (!data.ok) return (data.error as string) ?? "Erreur d'inscription";
        setUser(normalizeUser(data.user as RawApiUser));
        return null;
      } catch {
        return "Erreur réseau, veuillez réessayer";
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("logout", { method: "POST" });
    } finally {
      setUser(null);
      _csrfMem = null;
      setCsrfToken(null);
    }
  }, []);

  const forgotPassword = useCallback(async (email: string): Promise<string> => {
    try {
      const data = await apiFetch("forgot_password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      return (data.message as string) ?? "Si un compte existe, un email a été envoyé.";
    } catch {
      return "Erreur réseau, veuillez réessayer";
    }
  }, []);

  const resetPassword = useCallback(
    async (token: string, password: string): Promise<string | null> => {
      try {
        const data = await apiFetch("reset_password", {
          method: "POST",
          body: JSON.stringify({ token, password }),
        });
        if (!data.ok) return (data.error as string) ?? "Erreur lors de la réinitialisation";
        return null;
      } catch {
        return "Erreur réseau, veuillez réessayer";
      }
    },
    []
  );

  const validateResetToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      // Passer le token via les params GET
      const params = new URLSearchParams({ action: "validate_reset_token", token });
      const res = await fetch(`${API_BASE}?${params}`, {
        method: "GET",
        credentials: "include",
      });
      const json = await res.json();
      return !!(json.ok && json.valid);
    } catch {
      return false;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        validateResetToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans AuthProvider");
  return ctx;
}

