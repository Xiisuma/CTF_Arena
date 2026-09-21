import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CTFPhase } from "../types";

// ─── Mocks ────────────────────────────────────────────────────────────────────

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

const refresh = vi.fn().mockResolvedValue(undefined);

function setup(phase: CTFPhase, isAdmin: boolean) {
  vi.mocked(useAuth).mockReturnValue({ user: { id: "1", username: "u", isAdmin } } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(useChallenges).mockReturnValue({
    categories: [{ id: "WEB", name: "Web", description: "", descriptionMd: "", icon: "🌐", color: "#3b82f6", sortOrder: 1 }],
    challenges: [],
    status: "success",
    error: null,
    refresh,
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("HomePage — CTF non démarré", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("masque les catégories au joueur tant que la partie n'est pas lancée", () => {
    setup("not_started", false);
    render(<HomePage />);
    expect(screen.getByText(/Le CTF commence bientôt/)).toBeTruthy();
    expect(screen.queryByText("Web")).toBeNull();
  });

  it("masque la barre de progression du rang tant que la partie n'est pas lancée", () => {
    setup("not_started", false);
    render(<HomePage />);
    expect(screen.queryByText(/flag validé/)).toBeNull();
  });

  it("affiche la barre de progression du rang une fois la partie lancée", () => {
    setup("running", false);
    render(<HomePage />);
    expect(screen.getByText(/flag validé/)).toBeTruthy();
  });

  it("laisse l'admin voir les catégories pour préparer la partie", () => {
    setup("not_started", true);
    render(<HomePage />);
    expect(screen.getByText("Web")).toBeTruthy();
  });

  it("montre les catégories au joueur une fois la partie lancée", () => {
    setup("running", false);
    render(<HomePage />);
    expect(screen.getByText("Web")).toBeTruthy();
    expect(screen.queryByText(/Le CTF commence bientôt/)).toBeNull();
  });

  it("recharge les challenges quand la partie démarre", () => {
    setup("not_started", false);
    const { rerender } = render(<HomePage />);
    expect(refresh).not.toHaveBeenCalled();
    setup("running", false);
    rerender(<HomePage />);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
