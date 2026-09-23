/**
 * Aperçu joueur : bascule d'affichage réservée à l'administrateur.
 * Les droits serveur ne sont jamais touchés — seul l'utilisateur « affiché » change.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../features/auth/AuthContext", () => ({ useAuth: vi.fn() }));

import { usePlayerPreview, useViewer } from "../features/auth/playerPreview";
import { useAuth } from "../features/auth/AuthContext";

function Harness() {
  const { previewing, available, toggle } = usePlayerPreview();
  const viewer = useViewer();
  return (
    <div>
      <button onClick={toggle}>bascule</button>
      <p data-testid="etat">{`${available}|${previewing}|${viewer?.isAdmin}`}</p>
    </div>
  );
}

function mockUser(isAdmin: boolean) {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: "1", username: "u", isAdmin, isAuthor: false },
  } as unknown as ReturnType<typeof useAuth>);
}

const etat = () => screen.getByTestId("etat").textContent;

describe("aperçu de la vue joueur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("présente l'administrateur comme un joueur une fois l'aperçu activé", async () => {
    mockUser(true);
    render(<Harness />);
    expect(etat()).toBe("true|false|true");

    await userEvent.click(screen.getByText("bascule"));
    expect(etat()).toBe("true|true|false");
    expect(localStorage.getItem("ctf-player-preview")).toBe("1");

    await userEvent.click(screen.getByText("bascule"));
    expect(etat()).toBe("true|false|true");
  });

  it("n'expose pas la bascule à un joueur ordinaire", async () => {
    mockUser(false);
    render(<Harness />);
    expect(etat()).toBe("false|false|false");

    await userEvent.click(screen.getByText("bascule"));
    expect(etat()).toBe("false|false|false");
  });

  it("ignore un aperçu mémorisé pour un compte non administrateur", () => {
    localStorage.setItem("ctf-player-preview", "1");
    mockUser(false);
    render(<Harness />);
    expect(etat()).toBe("false|false|false");
  });

  it("ne renvoie aucun utilisateur affiché sans session", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as unknown as ReturnType<typeof useAuth>);
    render(<Harness />);
    expect(etat()).toBe("false|false|undefined");
  });
});
