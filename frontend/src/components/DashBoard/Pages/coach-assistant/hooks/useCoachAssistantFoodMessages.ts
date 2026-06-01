import { useCallback, type Dispatch, type SetStateAction } from 'react';
import { useAIChat } from '../../../../../hooks/useAIChat';
import type { CoachMessageData, ResponseStyle } from '../SwanCoachTypes';

interface UseCoachAssistantFoodMessagesOptions {
  chat: ReturnType<typeof useAIChat>;
  responseStyle: ResponseStyle;
  targetClientId: number | null;
  setLocalMessages: Dispatch<SetStateAction<CoachMessageData[]>>;
}

export function useCoachAssistantFoodMessages({
  chat,
  responseStyle,
  targetClientId,
  setLocalMessages,
}: UseCoachAssistantFoodMessagesOptions) {
  const sendMessageWithFood = useCallback(async (
    text: string,
    foodContext: Record<string, unknown>,
  ) => {
    if (!text.trim() || chat.sending) return null;

    const result = await chat.sendMessageWithConversation(
      text.trim(),
      'macro_logging' as Parameters<typeof chat.sendMessageWithConversation>[1],
      'Nutrition Coach',
      targetClientId,
      responseStyle as Parameters<typeof chat.sendMessageWithConversation>[4],
      foodContext,
    );
    setLocalMessages([]);
    return result;
  }, [chat, responseStyle, targetClientId, setLocalMessages]);

  return { sendMessageWithFood };
}
