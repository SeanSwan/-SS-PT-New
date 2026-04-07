/**
 * ============================================================================
 * FILE: TabErrorBoundary.tsx
 * PURPOSE: Lightweight error boundary for wrapping dashboard tab content
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Catches render errors in tab children and displays a
 * friendly Crimson Frost error card with a retry button, preventing a single
 * broken tab from crashing the entire dashboard.
 *
 * HOW IT FITS IN THE APP: Wraps each tab's content in the admin/client/trainer
 * dashboards. Parent passes tabName for the error message.
 *
 * KEY DECISIONS: Class component is required because React error boundaries
 * only work with componentDidCatch / getDerivedStateFromError lifecycle.
 * Uses the Crimson Frost error pattern from the design system handoff.
 */

import React from 'react';
import styled from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Props & State
// PURPOSE: Public API and internal error tracking state
// ─────────────────────────────────────────────────────────────

export interface TabErrorBoundaryProps {
  /** Name of the tab, shown in the error message */
  tabName: string;
  /** Content to render when no error */
  children: React.ReactNode;
  /** Optional custom fallback UI instead of the default error card */
  fallback?: React.ReactNode;
}

interface TabErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Crimson Frost error card styling
// WHY: Matches design system handoff — Graphite bg + 4px Crimson
//      Frost left border + Frost White text
// ─────────────────────────────────────────────────────────────

const ErrorCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  padding: 24px;
  background: rgba(26, 26, 36, 0.95);
  border-left: 4px solid #c92a54;
  border-radius: 8px;
  margin: 16px;
`;

const ErrorHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

/**
 * Inline SVG alert-triangle icon to avoid hard dependency on lucide-react.
 * If lucide-react is already bundled, consumers can pass a custom fallback
 * with the AlertTriangle icon instead.
 */
const AlertIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#C92A54"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ErrorTitle = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #e0ecf4);
  margin: 0;
`;

const ErrorDetail = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-muted, #94a3b8);
  margin: 0;
  line-height: 1.5;
  word-break: break-word;
`;

const RetryButton = styled.button`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #e0ecf4;
  background: var(--bg-elevated, #1a1a24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.2));
  border-radius: 8px;
  padding: 0 20px;
  min-height: 44px;
  min-width: 44px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: var(--bg-surface, #141419);
    border-color: var(--accent-primary, #60c0f0);
  }

  &:focus-visible {
    outline: 2px solid #60c0f0;
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
      inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Error Boundary Class Component
// PURPOSE: Catches render errors and shows recovery UI
// WHY: React requires class components for error boundaries
// ─────────────────────────────────────────────────────────────

/**
 * TabErrorBoundary wraps tab content and catches render errors.
 * Displays a Crimson Frost error card with retry instead of
 * crashing the entire dashboard.
 *
 * @example
 * <TabErrorBoundary tabName="Schedule">
 *   <ScheduleTab />
 * </TabErrorBoundary>
 */
class TabErrorBoundary extends React.Component<
  TabErrorBoundaryProps,
  TabErrorBoundaryState
> {
  // Instance-level flag prevents React 18 Strict Mode double-invoke
  // from reporting the same error twice. NOT a global window flag —
  // each boundary tracks its own reporting independently.
  private reported = false;

  constructor(props: TabErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): TabErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (this.reported) return;
    this.reported = true;

    console.error(
      `[TabErrorBoundary] Error in "${this.props.tabName}" tab:`,
      error,
      errorInfo.componentStack
    );
  }

  /** Resets error state so the children re-mount and retry */
  handleRetry = (): void => {
    this.reported = false;
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Allow consumers to provide a fully custom fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorCard role="alert">
          <ErrorHeader>
            <AlertIcon />
            <ErrorTitle>
              Something went wrong in {this.props.tabName}
            </ErrorTitle>
          </ErrorHeader>
          {this.state.error?.message && (
            <ErrorDetail>{this.state.error.message}</ErrorDetail>
          )}
          <RetryButton type="button" onClick={this.handleRetry}>
            Try Again
          </RetryButton>
        </ErrorCard>
      );
    }

    return this.props.children;
  }
}

export { TabErrorBoundary };
export default TabErrorBoundary;
