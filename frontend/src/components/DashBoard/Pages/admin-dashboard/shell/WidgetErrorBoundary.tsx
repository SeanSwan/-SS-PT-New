/**
 * WidgetErrorBoundary
 * ─────────────────────────────────────────────────────────────
 * SWA-138 S1 — per-widget crash isolation for the admin Command
 * Center. One widget throwing must degrade to a labeled
 * "unavailable" card, never white-screen the whole overview.
 */

import React from 'react';
import { StyledBox } from '@/components/ui/StyledBox';
import { CommandCard } from '../AdminDashboardCards';
import { ErrorState, RetryButton } from './WidgetShell.styles';

interface WidgetErrorBoundaryProps {
  /** Human label shown in the fallback, e.g. "Revenue chart". */
  name: string;
  children: React.ReactNode;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
}

class WidgetErrorBoundary extends React.Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(`[WidgetErrorBoundary] ${this.props.name} crashed:`, error, info);
  }

  handleReset = (): void => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <StyledBox
        as={CommandCard}
        $style={{ padding: '2rem', height: '100%', marginBottom: '1.5rem' }}
      >
        <ErrorState role="alert" aria-live="polite">
          <span>{this.props.name} is unavailable — it hit an internal error.</span>
          <RetryButton type="button" onClick={this.handleReset}>
            Try again
          </RetryButton>
        </ErrorState>
      </StyledBox>
    );
  }
}

export default WidgetErrorBoundary;
