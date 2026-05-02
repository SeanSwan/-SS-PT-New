/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { PanelErrorBoundary } from './PanelErrorBoundary';
import React from 'react';

// ─────────────────────────────────────────────────────────────
// W1A-5 (2026-05-01) regression test for PanelErrorBoundary.
//
// Production concern: top-level App.tsx ErrorBoundary white-screens
// the WHOLE dashboard when AITerminalPanel (lazy) throws on load.
// PanelErrorBoundary catches the failure inline so the rest of the
// dashboard stays interactive.
// ─────────────────────────────────────────────────────────────

const Boom: React.FC<{ trigger?: boolean }> = ({ trigger = true }) => {
  if (trigger) throw new Error('panel-internal-failure');
  return <div data-testid="ok-panel">OK</div>;
};

describe('PanelErrorBoundary', () => {
  beforeEach(() => {
    cleanup();
    // React's default error-boundary behavior writes errors to console.
    // Silence to keep test output clean. Real logApiError still runs
    // but its console.error is also spied here to keep output silent.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children normally when no error', () => {
    render(
      <PanelErrorBoundary panelName="Test Panel">
        <Boom trigger={false} />
      </PanelErrorBoundary>,
    );
    expect(screen.getByTestId('ok-panel')).toBeInTheDocument();
  });

  it('catches a child error and renders the inline fallback', () => {
    render(
      <PanelErrorBoundary panelName="Test Panel">
        <Boom trigger={true} />
      </PanelErrorBoundary>,
    );
    // Fallback present
    expect(screen.getByText('Test Panel unavailable')).toBeInTheDocument();
    expect(screen.getByText(/rest of the page is still working/i)).toBeInTheDocument();
    // Boom did NOT bubble — child not rendered
    expect(screen.queryByTestId('ok-panel')).not.toBeInTheDocument();
  });

  it('Retry button resets and re-renders children', () => {
    let trigger = true;
    const Toggle: React.FC = () => {
      if (trigger) throw new Error('first-time-fails');
      return <div data-testid="recovered">recovered</div>;
    };

    const { rerender } = render(
      <PanelErrorBoundary panelName="Test Panel">
        <Toggle />
      </PanelErrorBoundary>,
    );
    // Initial throw → fallback
    expect(screen.getByText('Test Panel unavailable')).toBeInTheDocument();

    // Flip the trigger and click Retry
    trigger = false;
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    // After reset the boundary re-renders children which now succeed.
    // (rerender ensures React picks up the latest closure value.)
    rerender(
      <PanelErrorBoundary panelName="Test Panel">
        <Toggle />
      </PanelErrorBoundary>,
    );
    expect(screen.getByTestId('recovered')).toBeInTheDocument();
  });

  it('uses custom fallback when provided', () => {
    render(
      <PanelErrorBoundary
        panelName="Test Panel"
        fallback={(_reset, name) => <div data-testid="custom-fb">custom: {name}</div>}
      >
        <Boom trigger={true} />
      </PanelErrorBoundary>,
    );
    expect(screen.getByTestId('custom-fb')).toHaveTextContent('custom: Test Panel');
  });

  it('Retry button has accessible label and is keyboard-focusable', () => {
    render(
      <PanelErrorBoundary panelName="Swan Coach Assistant">
        <Boom trigger={true} />
      </PanelErrorBoundary>,
    );
    const btn = screen.getByRole('button', { name: /retry/i });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.getAttribute('type')).toBe('button');
  });
});
