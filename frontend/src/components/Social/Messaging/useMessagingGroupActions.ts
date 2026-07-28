/**
 * FILE: useMessagingGroupActions.ts
 * PURPOSE: REST group-management actions for the messaging hook.
 */
import { useCallback } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ConversationData, GroupRole, MessageData } from './MessagingTypes';
import { encodeMessagingPathSegment, normalizeConversationPayload } from './messagingApiAdapters';
import { apiFetch } from './messagingApiFetch';
import { createMessagingErrorState, type MessagingErrorState } from './messagingSafeErrors';

interface Args {
  enabled: boolean;
  currentUserId: string | number | null;
  mountedRef: MutableRefObject<boolean>;
  applyConversationUpdate: (conversation: ConversationData | null) => void;
  setConversations: Dispatch<SetStateAction<ConversationData[]>>;
  setActiveConversationId: Dispatch<SetStateAction<string | number | null>>;
  setMessages: Dispatch<SetStateAction<MessageData[]>>;
  setError: Dispatch<SetStateAction<MessagingErrorState | null>>;
}

export function useMessagingGroupActions({
  enabled,
  currentUserId,
  mountedRef,
  applyConversationUpdate,
  setConversations,
  setActiveConversationId,
  setMessages,
  setError,
}: Args) {
  const renameConversation = useCallback(async (conversationId: string | number, name: string) => {
    if (!enabled) return null;
    try {
      const data = await apiFetch<unknown>(`/conversations/${encodeMessagingPathSegment(conversationId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
      const conversation = normalizeConversationPayload(data);
      applyConversationUpdate(conversation);
      return conversation;
    } catch {
      if (mountedRef.current) setError(createMessagingErrorState('request'));
      return null;
    }
  }, [applyConversationUpdate, enabled, mountedRef, setError]);

  const addConversationParticipants = useCallback(async (conversationId: string | number, participantIds: number[], adminIds: number[] = []) => {
    if (!enabled) return null;
    try {
      const data = await apiFetch<unknown>(`/conversations/${encodeMessagingPathSegment(conversationId)}/participants`, {
        method: 'POST',
        body: JSON.stringify({ participantIds, adminIds }),
      });
      const conversation = normalizeConversationPayload(data);
      applyConversationUpdate(conversation);
      return conversation;
    } catch {
      if (mountedRef.current) setError(createMessagingErrorState('request'));
      return null;
    }
  }, [applyConversationUpdate, enabled, mountedRef, setError]);

  const updateParticipantRole = useCallback(async (conversationId: string | number, userId: number, role: Exclude<GroupRole, 'owner'>) => {
    if (!enabled) return null;
    try {
      const data = await apiFetch<unknown>(`/conversations/${encodeMessagingPathSegment(conversationId)}/participants/${encodeMessagingPathSegment(userId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      const conversation = normalizeConversationPayload(data);
      applyConversationUpdate(conversation);
      return conversation;
    } catch {
      if (mountedRef.current) setError(createMessagingErrorState('request'));
      return null;
    }
  }, [applyConversationUpdate, enabled, mountedRef, setError]);

  const removeConversationParticipant = useCallback(async (conversationId: string | number, userId: number) => {
    if (!enabled) return false;
    try {
      const data = await apiFetch<unknown>(`/conversations/${encodeMessagingPathSegment(conversationId)}/participants/${encodeMessagingPathSegment(userId)}`, {
        method: 'DELETE',
      });
      const conversation = normalizeConversationPayload(data);
      if (conversation) applyConversationUpdate(conversation);
      if (!conversation && mountedRef.current && Number(userId) === Number(currentUserId)) {
        setConversations(prev => prev.filter(item => String(item.id) !== String(conversationId)));
        setActiveConversationId(null);
        setMessages([]);
      }
      return true;
    } catch {
      if (mountedRef.current) setError(createMessagingErrorState('request'));
      return false;
    }
  }, [applyConversationUpdate, currentUserId, enabled, mountedRef, setActiveConversationId, setConversations, setError, setMessages]);

  return {
    renameConversation,
    addConversationParticipants,
    updateParticipantRole,
    removeConversationParticipant,
  };
}
