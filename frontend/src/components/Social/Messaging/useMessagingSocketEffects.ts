import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ConversationData, MessageData, PendingMessage, TypingUser } from './MessagingTypes';
import { normalizeMessage } from './messagingApiAdapters';

type SocketEmit = (event: string, payload?: unknown, ack?: (...args: unknown[]) => void) => void;
type SocketOn = (event: string, handler: (...args: unknown[]) => void) => () => void;

interface UseMessagingSocketEffectsParams {
  activeConvRef: MutableRefObject<string | number | null>;
  connected: boolean;
  conversations: ConversationData[];
  currentUserId: string | number | null;
  emit: SocketEmit;
  enabled: boolean;
  mountedRef: MutableRefObject<boolean>;
  on: SocketOn;
  setConversations: Dispatch<SetStateAction<ConversationData[]>>;
  setMessages: Dispatch<SetStateAction<MessageData[]>>;
  setOnlineUserIds: Dispatch<SetStateAction<Set<number>>>;
  setPendingMessages: Dispatch<SetStateAction<PendingMessage[]>>;
  setTypingUsers: Dispatch<SetStateAction<TypingUser[]>>;
  typingClearTimers: MutableRefObject<Map<number, ReturnType<typeof setTimeout>>>;
}

export function useMessagingSocketEffects({
  activeConvRef,
  connected,
  conversations,
  currentUserId,
  emit,
  enabled,
  mountedRef,
  on,
  setConversations,
  setMessages,
  setOnlineUserIds,
  setPendingMessages,
  setTypingUsers,
  typingClearTimers,
}: UseMessagingSocketEffectsParams): void {
  useEffect(() => {
    if (!enabled || !connected || conversations.length === 0) return;
    const convIds = conversations.map(c => c.id);
    emit('join_conversations', convIds);
  }, [connected, conversations, emit, enabled]);

  useEffect(() => {
    if (!enabled || !connected) return;

    const handleNewMessage = (message: unknown) => {
      const typedMsg = normalizeMessage(message);
      if (!typedMsg) return;

      const msgConvId = typedMsg.conversation_id;

      if (String(msgConvId) === String(activeConvRef.current)) {
        setMessages(prev => {
          if (prev.some(m => String(m.id) === String(typedMsg.id))) return prev;
          return [...prev, typedMsg];
        });
        if (typedMsg.clientMessageId) {
          setPendingMessages(prev => prev.filter(p => p.clientMessageId !== typedMsg.clientMessageId));
        }
      }

      setConversations(prev => prev.map(conv => {
        if (String(conv.id) !== String(msgConvId)) return conv;
        return {
          ...conv,
          lastMessage: {
            content: String(typedMsg.content),
            created_at: String(typedMsg.created_at),
            sender_id: Number(typedMsg.sender_id),
          },
          unreadCount: String(msgConvId) === String(activeConvRef.current)
            ? conv.unreadCount
            : conv.unreadCount + 1,
        };
      }));
    };

    const cleanup = on('new_message', handleNewMessage);
    return cleanup;
  }, [connected, on, enabled, activeConvRef, setMessages, setPendingMessages, setConversations]);

  useEffect(() => {
    if (!enabled || !connected) return;

    const handleTyping = (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      if (!data?.conversationId || !data?.userId || !data?.userName) return;
      if (String(data.userId) === String(currentUserId)) return;

      const typingData = {
        userId: Number(data.userId),
        userName: String(data.userName),
        conversationId: data.conversationId as string | number,
      };

      setTypingUsers(prev => {
        const exists = prev.some(
          t => t.userId === typingData.userId &&
               String(t.conversationId) === String(typingData.conversationId)
        );
        return exists ? prev : [...prev, typingData];
      });

      const existingTimer = typingClearTimers.current.get(typingData.userId);
      if (existingTimer) clearTimeout(existingTimer);
      typingClearTimers.current.set(typingData.userId, setTimeout(() => {
        if (mountedRef.current) {
          setTypingUsers(prev => prev.filter(t => t.userId !== typingData.userId));
        }
        typingClearTimers.current.delete(typingData.userId);
      }, 3000));
    };

    const cleanup = on('user_typing', handleTyping);
    return cleanup;
  }, [
    connected,
    on,
    currentUserId,
    enabled,
    mountedRef,
    setTypingUsers,
    typingClearTimers,
  ]);

  useEffect(() => {
    if (!enabled || !connected) return;

    const handleRead = (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      if (!data?.conversationId || !data?.userId || !Array.isArray(data?.readMessageIds)) return;

      if (String(data.conversationId) !== String(activeConvRef.current)) return;
      const userId = Number(data.userId);
      const readIds = data.readMessageIds as (string | number)[];
      setMessages(prev => prev.map(msg => {
        if (!readIds.includes(msg.id)) return msg;
        const existingReads = msg.readBy || [];
        if (existingReads.some(r => r.userId === userId)) return msg;
        return {
          ...msg,
          readBy: [...existingReads, { userId, readAt: new Date().toISOString() }],
        };
      }));
    };

    const cleanup = on('messages_read', handleRead);
    return cleanup;
  }, [connected, on, enabled, activeConvRef, setMessages]);

  useEffect(() => {
    if (!enabled || !connected) return;

    const handleOnline = (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      if (data?.userId) {
        setOnlineUserIds(prev => new Set([...prev, Number(data.userId)]));
      }
    };
    const handleOffline = (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      if (data?.userId) {
        setOnlineUserIds(prev => {
          const next = new Set(prev);
          next.delete(Number(data.userId));
          return next;
        });
      }
    };

    const cleanupOnline = on('user_online', handleOnline);
    const cleanupOffline = on('user_offline', handleOffline);
    return () => { cleanupOnline(); cleanupOffline(); };
  }, [connected, on, enabled, setOnlineUserIds]);
}
