/**
 * ┌─── SUB-COMPONENT: ConversationListPanel ───────────────────┐
 * │ PARENT: MessagingView                                       │
 * │ PURPOSE: Left panel showing conversation list + new chat    │
 * │ WIREFRAME:                                                  │
 * │ ┌────────────────────────────┐                              │
 * │ │ Messages          [+ New]  │                              │
 * │ ├────────────────────────────┤                              │
 * │ │ [Avatar] Sean Swan    2m   │                              │
 * │ │          Hey, great wo...  │                              │
 * │ │ [Avatar] Jane Doe    1h   │                              │
 * │ │          Thanks!      (2) │                              │
 * │ └────────────────────────────┘                              │
 * │ Props: { conversations, activeId, currentUserId, ... }      │
 * │ CLICK-OUTCOMES:                                             │
 * │ [ConversationItem] -> onSelectConversation(id)              │
 * │ [+ New] -> onNewConversation() opens modal                  │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { PenSquare, MessageCircle } from 'lucide-react';
import type { ConversationListProps, ConversationData, MessageParticipant } from './MessagingTypes';
import {
  ConversationPanel, ConversationHeader, ConversationTitle,
  NewChatButton, ConversationList, ConversationItem, Avatar,
  ConversationInfo, ConversationName, ConversationPreview,
  ConversationMeta, TimeStamp, UnreadBadge, EmptyState,
  EmptyIcon, EmptyTitle, EmptySubtext, SkeletonLine,
} from './MessagingStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Helpers
// ─────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getInitials(p: MessageParticipant | null): string {
  if (!p) return '?';
  return `${(p.firstName?.[0] || '').toUpperCase()}${(p.lastName?.[0] || '').toUpperCase()}`;
}

function getDisplayName(conv: ConversationData, currentUserId: number): string {
  if (conv.name) return conv.name;
  const other = conv.participants.find(p => p.id !== currentUserId);
  if (other) return `${other.firstName} ${other.lastName}`;
  return 'Conversation';
}

function getOtherParticipant(conv: ConversationData, currentUserId: number): MessageParticipant | null {
  return conv.participants.find(p => p.id !== currentUserId) || conv.participants[0] || null;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Loading Skeleton
// ─────────────────────────────────────────────────────────────

const ConversationSkeleton: React.FC = () => (
  <>
    {[1, 2, 3, 4].map(i => (
      <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', alignItems: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(96,192,240,0.06)' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SkeletonLine $width="60%" />
          <SkeletonLine $width="80%" />
        </div>
      </div>
    ))}
  </>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ConversationListPanel: React.FC<ConversationListProps & { mobileHidden?: boolean }> = ({
  conversations,
  activeConversationId,
  currentUserId,
  onSelectConversation,
  onNewConversation,
  loading,
  mobileHidden,
}) => {
  return (
    <ConversationPanel $mobileHidden={mobileHidden}>
      <ConversationHeader>
        <ConversationTitle>Messages</ConversationTitle>
        <NewChatButton onClick={onNewConversation} aria-label="New conversation">
          <PenSquare size={18} />
        </NewChatButton>
      </ConversationHeader>

      <ConversationList>
        {loading ? (
          <ConversationSkeleton />
        ) : conversations.length === 0 ? (
          <EmptyState>
            <EmptyIcon>
              <MessageCircle size={32} />
            </EmptyIcon>
            <EmptyTitle>No conversations yet</EmptyTitle>
            <EmptySubtext>Start a conversation to connect with your trainer or fellow members</EmptySubtext>
          </EmptyState>
        ) : (
          conversations.map(conv => {
            const other = getOtherParticipant(conv, currentUserId);
            return (
              <ConversationItem
                key={conv.id}
                $active={conv.id === activeConversationId}
                onClick={() => onSelectConversation(conv.id)}
                aria-label={`Conversation with ${getDisplayName(conv, currentUserId)}${conv.unreadCount > 0 ? `, ${conv.unreadCount} unread` : ''}`}
              >
                <Avatar>
                  {other?.photo ? (
                    <img src={other.photo} alt={other ? `${other.firstName} ${other.lastName} profile` : ''} />
                  ) : (
                    getInitials(other)
                  )}
                </Avatar>
                <ConversationInfo>
                  <ConversationName>{getDisplayName(conv, currentUserId)}</ConversationName>
                  <ConversationPreview>
                    {conv.lastMessage?.content || 'No messages yet'}
                  </ConversationPreview>
                </ConversationInfo>
                <ConversationMeta>
                  {conv.lastMessage?.created_at && (
                    <TimeStamp>{formatTime(conv.lastMessage.created_at)}</TimeStamp>
                  )}
                  {conv.unreadCount > 0 && (
                    <UnreadBadge>{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</UnreadBadge>
                  )}
                </ConversationMeta>
              </ConversationItem>
            );
          })
        )}
      </ConversationList>
    </ConversationPanel>
  );
};

export default React.memo(ConversationListPanel);
