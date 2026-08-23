
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useChallenges } from "../features/challenges/useChallenges";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../api/categories", () => ({ getCategories: vi.fn() }));
vi.mock("../api/challenges",  () => ({ getChallenges:  vi.fn() }));

import { getCategories } from "../features/categories/api";
import { getChallenges }  from "../features/challenges/api";

const mockCategories = [
  { id: "web", name: "Web", description: "", descriptionMd: "", icon: "🌐", color: "#3b82f6", sortOrder: 1 },
];
const mockChallenges = [
  { id: "c1", title: "SQLi 101", category: "web", points: 100, description: "", files: [], flag: "CTF{x}", createdAt: "" },
  { id: "c2", title: "XSS 101", category: "web", points: 200, description: "", files: [], flag: "CTF{y}", createdAt: "" },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useChallenges", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("démarre en status loading", () => {
    vi.mocked(getCategories).mockResolvedValue(mockCategories);
    vi.mocked(getChallenges).mockResolvedValue(mockChallenges);
    const { result } = renderHook(() => useChallenges());
    expect(result.current.status).toBe("loading");
  });

  it("expose les catégories et challenges après chargement", async () => {
    vi.mocked(getCategories).mockResolvedValue(mockCategories);
    vi.mocked(getChallenges).mockResolvedValue(mockChallenges);
    const { result } = renderHook(() => useChallenges());
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.categories).toEqual(mockCategories);
    expect(result.current.challenges).toEqual(mockChallenges);
    expect(result.current.error).toBeNull();
  });

  it("passe en error si getCategories rejette", async () => {
    vi.mocked(getCategories).mockRejectedValue(new Error("API down"));
    vi.mocked(getChallenges).mockResolvedValue([]);
    const { result } = renderHook(() => useChallenges());
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).not.toBeNull();
    expect(result.current.categories).toEqual([]);
    expect(result.current.challenges).toEqual([]);
  });

  it("passe en error si getChallenges rejette", async () => {
    vi.mocked(getCategories).mockResolvedValue(mockCategories);
    vi.mocked(getChallenges).mockRejectedValue(new Error("Timeout"));
    const { result } = renderHook(() => useChallenges());
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).not.toBeNull();
  });

  it("refresh() recharge les données et repasse en success", async () => {
    vi.mocked(getCategories).mockResolvedValue(mockCategories);
    vi.mocked(getChallenges).mockResolvedValue(mockChallenges);
    const { result } = renderHook(() => useChallenges());
    await waitFor(() => expect(result.current.status).toBe("success"));

    // Simule une mise à jour côté API
    const updatedChallenges = [...mockChallenges, {
      id: "c3", title: "CSRF", category: "web", points: 300, description: "", files: [], flag: "CTF{z}", createdAt: "",
    }];
    vi.mocked(getChallenges).mockResolvedValue(updatedChallenges);

    await act(async () => { await result.current.refresh(); });
    expect(result.current.challenges).toHaveLength(3);
    expect(result.current.status).toBe("success");
  });

  it("refresh() passe en error si l'API échoue au second appel", async () => {
    vi.mocked(getCategories).mockResolvedValue(mockCategories);
    vi.mocked(getChallenges).mockResolvedValue(mockChallenges);
    const { result } = renderHook(() => useChallenges());
    await waitFor(() => expect(result.current.status).toBe("success"));

    vi.mocked(getChallenges).mockRejectedValue(new Error("Network lost"));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.status).toBe("error");
    expect(result.current.error).not.toBeNull();
  });

  it("status et error sont mutuellement exclusifs en success", async () => {
    vi.mocked(getCategories).mockResolvedValue(mockCategories);
    vi.mocked(getChallenges).mockResolvedValue(mockChallenges);
    const { result } = renderHook(() => useChallenges());
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.error).toBeNull();
  });
});

