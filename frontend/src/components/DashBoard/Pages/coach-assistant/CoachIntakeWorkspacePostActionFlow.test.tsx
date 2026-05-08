import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';
import {
  answerCoachProposalClarification,
  approveCoachProposal,
  getCoachProposal,
  rejectCoachProposal,
} from '../../../../services/coachProposalService';

vi.mock('../../../../services/coachProposalService', () => ({
  answerCoachProposalClarification: vi.fn(),
  approveCoachProposal: vi.fn(),
  getCoachProposal: vi.fn(),
  rejectCoachProposal: vi.fn(),
}));

function makeQueue() {
  return {
    items: [{
      id: 'item-1',
      entityId: 'item-1',
      kind: 'coach_intake',
      title: 'Morning lower body notes',
      sourceLabel: 'Manual Upload',
      queueStatus: 'ready_review',
      clientName: null,
      clipCount: 3,
      canReview: true,
      needsClient: true,
      timelineAt: '2026-05-06T16:30:00.000Z',
      audioPuzzle: {
        pieceCount: 3,
        bundleCount: 2,
        autoBundleCount: 1,
        needsOrderingReview: false,
        confidence: 'low',
      },
      latestProposalId: 'proposal-1',
    }],
    summary: {
      total: 3,
      actionable: 2,
      today: 1,
      unprocessed: 1,
      processing: 0,
      readyReview: 1,
      failed: 0,
      needsClient: 1,
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  };
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="current-route">{location.pathname}{location.search}</span>;
}

function RoutedCoachIntakeWorkspace({ queue }: { queue: ReturnType<typeof makeQueue> }) {
  const location = useLocation();
  const activeIntakeId = new URLSearchParams(location.search).get('intake');
  return (
    <CoachIntakeWorkspace
      userRole="admin"
      selectedClientName={null}
      onCommandPrompt={vi.fn()}
      queue={queue}
      activeIntakeId={activeIntakeId}
    />
  );
}

describe('CoachIntakeWorkspace post-action flow', () => {
  it('opens and renders the linked prepared proposal from the active dossier', async () => {
    const queue = makeQueue();
    queue.refresh = vi.fn().mockResolvedValue([]);
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        id: 'proposal-1',
        type: 'workout_log',
        status: 'PENDING',
        title: 'Review lower body workout draft',
        summary: { clientId: 42, date: '2026-05-06', exerciseCount: 2 },
        detail: { workout: { clientId: 42, date: '2026-05-06', exercises: [{ name: 'Squat' }] } },
        reviewToken: 'review-v1.test',
      },
    });
    vi.mocked(approveCoachProposal).mockResolvedValue({
      success: true,
      applied: true,
      proposal: {
        id: 'proposal-1',
        type: 'workout_log',
        status: 'APPLIED',
        title: 'Review lower body workout draft',
        summary: { clientId: 42, date: '2026-05-06', exerciseCount: 2 },
      },
    });

    render(
      <MemoryRouter>
        <CoachIntakeWorkspace userRole="admin" selectedClientName={null} onCommandPrompt={vi.fn()} queue={queue} activeIntakeId="item-1" />
      </MemoryRouter>,
    );

    fireEvent.click(within(screen.getByLabelText(/Active review target/i)).getByRole('button', { name: /review prepared draft/i }));

    expect(await screen.findByLabelText(/Prepared draft review panel/i)).toBeInTheDocument();
    expect(getCoachProposal).toHaveBeenCalledWith('proposal-1');
    expect(await screen.findByText(/Review lower body workout draft/i)).toBeInTheDocument();
    const approveButton = screen.getByRole('button', { name: /approve and log/i });
    expect(approveButton).toBeEnabled();
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(approveCoachProposal).toHaveBeenCalledWith('proposal-1', 'review-v1.test');
      expect(queue.refresh).toHaveBeenCalled();
    });
  });

  it('closes a finished prepared draft and advances to the next actionable intake', async () => {
    const queue = makeQueue();
    const nextItem = {
      ...queue.items[0],
      id: 'item-2',
      entityId: 'item-2',
      title: 'Evening upper body notes',
      timelineAt: '2026-05-07T18:30:00.000Z',
      latestProposalId: null,
    };
    queue.items = [{ ...queue.items[0], latestProposalId: 'proposal-1' }, nextItem];
    queue.refresh = vi.fn().mockResolvedValue([nextItem]);
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        id: 'proposal-1',
        type: 'workout_log',
        status: 'PENDING',
        title: 'Review lower body workout draft',
        summary: { clientId: 42, date: '2026-05-06', exerciseCount: 2 },
        detail: { workout: { clientId: 42, date: '2026-05-06', exercises: [{ name: 'Squat' }] } },
        reviewToken: 'review-v1.test',
      },
    });
    vi.mocked(approveCoachProposal).mockResolvedValue({
      success: true,
      applied: true,
      proposal: {
        id: 'proposal-1',
        type: 'workout_log',
        status: 'APPLIED',
        title: 'Review lower body workout draft',
        summary: { clientId: 42, date: '2026-05-06', exerciseCount: 2 },
      },
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <LocationProbe />
        <RoutedCoachIntakeWorkspace queue={queue} />
      </MemoryRouter>,
    );

    fireEvent.click(within(screen.getByLabelText(/Active review target/i)).getByRole('button', { name: /review prepared draft/i }));
    fireEvent.click(await screen.findByRole('button', { name: /approve and log/i }));

    await waitFor(() => {
      expect(queue.refresh).toHaveBeenCalled();
      expect(screen.getByTestId('current-route')).toHaveTextContent('/dashboard/admin/coach-assistant?intake=item-2');
    });
    expect(screen.queryByLabelText(/Prepared draft review panel/i)).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Active intake: Evening upper body notes');
  });

  it('closes a rejected prepared draft and advances to the next actionable intake', async () => {
    const queue = makeQueue();
    const nextItem = {
      ...queue.items[0],
      id: 'item-2',
      entityId: 'item-2',
      title: 'Evening upper body notes',
      timelineAt: '2026-05-07T18:30:00.000Z',
      latestProposalId: null,
    };
    queue.items = [{ ...queue.items[0], latestProposalId: 'proposal-1' }, nextItem];
    queue.refresh = vi.fn().mockResolvedValue([nextItem]);
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        id: 'proposal-1',
        type: 'workout_log',
        status: 'PENDING',
        title: 'Review lower body workout draft',
        summary: { clientId: 42, date: '2026-05-06', exerciseCount: 2 },
        detail: { workout: { clientId: 42, date: '2026-05-06', exercises: [{ name: 'Squat' }] } },
        reviewToken: 'review-v1.test',
      },
    });
    vi.mocked(rejectCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        id: 'proposal-1',
        type: 'workout_log',
        status: 'REJECTED',
        title: 'Review lower body workout draft',
        summary: { clientId: 42, date: '2026-05-06', exerciseCount: 2 },
      },
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <LocationProbe />
        <CoachIntakeWorkspace userRole="admin" selectedClientName={null} onCommandPrompt={vi.fn()} queue={queue} activeIntakeId="item-1" />
      </MemoryRouter>,
    );

    fireEvent.click(within(screen.getByLabelText(/Active review target/i)).getByRole('button', { name: /review prepared draft/i }));
    fireEvent.click(await screen.findByRole('button', { name: /reject/i }));

    await waitFor(() => {
      expect(rejectCoachProposal).toHaveBeenCalledWith('proposal-1');
      expect(queue.refresh).toHaveBeenCalled();
      expect(screen.getByTestId('current-route')).toHaveTextContent('/dashboard/admin/coach-assistant?intake=item-2');
    });
    expect(screen.queryByLabelText(/Prepared draft review panel/i)).toBeNull();
  });

  it('closes an answered clarification and advances to the next actionable intake', async () => {
    const queue = makeQueue();
    const nextItem = {
      ...queue.items[0],
      id: 'item-2',
      entityId: 'item-2',
      title: 'Evening upper body notes',
      timelineAt: '2026-05-07T18:30:00.000Z',
      latestProposalId: null,
    };
    queue.items = [{ ...queue.items[0], latestProposalId: 'clarification-1' }, nextItem];
    queue.refresh = vi.fn().mockResolvedValue([nextItem]);
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        id: 'clarification-1',
        type: 'clarification',
        status: 'PENDING',
        title: 'Confirm client match',
        summary: { actionRequired: 'Client confirmation' },
        detail: {
          clarification: {
            question: 'Which client does this workout belong to?',
            options: ['Client #42', 'New client'],
          },
        },
      },
    });
    vi.mocked(answerCoachProposalClarification).mockResolvedValue({
      success: true,
      proposal: {
        id: 'clarification-1',
        type: 'clarification',
        status: 'APPROVED',
        title: 'Confirm client match',
        summary: { actionRequired: 'Client confirmation' },
      },
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <LocationProbe />
        <CoachIntakeWorkspace userRole="admin" selectedClientName={null} onCommandPrompt={vi.fn()} queue={queue} activeIntakeId="item-1" />
      </MemoryRouter>,
    );

    fireEvent.click(within(screen.getByLabelText(/Active review target/i)).getByRole('button', { name: /review prepared draft/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Client #42/i }));

    await waitFor(() => {
      expect(answerCoachProposalClarification).toHaveBeenCalledWith('clarification-1', 'Client #42');
      expect(queue.refresh).toHaveBeenCalled();
      expect(screen.getByTestId('current-route')).toHaveTextContent('/dashboard/admin/coach-assistant?intake=item-2');
    });
    expect(screen.queryByLabelText(/Prepared draft review panel/i)).toBeNull();
  });

  it('keeps generated split-plan draft reviews open instead of advancing away', async () => {
    const queue = makeQueue();
    queue.items[0] = { ...queue.items[0], latestProposalId: 'split-proposal-1' };
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        id: 'split-proposal-1',
        type: 'split_plan',
        status: 'PENDING',
        title: 'Review split plan',
        summary: { date: '2026-05-06' },
        detail: { splitPlan: { splitCount: 2 }, approvalGate: { confirmationMode: 'trainer_approval_required' } },
        reviewToken: 'review-v1.split',
      },
    });
    vi.mocked(approveCoachProposal).mockResolvedValue({
      success: true,
      applied: false,
      proposal: { id: 'split-proposal-1', type: 'split_plan', status: 'APPROVED', title: 'Review split plan', summary: { date: '2026-05-06' } },
      splitPlan: {
        workoutProposalCount: 1,
        splitCount: 2,
        workoutProposals: [{
          id: 'child-workout-1',
          type: 'workout_log',
          status: 'PENDING',
          title: 'Review generated workout draft',
          summary: { clientId: 42, date: '2026-05-06', exerciseCount: 1 },
        }],
      },
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <LocationProbe />
        <CoachIntakeWorkspace userRole="admin" selectedClientName={null} onCommandPrompt={vi.fn()} queue={queue} activeIntakeId="item-1" />
      </MemoryRouter>,
    );

    fireEvent.click(within(screen.getByLabelText(/Active review target/i)).getByRole('button', { name: /review prepared draft/i }));
    fireEvent.click(await screen.findByRole('button', { name: /approve split plan/i }));

    expect(await screen.findByText(/Review generated workout draft/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Prepared draft review panel/i)).toBeInTheDocument();
    expect(screen.getByTestId('current-route')).toHaveTextContent('/dashboard/admin/coach-assistant?intake=item-1');
  });

  it('lands on the Coach workspace when the refreshed queue is empty after a final action', async () => {
    const queue = makeQueue();
    queue.items = [{ ...queue.items[0], latestProposalId: 'proposal-1' }];
    queue.refresh = vi.fn().mockResolvedValue([]);
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        id: 'proposal-1',
        type: 'workout_log',
        status: 'PENDING',
        title: 'Review lower body workout draft',
        summary: { clientId: 42, date: '2026-05-06', exerciseCount: 2 },
        detail: { workout: { clientId: 42, date: '2026-05-06', exercises: [{ name: 'Squat' }] } },
        reviewToken: 'review-v1.test',
      },
    });
    vi.mocked(approveCoachProposal).mockResolvedValue({
      success: true,
      applied: true,
      proposal: { id: 'proposal-1', type: 'workout_log', status: 'APPLIED', title: 'Review lower body workout draft', summary: {} },
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <LocationProbe />
        <CoachIntakeWorkspace userRole="admin" selectedClientName={null} onCommandPrompt={vi.fn()} queue={queue} activeIntakeId="item-1" />
      </MemoryRouter>,
    );

    fireEvent.click(within(screen.getByLabelText(/Active review target/i)).getByRole('button', { name: /review prepared draft/i }));
    fireEvent.click(await screen.findByRole('button', { name: /approve and log/i }));

    await waitFor(() => {
      expect(screen.getByTestId('current-route')).toHaveTextContent('/dashboard/admin/coach-assistant');
    });
    expect(screen.getByTestId('current-route')).not.toHaveTextContent('intake=');
    expect(await screen.findByText(/Workout log applied/i)).toBeInTheDocument();
    expect(screen.getByText(/Queue refreshed; no next actionable intake was found/i)).toBeInTheDocument();
  });

  it('shows applied proposal state in the active write gate when queue metadata is synced', () => {
    const queue = makeQueue();
    queue.items[0] = {
      ...queue.items[0],
      latestProposal: { id: 'proposal-1', type: 'workout_log', status: 'APPLIED', title: 'Review lower body workout draft', createdAt: '2026-05-07T10:00:00.000Z' },
    };

    render(
      <MemoryRouter>
        <CoachIntakeWorkspace userRole="admin" selectedClientName={null} onCommandPrompt={vi.fn()} queue={queue} activeIntakeId="item-1" />
      </MemoryRouter>,
    );

    expect(within(screen.getByLabelText(/Active review target/i)).getByText(/Draft applied/i)).toBeInTheDocument();
  });

  it('clears a previous action receipt when a different intake becomes active', async () => {
    const queue = makeQueue();
    const nextItem = {
      ...queue.items[0],
      id: 'item-2',
      entityId: 'item-2',
      title: 'Evening upper body notes',
      timelineAt: '2026-05-07T18:30:00.000Z',
      latestProposalId: null,
    };
    const manuallySelectedItem = {
      ...queue.items[0],
      id: 'item-3',
      entityId: 'item-3',
      title: 'Manual switch shoulder note',
      timelineAt: '2026-05-08T18:30:00.000Z',
      latestProposalId: null,
    };
    queue.items = [{ ...queue.items[0], latestProposalId: 'proposal-1' }, nextItem, manuallySelectedItem];
    queue.refresh = vi.fn().mockResolvedValue([nextItem, manuallySelectedItem]);
    vi.mocked(getCoachProposal).mockResolvedValue({
      success: true,
      proposal: {
        id: 'proposal-1',
        type: 'workout_log',
        status: 'PENDING',
        title: 'Review lower body workout draft',
        summary: { clientId: 42, date: '2026-05-06', exerciseCount: 2 },
        detail: { workout: { clientId: 42, date: '2026-05-06', exercises: [{ name: 'Squat' }] } },
        reviewToken: 'review-v1.test',
      },
    });
    vi.mocked(approveCoachProposal).mockResolvedValue({
      success: true,
      applied: true,
      proposal: {
        id: 'proposal-1',
        type: 'workout_log',
        status: 'APPLIED',
        title: 'Review lower body workout draft',
        summary: { clientId: 42, date: '2026-05-06', exerciseCount: 2 },
      },
    });

    const { rerender } = render(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-1']}>
        <CoachIntakeWorkspace userRole="admin" selectedClientName={null} onCommandPrompt={vi.fn()} queue={queue} activeIntakeId="item-1" />
      </MemoryRouter>,
    );

    fireEvent.click(within(screen.getByLabelText(/Active review target/i)).getByRole('button', { name: /review prepared draft/i }));
    fireEvent.click(await screen.findByRole('button', { name: /approve and log/i }));

    await waitFor(() => {
      expect(queue.refresh).toHaveBeenCalled();
    });

    const refreshedQueue = { ...queue, items: [nextItem, manuallySelectedItem] };

    rerender(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-2']}>
        <CoachIntakeWorkspace userRole="admin" selectedClientName={null} onCommandPrompt={vi.fn()} queue={refreshedQueue} activeIntakeId="item-2" />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Workout log applied/i)).toBeInTheDocument();

    rerender(
      <MemoryRouter initialEntries={['/dashboard/admin/coach-assistant?intake=item-3']}>
        <CoachIntakeWorkspace userRole="admin" selectedClientName={null} onCommandPrompt={vi.fn()} queue={refreshedQueue} activeIntakeId="item-3" />
      </MemoryRouter>,
    );

    expect(screen.queryByText(/Workout log applied/i)).toBeNull();
    expect(screen.getAllByText(/Manual switch shoulder note/i).length).toBeGreaterThan(0);
  });
});
