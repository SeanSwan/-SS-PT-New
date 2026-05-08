/**
 * CoachIntakeQueueScopeTabs.test.tsx
 * ==================================
 * Locks operational queue filters for the Coach intake workspace.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeQueueScopeTabs from './CoachIntakeQueueScopeTabs';

describe('CoachIntakeQueueScopeTabs', () => {
  it('renders operational scope counts and requests the selected backend scope', () => {
    const onScopeChange = vi.fn();

    render(
      <CoachIntakeQueueScopeTabs
        activeScope="actionable"
        onScopeChange={onScopeChange}
        summary={{
          total: 9,
          actionable: 7,
          today: 2,
          unprocessed: 3,
          needsClarification: 2,
          duplicateHold: 1,
          processing: 1,
          readyReview: 2,
          failed: 1,
          needsClient: 4,
        }}
      />,
    );

    expect(screen.getByRole('button', { name: /actionable 7/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /ready 2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /needs client 4/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /needs clarity 2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /duplicate hold 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /failed 1/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /needs clarity 2/i }));

    expect(onScopeChange).toHaveBeenCalledWith('needs_clarification');
  });
});
