import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSwanCoachConversationActions } from './useSwanCoachConversationActions';

type HookInput = Parameters<typeof useSwanCoachConversationActions>[0];

const makeHookInput = (selectedClient: HookInput['selectedClient'] = null) => {
  const chat = {
    createConversation: vi.fn().mockResolvedValue(null),
    listConversations: vi.fn().mockResolvedValue([]),
    loadConversation: vi.fn().mockResolvedValue(null),
  };
  const coach = {
    clearConversation: vi.fn(),
  };
  const coachIntakeQueue = {
    refresh: vi.fn().mockResolvedValue(null),
  };

  return {
    chat,
    input: {
      chat,
      coach,
      coachIntakeQueue,
      selectedClient,
    } as HookInput,
  };
};

describe('useSwanCoachConversationActions', () => {
  it('passes selected client id when opening the macro context conversation', async () => {
    const { chat, input } = makeHookInput({ id: 42 });

    const { result } = renderHook(() => useSwanCoachConversationActions(input));

    await act(async () => {
      await result.current.handleNeuralLink();
    });

    expect(chat.createConversation).toHaveBeenCalledWith(
      'macro_logging',
      'Macro Context Session',
      42,
    );
  });

  it('keeps no-selected-client macro conversations unscoped', async () => {
    const { chat, input } = makeHookInput(null);

    const { result } = renderHook(() => useSwanCoachConversationActions(input));

    await act(async () => {
      await result.current.handleNeuralLink();
    });

    expect(chat.createConversation).toHaveBeenCalledWith(
      'macro_logging',
      'Macro Context Session',
    );
  });
});