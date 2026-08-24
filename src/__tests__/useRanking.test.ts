
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useRanking } from "../features/ranking/useRanking";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../features/ranking/api", () => ({
  getRanking: vi.fn(),
  getTeamRanking: vi.fn(),
}));

import { getRanking, getTeamRanking } from "../features/ranking/api";

const mockRanking = [
  { username: "alice", points: 500, solved: 10 },
  { username: "bob",   points: 300, solved:  6 },
];
const mockTeamRanking = [
  {
    team: { id: "t1", name: "Elite", description: "", emoji: "🔥", isPublic: true, ownerId: "u1", createdAt: "" },
    points: 800, solved: 16, memberCount: 2,
  },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useRanking", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("démarre en status loading", () => {
    vi.mocked(getRanking).mockResolvedValue(mockRanking);
    vi.mocked(getTeamRanking).mockResolvedValue(mockTeamRanking);
    const { result } = renderHook(() => useRanking());
    expect(result.current.status).toBe("loading");
  });

  it("passe en success et expose les données après chargement", async () => {
    vi.mocked(getRanking).mockResolvedValue(mockRanking);
    vi.mocked(getTeamRanking).mockResolvedValue(mockTeamRanking);
    const { result } = renderHook(() => useRanking());
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.ranking).toEqual(mockRanking);
    expect(result.current.teamRanking).toEqual(mockTeamRanking);
    expect(result.current.error).toBeNull();
  });

  it("passe en error si getRanking rejette", async () => {
    vi.mocked(getRanking).mockRejectedValue(new Error("Network error"));
    vi.mocked(getTeamRanking).mockResolvedValue([]);
    const { result } = renderHook(() => useRanking());
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).not.toBeNull();
    expect(result.current.ranking).toEqual([]);
  });

  it("passe en error si getTeamRanking rejette", async () => {
    vi.mocked(getRanking).mockResolvedValue(mockRanking);
    vi.mocked(getTeamRanking).mockRejectedValue(new Error("Timeout"));
    const { result } = renderHook(() => useRanking());
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).not.toBeNull();
  });

  it("status et error sont mutuellement exclusifs", async () => {
    vi.mocked(getRanking).mockResolvedValue(mockRanking);
    vi.mocked(getTeamRanking).mockResolvedValue(mockTeamRanking);
    const { result } = renderHook(() => useRanking());
    await waitFor(() => expect(result.current.status).toBe("success"));
    // En success : pas d'erreur
    expect(result.current.error).toBeNull();
  });

  it("appelle getRanking et getTeamRanking exactement une fois", async () => {
    vi.mocked(getRanking).mockResolvedValue([]);
    vi.mocked(getTeamRanking).mockResolvedValue([]);
    renderHook(() => useRanking());
    await waitFor(() => expect(vi.mocked(getRanking)).toHaveBeenCalledTimes(1));
    expect(vi.mocked(getTeamRanking)).toHaveBeenCalledTimes(1);
  });
});

