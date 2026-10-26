/**
 * Page Aide : les outils sont listés, filtrables, et chaque lien sort du site
 * proprement (nouvel onglet, pas de fuite d'opener).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HelpPage from "../pages/HelpPage";
import { TOOLS } from "../features/help/tools";

describe("HelpPage", () => {
  it("affiche tous les outils par défaut", () => {
    render(<HelpPage />);
    for (const tool of TOOLS) {
      expect(screen.getByText(tool.name)).toBeTruthy();
    }
  });

  it("ouvre chaque lien dans un nouvel onglet sans fuite d'opener", () => {
    render(<HelpPage />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(TOOLS.length);
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
      expect(link.getAttribute("href")).toMatch(/^https:\/\//);
    }
  });

  it("filtre les outils par domaine, puis revient à la liste complète", async () => {
    render(<HelpPage />);
    await userEvent.click(screen.getByRole("button", { name: "Stéganographie" }));
    expect(screen.getByText("Aperi'Solve")).toBeTruthy();
    expect(screen.queryByText("CrackStation")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Tous" }));
    expect(screen.getByText("CrackStation")).toBeTruthy();
  });

  it("donne à chaque outil une phrase d'explication et un moment d'emploi", () => {
    for (const tool of TOOLS) {
      expect(tool.what.length).toBeGreaterThan(20);
      expect(tool.when.length).toBeGreaterThan(20);
      expect(tool.tags.length).toBeGreaterThan(0);
    }
  });
});
