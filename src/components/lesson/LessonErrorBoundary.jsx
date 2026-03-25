import { Component } from "react";

export default class LessonErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[LessonError]", error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="screen" style={{
          background: "var(--c-bg)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 32,
          textAlign: "center",
        }}>
          <span style={{ fontSize: 40 }}>{"\uD83D\uDCD6"}</span>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--c-text)" }}>
            Something went wrong
          </p>
          <p style={{ fontSize: 14, color: "var(--c-text-soft)", lineHeight: 1.5 }}>
            This lesson hit an unexpected error. Your progress on previous lessons is safe.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onBack?.();
            }}
            style={{ marginTop: 8 }}
          >
            Back to lessons
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
