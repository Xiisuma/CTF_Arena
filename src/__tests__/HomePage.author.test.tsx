/**
 * Mode auteur : bascule visible pour les auteurs seulement, outils d'édition
 * réservés aux challenges que le serveur autorise (challenge.canEdit).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Challenge } from "../types";

vi.mock("../db", () => ({ removeChallenge: vi.fn(), addChallenge: vi.fn(), updateChallenge: vi.fn() }));
vi.mock("../features/auth/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../features/challenges/useChallenges", () => ({ useChallenges: vi.fn() }));
vi.mock("../features/challenges/useSolvedChallenges", () => ({ useSolvedChallenges: vi.fn() }));
vi.mock("../features/ctf/useCTFState", () => ({ useCTFState: vi.fn(), phaseSecondsLeft: () => null }));
vi.mock("../features/ctf/useActiveEvent", () => ({ useActiveEvent: () => ({ event: null }) }));
vi.mock("../features/challenges/api", () => ({ submitMysteryFlag: vi.fn() }));
vi.mock("../features/categories/store", () => ({
  CATEGORIES: [{ id: "WEB", name: "Web", description: "", descriptionMd: "", icon: "🌐", color: "#3b82f6", sortOrder: 1 }],
}));

import HomePage from "../pages/HomePage";
import { useAuth } from "../features/auth/AuthContext";
import { useChallenges } from "../features/challenges/useChallenges";
import { useSolvedChallenges } from "../features/challenges/useSolvedChallenges";
import { useCTFState } from "../features/ctf/useCTFState";

const challenge = (over: Partial<Challenge> = {}): Challenge => ({
  id: "c1",
  title: "SQLi",
  category: "WEB",
  points: 100,
  currentPoints: 100,
  solves: 0,
  canEdit: false,
  mine: false,
  authorLocked: false,
  description: "",
  files: [],
  createdAt: "",
  ...over,
});

function setup({ isAuthor, canEdit }: { isAuthor: boolean; canEdit: boolean }) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: "1", username: "u", isAdmin: false, isAuthor },
  } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(useChallenges).mockReturnValue({
    categories: [{ id: "WEB", name: "Web", description: "", descriptionMd: "", icon: "🌐", color: "#3b82f6", sortOrder: 1 }],
    challenges: [challenge({ canEdit, mine: canEdit })],
    status: "success",
    error: null,
    refresh: vi.fn().mockResolvedValue(undefined),
  });
  vi.mocked(useSolvedChallenges).mockReturnValue({
    solvedIds: new Set<string>(), status: "success", error: null, refresh: vi.fn(),
  } as unknown as ReturnType<typeof useSolvedChallenges>);
  vi.mocked(useCTFState).mockReturnValue({
    ctfState: { gameStarted: true, scrambleStartedAt: "", podiumVisible: false, podiumRevealed: 0, eventTheme: "" },
    phase: "running",
    loading: false,
    refresh: vi.fn(),
  } as unknown as ReturnType<typeof useCTFState>);
}

describe("HomePage — mode auteur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("ne propose pas la bascule à un joueur ordinaire", () => {
    setup({ isAuthor: false, canEdit: false });
    render(<HomePage />);
    expect(screen.queryByText(/Mode auteur/)).toBeNull();
  });

  it("propose la bascule à un auteur, désactivée par défaut", () => {
    setup({ isAuthor: true, canEdit: true });
    render(<HomePage />);
    expect(screen.getByText(/Mode auteur désactivé/)).toBeTruthy();
    expect(screen.queryByText("Ajouter")).toBeNull();
  });

  it("affiche les outils de création une fois le mode auteur activé", async () => {
    setup({ isAuthor: true, canEdit: true });
    render(<HomePage />);
    await userEvent.click(screen.getByText(/Mode auteur désactivé/));
    expect(screen.getByRole("button", { pressed: true })).toBeTruthy();
    expect(screen.getByText("Ajouter")).toBeTruthy();
  });

  it("n'affiche aucun outil de création sur un challenge qui n'est pas le sien", async () => {
    setup({ isAuthor: true, canEdit: false });
    render(<HomePage />);
    await userEvent.click(screen.getByText(/Mode auteur désactivé/));
    await userEvent.click(screen.getByText("Web"));
    expect(screen.queryByLabelText("Modifier le challenge")).toBeNull();
  });
});
