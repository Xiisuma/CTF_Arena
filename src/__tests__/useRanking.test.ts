
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useRanking } from "../features/ranking/useRanking";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../features/ranking/api", () => ({
  getRanking: vi.fn(),
}));

import { getRanking } from "../features/ranking/api";

const mockRanking = [
  { username: "alice", points: 500, solved: 10 },
  { username: "bob",   points: 300, solved:  6 },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useRanking", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("démarre en status loading", () => {
    vi.mocked(getRanking).mockResolvedValue(mockRanking);
    const { result } = renderHook(() => useRanking());
    expect(result.current.status).toBe("loading");
  });

  it("passe en success et expose les données après chargement", async () => {
    vi.mocked(getRanking).mockResolvedValue(mockRanking);
    const { result } = renderHook(() => useRanking());
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.ranking).toEqual(mockRanking);
    expect(result.current.error).toBeNull();
  });

  it("passe en error si getRanking rejette", async () => {
    vi.mocked(getRanking).mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useRanking());
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).not.toBeNull();
    expect(result.current.ranking).toEqual([]);
  });

  it("status et error sont mutuellement exclusifs", async () => {
    vi.mocked(getRanking).mockResolvedValue(mockRanking);
    const { result } = renderHook(() => useRanking());
    await waitFor(() => expect(result.current.status).toBe("success"));
    // En success : pas d'erreur
    expect(result.current.error).toBeNull();
  });

  it("appelle getRanking exactement une fois", async () => {
    vi.mocked(getRanking).mockResolvedValue([]);
    renderHook(() => useRanking());
    await waitFor(() => expect(vi.mocked(getRanking)).toHaveBeenCalledTimes(1));
  });
});

