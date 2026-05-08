import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';
import { isCommandLaneCandidate } from '../../../../hooks/aiMessageLimits';

function makeQueue({ needsOrderingReview = false, needsClient = false } = {}) {
  const intakeId = '77777777-7777-4777-9777-777777777777';
  return {
    items: [{
      id: `coach:${intakeId}`,
      entityId: intakeId,
      kind: 'coach_intake',
      title: 'Confirmed audio workout note',
      sourceLabel: 'Coach voice note',
      queueStatus: 'ready_review',
      clientName: needsClient ? null : 'Client 12',
      clipCount: 2,
      canReview: true,
      needsClient,
      timelineAt: '2026-05-06T16:30:00.000Z',
      audioPuzzle: {
        pieceCount: 2,
        bundleCount: 1,
        autoBundleCount: 1,
        needsOrderingReview,
        confidence: 'medium',
      },
    }],
    summary: {
      total: 1,
      actionable: 1,
      today: 1,
      unprocessed: 0,
      processing: 0,
      readyReview: 1,
      failed: 0,
      needsClient: needsClient ? 1 : 0,
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  };
}

describe('CoachIntakeWorkspace draft review bridge', () => {
  it('prompts Coach to prepare a structured proposal after audio order is clear', () => {
    const onCommandPrompt = vi.fn();

    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={onCommandPrompt}
          queue={makeQueue()}
          activeIntakeId="77777777-7777-4777-9777-777777777777"
        />
      </MemoryRouter>,
    );

    const target = screen.getByLabelText(/Active review target/i);
    fireEvent.click(within(target).getByRole('button', { name: /prepare draft review/i }));

    expect(onCommandPrompt).toHaveBeenCalledTimes(1);
    const prompt = onCommandPrompt.mock.calls[0][0];
    expect(prompt).toContain('Prepare structured Coach draft review for intake 77777777-7777-4777-9777-777777777777');
    expect(prompt).toContain('"intake_id": "77777777-7777-4777-9777-777777777777"');
    expect(prompt).toContain('coach_action_proposal clarification');
    expect(prompt).toContain('split_plan or workout_log draft');
    expect(prompt).toContain('Do not write');
    expect(isCommandLaneCandidate(prompt)).toBe(false);
  });

  it('does not offer draft preparation before audio order is confirmed', () => {
    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={makeQueue({ needsOrderingReview: true })}
          activeIntakeId="77777777-7777-4777-9777-777777777777"
        />
      </MemoryRouter>,
    );

    const target = screen.getByLabelText(/Active review target/i);
    expect(within(target).queryByRole('button', { name: /prepare draft review/i })).toBeNull();
    expect(within(target).getByRole('button', { name: /confirm audio order/i })).toBeInTheDocument();
  });
});
