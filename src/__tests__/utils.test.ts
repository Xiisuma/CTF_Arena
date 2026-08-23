
import { describe, it, expect } from "vitest";
import { validateUsername } from "../infrastructure/api/utils";

describe("validateUsername", () => {
  // ─── Cas valides ────────────────────────────────────────────────────────────

  it("accepte un username alphanumérique simple", () => {
    expect(validateUsername("alice")).toBeNull();
  });

  it("accepte les underscores et tirets", () => {
    expect(validateUsername("alice_bob-42")).toBeNull();
  });

  it("accepte exactement 3 caractères", () => {
    expect(validateUsername("abc")).toBeNull();
  });

  it("accepte exactement 30 caractères", () => {
    expect(validateUsername("a".repeat(30))).toBeNull();
  });

  it("accepte des chiffres seuls", () => {
    expect(validateUsername("12345")).toBeNull();
  });

  // ─── Trop court ─────────────────────────────────────────────────────────────

  it("refuse moins de 3 caractères", () => {
    expect(validateUsername("ab")).not.toBeNull();
  });

  it("refuse une chaîne vide", () => {
    expect(validateUsername("")).not.toBeNull();
  });

  it("refuse un espace seul (trim)", () => {
    expect(validateUsername("   ")).not.toBeNull();
  });

  it("refuse 2 caractères avec espaces autour (trim)", () => {
    expect(validateUsername("  ab  ")).not.toBeNull();
  });

  // ─── Trop long ──────────────────────────────────────────────────────────────

  it("refuse 31 caractères", () => {
    expect(validateUsername("a".repeat(31))).not.toBeNull();
  });

  // ─── Caractères interdits ────────────────────────────────────────────────────

  it("refuse les espaces au milieu", () => {
    expect(validateUsername("alice bob")).not.toBeNull();
  });

  it("refuse les caractères spéciaux (@)", () => {
    expect(validateUsername("alice@bob")).not.toBeNull();
  });

  it("refuse les points", () => {
    expect(validateUsername("alice.bob")).not.toBeNull();
  });

  it("refuse les accents", () => {
    expect(validateUsername("héros")).not.toBeNull();
  });

  // ─── Messages d'erreur ───────────────────────────────────────────────────────

  it("retourne le bon message pour username trop court", () => {
    expect(validateUsername("ab")).toContain("3");
  });

  it("retourne le bon message pour username trop long", () => {
    expect(validateUsername("a".repeat(31))).toContain("30");
  });

  it("retourne le bon message pour caractères invalides", () => {
    const msg = validateUsername("alice@bob");
    expect(msg).not.toBeNull();
    expect(msg!.length).toBeGreaterThan(0);
  });
});

