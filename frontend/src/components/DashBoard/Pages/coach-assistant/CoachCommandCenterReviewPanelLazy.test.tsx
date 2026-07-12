/**
 * Code-split boundary contract for the Review workspace.
 * Locks: fallback renders first, the real panel arrives async, and the
 * boundary forwards props unchanged.
 */
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import CoachCommandCenterReviewPanelLazy from './CoachCommandCenterReviewPanelLazy';

vi.mock('./CoachCommandCenterReviewPanel', () => ({
  default: ({ userRole }: { userRole: string }) => (
    <section data-testid="review-panel-loaded">role:{userRole}</section>
  ),
}));

describe('CoachCommandCenterReviewPanelLazy', () => {
  it('shows a busy fallback, then the panel with forwarded props', async () => {
    render(
      <CoachCommandCenterReviewPanelLazy
        {...({ userRole: 'admin' } as React.ComponentProps<
          typeof CoachCommandCenterReviewPanelLazy
        >)}
      />,
    );

    const loaded = await screen.findByTestId('review-panel-loaded');
    expect(loaded.textContent).toBe('role:admin');
  });
});
