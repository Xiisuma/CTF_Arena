
/**
 * api.categories.integration.test.ts
 * Tests MSW : normalisation PHP snake_case, validation Zod, toRawArray.
 */
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "./mswServer";
import { getCategories } from "../features/categories/api";

const API = "http://localhost/api.php";

// ─── Fixture réaliste ─────────────────────────────────────────────────────────

const RAW_CATEGORIES = [
  {
    id: "WEB",
    name: "Web",
    description: "Challenges web",
    description_md: "## Web\n\nExplore les failles...", // snake_case PHP
    icon: "🌐",
    color: "#3b82f6",
    sort_order: "1",   // string — doit être coercé en number
  },
  {
    id: "CRYPTO",
    name: "Cryptographie",
    description: "Challenges crypto",
    description_md: "",
    icon: "🔐",
    color: "#8b5cf6",
    sort_order: "2",
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("getCategories() — intégration MSW", () => {
  it("retourne les catégories normalisées", async () => {
    server.use(
      http.get(API, ({ request }) => {
        if (new URL(request.url).searchParams.get("action") !== "get_categories") return;
        return HttpResponse.json({ ok: true, categories: RAW_CATEGORIES });
      })
    );
    const result = await getCategories();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("WEB");
    expect(result[0].name).toBe("Web");
  });

  it("normalise description_md (snake_case → descriptionMd)", async () => {
    server.use(
      http.get(API, ({ request }) => {
        if (new URL(request.url).searchParams.get("action") !== "get_categories") return;
        return HttpResponse.json({ ok: true, categories: RAW_CATEGORIES });
      })
    );
    const result = await getCategories();
    expect(result[0].descriptionMd).toBe("## Web\n\nExplore les failles...");
    expect(result[1].descriptionMd).toBe("");
  });

  it("coerce sort_order (string → number)", async () => {
    server.use(
      http.get(API, ({ request }) => {
        if (new URL(request.url).searchParams.get("action") !== "get_categories") return;
        return HttpResponse.json({ ok: true, categories: RAW_CATEGORIES });
      })
    );
    const result = await getCategories();
    expect(typeof result[0].sortOrder).toBe("number");
    expect(result[0].sortOrder).toBe(1);
  });

  it("retourne [] si ok: false", async () => {
    server.use(
      http.get(API, ({ request }) => {
        if (new URL(request.url).searchParams.get("action") !== "get_categories") return;
        return HttpResponse.json({ ok: false });
      })
    );
    const result = await getCategories();
    expect(result).toEqual([]);
  });

  it("filtre les items null / primitifs (toRawArray)", async () => {
    server.use(
      http.get(API, ({ request }) => {
        if (new URL(request.url).searchParams.get("action") !== "get_categories") return;
        return HttpResponse.json({
          ok: true,
          categories: [null, "invalid", RAW_CATEGORIES[0]],
        });
      })
    );
    const result = await getCategories();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("WEB");
  });

  it("retourne [] sur erreur réseau", async () => {
    server.use(
      http.get(API, ({ request }) => {
        if (new URL(request.url).searchParams.get("action") !== "get_categories") return;
        return HttpResponse.error();
      })
    );
    const result = await getCategories();
    expect(result).toEqual([]);
  });
});

