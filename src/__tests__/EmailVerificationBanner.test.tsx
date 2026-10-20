/**
 * Bandeau de confirmation d'adresse : visible pour un joueur non confirmé,
 * invisible dès que l'adresse est confirmée ou pour un administrateur.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../features/auth/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../features/profile/emailVerificationApi", () => ({
  sendVerificationCode: vi.fn(),
  verifyEmailCode: vi.fn(),
}));

import { EmailVerificationBanner } from "../features/profile/EmailVerificationBanner";
import { useAuth } from "../features/auth/AuthContext";
import {
  sendVerificationCode,
  verifyEmailCode,
} from "../features/profile/emailVerificationApi";

const refreshUser = vi.fn().mockResolvedValue(undefined);

function setup({ isAdmin = false, emailVerified = false } = {}) {
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: "1",
      username: "joueur",
      email: "joueur@exemple.fr",
      isAdmin,
      isAuthor: false,
      emailVerified,
    },
    refreshUser,
  } as unknown as ReturnType<typeof useAuth>);
}

describe("EmailVerificationBanner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("n'apparaît pas si l'adresse est déjà confirmée", () => {
    setup({ emailVerified: true });
    const { container } = render(<EmailVerificationBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("n'apparaît pas pour un administrateur", () => {
    setup({ isAdmin: true });
    const { container } = render(<EmailVerificationBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("confirme l'adresse puis recharge l'utilisateur", async () => {
    setup();
    vi.mocked(verifyEmailCode).mockResolvedValue({ ok: true });
    render(<EmailVerificationBanner />);
    await userEvent.type(screen.getByLabelText("Code de confirmation"), "123456");
    await userEvent.click(screen.getByText("Valider"));
    expect(vi.mocked(verifyEmailCode)).toHaveBeenCalledWith("123456");
    expect(refreshUser).toHaveBeenCalled();
  });

  it("affiche le refus du serveur sans recharger l'utilisateur", async () => {
    setup();
    vi.mocked(verifyEmailCode).mockResolvedValue({ ok: false, error: "Code incorrect." });
    render(<EmailVerificationBanner />);
    await userEvent.type(screen.getByLabelText("Code de confirmation"), "000000");
    await userEvent.click(screen.getByText("Valider"));
    expect(await screen.findByText("Code incorrect.")).toBeTruthy();
    expect(refreshUser).not.toHaveBeenCalled();
  });

  it("bloque un nouvel envoi pendant le délai annoncé", async () => {
    setup();
    vi.mocked(sendVerificationCode).mockResolvedValue({ ok: true, cooldown: 60 });
    render(<EmailVerificationBanner />);
    await userEvent.click(screen.getByText("Envoyer un code"));
    expect(await screen.findByText(/Renvoyer \(60 s\)/)).toBeTruthy();
  });
});
