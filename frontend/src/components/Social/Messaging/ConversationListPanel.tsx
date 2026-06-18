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
import React, { useMemo, useState } from 'react';
import { PenSquare, MessageCircle, Search } from 'lucide-react';
import styled, { css } from 'styled-components';
import type { ConversationListProps, ConversationData, MessageParticipant } from './MessagingTypes';
import { participantDisplayName } from './messagingApiAdapters';
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
  if (other) return participantDisplayName(other);
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
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'trainer' | 'client'>('all');

  const unreadTotal = useMemo(
    () => conversations.reduce((total, conversation) => total + conversation.unreadCount, 0),
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const other = getOtherParticipant(conversation, currentUserId);
      const role = other?.role === 'user' ? 'client' : other?.role;
      const matchesRole = roleFilter === 'all' || role === roleFilter;
      const searchable = [
        getDisplayName(conversation, currentUserId),
        other?.username,
        other?.role,
        conversation.lastMessage?.content,
      ].filter(Boolean).join(' ').toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      return matchesRole && matchesQuery;
    });
  }, [conversations, currentUserId, query, roleFilter]);

  return (
    <ConversationPanel $mobileHidden={mobileHidden}>
      <ConversationHeader>
        <HeaderCopy>
          <HeaderKicker>Inbox</HeaderKicker>
          <ConversationTitle>Messages</ConversationTitle>
        </HeaderCopy>
        <NewChatButton onClick={onNewConversation} aria-label="New conversation">
          <PenSquare size={18} />
        </NewChatButton>
      </ConversationHeader>

      <InboxTools>
        <MetricRow aria-label="Messaging summary">
          <MetricPill><strong>{conversations.length}</strong> threads</MetricPill>
          <MetricPill $urgent={unreadTotal > 0}><strong>{unreadTotal}</strong> unread</MetricPill>
        </MetricRow>
        <SearchBox>
          <Search size={15} aria-hidden="true" />
          <InboxSearch
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people or messages"
            aria-label="Search conversations"
          />
        </SearchBox>
        <FilterRow aria-label="Filter conversations by role">
          {(['all', 'client', 'trainer', 'admin'] as const).map((role) => (
            <FilterButton
              key={role}
              type="button"
              $active={roleFilter === role}
              aria-pressed={roleFilter === role}
              onClick={() => setRoleFilter(role)}
            >
              {role}
            </FilterButton>
          ))}
        </FilterRow>
      </InboxTools>

      <ConversationList>
        {loading ? (
          <ConversationSkeleton />
        ) : filteredConversations.length === 0 ? (
          <EmptyState>
            <EmptyIcon>
              <MessageCircle size={32} />
            </EmptyIcon>
            <EmptyTitle>{conversations.length === 0 ? 'No conversations yet' : 'No matching threads'}</EmptyTitle>
            <EmptySubtext>{conversations.length === 0 ? 'Start a conversation to connect with your trainer or fellow members' : 'Try a different name, role, or message keyword'}</EmptySubtext>
          </EmptyState>
        ) : (
          filteredConversations.map(conv => {
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
                  {other?.role && <RoleLine>{other.role}</RoleLine>}
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

const HeaderCopy = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
`;

const HeaderKicker = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
`;

const InboxTools = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
`;

const MetricRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
`;

const MetricPill = styled.div<{ $urgent?: boolean }>`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, var(--accent-primary, #60C0F0) 8%);
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  font-size: 0.72rem;

  strong {
    color: ${({ $urgent }) => ($urgent ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-primary, #E0ECF4)')};
    font-family: 'Sora', sans-serif;
    font-size: 0.95rem;
  }
`;

const SearchBox = styled.label`
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  background: var(--bg-base, #0A0A0F);
  color: var(--accent-primary, #60C0F0);
  padding: 0 0.75rem;
`;

const InboxSearch = styled.input`
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.55));
  }
`;

const FilterRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.35rem;
`;

const FilterButton = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.7));
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  text-transform: capitalize;

  ${({ $active }) => $active && css`
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
    color: var(--text-primary, #E0ECF4);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
  `}

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  }
`;

const RoleLine = styled.div`
  color: var(--accent-primary, #60C0F0);
  font-size: 0.65rem;
  margin-top: 2px;
  text-transform: capitalize;
`;
