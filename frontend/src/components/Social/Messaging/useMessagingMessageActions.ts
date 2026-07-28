import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { MessageData, MessagePin, MessageReaction, MessageSave } from './MessagingTypes';
import { encodeMessagingPathSegment, normalizeMessagePayload } from './messagingApiAdapters';
import { apiFetch } from './messagingApiFetch';
import { createMessagingErrorState, type MessagingErrorState } from './messagingSafeErrors';

interface UseMessagingMessageActionsParams {
  currentUserId: string | number | null;
  enabled: boolean;
  fetchConversations: () => Promise<void>;
  mountedRef: MutableRefObject<boolean>;
  setError: Dispatch<SetStateAction<MessagingErrorState | null>>;
  setMessages: Dispatch<SetStateAction<MessageData[]>>;
}

const nowIso = () => new Date().toISOString();
const sameId = (a: string | number, b: string | number) => String(a) === String(b);

export function useMessagingMessageActions({
  currentUserId,
  enabled,
  fetchConversations,
  mountedRef,
  setError,
  setMessages,
}: UseMessagingMessageActionsParams) {
  const failAction = useCallback(() => {
    if (mountedRef.current) setError(createMessagingErrorState('send'));
  }, [mountedRef, setError]);

  const editMessage = useCallback(async (messageId: string | number, content: string) => {
    if (!enabled || !content.trim()) return null;
    try {
      const id = encodeMessagingPathSegment(messageId);
      const data = await apiFetch<unknown>(`/messages/${id}`, { method: 'PATCH', body: JSON.stringify({ content: content.trim() }) });
      const updated = normalizeMessagePayload(data) || null;
      if (mountedRef.current) {
        setMessages(prev => prev.map(message => sameId(message.id, messageId)
          ? { ...message, ...(updated || {}), content: updated?.content || content.trim(), edited_at: updated?.edited_at || nowIso() }
          : message));
        await fetchConversations();
      }
      return updated;
    } catch {
      failAction();
      return null;
    }
  }, [enabled, failAction, fetchConversations, mountedRef, setMessages]);

  const deleteMessage = useCallback(async (messageId: string | number) => {
    if (!enabled) return false;
    try {
      const id = encodeMessagingPathSegment(messageId);
      await apiFetch<unknown>(`/messages/${id}`, { method: 'DELETE' });
      if (mountedRef.current) {
        setMessages(prev => prev.map(message => sameId(message.id, messageId)
          ? { ...message, content: '[Message deleted]', deleted_at: message.deleted_at || nowIso(), deleted_by: Number(currentUserId) || null }
          : message));
        await fetchConversations();
      }
      return true;
    } catch {
      failAction();
      return false;
    }
  }, [currentUserId, enabled, failAction, fetchConversations, mountedRef, setMessages]);

  const toggleMessageReaction = useCallback(async (message: MessageData, reaction = 'swan') => {
    if (!enabled || !currentUserId) return false;
    const actorId = Number(currentUserId);
    const existing = message.reactions?.some(item => sameId(item.userId, currentUserId) && item.reaction === reaction);
    const id = encodeMessagingPathSegment(message.id);
    try {
      if (existing) await apiFetch<unknown>(`/messages/${id}/reactions?reaction=${encodeURIComponent(reaction)}`, { method: 'DELETE' });
      else await apiFetch<unknown>(`/messages/${id}/reactions`, { method: 'PUT', body: JSON.stringify({ reaction }) });
      if (mountedRef.current) {
        setMessages(prev => prev.map(item => {
          if (!sameId(item.id, message.id)) return item;
          const current = item.reactions || [];
          const reactions = existing
            ? current.filter(row => !(sameId(row.userId, currentUserId) && row.reaction === reaction))
            : [...current, { userId: actorId, reaction, createdAt: nowIso() } as MessageReaction];
          return { ...item, reactions };
        }));
      }
      return true;
    } catch {
      failAction();
      return false;
    }
  }, [currentUserId, enabled, failAction, mountedRef, setMessages]);

  const toggleMessagePin = useCallback(async (message: MessageData) => {
    if (!enabled || !currentUserId) return false;
    const actorId = Number(currentUserId);
    const existing = message.pins?.some(item => sameId(item.pinnedBy, currentUserId));
    const id = encodeMessagingPathSegment(message.id);
    try {
      if (existing) await apiFetch<unknown>(`/messages/${id}/pin`, { method: 'DELETE' });
      else await apiFetch<unknown>(`/messages/${id}/pin`, { method: 'PUT' });
      if (mountedRef.current) {
        setMessages(prev => prev.map(item => {
          if (!sameId(item.id, message.id)) return item;
          const current = item.pins || [];
          const pins = existing
            ? current.filter(row => !sameId(row.pinnedBy, currentUserId))
            : [...current, { pinnedBy: actorId, createdAt: nowIso() } as MessagePin];
          return { ...item, pins };
        }));
      }
      return true;
    } catch {
      failAction();
      return false;
    }
  }, [currentUserId, enabled, failAction, mountedRef, setMessages]);

  const toggleMessageSave = useCallback(async (message: MessageData) => {
    if (!enabled || !currentUserId) return false;
    const actorId = Number(currentUserId);
    const existing = message.saves?.some(item => sameId(item.savedBy, currentUserId));
    const id = encodeMessagingPathSegment(message.id);
    try {
      if (existing) await apiFetch<unknown>(`/messages/${id}/save`, { method: 'DELETE' });
      else await apiFetch<unknown>(`/messages/${id}/save`, { method: 'PUT' });
      if (mountedRef.current) {
        setMessages(prev => prev.map(item => {
          if (!sameId(item.id, message.id)) return item;
          const current = item.saves || [];
          const saves = existing
            ? current.filter(row => !sameId(row.savedBy, currentUserId))
            : [...current, { savedBy: actorId, createdAt: nowIso() } as MessageSave];
          return { ...item, saves };
        }));
      }
      return true;
    } catch {
      failAction();
      return false;
    }
  }, [currentUserId, enabled, failAction, mountedRef, setMessages]);

  return { editMessage, deleteMessage, toggleMessageReaction, toggleMessagePin, toggleMessageSave };
}
