import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

// A page that throws while rendering (or fails to load its code chunk) used to
// leave a blank screen. This catches it and shows a branded message with a way
// forward instead. Keyed by pathname below, so moving to another page clears it.
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Page failed to render", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main>
        <section className="band center" style={{ minHeight: "70svh", display: "flex", alignItems: "center" }}>
          <div className="wrap" role="alert">
            <div className="eyebrow">Something went wrong</div>
            <div className="rule center" />
            <h1 style={{ maxWidth: "20ch", margin: "0 auto" }}>
              This page <span className="it">didn't open.</span>
            </h1>
            <p className="lede" style={{ margin: "18px auto 0", maxWidth: "44ch" }}>
              It's on our side, not yours. Try again in a moment, or head back home and carry on from there.
            </p>
            <div className="btn-row center" style={{ marginTop: 28 }}>
              <button type="button" className="btn btn-gold" onClick={() => window.location.reload()}>
                Try again
              </button>
              <Link className="btn" to="/">
                Back to home
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }
}

export default function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <Boundary key={pathname}>{children}</Boundary>;
}
