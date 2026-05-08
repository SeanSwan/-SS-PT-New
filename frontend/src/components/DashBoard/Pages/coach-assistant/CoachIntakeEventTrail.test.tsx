/**
 * CoachIntakeEventTrail.test.tsx
 * ==============================
 * Verifies the active Coach intake panel shows sanitized audit history.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeEventTrail from './CoachIntakeEventTrail';
import { listCoachIntakeEvents } from '../../../../services/coachIntakeService';

vi.mock('../../../../services/coachIntakeService', () => ({
  listCoachIntakeEvents: vi.fn(),
}));

describe('CoachIntakeEventTrail', () => {
  it('renders recent sanitized Coach intake events', async () => {
    vi.mocked(listCoachIntakeEvents).mockResolvedValue({
      intakeId: '11111111-1111-4111-8111-111111111111',
      limit: 8,
      events: [
        {
          id: 'event-1',
          actorType: 'model',
          eventType: 'proposal_applied',
          createdAt: '2026-05-07T10:00:00.000Z',
          summary: {
            action: 'proposal_status_changed',
            proposalType: 'workout_log',
            status: 'APPLIED',
            clientName: 'Marcus',
            rawTranscript: 'private transcript',
          },
        },
        {
          id: 'event-2',
          actorType: 'user',
          eventType: 'confirm_audio_order',
          createdAt: '2026-05-07T09:58:00.000Z',
          summary: {
            action: 'confirm_audio_order',
            pieceCount: 3,
            bundleCount: 2,
          },
        },
      ],
    });

    render(<CoachIntakeEventTrail intakeId="11111111-1111-4111-8111-111111111111" />);

    expect(await screen.findByLabelText(/Coach intake activity trail/i)).toBeInTheDocument();
    expect(screen.getByText(/proposal applied/i)).toBeInTheDocument();
    expect(screen.getByText(/proposalType: workout_log/i)).toBeInTheDocument();
    expect(screen.getByText(/pieceCount: 3/i)).toBeInTheDocument();
    expect(screen.queryByText(/Marcus|private transcript|clientName|rawTranscript/i)).toBeNull();
  });

  it('shows a compact empty state when no events exist', async () => {
    vi.mocked(listCoachIntakeEvents).mockResolvedValue({
      intakeId: '11111111-1111-4111-8111-111111111111',
      limit: 8,
      events: [],
    });

    render(<CoachIntakeEventTrail intakeId="11111111-1111-4111-8111-111111111111" />);

    await waitFor(() => expect(listCoachIntakeEvents).toHaveBeenCalled());
    expect(screen.getByText(/No activity recorded yet/i)).toBeInTheDocument();
  });

  it('clears stale events when the active intake changes', async () => {
    const secondRequest = new Promise<never>(() => {});
    vi.mocked(listCoachIntakeEvents)
      .mockResolvedValueOnce({
        intakeId: '11111111-1111-4111-8111-111111111111',
        limit: 8,
        events: [
          {
            id: 'event-1',
            actorType: 'model',
            eventType: 'proposal_applied',
            createdAt: '2026-05-07T10:00:00.000Z',
            summary: { status: 'APPLIED' },
          },
        ],
      })
      .mockReturnValueOnce(secondRequest);

    const { rerender } = render(<CoachIntakeEventTrail intakeId="11111111-1111-4111-8111-111111111111" />);

    expect(await screen.findByText(/proposal applied/i)).toBeInTheDocument();

    rerender(<CoachIntakeEventTrail intakeId="22222222-2222-4222-8222-222222222222" />);

    expect(await screen.findByText(/Loading activity/i)).toBeInTheDocument();
    expect(screen.queryByText(/proposal applied/i)).toBeNull();
  });

  it('does not fetch activity for non-persisted synthetic ids', () => {
    vi.mocked(listCoachIntakeEvents).mockClear();

    const { container } = render(<CoachIntakeEventTrail intakeId="item-1" />);

    expect(container).toBeEmptyDOMElement();
    expect(listCoachIntakeEvents).not.toHaveBeenCalled();
  });
});
