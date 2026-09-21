/**
 * Essais de flags — normalisation de la réponse API (groupée par challenge).
 */
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "./mswServer";
import { getFlagAttempts } from "../features/profile/attemptsApi";

const API = "http://localhost/api.php";

function handler(body: unknown) {
  return http.get(API, ({ request }) => {
    if (new URL(request.url).searchParams.get("action") !== "get_flag_attempts") return;
    return HttpResponse.json(body);
  });
}

describe("getFlagAttempts()", () => {
  it("normalise les groupes et leurs essais", async () => {
    server.use(
      handler({
        ok: true,
        challenges: [
          {
            challengeId: 7,
            challengeTitle: "Cesar",
            category: "CRYPTO",
            attempts: [
              { id: 3, flag: "CTF{faux}", submittedAt: "2026-09-21 10:00:00" },
              { id: 2, flag: "CTF{encore}", submittedAt: "2026-09-21 09:00:00" },
            ],
          },
        ],
      })
    );
    const result = await getFlagAttempts();
    expect(result).toHaveLength(1);
    expect(result[0].challengeId).toBe("7");
    expect(result[0].attempts.map((a) => a.flag)).toEqual(["CTF{faux}", "CTF{encore}"]);
  });

  it("retourne [] si ok: false", async () => {
    server.use(handler({ ok: false }));
    expect(await getFlagAttempts()).toEqual([]);
  });

  it("retourne [] sur erreur réseau", async () => {
    server.use(
      http.get(API, ({ request }) => {
        if (new URL(request.url).searchParams.get("action") !== "get_flag_attempts") return;
        return HttpResponse.error();
      })
    );
    expect(await getFlagAttempts()).toEqual([]);
  });
});
