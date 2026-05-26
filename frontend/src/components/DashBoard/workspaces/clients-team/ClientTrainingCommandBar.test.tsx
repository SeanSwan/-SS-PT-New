import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const chatMock = vi.hoisted(() => ({
  clearError: vi.fn(),
  messages: [] as Array<Record<string, unknown>>,
  sendMessageWithConversation: vi.fn(),
}));

vi.mock('../../../../hooks/useAIChat', () => ({
  useAIChat: () => ({
    messages: chatMock.messages,
    sending: false,
    error: null,
    sendMessageWithConversation: chatMock.sendMessageWithConversation,
    clearError: chatMock.clearError,
  }),
}));

vi.mock('../../Pages/coach-assistant/CoachActionProposalCard', () => ({
  default: ({ proposal }: { proposal: { id: string; type: string } }) => (
    <article data-testid="coach-proposal-card">
      {proposal.type}:{proposal.id}
    </article>
  ),
}));

import ClientTrainingCommandBar from './ClientTrainingCommandBar';

describe('ClientTrainingCommandBar', () => {
  beforeEach(() => {
    chatMock.clearError.mockReset();
    chatMock.messages = [];
    chatMock.sendMessageWithConversation.mockReset();
    chatMock.sendMessageWithConversation.mockResolvedValue({ success: true });
  });

  it('sends a selected-client daily workout command with review-gated AI context', async () => {
    render(<ClientTrainingCommandBar clientId={424242} clientName="Fixture Client" />);

    const input = screen.getByLabelText(/tell swan about fixture client/i);
    fireEvent.change(input, {
      target: { value: 'Bench press 3 sets of 10 at 135, RPE 7' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send to swan/i }));

    await waitFor(() => expect(chatMock.sendMessageWithConversation).toHaveBeenCalledTimes(1));
    const [message, context, title, targetUserId, responseStyle] =
      chatMock.sendMessageWithConversation.mock.calls[0];

    expect(message).toContain('Bench press 3 sets of 10 at 135, RPE 7');
    expect(message).toContain('review-gated workout_log proposal');
    expect(message).toContain('clientId=424242');
    expect(message).not.toContain('Fixture Client');
    expect(context).toBe('workout_generation');
    expect(title).toBe('Client #424242 daily training');
    expect(targetUserId).toBe(424242);
    expect(responseStyle).toBe('both');
  });

  it('does not clear the dictated command when Swan returns a structured failure', async () => {
    chatMock.sendMessageWithConversation.mockResolvedValueOnce({
      failed: true,
      originalMessage: 'server rejected it',
    });

    render(<ClientTrainingCommandBar clientId={424242} clientName="Fixture Client" />);

    const input = screen.getByLabelText(/tell swan about fixture client/i);
    fireEvent.change(input, { target: { value: 'Rows 4 sets of 12' } });
    fireEvent.click(screen.getByRole('button', { name: /send to swan/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/swan could not process/i);
    expect(input).toHaveValue('Rows 4 sets of 12');
  });

  it('surfaces returned workout-log proposal cards inline for review', () => {
    chatMock.messages = [
      {
        role: 'assistant',
        content: 'Prepared a daily workout draft.',
        metadata: {
          coachActionProposals: [
            {
              id: 'proposal-424242',
              type: 'workout_log',
              status: 'PENDING',
              title: 'Review workout log',
              summary: { clientId: 424242, date: '2026-05-25', exerciseCount: 1 },
            },
          ],
        },
      },
    ];

    render(<ClientTrainingCommandBar clientId={424242} clientName="Fixture Client" />);

    expect(screen.getByText(/prepared a daily workout draft/i)).toBeInTheDocument();
    expect(screen.getByTestId('coach-proposal-card')).toHaveTextContent(
      'workout_log:proposal-424242'
    );
  });

  it('does not surface assistant proposal output for another selected client', () => {
    chatMock.messages = [
      {
        role: 'assistant',
        content: 'Prepared another client draft.',
        metadata: {
          coachActionProposals: [
            {
              id: 'proposal-other-client',
              type: 'workout_log',
              status: 'PENDING',
              title: 'Review workout log',
              summary: { clientId: 999999, date: '2026-05-25', exerciseCount: 1 },
            },
          ],
        },
      },
    ];

    render(<ClientTrainingCommandBar clientId={424242} clientName="Fixture Client" />);

    expect(screen.queryByText(/prepared another client draft/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('coach-proposal-card')).not.toBeInTheDocument();
  });
});
