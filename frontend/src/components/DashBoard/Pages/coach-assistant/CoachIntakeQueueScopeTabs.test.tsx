import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeQueueScopeTabs from './CoachIntakeQueueScopeTabs';
import type { PlaudIntakeSummary } from '../../../../services/plaudIntakeService';

const summary: PlaudIntakeSummary = {
  total: 12,
  actionable: 3,
  today: 4,
  unprocessed: 2,
  processing: 1,
  readyReview: 5,
  needsClarification: 6,
  duplicateHold: 7,
  failed: 1,
  needsClient: 2,
};

describe('CoachIntakeQueueScopeTabs', () => {
  it('promotes the four operator-first filters before secondary states', () => {
    const onScopeChange = vi.fn();

    render(
      <CoachIntakeQueueScopeTabs
        activeScope="actionable"
        summary={summary}
        onScopeChange={onScopeChange}
      />,
    );

    expect(screen.getByRole('button', { name: /actionable 3/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /ready 5/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /needs client 2/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /failed 1/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: /duplicate hold 7/i })).toBeNull();

    fireEvent.click(screen.getByText(/more filters/i));
    fireEvent.click(screen.getByRole('button', { name: /duplicate hold 7/i }));

    expect(onScopeChange).toHaveBeenCalledWith('duplicate_hold');
  });

  it('opens secondary filters when a secondary scope is active', () => {
    render(
      <CoachIntakeQueueScopeTabs
        activeScope="processing"
        summary={summary}
      />,
    );

    expect(screen.getByRole('button', { name: /processing 1/i })).toHaveAttribute('aria-pressed', 'true');
  });
});
