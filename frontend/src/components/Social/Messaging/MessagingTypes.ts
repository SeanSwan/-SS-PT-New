/**
 * ============================================================================
 * FILE: MessagingTypes.ts
 * PURPOSE: Type definitions for the Direct Messaging system
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────
// SECTION: Core Types
// ─────────────────────────────────────────────────────────────

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

export interface MessageData {
  id: number | string;
  conversation_id: number | string;
  sender_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  sender?: MessageParticipant;
  readBy?: { userId: number; readAt: string }[];
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

// ─────────────────────────────────────────────────────────────
// SECTION: Component Props
// ─────────────────────────────────────────────────────────────

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
  onSend: (content: string) => void;
  disabled?: boolean;
}

export interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartConversation: (request: number | CreateConversationRequest) => void | Promise<unknown>;
}
