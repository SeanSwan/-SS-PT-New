import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCoachAssistant } from './useCoachAssistant';

const executeCommand = vi.fn();
const confirmCommand = vi.fn();
const cancelCommand = vi.fn();
const sendMessageWithConversation = vi.fn();

vi.mock('../../../../../hooks/aiMessageLimits', async () => {
  const actual = await vi.importActual<typeof import('../../../../../hooks/aiMessageLimits')>(
    '../../../../../hooks/aiMessageLimits',
  );
  return {
    ...actual,
    isCommandLaneCandidate: () => true,
  };
});

vi.mock('../../../../../hooks/useCoachCommand', () => ({
  useCoachCommand: () => ({
    executeCommand,
    confirmCommand,
    cancelCommand,
    executingCommand: false,
  }),
}));

vi.mock('../../../../../hooks/useAIChat', () => ({
  useAIChat: () => ({
    activeConversation: null,
    sending: false,
    sendMessageWithConversation,
  }),
}));

describe('useCoachAssistant command summaries', () => {
  beforeEach(() => {
    executeCommand.mockReset();
    confirmCommand.mockReset();
    cancelCommand.mockReset();
    sendMessageWithConversation.mockReset();
  });

  it('does not render arbitrary availability override reasons in command summaries', async () => {
    executeCommand.mockResolvedValue({
      type: 'executed',
      command: 'create_availability_override',
      result: {
        date: '2026-05-08',
        startTime: '18:00',
        endTime: '19:00',
        type: 'blocked',
        reason: 'do-not-render-private-availability-detail',
      },
      client: null,
    });

    const { result } = renderHook(() => useCoachAssistant());

    await act(async () => {
      await result.current.sendMessage('block availability tomorrow');
    });

    const assistantMessages = result.current.messages
      .filter((message) => message.role === 'assistant')
      .map((message) => message.content);

    expect(assistantMessages.join(' ')).toContain('Availability blocked on 2026-05-08');
    expect(assistantMessages.join(' ')).not.toContain('do-not-render-private-availability-detail');
  });
});
