/**
 * Podium : la révélation doit aller jusqu'au 1er du classement.
 * Le serveur plafonnait podium_revealed à 4 pour 5 emplacements, donc le
 * dernier clic échouait et le 1er restait masqué pour toujours.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../features/ctf/api", () => ({ getPodium: vi.fn(), setCTFState: vi.fn() }));
vi.mock("../features/ctf/useCTFState", () => ({ useCTFState: vi.fn() }));
vi.mock("../features/auth/AuthContext", () => ({ useAuth: vi.fn() }));

import PodiumPage from "../pages/PodiumPage";
import { getPodium, setCTFState } from "../features/ctf/api";
import { useCTFState } from "../features/ctf/useCTFState";
import { useAuth } from "../features/auth/AuthContext";

const podium = {
  soloTop3: [
    { userId: "1", username: "Alice", flagsFound: 9, totalPoints: 900 },
    { userId: "2", username: "Bob", flagsFound: 7, totalPoints: 700 },
    { userId: "3", username: "Carl", flagsFound: 5, totalPoints: 500 },
  ],
  mostFlags: { userId: "1", username: "Alice", flagsFound: 9 },
  mostAchievements: { userId: "2", username: "Bob", count: 6 },
};

function setup(revealed: number, isAdmin = true) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: "9", username: "admin", isAdmin, isAuthor: false },
  } as unknown as ReturnType<typeof useAuth>);
  vi.mocked(getPodium).mockResolvedValue(podium as unknown as Awaited<ReturnType<typeof getPodium>>);
  vi.mocked(setCTFState).mockResolvedValue(true as unknown as Awaited<ReturnType<typeof setCTFState>>);
  vi.mocked(useCTFState).mockReturnValue({
    ctfState: {
      gameStarted: true,
      scrambleStartedAt: "",
      podiumVisible: true,
      podiumRevealed: revealed,
      eventTheme: "",
    },
    phase: "ended",
    loading: false,
    refresh: vi.fn(),
  } as unknown as ReturnType<typeof useCTFState>);
}

describe("PodiumPage — révélation jusqu'au 1er", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("garde le 1er masqué tant que les 5 emplacements ne sont pas révélés", async () => {
    setup(4);
    render(<PodiumPage />);
    // Alice tient deux places : 1er du classement et plus de flags.
    // Seule la seconde est dévoilée, la première affiche encore les pointillés.
    await screen.findByText("Carl");
    expect(screen.getAllByText("Alice")).toHaveLength(1);
    expect(screen.getAllByText("• • •")).toHaveLength(1);
  });

  it("affiche le 1er au 5e dévoilement", async () => {
    setup(5);
    render(<PodiumPage />);
    await screen.findByText("Carl");
    expect(screen.getAllByText("Alice")).toHaveLength(2);
    expect(screen.queryByText("• • •")).toBeNull();
  });

  it("demande bien la valeur 5 au dernier clic", async () => {
    setup(4);
    render(<PodiumPage />);
    await userEvent.click(await screen.findByText(/Révéler le 1er/));
    expect(vi.mocked(setCTFState)).toHaveBeenCalledWith("podium_revealed", "5");
  });

  it("ne propose plus de révélation une fois les 5 emplacements dévoilés", async () => {
    setup(5);
    render(<PodiumPage />);
    await screen.findByText("Carl");
    expect(screen.queryByText(/Révéler/)).toBeNull();
  });
});
