/**
 * Succès : l'aperçu de la vue joueur demande au serveur la liste masquée.
 * Le masquage des succès cachés se fait côté serveur — le client doit donc
 * signaler qu'il veut la vue joueur, sinon un administrateur reçoit tout.
 */
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "./mswServer";
import { getAchievements } from "../features/achievements/api";

const API = "http://localhost/api.php";

const hiddenRow = {
  id: "builtin-remontada",
  title: "Succès caché",
  description: "Débloquez-le pour découvrir de quoi il s'agit.",
  icon: "❓",
  condition: "hidden",
  conditionValue: 0,
  conditionCategory: null,
  points: 0,
  isHidden: true,
  isLocked: true,
  isRepeatable: false,
  createdAt: "2026-09-21 10:00:00",
};

function captureAsPlayer(seen: { value: string | null }) {
  return http.get(API, ({ request }) => {
    const params = new URL(request.url).searchParams;
    if (params.get("action") !== "get_achievements") return;
    seen.value = params.get("asPlayer");
    return HttpResponse.json({ ok: true, achievements: [hiddenRow] });
  });
}

describe("getAchievements()", () => {
  it("ne demande pas la vue joueur par défaut", async () => {
    const seen = { value: "jamais appelé" as string | null };
    server.use(captureAsPlayer(seen));
    await getAchievements();
    expect(seen.value).toBeNull();
  });

  it("demande la vue joueur pendant l'aperçu", async () => {
    const seen = { value: null as string | null };
    server.use(captureAsPlayer(seen));
    const result = await getAchievements(true);
    expect(seen.value).toBe("1");
    expect(result[0].title).toBe("Succès caché");
    expect(result[0].isHidden).toBe(true);
  });
});
