
/**
 * api.challenges.integration.test.ts
 * Tests MSW : la couche API est réelle (normalisation snake_case→camelCase,
 * toRawArray, validate Zod). Seul le réseau est intercepté.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "./mswServer";
import { getChallenges } from "../features/challenges/api";

const API = "http://localhost/api.php";

// ─── Fixture réaliste (format brut PHP) ───────────────────────────────────────

const RAW_CHALLENGES = [
  {
    id: "c1",
    title: "SQL Injection 101",
    category: "WEB",
    points: "150",            // string — doit être coercé en number
    description: "Trouve le flag",
    flag: "",
    files: [
      { id: "f1", name: "source.zip", url: "/files/source.zip" },
    ],
    difficulty_mode: "auto",   // snake_case PHP
    difficulty: "medium",
    created_at: "2026-01-15",  // snake_case PHP
  },
  {
    id: "c2",
    title: "XSS Stored",
    category: "WEB",
    points: "300",
    description: "Injecte un script",
    flag: "",
    files: [],
    difficulty_mode: "hard",
    difficulty: "hard",
    created_at: "2026-01-20",
  },
];

function mockGetChallenges(overrides?: Record<string, unknown>) {
  server.use(
    http.get(API, ({ request }) => {
      const action = new URL(request.url).searchParams.get("action");
      if (action !== "get_challenges") return;
      return HttpResponse.json({ ok: true, challenges: RAW_CHALLENGES, ...overrides });
    })
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getChallenges() — intégration MSW", () => {
  beforeEach(() => {
    mockGetChallenges();
  });

  it("retourne un tableau de challenges normalisés", async () => {
    const result = await getChallenges();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("c1");
    expect(result[0].title).toBe("SQL Injection 101");
  });

  it("coerce points (string → number)", async () => {
    const result = await getChallenges();
    expect(typeof result[0].points).toBe("number");
    expect(result[0].points).toBe(150);
  });

  it("normalise difficulty_mode (snake_case → difficultyMode)", async () => {
    const result = await getChallenges();
    expect(result[0].difficultyMode).toBe("auto");
    expect(result[1].difficultyMode).toBe("hard");
  });

  it("normalise created_at (snake_case → createdAt)", async () => {
    const result = await getChallenges();
    expect(result[0].createdAt).toBe("2026-01-15");
  });

  it("parse le tableau files imbriqué", async () => {
    const result = await getChallenges();
    expect(result[0].files).toHaveLength(1);
    expect(result[0].files[0]).toMatchObject({ id: "f1", name: "source.zip" });
  });

  it("retourne [] si ok: false", async () => {
    server.use(
      http.get(API, ({ request }) => {
        if (new URL(request.url).searchParams.get("action") !== "get_challenges") return;
        return HttpResponse.json({ ok: false, error: "Non autorisé" });
      })
    );
    const result = await getChallenges();
    expect(result).toEqual([]);
  });

  it("retourne [] si challenges absent de la réponse", async () => {
    server.use(
      http.get(API, ({ request }) => {
        if (new URL(request.url).searchParams.get("action") !== "get_challenges") return;
        return HttpResponse.json({ ok: true }); // pas de clé challenges
      })
    );
    const result = await getChallenges();
    expect(result).toEqual([]);
  });

  it("filtre les items non-objets dans le tableau (toRawArray)", async () => {
    server.use(
      http.get(API, ({ request }) => {
        if (new URL(request.url).searchParams.get("action") !== "get_challenges") return;
        return HttpResponse.json({
          ok: true,
          challenges: [
            null,          // doit être filtré
            42,            // doit être filtré
            RAW_CHALLENGES[0],
          ],
        });
      })
    );
    const result = await getChallenges();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c1");
  });

  it("retourne [] sur erreur réseau", async () => {
    server.use(
      http.get(API, ({ request }) => {
        if (new URL(request.url).searchParams.get("action") !== "get_challenges") return;
        return HttpResponse.error();
      })
    );
    const result = await getChallenges();
    expect(result).toEqual([]);
  });
});

