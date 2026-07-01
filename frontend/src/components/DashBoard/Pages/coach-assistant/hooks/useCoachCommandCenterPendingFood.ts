import { useCallback } from 'react';
import type { useAIChat } from '../../../../../hooks/useAIChat';

type CommandCenterChat = Pick<
  ReturnType<typeof useAIChat>,
  'listConversations' | 'sendMessageWithConversation' | 'sending'
>;

type UseCoachCommandCenterPendingFoodArgs = {
  chat: CommandCenterChat;
  targetClientId: number | null;
};

export function useCoachCommandCenterPendingFood({
  chat,
  targetClientId,
}: UseCoachCommandCenterPendingFoodArgs) {
  return useCallback(async (
    text: string,
    foodContext: Record<string, unknown>,
  ) => {
    const trimmed = text.trim();
    if (!trimmed || chat.sending) return null;
    const response = await chat.sendMessageWithConversation(
      trimmed,
      'macro_logging',
      'Nutrition Coach',
      targetClientId,
      'both',
      foodContext,
    );
    void chat.listConversations('active', true);
    return response;
  }, [chat, targetClientId]);
}