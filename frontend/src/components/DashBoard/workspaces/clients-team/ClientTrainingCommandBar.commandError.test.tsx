import { fireEvent, render, screen } from '@testing-library/react';
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

import ClientTrainingCommandBar from './ClientTrainingCommandBar';

vi.mock('../../../CoachConfirm/ConfirmationSheet', () => ({
  default: () => <button>Confirm synthetic operation</button>,
}));

describe('ClientTrainingCommandBar command errors', () => {
  beforeEach(() => {
    chatMock.clearError.mockReset();
    chatMock.messages = [];
    chatMock.newChat.mockReset();
    chatMock.sendMessageWithConversation.mockReset();
    commandMock.cancelCommand.mockReset();
    commandMock.confirmCommand.mockReset();
    commandMock.executeCommand.mockReset();
  });

  it('keeps command-lane errors out of chat fallback', async () => {
    commandMock.executeCommand.mockResolvedValueOnce({
      type: 'error',
      error: 'selectedClientId must be a positive integer when provided',
    });

    render(<ClientTrainingCommandBar clientId={424242} clientName="Fixture Client" />);

    const input = screen.getByLabelText(/ask coach about fixture client/i);
    fireEvent.change(input, {
      target: { value: 'Log bench press 3 sets of 10 at 135' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send to coach/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /selectedClientId must be a positive integer/i
    );
    expect(chatMock.sendMessageWithConversation).not.toHaveBeenCalled();
    expect(input).toHaveValue('Log bench press 3 sets of 10 at 135');
  });

  it('retains the draft and refuses a confirmation without an operation identity', async () => {
    commandMock.executeCommand.mockResolvedValueOnce({ type: 'confirmation_required',
      operationId: null, command: 'log_workout', message: 'Review workout', params: {},
      client: { id: 424242 }, details: null, isDestructive: false });
    render(<ClientTrainingCommandBar clientId={424242} clientName="Fixture Client" />);
    const input = screen.getByLabelText(/ask coach about fixture client/i);
    fireEvent.change(input, { target: { value: 'Log bench press 3 sets of 10 at 135' } });
    fireEvent.click(screen.getByRole('button', { name: /send to coach/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/confirmation is unavailable/i);
    expect(input).toHaveValue('Log bench press 3 sets of 10 at 135');
    expect(screen.queryByRole('button', { name: 'Confirm synthetic operation' })).not.toBeInTheDocument();
    expect(commandMock.confirmCommand).not.toHaveBeenCalled();
    expect(chatMock.sendMessageWithConversation).not.toHaveBeenCalled();
  });
});
