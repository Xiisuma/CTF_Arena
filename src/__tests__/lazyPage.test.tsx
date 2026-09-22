/**
 * Filet de sécurité au déploiement : une page dont le bundle a disparu
 * recharge la page une seule fois, puis laisse l'erreur remonter.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Suspense, Component, type ReactNode } from "react";
import { lazyPage, CHUNK_RELOAD_KEY } from "../App";

class Catcher extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p>erreur remontée</p> : this.props.children;
  }
}

const reload = vi.fn();

beforeEach(() => {
  sessionStorage.clear();
  reload.mockClear();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, reload },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("lazyPage", () => {
  it("recharge une fois quand le bundle a disparu", async () => {
    const Page = lazyPage(() => Promise.reject(new Error("Failed to fetch dynamically imported module")));
    render(
      <Catcher>
        <Suspense fallback={<p>chargement</p>}>
          <Page />
        </Suspense>
      </Catcher>
    );
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).toBe("1");
    expect(screen.queryByText("erreur remontée")).toBeNull();
  });

  it("ne boucle pas : après un rechargement déjà tenté, l'erreur remonte", async () => {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    const Page = lazyPage(() => Promise.reject(new Error("Failed to fetch dynamically imported module")));
    render(
      <Catcher>
        <Suspense fallback={<p>chargement</p>}>
          <Page />
        </Suspense>
      </Catcher>
    );
    await waitFor(() => expect(screen.getByText("erreur remontée")).toBeTruthy());
    expect(reload).not.toHaveBeenCalled();
  });

  it("rend la page normalement quand le bundle est là", async () => {
    const Page = lazyPage(() => Promise.resolve({ default: () => <p>page chargée</p> }));
    render(
      <Suspense fallback={<p>chargement</p>}>
        <Page />
      </Suspense>
    );
    await waitFor(() => expect(screen.getByText("page chargée")).toBeTruthy());
    expect(reload).not.toHaveBeenCalled();
  });
});
