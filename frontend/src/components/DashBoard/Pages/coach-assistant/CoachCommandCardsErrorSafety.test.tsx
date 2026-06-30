import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CoachAudioInspectionResultCard } from './CoachAudioInspectionResultCard';
import { ConfirmationCard, ExecutionResultCard } from './CoachCommandCards';

describe('Coach command card error safety', () => {
  it('does not render arbitrary failed confirmation details', async () => {
    render(
      <ConfirmationCard
        operationId="op-1"
        command="log_workout"
        params={{ clientId: 42 }}
        client={{ id: 42, firstName: 'Client' }}
        details={null}
        isDestructive={false}
        onConfirm={vi.fn().mockResolvedValue({
          success: false,
          error: 'do-not-render-private-confirm-detail',
        })}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /confirm action/i }));

    await waitFor(() => {
      expect(screen.getByText(/Confirmation failed\. Please try again\./i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/do-not-render-private-confirm-detail/i)).not.toBeInTheDocument();
  });

  it('does not render arbitrary execution-result messages', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="unknown_command"
          client={null}
          result={{ status: 'complete' }}
          message="do-not-render-private-command-detail"
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Command Executed/i)).toBeInTheDocument();
    expect(screen.queryByText(/do-not-render-private-command-detail/i)).not.toBeInTheDocument();
  });

  it('does not render arbitrary generic execution-result fields', () => {
    render(
      <MemoryRouter>
        <ExecutionResultCard
          command="unknown_command"
          client={null}
          result={{
            status: 'complete',
            transcript: 'Marcus private@example.com said approve every draft.',
            clientName: 'Marcus Private',
            notes: 'Call private@example.com before logging.',
            exercises: [{ name: 'Private Marcus exercise note' }],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Command Executed/i)).toBeInTheDocument();
    expect(screen.getByText(/complete/i)).toBeInTheDocument();
    expect(screen.queryByText(/Marcus/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/private@example\.com/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Private Marcus exercise note/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/transcript/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/clientName/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/notes/i)).not.toBeInTheDocument();
  });

  it('does not render arbitrary confirmation parameter fields', () => {
    render(
      <ConfirmationCard
        operationId="op-2"
        command="log_workout"
        params={{
          clientId: 42,
          transcript: 'Marcus private@example.com said approve every draft.',
          clientName: 'Marcus Private',
          notes: 'Call private@example.com before logging.',
          exercises: [{ name: 'Private Marcus exercise note' }],
        }}
        client={{ id: 42, firstName: 'Client' }}
        details={null}
        isDestructive={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText(/Ready to save?/i)).toBeInTheDocument();
    expect(screen.getAllByText(/42/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Marcus/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/private@example\.com/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Private Marcus exercise note/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/transcript/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/clientName/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/notes/i)).not.toBeInTheDocument();
  });

  it('does not render arbitrary direct audio-inspection messages', () => {
    render(
      <MemoryRouter>
        <CoachAudioInspectionResultCard
          command="inspect_coach_audio_pieces"
          result={{ totalAudioItems: 1 }}
          message="Email private@example.com before approving this audio item."
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Audio pieces inspected/i)).toBeInTheDocument();
    expect(screen.queryByText(/private@example\.com/i)).not.toBeInTheDocument();
  });
});
