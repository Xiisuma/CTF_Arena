/**
 * Page Succès : les succès encore mystérieux sont rangés en fin de liste,
 * pour que les cartes « ❓ » ne coupent plus les succès lisibles.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Achievement } from "../types";

vi.mock("../db", () => ({
  addAchievement: vi.fn(),
  evaluateAchievements: vi.fn(),
  removeAchievement: vi.fn(),
  updateAchievement: vi.fn(),
}));
vi.mock("../features/auth/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../features/achievements/useAchievements", () => ({ useAchievements: vi.fn() }));

import AchievementsPage from "../pages/AchievementsPage";
import { useAuth } from "../features/auth/AuthContext";
import { useAchievements } from "../features/achievements/useAchievements";

const base: Achievement = {
  id: "a",
  title: "A",
  description: "",
  icon: "🎖️",
  condition: "builtin",
  conditionValue: 0,
  conditionCategory: undefined,
  points: 25,
  isHidden: false,
  isLocked: false,
  isRepeatable: false,
  createdAt: "2026-09-21 10:00:00",
};

const achievement = (over: Partial<Achievement>): Achievement => ({ ...base, ...over });

function setup(achievements: Achievement[]) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: "1", username: "joueur", isAdmin: false, isAuthor: false },
  } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(useAchievements).mockReturnValue({
    achievements,
    userAchievements: [],
    players: [],
    status: "success",
    error: null,
    refresh: vi.fn(),
  } as unknown as ReturnType<typeof useAchievements>);
}

const titles = () =>
  screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);

describe("AchievementsPage — ordre des succès cachés", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renvoie les succès encore masqués en fin de liste", () => {
    setup([
      achievement({ id: "1", title: "First Blood" }),
      achievement({ id: "2", title: "Succès caché", isHidden: true, isLocked: true }),
      achievement({ id: "3", title: "Éclaireur" }),
      achievement({ id: "4", title: "Succès caché", isHidden: true, isLocked: true }),
      achievement({ id: "5", title: "Complétiste" }),
    ]);
    render(<AchievementsPage />);
    expect(titles()).toEqual([
      "First Blood",
      "Éclaireur",
      "Complétiste",
      "Succès caché",
      "Succès caché",
    ]);
  });

  it("laisse un succès caché débloqué à sa place habituelle", () => {
    setup([
      achievement({ id: "1", title: "First Blood" }),
      achievement({ id: "2", title: "Remontada", isHidden: true, isLocked: false }),
      achievement({ id: "3", title: "Succès caché", isHidden: true, isLocked: true }),
      achievement({ id: "4", title: "Complétiste" }),
    ]);
    render(<AchievementsPage />);
    expect(titles()).toEqual([
      "First Blood",
      "Remontada",
      "Complétiste",
      "Succès caché",
    ]);
  });
});
