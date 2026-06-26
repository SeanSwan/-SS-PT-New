/**
 * FILE: ConversationListPanel.tsx
 * PURPOSE: Messaging inbox list with direct-thread and group-thread affordances.
 */
import React, { useMemo, useState } from 'react';
import { PenSquare, MessageCircle, Search, Users } from 'lucide-react';
import type { ConversationListProps, ConversationData, MessageParticipant } from './MessagingTypes';
import { participantDisplayName } from './messagingApiAdapters';
import {
  ConversationPanel, ConversationHeader, ConversationTitle,
  NewChatButton, ConversationList, ConversationItem, Avatar,
  ConversationInfo, ConversationName, ConversationPreview,
  ConversationMeta, TimeStamp, UnreadBadge, EmptyState,
  EmptyIcon, EmptyTitle, EmptySubtext, SkeletonLine,
} from './MessagingStyles';
import {
  FilterButton,
  FilterRow,
  HeaderCopy,
  HeaderKicker,
  InboxSearch,
  InboxTools,
  MetricPill,
  MetricRow,
  RoleLine,
  SearchBox,
  SkeletonAvatar,
  SkeletonConversationRow,
  SkeletonStack,
} from './ConversationListPanel.styles';

type ConversationFilter = 'all' | 'groups' | 'admin' | 'trainer' | 'client';

const FILTERS: ConversationFilter[] = ['all', 'groups', 'client', 'trainer', 'admin'];

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

function getMemberCount(conv: ConversationData): number {
  return conv.memberCount || conv.participants.length;
}

const ConversationSkeleton: React.FC = () => (
  <>
    {[1, 2, 3, 4].map(i => (
      <SkeletonConversationRow key={i}>
        <SkeletonAvatar />
        <SkeletonStack>
          <SkeletonLine $width="60%" />
          <SkeletonLine $width="80%" />
        </SkeletonStack>
      </SkeletonConversationRow>
    ))}
  </>
);

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
  const [roleFilter, setRoleFilter] = useState<ConversationFilter>('all');

  const unreadTotal = useMemo(
    () => conversations.reduce((total, conversation) => total + conversation.unreadCount, 0),
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const isGroup = conversation.type === 'group';
      const other = getOtherParticipant(conversation, currentUserId);
      const role = other?.role === 'user' ? 'client' : other?.role;
      const matchesRole = roleFilter === 'all'
        || (roleFilter === 'groups' ? isGroup : !isGroup && role === roleFilter);
      const participantNames = conversation.participants.map(participantDisplayName).join(' ');
      const searchable = [
        getDisplayName(conversation, currentUserId),
        isGroup ? 'group' : 'direct',
        participantNames,
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
          {FILTERS.map((filter) => (
            <FilterButton
              key={filter}
              type="button"
              $active={roleFilter === filter}
              aria-pressed={roleFilter === filter}
              onClick={() => setRoleFilter(filter)}
            >
              {filter}
            </FilterButton>
          ))}
        </FilterRow>
      </InboxTools>

      <ConversationList>
        {loading ? (
          <ConversationSkeleton />
        ) : filteredConversations.length === 0 ? (
          <EmptyState>
            <EmptyIcon><MessageCircle size={32} /></EmptyIcon>
            <EmptyTitle>{conversations.length === 0 ? 'No conversations yet' : 'No matching threads'}</EmptyTitle>
            <EmptySubtext>{conversations.length === 0 ? 'Start a conversation to connect with your trainer or fellow members' : 'Try a different name, role, or message keyword'}</EmptySubtext>
          </EmptyState>
        ) : (
          filteredConversations.map(conv => {
            const isGroup = conv.type === 'group';
            const other = getOtherParticipant(conv, currentUserId);
            const displayName = getDisplayName(conv, currentUserId);
            const memberCount = getMemberCount(conv);
            return (
              <ConversationItem
                key={conv.id}
                $active={conv.id === activeConversationId}
                onClick={() => onSelectConversation(conv.id)}
                aria-label={`${isGroup ? 'Group conversation' : 'Conversation with'} ${displayName}${conv.unreadCount > 0 ? `, ${conv.unreadCount} unread` : ''}`}
              >
                <Avatar data-testid={isGroup ? `conversation-group-avatar-${conv.id}` : undefined}>
                  {isGroup ? (
                    <Users size={18} aria-hidden="true" />
                  ) : other?.photo ? (
                    <img src={other.photo} alt={other ? `${other.firstName} ${other.lastName} profile` : ''} />
                  ) : (
                    getInitials(other)
                  )}
                </Avatar>
                <ConversationInfo>
                  <ConversationName>{displayName}</ConversationName>
                  {isGroup ? (
                    <RoleLine $group data-testid={`conversation-group-badge-${conv.id}`}>Group - {memberCount} members</RoleLine>
                  ) : other?.role ? (
                    <RoleLine>{other.role}</RoleLine>
                  ) : null}
                  <ConversationPreview>{conv.lastMessage?.content || 'No messages yet'}</ConversationPreview>
                </ConversationInfo>
                <ConversationMeta>
                  {conv.lastMessage?.created_at && <TimeStamp>{formatTime(conv.lastMessage.created_at)}</TimeStamp>}
                  {conv.unreadCount > 0 && <UnreadBadge>{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</UnreadBadge>}
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