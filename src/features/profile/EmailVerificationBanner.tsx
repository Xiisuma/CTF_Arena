/**
 * EmailVerificationBanner.tsx — bandeau de confirmation d'adresse.
 *
 * Affiché tant que l'adresse du joueur n'est pas confirmée. Il n'empêche rien
 * par lui-même : c'est le serveur qui décide, selon EMAIL_VERIFICATION, si une
 * adresse non confirmée bloque la soumission des flags.
 */

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { sendVerificationCode, verifyEmailCode } from "./emailVerificationApi";

export function EmailVerificationBanner() {
  const { user, refreshUser } = useAuth();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSend = useCallback(async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await sendVerificationCode();
    if (result.ok) {
      setCooldown(result.cooldown);
      setMessage("Code envoyé. Regardez votre boîte mail, et vos spams.");
    } else {
      setError(result.error ?? "Envoi impossible.");
    }
    setBusy(false);
  }, []);

  const handleVerify = useCallback(async () => {
    const trimmed = code.replace(/\D/g, "");
    if (trimmed.length !== 6) {
      setError("Le code compte six chiffres.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await verifyEmailCode(trimmed);
    if (result.ok) {
      setCode("");
      await refreshUser();
    } else {
      setError(result.error ?? "Code refusé.");
    }
    setBusy(false);
  }, [code, refreshUser]);

  if (!user || user.isAdmin || user.emailVerified) return null;

  return (
    <div className="mx-auto mt-4 max-w-7xl px-4 sm:px-6">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
        <p className="text-sm font-semibold text-amber-300">
          ✉️ Confirmez votre adresse email
        </p>
        <p className="mt-1 text-sm text-amber-200/80">
          Saisissez le code à six chiffres envoyé à {user.email ?? "votre adresse"}.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="Code de confirmation"
            placeholder="123456"
            className="w-32 rounded-xl border border-secondary bg-input px-4 py-2 font-mono text-sm tracking-widest text-primary outline-none focus:ring-2 focus:ring-amber-400/40"
          />
          <button
            onClick={handleVerify}
            disabled={busy || code.length !== 6}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400 disabled:opacity-50"
          >
            Valider
          </button>
          <button
            onClick={handleSend}
            disabled={busy || cooldown > 0}
            className="rounded-xl border border-primary bg-card px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-input disabled:opacity-50"
          >
            {cooldown > 0 ? `Renvoyer (${cooldown} s)` : "Envoyer un code"}
          </button>
        </div>
        {message && <p className="mt-2 text-xs text-emerald-300">{message}</p>}
        {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
      </div>
    </div>
  );
}
