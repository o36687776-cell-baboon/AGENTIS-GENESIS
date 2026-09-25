import { Component, type ErrorInfo, type ReactNode } from "react";
import { Icon } from "@/design-system/icons";
import { Card } from "@/design-system/components/Card";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  info?: ErrorInfo;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ error, info });
    console.error("🚨 GENESIS RUNTIME ERROR:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <Card surface={3} border className="m-4 p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <Icon name="x" size={20} className="text-[var(--signal-error)]" />
              <span className="font-mono text-xs uppercase tracking-[0.1em] text-[var(--signal-error)]">
                EXECUTION BLOCKED
              </span>
            </div>
            <h3 className="text-h4 font-medium text-[var(--color-off-white)]">
              {this.state.error?.message ?? "An error occurred"}
            </h3>
            {this.state.error?.stack && (
              <pre className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border border-[var(--border-subtle)] bg-[var(--color-void)] p-3 text-mono text-xs text-[var(--signal-error)]">
                {this.state.error.stack}
              </pre>
            )}
          </Card>
        )
      );
    }
    return this.props.children;
  }
}
