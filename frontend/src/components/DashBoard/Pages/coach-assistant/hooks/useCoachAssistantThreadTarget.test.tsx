import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCoachAssistant } from './useCoachAssistant';

const executeCommand = vi.fn();
const confirmCommand = vi.fn();
const cancelCommand = vi.fn();
const sendMessageWithConversation = vi.fn();
let activeConversationMock: { targetUserId?: number | string | null } | null = null;

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
    activeConversation: activeConversationMock,
    sending: false,
    sendMessageWithConversation,
  }),
}));

describe('useCoachAssistant active thread targeting', () => {
  beforeEach(() => {
    executeCommand.mockReset();
    confirmCommand.mockReset();
    cancelCommand.mockReset();
    sendMessageWithConversation.mockReset();
    activeConversationMock = null;
  });

  it('uses the active thread target when no picker client is selected', async () => {
    activeConversationMock = { targetUserId: 42 };
    executeCommand.mockResolvedValue({ type: 'fallback_to_chat' });
    sendMessageWithConversation.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useCoachAssistant({ targetClientId: null }));

    await act(async () => {
      await result.current.sendMessage('summarize this client thread');
    });

    expect(executeCommand).toHaveBeenCalledWith('summarize this client thread', {
      selectedClientId: 42,
      routeContext: null,
    });
    expect(sendMessageWithConversation).toHaveBeenCalledWith(
      'summarize this client thread',
      'coach_assistant',
      'Swan Coach Session',
      42,
      'balanced',
    );
  });

  it('prefers the picker target over an older active thread target', async () => {
    activeConversationMock = { targetUserId: 77 };
    executeCommand.mockResolvedValue({ type: 'fallback_to_chat' });
    sendMessageWithConversation.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useCoachAssistant({ targetClientId: 42 }));

    await act(async () => {
      await result.current.sendMessage('summarize selected client');
    });

    expect(executeCommand).toHaveBeenCalledWith('summarize selected client', {
      selectedClientId: 42,
      routeContext: null,
    });
    expect(sendMessageWithConversation).toHaveBeenCalledWith(
      'summarize selected client',
      'coach_assistant',
      'Swan Coach Session',
      42,
      'balanced',
    );
  });
});