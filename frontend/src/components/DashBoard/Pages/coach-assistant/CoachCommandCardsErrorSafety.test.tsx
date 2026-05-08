import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
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
});
