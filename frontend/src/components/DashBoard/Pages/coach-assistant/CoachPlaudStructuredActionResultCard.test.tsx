import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ExecutionResultCard } from './CoachCommandCards';

describe('Coach PLAUD structured action result card', () => {
  it('renders manual-confirmation PLAUD proposals without raw transport keys', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="plaud_propose_clip_order"
          client={null}
          result={{
            actionType: 'plaud_propose_clip_order',
            contractVersion: 'plaud-coach-action-v1',
            proposalType: 'clip_order',
            requiresManualConfirmation: true,
            confirmationKind: 'audio_order',
            writeStatus: 'not_written',
            nextWritePath: 'existing_review_flow_only',
            totalAudioItems: 1,
            needsOrderingReview: 1,
            targetIntakeId: 'coach-intake-1',
            targetMatched: true,
            reviewRoute: '/dashboard/trainer/coach-assistant?intake=coach-intake-1',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/PLAUD action proposed/i)).toBeInTheDocument();
    expect(screen.getByText(/Manual confirmation required/i)).toBeInTheDocument();
    expect(screen.getByText(/No workout log written/i)).toBeInTheDocument();
    expect(screen.getByText(/Clip order/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirm audio order/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open coach intake/i }))
      .toHaveAttribute('href', '/dashboard/trainer/coach-assistant?intake=coach-intake-1');
    expect(screen.queryByText('writeStatus')).toBeNull();
    expect(screen.queryByText('nextWritePath')).toBeNull();
    expect(screen.queryByText('targetIntakeId')).toBeNull();
    expect(screen.queryByText('coach-intake-1')).toBeNull();
  });

  it('renders read-only PLAUD analysis as a non-write result', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="plaud_analyze_clip_set"
          client={null}
          result={{
            actionType: 'plaud_analyze_clip_set',
            contractVersion: 'plaud-coach-action-v1',
            writeStatus: 'read_only',
            totalAudioItems: 2,
            lowConfidence: 1,
            queueRoute: '/dashboard/admin/coach-assistant',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/PLAUD clip set analyzed/i)).toBeInTheDocument();
    expect(screen.getByText(/Read only/i)).toBeInTheDocument();
    expect(screen.getByText(/2 audio items/i)).toBeInTheDocument();
    expect(screen.getByText(/1 low confidence/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open coach intake/i }))
      .toHaveAttribute('href', '/dashboard/admin/coach-assistant');
    expect(screen.queryByText('writeStatus')).toBeNull();
  });

  it('keeps PLAUD list commands useful by showing queue counts', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="plaud_list_intake_items"
          client={null}
          result={{
            writeStatus: 'read_only',
            total: 3,
            actionable: 2,
            queueRoute: '/dashboard/admin/coach-assistant',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/PLAUD intake listed/i)).toBeInTheDocument();
    expect(screen.getByText(/3 intake items/i)).toBeInTheDocument();
    expect(screen.getByText(/2 actionable/i)).toBeInTheDocument();
    expect(screen.queryByText('total')).toBeNull();
    expect(screen.queryByText('actionable')).toBeNull();
  });
});
