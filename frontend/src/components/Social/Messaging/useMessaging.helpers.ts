/**
 * FILE: useMessaging.helpers.ts
 * PURPOSE: Pure helpers for the real-time messaging hook.
 */
import type { CreateConversationRequest } from './MessagingTypes';

export type CreateConversationInput = number | CreateConversationRequest;

export interface SendMessageAck {
  ok?: boolean;
  clientMessageId?: string | null;
  message?: unknown;
}

export const isMessagingRequestCancellation = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false;
  const code = (err as { code?: unknown }).code;
  return err.name === 'AbortError' || err.name === 'CanceledError' || code === 'ERR_CANCELED';
};

export const normalizeCreateConversationInput = (input: CreateConversationInput): CreateConversationRequest => {
  if (typeof input === 'number') return { type: 'direct', participantIds: [input] };
  return {
    type: input.type || (input.participantIds.length > 1 ? 'group' : 'direct'),
    name: input.name,
    participantIds: input.participantIds,
    adminIds: input.adminIds || [],
  };
};

export const createClientMessageId = (): string => {
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId || `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};