import { useCallback, useRef } from 'react';
import type { useAIChat } from '../../../../../hooks/useAIChat';
import {
  isPublicationAdmitted,
  isPublicationTokenLive,
  readPublicationScope,
  type PublicationBinding,
  type PublicationSnapshot,
} from '../../../../../hooks/coachPublicationScope';

type CommandCenterChat = Pick<
  ReturnType<typeof useAIChat>,
  'listConversations' | 'sendMessageWithConversation' | 'sending'
>;

type UseCoachCommandCenterPendingFoodArgs = {
  chat: CommandCenterChat;
  targetClientId: number | null;
  /**
   * Plan 55 C4 — live admission for a macro message that is sent into the
   * currently selected coaching target. Absent keeps today's behaviour; present
   * means the send and the history refresh only happen while this exact target
   * is the admitted one, and a completion that lands after retirement publishes
   * nothing.
   */
  binding?: PublicationBinding;
};

export function useCoachCommandCenterPendingFood({
  chat,
  targetClientId,
  binding,
}: UseCoachCommandCenterPendingFoodArgs) {
  const bindingRef = useRef(binding);
  bindingRef.current = binding;
  const targetRef = useRef(targetClientId);
  targetRef.current = targetClientId;

  return useCallback(async (
    text: string,
    foodContext: Record<string, unknown>,
  ) => {
    const trimmed = text.trim();
    if (!trimmed || chat.sending) return null;
    if (!isPublicationAdmitted(bindingRef.current, { targetUserId: targetRef.current })) return null;
    // The token this send belongs to. A response that completes after the
    // admission retired is not a publication — it must not refresh history.
    const captured: PublicationSnapshot | null = readPublicationScope(bindingRef.current);
    const response = await chat.sendMessageWithConversation(
      trimmed,
      'macro_logging',
      'Nutrition Coach',
      targetRef.current,
      'both',
      foodContext,
    );
    if (!isPublicationTokenLive(bindingRef.current, captured)) return null;
    void chat.listConversations('active', true);
    return response;
  }, [chat]);
}
