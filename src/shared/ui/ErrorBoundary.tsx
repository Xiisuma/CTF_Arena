
/**
 * ErrorBoundary.tsx — root React error boundary
 * Catches unhandled render errors and shows a recovery UI instead of a blank screen.
 * Must be a class component (React requirement for componentDidCatch).
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : "Erreur inattendue";
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("[CTF Arena] Unhandled render error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-primary px-4 text-center">
          <span className="text-6xl">💥</span>
          <div>
            <h1 className="text-2xl font-black text-primary">Quelque chose s'est cassé</h1>
            <p className="mt-2 text-sm text-tertiary max-w-sm">
              {this.state.message}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="rounded-xl bg-accent-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-secondary"
            >
              Réessayer
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl border border-primary bg-input px-5 py-2.5 text-sm font-semibold text-secondary transition hover:bg-card"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

