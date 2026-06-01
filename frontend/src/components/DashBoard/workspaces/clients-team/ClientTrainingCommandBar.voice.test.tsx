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

const speechMock = vi.hoisted(() => ({
  cancelPillVisible: false,
  clearInterim: vi.fn(),
  handleCancelSend: vi.fn(),
  interim: '',
  listening: false,
  speechSupported: true,
  toggleListening: vi.fn(),
}));

vi.mock('../../../../hooks/useAIChat', () => ({
  useAIChat: () => ({
    clearError: chatMock.clearError,
    error: null,
    messages: chatMock.messages,
    newChat: chatMock.newChat,
    sendMessageWithConversation: chatMock.sendMessageWithConversation,
    sending: false,
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

vi.mock('../../Pages/coach-assistant/hooks/useCoachBrowserSpeechInput', () => ({
  useCoachBrowserSpeechInput: () => speechMock,
}));

vi.mock('../../Pages/coach-assistant/CoachActionProposalCard', () => ({
  default: ({ proposal }: { proposal: { id: string; type: string } }) => (
    <article data-testid="coach-proposal-card">
      {proposal.type}:{proposal.id}
    </article>
  ),
}));

import ClientTrainingCommandBar from './ClientTrainingCommandBar';

describe('ClientTrainingCommandBar voice dictation', () => {
  beforeEach(() => {
    chatMock.clearError.mockReset();
    chatMock.messages = [];
    chatMock.newChat.mockReset();
    chatMock.sendMessageWithConversation.mockReset();
    commandMock.cancelCommand.mockReset();
    commandMock.confirmCommand.mockReset();
    commandMock.executeCommand.mockReset();
    speechMock.clearInterim.mockReset();
    speechMock.handleCancelSend.mockReset();
    speechMock.toggleListening.mockReset();
    speechMock.cancelPillVisible = false;
    speechMock.interim = '';
    speechMock.listening = false;
    speechMock.speechSupported = true;
  });

  it('starts browser voice dictation from the selected-client command bar', () => {
    render(<ClientTrainingCommandBar clientId={424242} clientName="Fixture Client" />);

    const button = screen.getByRole('button', { name: /start voice dictation/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);

    expect(speechMock.toggleListening).toHaveBeenCalledTimes(1);
  });

  it('disables voice dictation when browser speech input is unavailable', () => {
    speechMock.speechSupported = false;

    render(<ClientTrainingCommandBar clientId={424242} clientName="Fixture Client" />);

    expect(screen.getByRole('button', { name: /voice dictation unavailable/i })).toBeDisabled();
  });
});
