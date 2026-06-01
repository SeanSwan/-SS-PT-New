/**
 * ============================================================================
 * FILE: ErrorBoundary.tsx
 * PURPOSE: Error boundary wrapper for the UserDashboard component tree
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Catches React rendering errors in the UserDashboard
 * subtree and displays a recovery UI with a local retry button.
 * HOW IT FITS IN THE APP: Wraps the entire UserDashboard in the orchestrator
 * KEY DECISIONS: Class component required for getDerivedStateFromError lifecycle
 */

import React from 'react';

/**
 * ┌─── SUB-COMPONENT: ErrorBoundary ──────────────────────────┐
 * | PARENT: UserDashboard                                      |
 * | PURPOSE: Catch render errors and show recovery UI          |
 * | WIREFRAME:                                                 |
 * | +------------------------------------------+               |
 * | |  Something went wrong                    |               |
 * | |  Retry this panel without leaving.        |               |
 * | |  [Try Again]                             |               |
 * | +------------------------------------------+               |
 * | Props: { children: React.ReactNode }                       |
 * | CLICK-OUTCOMES:                                            |
 * | [Try Again] -> clears local boundary state                 |
 * +------------------------------------------------------------+
 */
class UserDashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          padding: '2rem',
          textAlign: 'center'
          }}>
          <h2>Something went wrong</h2>
          <p>Retry this dashboard panel without leaving the page.</p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #60C0F0, #8B5CF6)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600',
              minHeight: '44px'
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default UserDashboardErrorBoundary;
