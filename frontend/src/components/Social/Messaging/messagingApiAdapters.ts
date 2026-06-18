/**
 * ============================================================================
 * FILE: messagingApiAdapters.ts
 * PURPOSE: Normalize live messaging API payloads for the mounted dashboard tab.
 * ============================================================================
 *
 * The production controller has returned both raw arrays and wrapped objects
 * over time. These adapters keep the UI stable while backend contracts converge.
 */
import type { ConversationData, MessageData, MessageParticipant, SearchUserResult } from './MessagingTypes';

type AnyRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is AnyRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const asId = (value: unknown): number | string => {
  const next = Number(value);
  return Number.isFinite(next) && value !== '' && value !== null ? next : asString(value);
};

const normalizeRole = (value: unknown): string => {
  const role = asString(value, 'client').toLowerCase();
  return role === 'user' ? 'client' : role;
};

const splitName = (raw: AnyRecord): { firstName: string; lastName: string; displayName: string } => {
  const firstName = asString(raw.firstName);
  const lastName = asString(raw.lastName);
  const name = asString(raw.name, [firstName, lastName].filter(Boolean).join(' '));
  const parts = name.split(/\s+/).filter(Boolean);

  if (firstName || lastName) {
    return {
      firstName,
      lastName,
      displayName: [firstName, lastName].filter(Boolean).join(' ') || name || 'SwanStudios Member',
    };
  }

  return {
    firstName: parts[0] || 'SwanStudios',
    lastName: parts.slice(1).join(' ') || 'Member',
    displayName: name || 'SwanStudios Member',
  };
};

export const participantDisplayName = (participant: Pick<MessageParticipant, 'firstName' | 'lastName' | 'username'> & { displayName?: string } | null): string => {
  if (!participant) return 'Conversation';
  return participant.displayName
    || [participant.firstName, participant.lastName].filter(Boolean).join(' ')
    || participant.username
    || 'SwanStudios Member';
};

export const normalizeParticipant = (value: unknown): MessageParticipant => {
  const raw = isRecord(value) ? value : {};
  const names = splitName(raw);

  return {
    id: asNumber(raw.id),
    firstName: names.firstName,
    lastName: names.lastName,
    username: asString(raw.username, names.displayName),
    photo: asString(raw.photo, '') || null,
    role: normalizeRole(raw.role),
    displayName: names.displayName,
    lastActive: asString(raw.lastActive, asString(raw.lastLogin, '')) || null,
  };
};

const normalizeLastMessage = (value: unknown): ConversationData['lastMessage'] | undefined => {
  const raw = isRecord(value) ? value : {};
  const content = asString(raw.content);
  const createdAt = asString(raw.created_at, asString(raw.timestamp, asString(raw.createdAt)));
  const senderId = asNumber(raw.sender_id, asNumber(raw.senderId));

  if (!content && !createdAt && !senderId) return undefined;

  return {
    content,
    created_at: createdAt || new Date(0).toISOString(),
    sender_id: senderId,
  };
};

export const normalizeConversation = (value: unknown): ConversationData | null => {
  if (!isRecord(value)) return null;
  const participants = asArray(value.participants)
    .map(normalizeParticipant)
    .filter((participant) => participant.id > 0);

  return {
    id: asId(value.id),
    type: asString(value.type, 'direct'),
    name: asString(value.name) || null,
    created_at: asString(value.created_at, asString(value.createdAt, new Date(0).toISOString())),
    updated_at: asString(value.updated_at, asString(value.updatedAt, new Date(0).toISOString())),
    lastMessage: normalizeLastMessage(value.lastMessage),
    participants,
    unreadCount: asNumber(value.unreadCount),
  };
};

export const normalizeMessage = (value: unknown): MessageData | null => {
  if (!isRecord(value)) return null;
  const id = asId(value.id);
  const conversationId = asId(value.conversation_id ?? value.conversationId);
  const senderId = asNumber(value.sender_id, asNumber(value.senderId));
  const content = asString(value.content);

  if (!id || !conversationId || !senderId || !content) return null;

  return {
    id,
    conversation_id: conversationId,
    sender_id: senderId,
    content,
    created_at: asString(value.created_at, asString(value.createdAt, new Date().toISOString())),
    updated_at: asString(value.updated_at, asString(value.updatedAt, new Date().toISOString())),
    sender: value.sender ? normalizeParticipant(value.sender) : undefined,
    readBy: asArray(value.readBy).map((entry) => {
      const raw = isRecord(entry) ? entry : {};
      return {
        userId: asNumber(raw.userId, asNumber(raw.user_id)),
        readAt: asString(raw.readAt, asString(raw.read_at, new Date().toISOString())),
      };
    }).filter((entry) => entry.userId > 0),
  };
};

export const normalizeConversationsPayload = (payload: unknown): ConversationData[] => {
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? asArray(payload.conversations)
      : [];
  return rows.map(normalizeConversation).filter((conversation): conversation is ConversationData => Boolean(conversation));
};

export const normalizeMessagesPayload = (payload: unknown): MessageData[] => {
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? asArray(payload.messages)
      : [];
  return rows
    .map(normalizeMessage)
    .filter((message): message is MessageData => Boolean(message))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
};

export const normalizeConversationPayload = (payload: unknown): ConversationData | null => {
  if (isRecord(payload) && payload.conversation) return normalizeConversation(payload.conversation);
  return normalizeConversation(payload);
};

export const normalizeMessagePayload = (payload: unknown): MessageData | null => {
  if (isRecord(payload) && payload.message) return normalizeMessage(payload.message);
  return normalizeMessage(payload);
};

export const normalizeSearchUsersPayload = (payload: unknown): SearchUserResult[] => {
  const rows = Array.isArray(payload)
    ? payload
    : isRecord(payload)
      ? asArray(payload.users)
      : [];
  return rows
    .map(normalizeParticipant)
    .filter((participant) => participant.id > 0)
    .map((participant) => ({
      id: participant.id,
      firstName: participant.firstName,
      lastName: participant.lastName,
      username: participant.username,
      photo: participant.photo,
      role: participant.role,
      displayName: participant.displayName,
      lastActive: participant.lastActive,
    }));
};
