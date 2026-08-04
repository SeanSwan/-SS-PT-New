/**
 * TabErrorBoundary.tsx
 * ====================
 * Per-tab error boundary for the universal dashboard shell (all roles).
 *
 * Launch-audit shared-infra P1 (Lane 2, 2026-08-03): before this, the only
 * router-level boundary lived at the root of main-routes — one throwing tab
 * component ejected the ENTIRE dashboard (the 2026-04-12 rule-43 incident
 * class). Now a crash degrades to an in-shell card; every other tab keeps
 * working and the user can retry in place.
 *
 * Class component by necessity: componentDidCatch has no hook equivalent.
 */
import React from 'react';
import styled from 'styled-components';

const BoundaryCard = styled.div`
  margin: 24px;
  padding: 32px 24px;
  border-radius: 14px;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  color: var(--text-primary, #E0ECF4);
  text-align: center;

  h2 {
    margin: 0 0 8px;
    font-size: 1.1rem;
  }

  p {
    margin: 0 0 20px;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent);
    font-size: 0.9rem;
  }
`;

const RetryButton = styled.button`
  min-height: 44px;
  min-width: 44px;
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  background: var(--accent-secondary, #8B5CF6);
  color: var(--text-primary, #E0ECF4);
  font-weight: 600;
  cursor: pointer;

  &:hover {
    box-shadow: 0 0 14px color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

interface TabErrorBoundaryProps {
  tabLabel?: string;
  children: React.ReactNode;
}

interface TabErrorBoundaryState {
  hasError: boolean;
}

class TabErrorBoundary extends React.Component<TabErrorBoundaryProps, TabErrorBoundaryState> {
  state: TabErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): TabErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Console only — no PII, no external reporting from the boundary itself.
    console.error(`[TabErrorBoundary] ${this.props.tabLabel || 'dashboard tab'} crashed:`, error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <BoundaryCard role="alert">
          <h2>{this.props.tabLabel ? `${this.props.tabLabel} hit an error` : 'This tab hit an error'}</h2>
          <p>The rest of the dashboard is still working. You can retry this tab or switch to another one.</p>
          <RetryButton type="button" onClick={this.handleRetry}>Retry</RetryButton>
        </BoundaryCard>
      );
    }
    return this.props.children;
  }
}

export default TabErrorBoundary;
