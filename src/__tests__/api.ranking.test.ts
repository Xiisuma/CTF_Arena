
/**
 * api.ranking.integration.test.ts
 * Tests MSW : normalisation total_points/flags_found (snake_case PHP),
 * team ranking avec structure imbriquée.
 */
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "./mswServer";
import { getRanking, getTeamRanking } from "../features/ranking/api";

const API = "http://localhost/api.php";

// ─── Fixtures réalistes (format brut PHP) ────────────────────────────────────

const RAW_RANKING = [
  { username: "alice", total_points: "500", flags_found: "10" },  // snake_case PHP
  { username: "bob",   total_points: "300", flags_found: "6"  },
];

const RAW_TEAM_RANKING = [
  {
    id: "t1", name: "Elite Hackers", description: "Top team",
    emoji: "🔥", is_public: true, owner_id: "u1", created_at: "2026-01-01",
    points: "800", solved: "16", memberCount: "3",
  },
];

// ─── getRanking ───────────────────────────────────────────────────────────────

describe("getRanking() — intégration MSW", () => {
  it("normalise total_points et flags_found (snake_case → points/solved)", async () => {
    server.use(
      http.get(API, ({ request }) => {
        if (new URL(request.url).searchParams.get("action") !== "get_ranking") return;
        return HttpResponse.json({ ok: true, ranking: RAW_RANKING });
      })
    );
    const result = await getRanking();
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ username: "alice", points: 500, solved: 10 });
    expect(result[1]).toMatchObject({ username: "bob",   points: 300, solved: 6  });
  });

  it("coerce total_points/flags_found (string → number)", async () => {
    server.use(
      http.get(API, ({ request }) => {
        if (new URL(request.url).searchParams.get("action") !== "get_ranking") return;
        return HttpResponse.json({ ok: true, ranking: RAW_RANKING });
      })
    );
    const result = await getRanking();
    expect(typeof result[0].points).toBe("number");
    expect(typeof result[0].solved).toBe("number");
  });

  it("retourne [] si ok: false", async () => {
    server.use(
      http.get(API, ({ request }) => {
        if (new URL(request.url).searchParams.get("action") !== "get_ranking") return;
        return HttpResponse.json({ ok: false });
      })
    );
    expect(await getRanking()).toEqual([]);
  });

  it("retourne [] sur erreur réseau", async () => {
    server.use(
      http.get(API, ({ request }) => {
        if (new URL(request.url).searchParams.get("action") !== "get_ranking") return;
        return HttpResponse.error();
      })
    );
    expect(await getRanking()).toEqual([]);
  });
});

// ─── getTeamRanking ───────────────────────────────────────────────────────────

describe("getTeamRanking() — intégration MSW", () => {
  it("normalise la team imbriquée et les points/solved", async () => {
    server.use(
      http.get(API, ({ request }) => {
        if (new URL(request.url).searchParams.get("action") !== "get_team_ranking") return;
        return HttpResponse.json({ ok: true, ranking: RAW_TEAM_RANKING });
      })
    );
    const result = await getTeamRanking();
    expect(result).toHaveLength(1);
    expect(result[0].team.name).toBe("Elite Hackers");
    expect(result[0].points).toBe(800);
    expect(result[0].solved).toBe(16);
    expect(result[0].memberCount).toBe(3);
  });

  it("retourne [] si ok: false", async () => {
    server.use(
      http.get(API, ({ request }) => {
        if (new URL(request.url).searchParams.get("action") !== "get_team_ranking") return;
        return HttpResponse.json({ ok: false });
      })
    );
    expect(await getTeamRanking()).toEqual([]);
  });
});

