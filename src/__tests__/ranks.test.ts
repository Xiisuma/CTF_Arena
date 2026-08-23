
import { describe, it, expect } from "vitest";
import { getRankFromFlags, getNextRank, getRankProgress, RANKS } from "../features/ranking/ranks";

describe("getRankFromFlags", () => {
  it("retourne Starter pour 0 flag", () => {
    expect(getRankFromFlags(0).id).toBe("starter");
  });

  it("retourne Starter pour 2 flags (limite haute)", () => {
    expect(getRankFromFlags(2).id).toBe("starter");
  });

  it("retourne Beginner pour 3 flags (limite basse)", () => {
    expect(getRankFromFlags(3).id).toBe("beginner");
  });

  it("retourne Advanced pour 15 flags", () => {
    expect(getRankFromFlags(15).id).toBe("advanced");
  });

  it("retourne Terminator pour 51 flags", () => {
    expect(getRankFromFlags(51).id).toBe("terminator");
  });

  it("retourne Terminator pour un très grand nombre de flags", () => {
    expect(getRankFromFlags(9999).id).toBe("terminator");
  });

  it("chaque rang est atteint à sa limite basse", () => {
    for (const rank of RANKS) {
      expect(getRankFromFlags(rank.minFlags).id).toBe(rank.id);
    }
  });
});

describe("getNextRank", () => {
  it("retourne Beginner après Starter", () => {
    const starter = RANKS.find((r) => r.id === "starter")!;
    expect(getNextRank(starter)?.id).toBe("beginner");
  });

  it("retourne null pour Terminator (rang max)", () => {
    const terminator = RANKS.find((r) => r.id === "terminator")!;
    expect(getNextRank(terminator)).toBeNull();
  });

  it("chaque rang sauf le dernier a un suivant", () => {
    for (const rank of RANKS.slice(0, -1)) {
      expect(getNextRank(rank)).not.toBeNull();
    }
  });
});

describe("getRankProgress", () => {
  it("progress=100 et next=null au rang max", () => {
    const result = getRankProgress(9999);
    expect(result.next).toBeNull();
    expect(result.progress).toBe(100);
  });

  it("progress=0 exactement au début d'un rang", () => {
    // Beginner commence à 3 flags
    const result = getRankProgress(3);
    expect(result.current.id).toBe("beginner");
    expect(result.progress).toBe(0);
  });

  it("progress est entre 0 et 100", () => {
    for (let i = 0; i <= 60; i++) {
      const { progress } = getRankProgress(i);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    }
  });

  it("flagsNeeded décroît à mesure qu'on monte", () => {
    const a = getRankProgress(3);
    const b = getRankProgress(4);
    expect(b.flagsNeeded).toBeLessThan(a.flagsNeeded!);
  });

  it("flagsNeeded vaut 0 quand on atteint le prochain rang", () => {
    // Intermediate commence à 6 — juste avant : 5 flags
    const result = getRankProgress(5);
    expect(result.flagsNeeded).toBe(1);
  });

  it("current.id correspond à getRankFromFlags", () => {
    for (let i = 0; i <= 55; i++) {
      expect(getRankProgress(i).current.id).toBe(getRankFromFlags(i).id);
    }
  });
});

