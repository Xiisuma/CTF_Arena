/**
 * Aperçu joueur sur la page Challenges : l'administrateur voit exactement
 * l'écran d'un joueur, sans que ses droits serveur changent.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Challenge } from "../types";

vi.mock("../db", () => ({ removeChallenge: vi.fn(), addChallenge: vi.fn(), updateChallenge: vi.fn() }));
vi.mock("../features/auth/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../features/challenges/useChallenges", () => ({ useChallenges: vi.fn() }));
vi.mock("../features/challenges/useSolvedChallenges", () => ({ useSolvedChallenges: vi.fn() }));
vi.mock("../features/ctf/useCTFState", () => ({ useCTFState: vi.fn(), phaseSecondsLeft: () => null }));
vi.mock("../features/ctf/useActiveEvent", () => ({ useActiveEvent: () => ({ event: null }) }));
vi.mock("../features/challenges/api", () => ({ submitMysteryFlag: vi.fn() }));

import HomePage from "../pages/HomePage";
import { useAuth } from "../features/auth/AuthContext";
import { useChallenges } from "../features/challenges/useChallenges";
import { useSolvedChallenges } from "../features/challenges/useSolvedChallenges";
import { useCTFState } from "../features/ctf/useCTFState";

const category = {
  id: "WEB",
  name: "Web",
  description: "",
  descriptionMd: "",
  icon: "🌐",
  color: "#3b82f6",
  sortOrder: 1,
};

const challenge: Challenge = {
  id: "c1",
  title: "SQLi",
  category: "WEB",
  points: 100,
  currentPoints: 100,
  solves: 0,
  canEdit: true,
  mine: false,
  authorLocked: false,
  description: "",
  files: [],
  createdAt: "",
};

function setup(phase: "not_started" | "running") {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: "1", username: "admin", isAdmin: true, isAuthor: false },
  } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(useChallenges).mockReturnValue({
    categories: [category],
    challenges: [challenge],
    status: "success",
    error: null,
    refresh: vi.fn().mockResolvedValue(undefined),
  });
  vi.mocked(useSolvedChallenges).mockReturnValue({
    solvedIds: new Set<string>(), status: "success", error: null, refresh: vi.fn(),
  } as unknown as ReturnType<typeof useSolvedChallenges>);
  vi.mocked(useCTFState).mockReturnValue({
    ctfState: { gameStarted: phase !== "not_started", scrambleStartedAt: "", podiumVisible: false, podiumRevealed: 0, eventTheme: "" },
    phase,
    loading: false,
    refresh: vi.fn(),
  } as unknown as ReturnType<typeof useCTFState>);
}

describe("HomePage — aperçu de la vue joueur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("montre la vue administrateur par défaut avant le lancement", () => {
    setup("not_started");
    render(<HomePage />);
    expect(screen.getByText(/Les joueurs ne voient pas encore/)).toBeTruthy();
    expect(screen.queryByText(/Aperçu de la vue joueur/)).toBeNull();
  });

  it("masque catégories et outils d'édition pendant l'aperçu", () => {
    localStorage.setItem("ctf-player-preview", "1");
    setup("not_started");
    render(<HomePage />);
    expect(screen.getByText(/Aperçu de la vue joueur/)).toBeTruthy();
    expect(screen.getByText(/Les challenges seront révélés au lancement/)).toBeTruthy();
    expect(screen.queryByText("Web")).toBeNull();
    expect(screen.queryByText("Ajouter")).toBeNull();
  });

  it("rend la progression du joueur pendant l'aperçu, partie lancée", () => {
    localStorage.setItem("ctf-player-preview", "1");
    setup("running");
    render(<HomePage />);
    expect(screen.getByText("Web")).toBeTruthy();
    expect(screen.queryByText("Ajouter")).toBeNull();
    expect(screen.getByText(/0 résolu/)).toBeTruthy();
  });
});
