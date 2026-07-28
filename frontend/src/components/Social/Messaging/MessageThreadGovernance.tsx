/**
 * FILE: MessageThreadGovernance.tsx
 * PURPOSE: Thread-level search, unread, mute, block, and archive controls for messaging.
 */
import React, { useCallback, useId, useState } from 'react';
import { Archive, Bell, BellOff, MailOpen, Search, ShieldOff } from 'lucide-react';
import type { MessageData } from './MessagingTypes';
import {
  GovernanceBand,
  RunSearchButton,
  SearchEmpty,
  SearchInput,
  SearchLabel,
  SearchPanel,
  SearchResult,
  SearchResults,
  ToolButton,
  ToolRow,
} from './MessageThreadGovernance.styles';

interface Props {
  conversationId: string | number | null;
  isMuted?: boolean;
  blockUserId?: number | null;
  blockUserLabel?: string;
  onArchiveConversation?: (conversationId: string | number) => void | Promise<unknown>;
  onBlockUser?: (userId: number) => void | Promise<unknown>;
  onMarkUnread?: (conversationId: string | number) => void | Promise<unknown>;
  onMuteConversation?: (conversationId: string | number) => void | Promise<unknown>;
  onSearchMessages?: (conversationId: string | number, query: string) => Promise<MessageData[]>;
  onUnmuteConversation?: (conversationId: string | number) => void | Promise<unknown>;
}

export const ThreadGovernanceControls: React.FC<Props> = ({
  conversationId,
  isMuted = false,
  blockUserId,
  blockUserLabel = 'participant',
  onArchiveConversation,
  onBlockUser,
  onMarkUnread,
  onMuteConversation,
  onSearchMessages,
  onUnmuteConversation,
}) => {
  const inputId = useId();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MessageData[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  const runSearch = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!conversationId || !onSearchMessages || trimmed.length < 2) return;
    setSearching(true);
    const rows = await onSearchMessages(conversationId, trimmed);
    setResults(rows);
    setSearched(true);
    setSearching(false);
  }, [conversationId, onSearchMessages, query]);

  if (!conversationId) return null;

  return (
    <GovernanceBand>
      <ToolRow aria-label="Conversation actions">
        {onSearchMessages && <ToolButton type="button" aria-label="Search this conversation" $active={searchOpen} onClick={() => setSearchOpen(open => !open)}><Search size={16} /></ToolButton>}
        {onMarkUnread && <ToolButton type="button" aria-label="Mark conversation unread" onClick={() => void onMarkUnread(conversationId)}><MailOpen size={16} /></ToolButton>}
        {isMuted ? onUnmuteConversation && <ToolButton type="button" aria-label="Unmute conversation" $active onClick={() => void onUnmuteConversation(conversationId)}><Bell size={16} /></ToolButton> : onMuteConversation && <ToolButton type="button" aria-label="Mute conversation" onClick={() => void onMuteConversation(conversationId)}><BellOff size={16} /></ToolButton>}
        {blockUserId && onBlockUser && <ToolButton type="button" aria-label={`Block ${blockUserLabel}`} $danger onClick={() => void onBlockUser(blockUserId)}><ShieldOff size={16} /></ToolButton>}
        {onArchiveConversation && <ToolButton type="button" aria-label="Archive conversation" $danger onClick={() => void onArchiveConversation(conversationId)}><Archive size={16} /></ToolButton>}
      </ToolRow>

      {searchOpen && onSearchMessages && (
        <SearchPanel onSubmit={runSearch}>
          <SearchLabel htmlFor={inputId}>Search messages in this conversation</SearchLabel>
          <SearchInput id={inputId} value={query} onChange={event => setQuery(event.target.value)} />
          <RunSearchButton type="submit" aria-label="Run message search" disabled={query.trim().length < 2 || searching}>{searching ? 'Searching' : 'Search'}</RunSearchButton>
          {searched && (
            <SearchResults aria-label="Message search results">
              {results.length === 0 ? <SearchEmpty>No matching messages</SearchEmpty> : results.map(message => <SearchResult key={String(message.id)}>{message.content}</SearchResult>)}
            </SearchResults>
          )}
        </SearchPanel>
      )}
    </GovernanceBand>
  );
};
