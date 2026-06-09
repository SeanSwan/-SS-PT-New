import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const chatMock = vi.hoisted(() => ({
  clearError: vi.fn(),
  messages: [] as Array<Record<string, unknown>>,
  newChat: vi.fn(),
  sendMessageWithConversation: vi.fn(),
}));

const commandMock = vi.hoisted(() => ({
  cancelCommand: vi.fn(),
  confirmCommand: vi.fn(),
  executeCommand: vi.fn(),
}));

vi.mock('../../../../hooks/useAIChat', () => ({
  useAIChat: () => ({
    messages: chatMock.messages,
    sending: false,
    error: null,
    newChat: chatMock.newChat,
    sendMessageWithConversation: chatMock.sendMessageWithConversation,
    clearError: chatMock.clearError,
  }),
}));

vi.mock('../../../../hooks/useCoachCommand', () => ({
  useCoachCommand: () => ({
    cancelCommand: commandMock.cancelCommand,
    confirmCommand: commandMock.confirmCommand,
    executeCommand: commandMock.executeCommand,
    executingCommand: false,
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
    chatMock.newChat.mockReset();
    chatMock.sendMessageWithConversation.mockReset();
    chatMock.sendMessageWithConversation.mockResolvedValue({ success: true });
    commandMock.cancelCommand.mockReset();
    commandMock.confirmCommand.mockReset();
    commandMock.executeCommand.mockReset();
    commandMock.executeCommand.mockResolvedValue({ type: 'fallback_to_chat' });
  });

  it('routes selected-client command-lane instructions before chat fallback', async () => {
    commandMock.executeCommand.mockResolvedValueOnce({
      type: 'executed',
      command: 'log_workout',
      result: { exerciseCount: 1, totalSets: 3, xpAwarded: 50 },
      client: { id: 424242, firstName: 'Client' },
    });

    render(<ClientTrainingCommandBar clientId={424242} clientName="Fixture Client" />);

    const input = screen.getByLabelText(/tell swan about fixture client/i);
    fireEvent.change(input, {
      target: { value: 'Log bench press 3 sets of 10 at 135' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send to swan/i }));

    await waitFor(() => expect(commandMock.executeCommand).toHaveBeenCalledTimes(1));
    expect(commandMock.executeCommand).toHaveBeenCalledWith(
      'Log bench press 3 sets of 10 at 135',
      {
        selectedClientId: 424242,
        routeContext: {
          source: 'clients-team',
          intent: 'daily_training_command',
          surface: 'client-training-command-bar',
        },
      }
    );
    expect(chatMock.sendMessageWithConversation).not.toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent(
      /workout logged for client/i
    );
    expect(input).toHaveValue('');
  });

  it('lets the parent activate the workout logger before command-lane dispatch', async () => {
    const callOrder: string[] = [];
    const onCommandLaneStart = vi.fn(() => {
      callOrder.push('activate-logger');
    });
    commandMock.executeCommand.mockImplementationOnce(async () => {
      callOrder.push('execute-command');
      return {
        type: 'frontend_dispatch',
        command: 'add_exercise_to_form',
        message: 'Sent to the active workout form.',
        event: 'AI_ADD_EXERCISE',
        payload: { exerciseName: 'Push Up' },
        dispatched: true,
      };
    });

    render(
      <ClientTrainingCommandBar
        clientId={424242}
        clientName="Fixture Client"
        onCommandLaneStart={onCommandLaneStart}
      />
    );

    fireEvent.change(screen.getByLabelText(/tell swan about fixture client/i), {
      target: { value: 'Add push ups to the workout' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send to swan/i }));

    await waitFor(() => expect(commandMock.executeCommand).toHaveBeenCalledTimes(1));
    expect(onCommandLaneStart).toHaveBeenCalledWith('Add push ups to the workout');
    expect(callOrder).toEqual(['activate-logger', 'execute-command']);
  });

  it('renders command-lane confirmation holds inline for selected-client workout logs', async () => {
    commandMock.executeCommand.mockResolvedValueOnce({
      type: 'confirmation_required',
      message: 'Review workout log before saving.',
      operationId: 'op-workout-42',
      command: 'log_workout',
      params: { exerciseName: 'Bench Press', sets: 3, reps: 10 },
      client: { id: 424242, firstName: 'Fixture' },
      details: null,
      isDestructive: false,
    });
    commandMock.confirmCommand.mockResolvedValueOnce({
      success: true,
      type: 'executed',
      message: 'Workout logged.',
      command: 'log_workout',
      result: { exerciseCount: 1, totalSets: 3, xpAwarded: 50 },
    });

    render(<ClientTrainingCommandBar clientId={424242} clientName="Fixture Client" />);

    fireEvent.change(screen.getByLabelText(/tell swan about fixture client/i), {
      target: { value: 'Log bench press 3 sets of 10 at 135' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send to swan/i }));

    expect(await screen.findByText(/confirm action/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /confirm action/i }));

    await waitFor(() => expect(commandMock.confirmCommand).toHaveBeenCalledWith('op-workout-42'));
    expect(await screen.findByRole('status')).toHaveTextContent(/workout logged for fixture/i);
  });

  it('lets admins cancel inline command-lane confirmation holds without saving', async () => {
    commandMock.executeCommand.mockResolvedValueOnce({
      type: 'confirmation_required',
      message: 'Review workout log before saving.',
      operationId: 'op-workout-cancel',
      command: 'log_workout',
      params: { exerciseName: 'Rows', sets: 4, reps: 12 },
      client: { id: 424242, firstName: 'Fixture' },
      details: null,
      isDestructive: false,
    });

    render(<ClientTrainingCommandBar clientId={424242} clientName="Fixture Client" />);

    fireEvent.change(screen.getByLabelText(/tell swan about fixture client/i), {
      target: { value: 'Log rows 4 sets of 12' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send to swan/i }));

    expect(await screen.findByText(/confirm action/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel action/i }));

    await waitFor(() => expect(commandMock.cancelCommand).toHaveBeenCalledWith('op-workout-cancel'));
    expect(await screen.findByRole('status')).toHaveTextContent(/log workout cancelled/i);
    expect(commandMock.confirmCommand).not.toHaveBeenCalled();
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
    expect(message).toContain('You are Swan Coach');
    expect(message).toContain('SwanStudios');
    expect(message).toContain('NASM-aligned');
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

  it('starts a fresh Swan conversation when the selected client changes', () => {
    const { rerender } = render(
      <ClientTrainingCommandBar clientId={424242} clientName="Fixture Client" />
    );
    const input = screen.getByLabelText(/tell swan about fixture client/i);
    fireEvent.change(input, { target: { value: 'Log squats for this client' } });

    rerender(<ClientTrainingCommandBar clientId={515151} clientName="Next Client" />);

    expect(chatMock.newChat).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/tell swan about next client/i)).toHaveValue('');
  });
});
