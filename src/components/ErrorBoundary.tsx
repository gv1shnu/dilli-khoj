import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Catches render-time crashes anywhere below it. Without this, a throw during
 * render unmounts the whole tree to a blank screen; here the player gets a calm
 * message and a way out, while the full error + component stack go to the
 * console and the "Technical details" toggle for developers.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const detail = [error.message, error.stack].filter(Boolean).join("\n\n");
    return (
      <main className="gate-backdrop">
        <div className="gate-card gate-card--error">
          <h1>Something broke</h1>
          <p role="alert">
            The game hit an unexpected error and stopped. Reloading usually fixes
            it — your progress is saved.
          </p>
          <button onClick={() => window.location.reload()}>Reload</button>
          {detail && (
            <details className="error-details">
              <summary>Technical details</summary>
              <pre>{detail}</pre>
            </details>
          )}
        </div>
      </main>
    );
  }
}
