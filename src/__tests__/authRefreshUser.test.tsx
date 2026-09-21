/**
 * Vérifie que refreshUser relit le compte depuis l'API : sans lui, l'avatar
 * modifié dans le profil restait l'ancien jusqu'au rechargement de la page.
 */
import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { server } from "./mswServer";
import { AuthProvider, useAuth } from "../features/auth/AuthContext";

const API = "http://localhost/api.php";

function meHandler(avatarEmoji: string) {
  return http.get(API, ({ request }) => {
    if (new URL(request.url).searchParams.get("action") !== "me") return;
    return HttpResponse.json({
      ok: true,
      user: { id: 1, username: "alice", email: "a@b.c", age: 22, gender: "other", avatarEmoji, bio: "", isAdmin: false },
      csrf: "token",
    });
  });
}

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe("AuthContext.refreshUser", () => {
  it("relit l'utilisateur après une modification du profil", async () => {
    server.use(meHandler("🎯"));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user?.avatarEmoji).toBe("🎯"));

    server.use(meHandler("🐉"));
    await act(async () => { await result.current.refreshUser(); });
    expect(result.current.user?.avatarEmoji).toBe("🐉");
  });
});
