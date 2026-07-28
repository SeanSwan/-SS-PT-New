/**
 * FILE: messagingApiAdapters.ts
 * PURPOSE: Normalize live messaging API payloads for the mounted dashboard tab.
 */
import type {
  ConversationData,
  GroupRole,
  MessageAttachment,
  MessageData,
  MessageParticipant,
  MessagePin,
  MessageReaction,
  MessageSave,
  SearchUserResult,
} from './MessagingTypes';

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

const asBoolean = (value: unknown, fallback = false): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
};

const asId = (value: unknown): number | string => {
  const next = Number(value);
  return Number.isFinite(next) && value !== '' && value !== null ? next : asString(value);
};

const asOptionalId = (value: unknown): number | string | null => {
  if (value === null || value === undefined || value === '') return null;
  const id = asId(value);
  return id === '' ? null : id;
};

const asOptionalNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

const normalizeRole = (value: unknown): string => {
  const role = asString(value, 'client').toLowerCase();
  return role === 'user' ? 'client' : role;
};

const normalizeGroupRole = (value: unknown): GroupRole | undefined => {
  const role = asString(value).toLowerCase();
  return role === 'owner' || role === 'admin' || role === 'member' ? role : undefined;
};

const splitName = (raw: AnyRecord): { firstName: string; lastName: string; displayName: string } => {
  const firstName = asString(raw.firstName);
  const lastName = asString(raw.lastName);
  const name = asString(raw.name, [firstName, lastName].filter(Boolean).join(' '));
  const parts = name.split(/\s+/).filter(Boolean);

  if (firstName || lastName) {
    return { firstName, lastName, displayName: [firstName, lastName].filter(Boolean).join(' ') || name || 'SwanStudios Member' };
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

export const encodeMessagingPathSegment = (value: string | number): string => encodeURIComponent(String(value));

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
    groupRole: normalizeGroupRole(raw.groupRole ?? raw.group_role ?? raw.participantRole ?? raw.participant_role),
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
  return { content, created_at: createdAt || new Date(0).toISOString(), sender_id: senderId };
};

const normalizeReaction = (value: unknown): MessageReaction | null => {
  const raw = isRecord(value) ? value : {};
  const userId = asNumber(raw.userId ?? raw.user_id);
  const reaction = asString(raw.reaction);
  if (!userId || !reaction) return null;
  return { id: asOptionalId(raw.id) ?? undefined, userId, reaction, createdAt: asString(raw.createdAt, asString(raw.created_at, new Date(0).toISOString())) };
};

const normalizePin = (value: unknown): MessagePin | null => {
  const raw = isRecord(value) ? value : {};
  const pinnedBy = asNumber(raw.pinnedBy ?? raw.pinned_by);
  if (!pinnedBy) return null;
  return { id: asOptionalId(raw.id) ?? undefined, pinnedBy, createdAt: asString(raw.createdAt, asString(raw.created_at, new Date(0).toISOString())) };
};

const normalizeSave = (value: unknown): MessageSave | null => {
  const raw = isRecord(value) ? value : {};
  const savedBy = asNumber(raw.savedBy ?? raw.saved_by);
  if (!savedBy) return null;
  return { id: asOptionalId(raw.id) ?? undefined, savedBy, createdAt: asString(raw.createdAt, asString(raw.created_at, new Date(0).toISOString())) };
};

const normalizeAttachment = (value: unknown): MessageAttachment | null => {
  const raw = isRecord(value) ? value : {};
  const id = asOptionalId(raw.id);
  const kind = asString(raw.kind);
  const title = asString(raw.title);
  if (!id || !kind || !title) return null;
  return {
    id,
    kind,
    title,
    url: asString(raw.url) || null,
    entityType: asString(raw.entityType, asString(raw.entity_type)) || null,
    entityId: asOptionalNumber(raw.entityId ?? raw.entity_id),
    metadata: isRecord(raw.metadata) ? raw.metadata : null,
    scanStatus: asString(raw.scanStatus, asString(raw.scan_status, 'not_required')),
  };
};

export const normalizeConversation = (value: unknown): ConversationData | null => {
  if (!isRecord(value)) return null;
  const participants = asArray(value.participants).map(normalizeParticipant).filter((participant) => participant.id > 0);
  const viewerRole = normalizeGroupRole(value.viewerRole ?? value.viewer_role);

  return {
    id: asId(value.id),
    type: asString(value.type, 'direct'),
    name: asString(value.name) || null,
    created_at: asString(value.created_at, asString(value.createdAt, new Date(0).toISOString())),
    updated_at: asString(value.updated_at, asString(value.updatedAt, new Date(0).toISOString())),
    lastMessage: normalizeLastMessage(value.lastMessage),
    participants,
    unreadCount: asNumber(value.unreadCount),
    viewerRole,
    canManage: asBoolean(value.canManage ?? value.can_manage, viewerRole === 'owner' || viewerRole === 'admin'),
    memberCount: asNumber(value.memberCount ?? value.member_count, participants.length),
    isMuted: asBoolean(value.isMuted ?? value.is_muted),
    mutedUntil: asString(value.mutedUntil, asString(value.muted_until)) || null,
  };
};

export const normalizeMessage = (value: unknown): MessageData | null => {
  if (!isRecord(value)) return null;
  const id = asId(value.id);
  const conversationId = asId(value.conversation_id ?? value.conversationId);
  const senderId = asNumber(value.sender_id, asNumber(value.senderId));
  const content = asString(value.content);
  const attachments = asArray(value.attachments).map(normalizeAttachment).filter((attachment): attachment is MessageAttachment => Boolean(attachment));
  if (!id || !conversationId || !senderId || (!content && attachments.length === 0)) return null;

  return {
    id,
    conversation_id: conversationId,
    sender_id: senderId,
    content,
    clientMessageId: asString(value.clientMessageId) || undefined,
    created_at: asString(value.created_at, asString(value.createdAt, new Date().toISOString())),
    updated_at: asString(value.updated_at, asString(value.updatedAt, new Date().toISOString())),
    reply_to_message_id: asOptionalId(value.reply_to_message_id ?? value.replyToMessageId),
    edited_at: asString(value.edited_at, asString(value.editedAt)) || null,
    deleted_at: asString(value.deleted_at, asString(value.deletedAt)) || null,
    deleted_by: asOptionalNumber(value.deleted_by ?? value.deletedBy),
    sender: value.sender ? normalizeParticipant(value.sender) : undefined,
    readBy: asArray(value.readBy).map((entry) => {
      const raw = isRecord(entry) ? entry : {};
      return { userId: asNumber(raw.userId, asNumber(raw.user_id)), readAt: asString(raw.readAt, asString(raw.read_at, new Date().toISOString())) };
    }).filter((entry) => entry.userId > 0),
    reactions: asArray(value.reactions).map(normalizeReaction).filter((reaction): reaction is MessageReaction => Boolean(reaction)),
    pins: asArray(value.pins).map(normalizePin).filter((pin): pin is MessagePin => Boolean(pin)),
    saves: asArray(value.saves).map(normalizeSave).filter((save): save is MessageSave => Boolean(save)),
    attachments,
  };
};

export const normalizeConversationsPayload = (payload: unknown): ConversationData[] => {
  const rows = Array.isArray(payload) ? payload : isRecord(payload) ? asArray(payload.conversations) : [];
  return rows.map(normalizeConversation).filter((conversation): conversation is ConversationData => Boolean(conversation));
};

export const normalizeMessagesPayload = (payload: unknown): MessageData[] => {
  const rows = Array.isArray(payload) ? payload : isRecord(payload) ? asArray(payload.messages) : [];
  return rows.map(normalizeMessage).filter((message): message is MessageData => Boolean(message))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
};

export const normalizeMessageSearchPayload = (payload: unknown): MessageData[] => {
  const rows = Array.isArray(payload) ? payload : isRecord(payload) ? asArray(payload.results ?? payload.messages) : [];
  return rows.map(normalizeMessage).filter((message): message is MessageData => Boolean(message));
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
  const rows = Array.isArray(payload) ? payload : isRecord(payload) ? asArray(payload.users) : [];
  return rows.map(normalizeParticipant).filter((participant) => participant.id > 0).map((participant) => ({
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
