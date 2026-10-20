/**
 * emailVerificationApi.ts — confirmation de l'adresse email par code.
 * Le code n'existe que côté serveur : le client ne fait que le transmettre.
 */

import { apiFetch } from "../../infrastructure/api/client";

export interface CodeRequestResult {
  ok: boolean;
  /** Secondes à attendre avant de pouvoir redemander un code. */
  cooldown: number;
  error?: string;
}

export async function sendVerificationCode(): Promise<CodeRequestResult> {
  const data = await apiFetch("send_verification_code", { method: "POST" });
  return {
    ok: Boolean(data.ok),
    cooldown: Number(data.cooldown ?? 60),
    error: typeof data.error === "string" ? data.error : undefined,
  };
}

export async function verifyEmailCode(code: string): Promise<{ ok: boolean; error?: string }> {
  const data = await apiFetch("verify_email_code", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  return {
    ok: Boolean(data.ok),
    error: typeof data.error === "string" ? data.error : undefined,
  };
}
