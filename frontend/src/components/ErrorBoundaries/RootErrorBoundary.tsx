/**
 * ============================================================================
 * FILE: RootErrorBoundary.tsx
 * PURPOSE: Top-level error boundary wrapping the entire application
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Catches any unhandled React error at the app root,
 * logs the error, clears storage, and provides a recovery path via
 * history.back() or a full navigation reset to '/'.
 *
 * HOW IT FITS IN THE APP: Wraps <App /> in index.tsx / main.tsx. If a child
 * error boundary (Data or Component) fails to catch, this is the last resort.
 *
 * KEY DECISIONS: Class component required (React error boundaries don't
 * support hooks). Styled-components for Crystalline Swan theming.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: RootErrorBoundary                                ║
 * ║  PURPOSE: Last-resort error boundary for entire app          ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │  [Full viewport, Midnight Sapphire bg]                      │
 * │                                                              │
 * │        [Shattered Swan watermark, rotated, faded]           │
 * │                                                              │
 * │        "Something shattered."                                │
 * │        "We've logged the error and are recovering."         │
 * │                                                              │
 * │        [ Go Back ]   [ Return Home ]                        │
 * │                                                              │
 * │        (Dev: error details collapsible)                      │
 * └────────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { children: ReactNode }
 * State:     { hasError, error, errorInfo }
 * API Calls: None (app may be broken)
 * Events:    None
 * Children:  None (fallback UI only)
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// PURPOSE: Props and state interfaces for the class component
// ─────────────────────────────────────────────────────────────

interface RootErrorBoundaryProps {
  children: ReactNode;
}

interface RootErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Class-based error boundary (required by React API)
// ─────────────────────────────────────────────────────────────

class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  constructor(props: RootErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<RootErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[RootErrorBoundary] Fatal error:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });
    this.setState({ errorInfo });
  }

  /** Clear storage and navigate back; fallback to home if back fails */
  handleGoBack = (): void => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Storage may be unavailable
    }
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  /** Hard reset to homepage */
  handleGoHome = (): void => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Storage may be unavailable
    }
    window.location.href = '/';
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Container>
        <ShatteredSwan src="/Logo.png" alt="" aria-hidden="true" />
        <Content>
          <Title>Something shattered.</Title>
          <Message>
            We&apos;ve logged the error and are recovering. Try going back
            or returning to the homepage.
          </Message>
          {import.meta.env.DEV && this.state.error && (
            <Details>
              <summary>Error Details (Dev)</summary>
              <Pre>{this.state.error.message}</Pre>
              <Pre>{this.state.error.stack}</Pre>
            </Details>
          )}
          <Actions>
            <PrimaryButton onClick={this.handleGoBack}>
              Go Back
            </PrimaryButton>
            <SecondaryButton onClick={this.handleGoHome}>
              Return Home
            </SecondaryButton>
          </Actions>
        </Content>
      </Container>
    );
  }
}

export default RootErrorBoundary;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Crystalline Swan themed fallback UI
// ─────────────────────────────────────────────────────────────

const subtlePulse = keyframes`
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.45; }
`;

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #002060; /* Midnight Sapphire */
  color: #E0ECF4; /* Frost White */
  padding: 2rem;
  position: relative;
  overflow: hidden;
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

/** Shattered Swan watermark — broken clip-path + grayscale */
const ShatteredSwan = styled.img`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 320px;
  height: auto;
  transform: translate(-50%, -50%) rotate(-5deg) scale(0.95);
  filter: grayscale(100%) brightness(0.8)
    drop-shadow(0 0 15px rgba(96, 192, 240, 0.4));
  clip-path: polygon(0 0, 100% 0, 80% 40%, 100% 100%, 0 100%, 20% 60%);
  opacity: 0.4;
  animation: ${subtlePulse} 4s ease-in-out infinite;
  pointer-events: none;
  user-select: none;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    opacity: 0.35;
  }
`;

const Content = styled.div`
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 480px;
  background: rgba(0, 48, 128, 0.6); /* Royal Depth translucent */
  border-radius: 16px;
  padding: 3rem 2rem;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(96, 192, 240, 0.2); /* Ice Wing border */

  @supports not (backdrop-filter: blur(12px)) {
    background: rgba(0, 48, 128, 0.95);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 1rem;
  color: #E0ECF4; /* Frost White */
`;

const Message = styled.p`
  font-size: 1rem;
  line-height: 1.6;
  margin: 0 0 2rem;
  opacity: 0.9;
`;

const Details = styled.details`
  text-align: left;
  background: rgba(10, 10, 15, 0.5); /* Obsidian Black translucent */
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 2rem;

  summary {
    cursor: pointer;
    font-weight: 600;
    margin-bottom: 0.5rem;
    min-height: 44px;
    display: flex;
    align-items: center;
  }
`;

const Pre = styled.pre`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  overflow-x: auto;
  margin: 0.5rem 0;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem;
  border-radius: 4px;
  color: #E0ECF4;
`;

const Actions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`;

const PrimaryButton = styled.button`
  background: #002060; /* Midnight Sapphire */
  color: #E0ECF4;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  min-height: 48px;
  min-width: 48px;
  transition: all 0.2s ease;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.3); /* Wing Purple glow */

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
      inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }
`;

const SecondaryButton = styled.button`
  background: rgba(224, 236, 244, 0.1);
  color: #E0ECF4;
  border: 1px solid rgba(224, 236, 244, 0.3);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  min-height: 48px;
  min-width: 48px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(224, 236, 244, 0.2);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
      inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }
`;
