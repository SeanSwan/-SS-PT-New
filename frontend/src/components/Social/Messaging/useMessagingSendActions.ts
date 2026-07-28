import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { MessageData, PendingMessage, SendMessageOptions } from './MessagingTypes';
import { encodeMessagingPathSegment, normalizeMessagePayload } from './messagingApiAdapters';
import { apiFetch } from './messagingApiFetch';
import { createMessagingErrorState, type MessagingErrorState } from './messagingSafeErrors';
import { createClientMessageId, type SendMessageAck } from './useMessaging.helpers';

type SocketEmit = (event: string, payload?: unknown, ack?: (...args: unknown[]) => void) => void;

interface UseMessagingSendActionsParams {
  activeConversationId: string | number | null;
  activeConvRef: MutableRefObject<string | number | null>;
  connected: boolean;
  emit: SocketEmit;
  enabled: boolean;
  fetchConversations: () => Promise<void>;
  mountedRef: MutableRefObject<boolean>;
  pendingMessages: PendingMessage[];
  setError: Dispatch<SetStateAction<MessagingErrorState | null>>;
  setMessages: Dispatch<SetStateAction<MessageData[]>>;
  setPendingMessages: Dispatch<SetStateAction<PendingMessage[]>>;
}

const markPending = (messages: PendingMessage[], pending: PendingMessage) => (
  messages.some(message => message.clientMessageId === pending.clientMessageId)
    ? messages.map(message => message.clientMessageId === pending.clientMessageId ? pending : message)
    : [...messages, pending]
);

export function useMessagingSendActions({
  activeConversationId,
  activeConvRef,
  connected,
  emit,
  enabled,
  fetchConversations,
  mountedRef,
  pendingMessages,
  setError,
  setMessages,
  setPendingMessages,
}: UseMessagingSendActionsParams) {
  const postMessage = useCallback(async (
    conversationId: string | number,
    content: string,
    clientMessageId?: string,
    options: SendMessageOptions = {},
  ) => {
    try {
      const segment = encodeMessagingPathSegment(conversationId);
      const body: Record<string, unknown> = { content };
      if (clientMessageId) body.clientMessageId = clientMessageId;
      if (options.replyToMessageId) body.replyToMessageId = options.replyToMessageId;
      if (options.attachments?.length) body.attachments = options.attachments;
      const data = await apiFetch<unknown>(`/conversations/${segment}/messages`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const sentMessage = normalizeMessagePayload(data);
      if (mountedRef.current) {
        if (sentMessage) setMessages(prev => [...prev, sentMessage]);
        if (clientMessageId) setPendingMessages(prev => prev.filter(message => message.clientMessageId !== clientMessageId));
        await fetchConversations();
      }
    } catch {
      if (!mountedRef.current) return;
      if (clientMessageId) {
        setPendingMessages(prev => prev.map(message => message.clientMessageId === clientMessageId
          ? { ...message, status: 'failed' }
          : message));
      }
      setError(createMessagingErrorState('send'));
    }
  }, [fetchConversations, mountedRef, setError, setMessages, setPendingMessages]);

  const handleSocketSendAck = useCallback(async (clientMessageId: string, ack: SendMessageAck) => {
    if (!mountedRef.current) return;
    if (ack?.clientMessageId && ack.clientMessageId !== clientMessageId) return;

    if (ack?.ok) {
      const ackMessage = normalizeMessagePayload(ack.message);
      if (ackMessage && String(ackMessage.conversation_id) === String(activeConvRef.current)) {
        setMessages(prev => prev.some(message => String(message.id) === String(ackMessage.id)) ? prev : [...prev, ackMessage]);
      }
      setPendingMessages(prev => prev.filter(message => message.clientMessageId !== clientMessageId));
      await fetchConversations();
      return;
    }

    setPendingMessages(prev => prev.map(message => message.clientMessageId === clientMessageId
      ? { ...message, status: 'failed' }
      : message));
    setError(createMessagingErrorState('send'));
  }, [activeConvRef, fetchConversations, mountedRef, setError, setMessages, setPendingMessages]);

  const sendSocketMessage = useCallback((conversationId: string | number, content: string, clientMessageId: string) => {
    emit('send_message', { conversationId, content, clientMessageId }, (ack: unknown) =>
      handleSocketSendAck(clientMessageId, (ack || {}) as SendMessageAck));
  }, [emit, handleSocketSendAck]);

  const sendMessage = useCallback(async (content: string, options: SendMessageOptions = {}) => {
    const trimmed = content.trim();
    const attachments = options.attachments || [];
    if (!enabled || !activeConversationId || (!trimmed && attachments.length === 0)) return;

    if (options.replyToMessageId || attachments.length > 0) {
      await postMessage(activeConversationId, trimmed, undefined, options);
      return;
    }

    if (connected) {
      const clientMessageId = createClientMessageId();
      setPendingMessages(prev => markPending(prev, {
        clientMessageId,
        conversationId: activeConversationId,
        content: trimmed,
        status: 'pending',
      }));
      sendSocketMessage(activeConversationId, trimmed, clientMessageId);
      return;
    }

    await postMessage(activeConversationId, trimmed);
  }, [activeConversationId, connected, enabled, postMessage, sendSocketMessage, setPendingMessages]);

  const retryMessage = useCallback(async (clientMessageId: string) => {
    if (!enabled) return;
    const retryTarget = pendingMessages.find(message => message.clientMessageId === clientMessageId && message.status === 'failed');
    if (!retryTarget) return;

    setPendingMessages(prev => prev.map(message => message.clientMessageId === clientMessageId
      ? { ...message, status: 'pending' }
      : message));

    if (connected) {
      sendSocketMessage(retryTarget.conversationId, retryTarget.content, retryTarget.clientMessageId);
      return;
    }

    await postMessage(retryTarget.conversationId, retryTarget.content, retryTarget.clientMessageId);
  }, [connected, enabled, pendingMessages, postMessage, sendSocketMessage, setPendingMessages]);

  return { retryMessage, sendMessage };
}