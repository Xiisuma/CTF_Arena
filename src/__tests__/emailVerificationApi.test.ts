/**
 * Confirmation d'adresse : le client ne fait que transmettre le code et
 * remonter fidèlement le refus du serveur.
 */
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "./mswServer";
import {
  sendVerificationCode,
  verifyEmailCode,
} from "../features/profile/emailVerificationApi";

const API = "http://localhost/api.php";

function post(action: string, body: unknown, status = 200) {
  return http.post(API, ({ request }) => {
    if (new URL(request.url).searchParams.get("action") !== action) return;
    return HttpResponse.json(body, { status });
  });
}

describe("sendVerificationCode()", () => {
  it("remonte le délai avant un nouvel envoi", async () => {
    server.use(post("send_verification_code", { ok: true, cooldown: 60 }));
    expect(await sendVerificationCode()).toEqual({ ok: true, cooldown: 60, error: undefined });
  });

  it("remonte le refus du serveur", async () => {
    server.use(
      post("send_verification_code", { ok: false, error: "Patientez 42 secondes" }, 429)
    );
    const result = await sendVerificationCode();
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Patientez 42 secondes");
  });
});

describe("verifyEmailCode()", () => {
  it("accepte un code valide", async () => {
    server.use(post("verify_email_code", { ok: true }));
    expect(await verifyEmailCode("123456")).toEqual({ ok: true, error: undefined });
  });

  it("remonte le message d'erreur", async () => {
    server.use(post("verify_email_code", { ok: false, error: "Code incorrect." }, 400));
    expect(await verifyEmailCode("000000")).toEqual({ ok: false, error: "Code incorrect." });
  });
});
