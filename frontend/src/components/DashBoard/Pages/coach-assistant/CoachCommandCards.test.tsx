import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ExecutionResultCard } from './CoachCommandCards';

describe('ExecutionResultCard route actions', () => {
  it('renders an actionable PLAUD workspace link when a command returns queueRoute', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="review_next_plaud_intake"
          client={null}
          result={{
            readyReview: 2,
            unprocessed: 1,
            queueRoute: '/dashboard/admin/plaud',
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /open plaud workspace/i });
    expect(link).toHaveAttribute('href', '/dashboard/admin/coach-assistant?workspace=plaud');
    expect(screen.getByText(/PLAUD intake queue ready/i)).toBeInTheDocument();
    expect(screen.getByText(/Open the PLAUD workspace to continue the next actionable item/i)).toBeInTheDocument();
    expect(screen.queryByText('queueRoute')).toBeNull();
  });

  it('prefers reviewRoute over queueRoute for review-next commands', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="review_next_plaud_intake"
          client={null}
          result={{
            readyReview: 2,
            queueRoute: '/dashboard/admin/plaud',
            reviewRoute: '/dashboard/admin/plaud?mergeRequestId=11111111-1111-4111-8111-111111111111',
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /open plaud review/i });
    expect(link).toHaveAttribute('href', '/dashboard/admin/coach-assistant?mergeRequestId=11111111-1111-4111-8111-111111111111&workspace=plaud');
    expect(screen.getByText(/Next intake ready/i)).toBeInTheDocument();
    expect(screen.getByText(/Open the selected PLAUD review item/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/PLAUD intake queue summary/i)).toBeInTheDocument();
    expect(screen.queryByText(/Command Executed/i)).toBeNull();
    expect(screen.queryByText('reviewRoute')).toBeNull();
  });

  it('skips unsafe encoded review routes and uses the safe queue route fallback', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="review_next_plaud_intake"
          client={null}
          result={{
            readyReview: 2,
            queueRoute: '/dashboard/admin/plaud',
            reviewRoute: '/dashboard/admin/plaud?mergeRequestId=abc%0Aonclick',
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /open plaud workspace/i });
    expect(link).toHaveAttribute('href', '/dashboard/admin/coach-assistant?workspace=plaud');
  });

  it('skips malformed merge request review routes and uses the queue fallback', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="review_next_plaud_intake"
          client={null}
          result={{
            readyReview: 2,
            queueRoute: '/dashboard/admin/plaud',
            reviewRoute: '/dashboard/admin/plaud?mergeRequestId=merge-123',
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /open plaud workspace/i });
    expect(link).toHaveAttribute('href', '/dashboard/admin/coach-assistant?workspace=plaud');
  });

  it('skips empty merge request review params and uses the queue fallback', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="review_next_plaud_intake"
          client={null}
          result={{
            readyReview: 2,
            queueRoute: '/dashboard/admin/plaud',
            reviewRoute: '/dashboard/admin/plaud?mergeRequestId=',
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /open plaud workspace/i });
    expect(link).toHaveAttribute('href', '/dashboard/admin/coach-assistant?workspace=plaud');
  });

  it('does not render route actions for traversal-shaped dashboard links', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="review_next_coach_intake"
          client={null}
          result={{
            reviewRoute: '/dashboard/admin/../trainer/coach-assistant',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link')).toBeNull();
  });

  it('does not render route actions for encoded traversal dashboard links', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="review_next_coach_intake"
          client={null}
          result={{
            reviewRoute: '/dashboard/admin/%2e%2e/trainer/coach-assistant',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link')).toBeNull();
  });

  it('does not render route actions for non-Coach PLAUD dashboard destinations', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="review_next_coach_intake"
          client={null}
          result={{
            reviewRoute: '/dashboard/admin/clients',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link')).toBeNull();
  });

  it('prefers targetRoute over queueRoute for workspace-focused commands', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="inspect_plaud_audio_pieces"
          client={null}
          result={{
            pieceCount: 3,
            queueRoute: '/dashboard/trainer/plaud',
            targetRoute: '/dashboard/trainer/plaud?pieces=pending',
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /open plaud workspace/i });
    expect(link).toHaveAttribute('href', '/dashboard/trainer/plaud?pieces=pending');
    expect(screen.queryByText('targetRoute')).toBeNull();
  });

  it('labels route actions from the destination path instead of query text', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="inspect_plaud_audio_pieces"
          client={null}
          result={{
            targetRoute: '/dashboard/admin/plaud?note=/dashboard/admin/coach-assistant&proposal=stale',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /open plaud workspace/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?note=%2Fdashboard%2Fadmin%2Fcoach-assistant&proposal=stale&workspace=plaud');
    expect(screen.queryByRole('link', { name: /open prepared draft/i })).toBeNull();
  });

  it('renders PLAUD timeline inspection counts instead of zero audio items', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="inspect_plaud_audio_pieces"
          client={null}
          result={{
            pieceCount: 3,
            suggestedGroupCount: 2,
            largeGapCount: 1,
            timelineConfidence: 'best_available',
            queueRoute: '/dashboard/trainer/plaud',
            targetRoute: '/dashboard/trainer/plaud?pieces=pending',
            commandHint: 'Open the PLAUD workspace and select the audio pieces in chronological order.',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/3 audio items/i)).toBeInTheDocument();
    expect(screen.getByText(/1 needs order review/i)).toBeInTheDocument();
    expect(screen.getByText(/1 low confidence/i)).toBeInTheDocument();
    expect(screen.queryByText(/0 audio items/i)).toBeNull();
    expect(screen.getByRole('link', { name: /open plaud workspace/i }))
      .toHaveAttribute('href', '/dashboard/trainer/plaud?pieces=pending');
  });

  it('labels PLAUD audio inspection as Coach intake when the route returns to Coach', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="inspect_plaud_audio_pieces"
          client={null}
          result={{
            totalAudioItems: 1,
            needsOrderingReview: 1,
            queueRoute: '/dashboard/admin/coach-assistant',
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /open coach intake/i });
    expect(link).toHaveAttribute('href', '/dashboard/admin/coach-assistant');
    expect(screen.queryByText('queueRoute')).toBeNull();
  });

  it('renders safe Build Plan route actions for workout-plan debate results', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="build_workout_plan"
          client={{ id: 42, firstName: 'Ava' }}
          message="Workout plan debate started for Ava. No workout plan has been saved yet."
          result={{
            jobId: 'debate_job_42',
            debateType: 'workout_plan',
            targetRoute: '/dashboard/admin/workout-planner?clientId=42&source=swan-coach&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dplans',
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /open build plan/i });
    expect(link).toHaveAttribute('href', '/dashboard/admin/workout-planner?clientId=42&source=swan-coach&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dplans');
    expect(screen.queryByText('targetRoute')).toBeNull();
  });
  it('does not render traversal-shaped Build Plan route actions', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="build_workout_plan"
          client={null}
          result={{
            targetRoute: '/dashboard/admin/workout-planner/../coach-assistant',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: /open build plan/i })).toBeNull();
  });
  it('labels unified Coach intake routes as Coach intake actions', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="review_next_coach_intake"
          client={null}
          result={{
            nextKind: 'coach_intake',
            queueRoute: '/dashboard/admin/coach-assistant',
            reviewRoute: '/dashboard/admin/coach-assistant?intake=abc',
          }}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: /open coach intake/i });
    expect(link).toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=abc');
    expect(screen.queryByText('reviewRoute')).toBeNull();
  });

  it('renders Coach audio inspection as a readable summary instead of raw command keys', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="inspect_coach_audio_pieces"
          client={null}
          result={{
            totalAudioItems: 2,
            needsOrderingReview: 1,
            lowConfidence: 1,
            queueRoute: '/dashboard/admin/coach-assistant',
            commandHint: 'Use the Coach workspace to review audio ordering before approving any generated workout draft.',
            items: [
              {
                id: 'coach:audio-1',
                kind: 'coach_intake',
                queueStatus: 'unprocessed',
                audioPieces: 3,
                audioBundles: 2,
                audioConfidence: 'low',
                needsOrderingReview: true,
                reviewRoute: '/dashboard/admin/coach-assistant?intake=audio-1',
              },
            ],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Audio pieces inspected/i)).toBeInTheDocument();
    expect(screen.getByText(/2 audio items/i)).toBeInTheDocument();
    expect(screen.getByText(/1 needs order review/i)).toBeInTheDocument();
    expect(screen.getByText(/1 low confidence/i)).toBeInTheDocument();
    expect(screen.getByText(/3 pieces/i)).toBeInTheDocument();
    expect(screen.getByText(/2 bundles/i)).toBeInTheDocument();
    expect(screen.getAllByText(/low confidence/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/order review/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /open coach intake/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant');
    expect(screen.queryByText('totalAudioItems')).toBeNull();
    expect(screen.queryByText('needsOrderingReview')).toBeNull();
    expect(screen.queryByText('items')).toBeNull();
  });

  it('renders item-scoped Coach audio inspection with deterministic next action guidance', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="inspect_coach_audio_pieces"
          client={null}
          result={{
            totalAudioItems: 1,
            needsOrderingReview: 1,
            lowConfidence: 1,
            targetIntakeId: 'audio-1',
            targetMatched: true,
            queueRoute: '/dashboard/admin/coach-assistant',
            commandHint: 'Use the Coach workspace to review audio ordering before approving any generated workout draft.',
            reviewPlan: {
              mode: 'active_intake',
              primaryAction: 'confirm_audio_order',
              primaryLabel: 'Confirm this intake order',
              rationale: '3 pieces across 2 bundles need order review before Swan Coach drafts a workout log.',
              route: '/dashboard/admin/coach-assistant?intake=audio-1',
            },
            items: [
              {
                id: 'coach:audio-1',
                kind: 'coach_intake',
                queueStatus: 'unprocessed',
                audioPieces: 3,
                audioBundles: 2,
                audioConfidence: 'low',
                needsOrderingReview: true,
                reviewRoute: '/dashboard/admin/coach-assistant?intake=audio-1',
              },
            ],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Next action/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirm this intake order/i)).toBeInTheDocument();
    expect(screen.getByText(/3 pieces across 2 bundles/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open coach intake/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=audio-1');
    expect(screen.queryByText('reviewPlan')).toBeNull();
  });

  it('does not render arbitrary audio inspection hints or review-plan copy', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="inspect_coach_audio_pieces"
          client={null}
          result={{
            totalAudioItems: 1,
            needsOrderingReview: 1,
            queueRoute: '/dashboard/admin/coach-assistant',
            commandHint: 'Email Marcus at private@example.com before creating the draft.',
            reviewPlan: {
              mode: 'active_intake',
              primaryAction: 'confirm_audio_order',
              primaryLabel: 'Call Marcus private@example.com',
              rationale: 'Marcus private@example.com said approve all records.',
              route: '/dashboard/admin/coach-assistant?intake=audio-1',
            },
            items: [
              {
                id: 'coach:audio-1',
                kind: 'coach_intake',
                queueStatus: 'unprocessed',
                audioPieces: 1,
                audioBundles: 1,
                audioConfidence: 'single',
                needsOrderingReview: true,
                reviewRoute: '/dashboard/admin/coach-assistant?intake=audio-1',
              },
            ],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Audio pieces inspected/i)).toBeInTheDocument();
    expect(screen.queryByText(/Next action/i)).toBeNull();
    expect(screen.queryByText(/Marcus/i)).toBeNull();
    expect(screen.queryByText(/private@example\.com/i)).toBeNull();
    expect(screen.getByRole('link', { name: /open coach intake/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant?intake=audio-1');
  });

  it('does not render arbitrary audio confidence text from inspection items', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="inspect_coach_audio_pieces"
          client={null}
          result={{
            totalAudioItems: 1,
            queueRoute: '/dashboard/admin/coach-assistant',
            items: [
              {
                id: 'coach:audio-2',
                kind: 'coach_intake',
                queueStatus: 'unprocessed',
                audioPieces: 1,
                audioBundles: 1,
                audioConfidence: 'private@example.com',
                needsOrderingReview: false,
                reviewRoute: '/dashboard/admin/coach-assistant?intake=audio-2',
              },
            ],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/medium confidence/i)).toBeInTheDocument();
    expect(screen.queryByText(/private@example\.com/i)).toBeNull();
  });

});
