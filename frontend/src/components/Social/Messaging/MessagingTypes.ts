/**
 * FILE: MessagingTypes.ts
 * PURPOSE: Type definitions for the SwanStudios messaging system.
 */

export type GroupRole = 'owner' | 'admin' | 'member';

export interface MessageParticipant {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  photo: string | null;
  role: string;
  groupRole?: GroupRole;
  displayName?: string;
  lastActive?: string | null;
}

export interface MessageReaction {
  id?: number | string;
  userId: number;
  reaction: string;
  createdAt: string;
}

export interface MessagePin {
  id?: number | string;
  pinnedBy: number;
  createdAt: string;
}

export interface MessageSave {
  id?: number | string;
  savedBy: number;
  createdAt: string;
}

export interface MessageAttachmentDraft {
  kind: 'link' | 'workout_card' | 'session_card' | 'nutrition_card';
  title: string;
  url?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface MessageAttachment {
  id: number | string;
  kind: string;
  title: string;
  url?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  metadata?: Record<string, unknown> | null;
  scanStatus?: string;
}

export interface MessageData {
  id: number | string;
  conversation_id: number | string;
  sender_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  reply_to_message_id?: number | string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  deleted_by?: number | null;
  sender?: MessageParticipant;
  readBy?: { userId: number; readAt: string }[];
  clientMessageId?: string;
  reactions?: MessageReaction[];
  pins?: MessagePin[];
  saves?: MessageSave[];
  attachments?: MessageAttachment[];
}

export interface PendingMessage {
  clientMessageId: string;
  conversationId: string | number;
  content: string;
  status: 'pending' | 'failed';
}

export interface ConversationData {
  id: number | string;
  type: string;
  name: string | null;
  created_at: string;
  updated_at: string;
  lastMessage?: {
    content: string;
    created_at: string;
    sender_id: number;
  };
  participants: MessageParticipant[];
  unreadCount: number;
  viewerRole?: GroupRole;
  canManage?: boolean;
  memberCount?: number;
  isMuted?: boolean;
  mutedUntil?: string | null;
}

export interface CreateConversationRequest {
  type?: 'direct' | 'group';
  participantIds: number[];
  name?: string;
  adminIds?: number[];
}

export interface SearchUserResult {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  photo: string | null;
  role: string;
  groupRole?: GroupRole;
  displayName?: string;
  lastActive?: string | null;
}

export interface TypingUser {
  userId: number;
  userName: string;
  conversationId: string | number;
}

export interface SendMessageOptions {
  replyToMessageId?: number | string | null;
  attachments?: MessageAttachmentDraft[];
}

export interface ConversationListProps {
  conversations: ConversationData[];
  activeConversationId: string | number | null;
  currentUserId: number;
  onSelectConversation: (id: string | number) => void;
  onNewConversation: () => void;
  loading: boolean;
}

export interface MessageThreadProps {
  conversationId: string | number;
  currentUserId: number;
  participant: MessageParticipant | null;
}

export interface ComposeMessageProps {
  onSend: (content: string, options?: SendMessageOptions) => void;
  disabled?: boolean;
}

export interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartConversation: (request: number | CreateConversationRequest) => void | Promise<unknown>;
}
