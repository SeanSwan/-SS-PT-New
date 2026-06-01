import { useCallback, useState } from 'react';
import type { useAIChat } from '../../../../../hooks/useAIChat';
import { createCoachTextIntake } from '../../../../../services/coachIntakeService';
import { safeCoachIntakeDraftFailure } from '../CoachIntakeOperationalText.logic';

type ConversationChatApi = Pick<
  ReturnType<typeof useAIChat>,
  'createConversation' | 'listConversations' | 'loadConversation'
>;

type ConversationCoachApi = {
  clearConversation: () => void;
};

type CoachIntakeQueueApi = {
  refresh: () => Promise<unknown> | unknown;
};

type SelectedClientLike = {
  id?: number | null;
} | null;

type UseSwanCoachConversationActionsArgs = {
  chat: ConversationChatApi;
  coach: ConversationCoachApi;
  coachIntakeQueue: CoachIntakeQueueApi;
  selectedClient: SelectedClientLike;
};

export function useSwanCoachConversationActions({
  chat,
  coach,
  coachIntakeQueue,
  selectedClient,
}: UseSwanCoachConversationActionsArgs) {
  const [macroLinkActive, setMacroLinkActive] = useState(false);

  const handleSelectConversation = useCallback(async (id: number) => {
    await chat.loadConversation(id);
  }, [chat]);

  const handleNewChat = useCallback(() => {
    coach.clearConversation();
    chat.listConversations('active', true);
  }, [coach, chat]);

  const handleNeuralLink = useCallback(async () => {
    const nextActive = !macroLinkActive;
    setMacroLinkActive(nextActive);
    if (nextActive) {
      await chat.createConversation('macro_logging', 'Macro Context Session');
    }
  }, [chat, macroLinkActive]);

  const handleCreateIntakeDraft = useCallback(async (text: string) => {
    try {
      await createCoachTextIntake({
        text,
        clientId: selectedClient?.id ?? null,
        trigger: 'oversized_chat',
      });
      await coachIntakeQueue.refresh();
      return {
        ok: true,
        message: 'Saved as an encrypted Coach intake draft. Use Review next intake to continue.',
      };
    } catch {
      return { ok: false, message: safeCoachIntakeDraftFailure() };
    }
  }, [coachIntakeQueue, selectedClient?.id]);

  return {
    handleCreateIntakeDraft,
    handleNeuralLink,
    handleNewChat,
    handleSelectConversation,
    macroLinkActive,
  };
}

export default useSwanCoachConversationActions;
