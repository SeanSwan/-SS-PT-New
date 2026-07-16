/**
 * Panel-scoped error boundary.
 *
 * Why this exists: 2026-05-01 W1A-5. The top-level ErrorBoundary at
 * App.tsx:224 wraps the entire dashboard router. When a lazy panel like
 * AITerminalPanel fails to load (network error on chunk fetch, runtime
 * error in panel code), the unhandled rejection bubbles to the top-level
 * boundary and white-screens the WHOLE dashboard.
 *
 * This component catches errors locally so a panel failure stays scoped to
 * the panel. The dashboard around it stays interactive. The user sees a
 * compact inline message with an optional retry, not a full-page crash UI.
 *
 * Usage:
 *   <PanelErrorBoundary panelName="AI Terminal">
 *     <Suspense fallback={null}>
 *       <SomeLazyPanel />
 *     </Suspense>
 *   </PanelErrorBoundary>
 *
 * Design discipline: rule 6 (var(--token, #fallback)), rule 22 (premium
 * feel — no template/generic), rule 25 (no motion that disrespects
 * prefers-reduced-motion).
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';
import { logApiError } from '@/utils/logApiError';

interface Props {
  children: ReactNode;
  panelName: string;
  /** Optional override of the inline fallback. Receives reset() to retry. */
  fallback?: (reset: () => void, panelName: string) => ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

const Box = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.2));
  border-radius: 10px;
  background: var(--bg-surface, rgba(0, 32, 96, 0.4));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  line-height: 1.4;
`;

const Title = styled.div`
  font-weight: 600;
  color: var(--accent-warning, #C6A84B);
`;

const Message = styled.div`
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  font-size: 0.78rem;
`;

const RetryButton = styled.button`
  min-height: 36px;
  padding: 8px 14px;
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export class PanelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: typeof error?.message === 'string' ? error.message : 'Unknown error',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Sanitized log — no JWT or PII leakage. info.componentStack is fine
    // (path through React tree, no user data).
    logApiError(`[PanelErrorBoundary:${this.props.panelName}]`, {
      message: error?.message,
      stack: error?.stack,
      componentStack: info?.componentStack,
    });
  }

  reset = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback(this.reset, this.props.panelName);

    return (
      <Box role="alert" aria-live="polite">
        <Title>{this.props.panelName} unavailable</Title>
        <Message>
          This panel hit an error and couldn&apos;t load. The rest of the page is still working.
        </Message>
        <RetryButton type="button" onClick={this.reset}>
          Retry
        </RetryButton>
      </Box>
    );
  }
}

export default PanelErrorBoundary;
