/**
 * ============================================================================
 * FILE: DataErrorBoundary.tsx
 * PURPOSE: Error boundary for data-fetching sections with retry capability
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Wraps sections that fetch data (API calls, async loads).
 * On error, shows a Crystalline Error Card with a "Recalibrate" retry button
 * that resets the boundary and re-renders children.
 *
 * HOW IT FITS IN THE APP: Used inside page layouts around data-dependent
 * sections. Sits between RootErrorBoundary (parent) and
 * ComponentErrorBoundary (child).
 *
 * KEY DECISIONS: Uses resetErrorBoundary pattern via state reset. Retry
 * counter prevents infinite loops. Styled with Royal Depth card + Arctic
 * Cyan border per AI Village consensus.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: DataErrorBoundary                                ║
 * ║  PURPOSE: Catch data-fetching errors with retry              ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────┐
 * │  [Royal Depth card, Arctic Cyan border]│
 * │  "Data stream interrupted"             │
 * │  "Unable to load this section."        │
 * │                                        │
 * │  [ Recalibrate ]                       │
 * └────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { children, fallbackTitle?, fallbackMessage?, onError? }
 * State:     { hasError, error, retryCount }
 * API Calls: None
 * Events:    onError callback (optional)
 * Children:  Wrapped data-fetching components
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// PURPOSE: Props and state for the data error boundary
// ─────────────────────────────────────────────────────────────

interface DataErrorBoundaryProps {
  children: ReactNode;
  /** Override the default error card title */
  fallbackTitle?: string;
  /** Override the default error card message */
  fallbackMessage?: string;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface DataErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/** Maximum automatic retries before requiring manual page reload */
const MAX_RETRIES = 3;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Class-based error boundary with retry logic
// ─────────────────────────────────────────────────────────────

class DataErrorBoundary extends Component<DataErrorBoundaryProps, DataErrorBoundaryState> {
  constructor(props: DataErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<DataErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[DataErrorBoundary] Data fetch error:', {
      message: error.message,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
    });
    this.props.onError?.(error, errorInfo);
  }

  /** Reset boundary state to re-render children (retry) */
  handleRetry = (): void => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const {
      fallbackTitle = 'Data stream interrupted',
      fallbackMessage = 'Unable to load this section. The data source may be temporarily unavailable.',
    } = this.props;

    const canRetry = this.state.retryCount < MAX_RETRIES;

    return (
      <ErrorCard role="alert">
        <ErrorIcon aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#50A0F0" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </ErrorIcon>
        <ErrorTitle>{fallbackTitle}</ErrorTitle>
        <ErrorMessage>{fallbackMessage}</ErrorMessage>
        {import.meta.env.DEV && this.state.error && (
          <DevInfo>{this.state.error.message}</DevInfo>
        )}
        {canRetry ? (
          <RetryButton onClick={this.handleRetry}>
            Recalibrate
          </RetryButton>
        ) : (
          <RetryExhausted>
            Retries exhausted. Please refresh the page.
          </RetryExhausted>
        )}
      </ErrorCard>
    );
  }
}

export default DataErrorBoundary;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Crystalline Error Card per AI Village design consensus
// ─────────────────────────────────────────────────────────────

const ErrorCard = styled.div`
  background: #003080; /* Royal Depth */
  border: 1px solid #50A0F0; /* Arctic Cyan */
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  color: #E0ECF4; /* Frost White */
  font-family: 'Plus Jakarta Sans', sans-serif;
  max-width: 480px;
  margin: 2rem auto;

  @supports (backdrop-filter: blur(8px)) {
    background: rgba(0, 48, 128, 0.85);
    backdrop-filter: blur(8px);
  }
`;

const ErrorIcon = styled.div`
  margin-bottom: 1rem;
`;

const ErrorTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: #E0ECF4;
`;

const ErrorMessage = styled.p`
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 1.5rem;
  opacity: 0.85;
`;

const DevInfo = styled.pre`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  background: rgba(10, 10, 15, 0.5); /* Obsidian Black */
  border-radius: 6px;
  padding: 0.75rem;
  margin: 0 0 1.5rem;
  text-align: left;
  overflow-x: auto;
  color: #E0ECF4;
`;

const RetryButton = styled.button`
  background: #8B5CF6; /* Wing Purple */
  color: #E0ECF4;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  min-height: 48px;
  min-width: 48px;
  transition: all 0.2s ease;
  box-shadow: 0 0 12px rgba(96, 192, 240, 0.3); /* Ice Wing glow on purple btn */

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 20px rgba(96, 192, 240, 0.5);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
      inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }
`;

const RetryExhausted = styled.p`
  font-size: 0.85rem;
  opacity: 0.7;
  font-style: italic;
`;
