import { Component, createRef } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { buildResetUrl } from "./error-boundary-reset-url.ts";
import { UI_TEXT as text } from "./text.ts";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// The app's only React error boundary. getDerivedStateFromError/componentDidCatch have
// no hook equivalent, which is why this one component is not a function. Catches render
// errors below it that would otherwise leave a blank page, and offers a reload or a
// reset that discards the saved game (see APP_CONFIG.saveResetQueryParam and
// game-app.tsx's loadOrResetGame).
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private readonly headingRef = createRef<HTMLHeadingElement>();

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // oxlint-disable-next-line no-console -- only surviving trace of a caught render error.
    console.error(error, errorInfo.componentStack);
  }

  componentDidUpdate(
    _prevProps: ErrorBoundaryProps,
    prevState: ErrorBoundaryState,
  ): void {
    if (!prevState.hasError && this.state.hasError) {
      this.headingRef.current?.focus();
    }
  }

  componentDidMount(): void {
    if (this.state.hasError) {
      this.headingRef.current?.focus();
    }
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleReset = (): void => {
    window.location.assign(buildResetUrl(window.location.href));
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <main className="main start">
        <h1 className="hero-title" tabIndex={-1} ref={this.headingRef}>
          {text.errorBoundary.title}
        </h1>
        <p className="lead">{text.errorBoundary.message}</p>
        <button
          type="button"
          className="primary start-button"
          onClick={this.handleReload}
        >
          {text.errorBoundary.reload}
        </button>
        <button
          type="button"
          className="action-button"
          onClick={this.handleReset}
        >
          {text.errorBoundary.reset}
        </button>
      </main>
    );
  }
}
