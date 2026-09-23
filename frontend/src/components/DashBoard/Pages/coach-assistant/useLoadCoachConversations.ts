/**
 * Blueprint: useLoadCoachConversations
 * Parent: CoachCommandCenter.controller (shared by the v4 Coach Workspace).
 * Lists the coach's thread history whenever it becomes readable or is cleared.
 */
import { useEffect, useRef } from 'react';

/**
 * Load thread history when the surface can actually read it. Staff are admitted
 * asynchronously (plan 55: GET /api/ai-chat/target-access) and listConversations
 * answers [] until then, so a mount-only load left a coach's history empty until
 * their first send (brain-v4). Staff list on every admission; a surface with no
 * admission step (phase 'retired' — clients) lists once at mount.
 */
export function useLoadCoachConversations(chat: {
  listConversations: (status: string, force?: boolean) => unknown;
  conversations?: readonly unknown[];
  /** useAIChat: the render's publication scope is committed (a list can succeed). */
  publicationVisible?: boolean;
}, selectionPhase?: string) {
  // "ready" is not enough: the admission publishes its snapshot, then useAIChat
  // commits the new scope a render later and clears the list. Listing before that
  // commit is refused, so readability also waits for publicationVisible.
  const phaseReadable = selectionPhase === undefined || selectionPhase === 'ready' || selectionPhase === 'retired';
  const readable = phaseReadable && chat.publicationVisible !== false;
  // New chat clears the list (useAIChat.newChat); "became empty" re-lists it. An
  // empty ANSWER leaves this true, so a coach with no threads does not loop.
  const empty = (chat.conversations?.length ?? 0) === 0;
  const previous = useRef({ readable: false, empty: true });
  useEffect(() => {
    const was = previous.current;
    previous.current = { readable, empty };
    if (readable && (!was.readable || (empty && !was.empty))) void chat.listConversations('active', true);
    // The trigger is "became readable" or "became empty"; the hook owns its cache afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readable, empty]);
}
