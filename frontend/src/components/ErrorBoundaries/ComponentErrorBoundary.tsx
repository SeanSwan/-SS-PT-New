/**
 * ============================================================================
 * FILE: ComponentErrorBoundary.tsx
 * PURPOSE: Widget-level error boundary that isolates crashes per component
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Wraps individual widgets (Feed, Map, Badges, Charts)
 * so that a crash in one widget does NOT unmount the entire dashboard tree.
 * Shows a compact Crystalline Error Card with retry.
 *
 * HOW IT FITS IN THE APP: Innermost error boundary layer. Used inside
 * dashboard grids, card layouts, and widget containers. Parent boundaries
 * (Data, Root) only fire if this one re-throws or is absent.
 *
 * KEY DECISIONS: Compact variant of the Crystalline Error Card for inline
 * use. Same Royal Depth + Arctic Cyan styling as DataErrorBoundary for
 * visual consistency.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ComponentErrorBoundary                           ║
 * ║  PURPOSE: Isolate widget crashes from dashboard tree         ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌──────────────────────────────┐
 * │  [Compact card, same height] │
 * │  "Widget unavailable"        │
 * │  [ Retry ]                   │
 * └──────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { children, componentName?, onError? }
 * State:     { hasError, error }
 * API Calls: None
 * Events:    onError callback (optional)
 * Children:  Single widget component
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// PURPOSE: Props and state for the component-level boundary
// ─────────────────────────────────────────────────────────────

interface ComponentErrorBoundaryProps {
  children: ReactNode;
  /** Name of the wrapped component for logging */
  componentName?: string;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ComponentErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Lightweight boundary that catches and isolates widget errors
// ─────────────────────────────────────────────────────────────

class ComponentErrorBoundary extends Component<
  ComponentErrorBoundaryProps,
  ComponentErrorBoundaryState
> {
  constructor(props: ComponentErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ComponentErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const name = this.props.componentName || 'Unknown';
    console.error(`[ComponentErrorBoundary:${name}] Widget error:`, {
      message: error.message,
      componentStack: errorInfo.componentStack,
    });
    this.props.onError?.(error, errorInfo);
  }

  /** Reset to re-render children */
  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const label = this.props.componentName || 'Widget';

    return (
      <CompactErrorCard role="alert">
        <CompactIcon aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#50A0F0" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </CompactIcon>
        <CompactTitle>{label} unavailable</CompactTitle>
        {import.meta.env.DEV && this.state.error && (
          <CompactDev>{this.state.error.message}</CompactDev>
        )}
        <CompactRetryButton onClick={this.handleRetry}>
          Retry
        </CompactRetryButton>
      </CompactErrorCard>
    );
  }
}

export default ComponentErrorBoundary;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Compact Crystalline Error Card for inline widget use
// ─────────────────────────────────────────────────────────────

const CompactErrorCard = styled.div`
  background: #003080; /* Royal Depth */
  border: 1px solid #50A0F0; /* Arctic Cyan */
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  color: #E0ECF4; /* Frost White */
  font-family: 'Plus Jakarta Sans', sans-serif;
  width: 100%;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  @supports (backdrop-filter: blur(8px)) {
    background: rgba(0, 48, 128, 0.85);
    backdrop-filter: blur(8px);
  }
`;

const CompactIcon = styled.div`
  flex-shrink: 0;
`;

const CompactTitle = styled.p`
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
  color: #E0ECF4;
`;

const CompactDev = styled.code`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  background: rgba(10, 10, 15, 0.5);
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const CompactRetryButton = styled.button`
  background: #8B5CF6; /* Wing Purple */
  color: #E0ECF4;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  min-height: 44px;
  min-width: 44px;
  transition: all 0.2s ease;
  box-shadow: 0 0 10px rgba(96, 192, 240, 0.25);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
      inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }
`;
