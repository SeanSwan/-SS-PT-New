/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ConversationSidebar                              ║
 * ║  PURPOSE: Conversation history sidebar with search & CRUD    ║
 * ║  OWNER: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────┐
 * │ [+ New Chat] [X]   │
 * │ [Search........]   │
 * │                    │
 * │ Today              │
 * │ > Leg Day Plan     │
 * │ > Diet Questions   │
 * │                    │
 * │ Yesterday          │
 * │ > Form Check       │
 * │ > Cardio Advice    │
 * │                    │
 * │ (empty state)      │
 * └────────────────────┘
 */

import React, { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, MessageSquareOff, Search } from 'lucide-react';
import type { ConversationSummary } from '../../../../hooks/useAIChat';
import ConversationItem from './ConversationItem';
import {
  SidebarOverlay,
  SidebarContainer,
  SidebarHeader,
  NewChatBtn,
  CloseSidebarBtn,
  SearchInput,
  ConversationList,
  GroupLabel,
  EmptyState,
} from './styles/CoachSidebarStyles';

interface ConversationSidebarProps {
  isOpen: boolean;
  conversations: ConversationSummary[];
  groupedConversations: { label: string; items: ConversationSummary[] }[];
  activeConversationId: number | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose: () => void;
  onNewChat: () => void;
  onSelectConversation: (id: number) => void;
  onDeleteConversation: (id: number) => void;
  onRenameConversation: (id: number, title: string) => void;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  isOpen,
  groupedConversations,
  activeConversationId,
  searchQuery,
  onSearchChange,
  onClose,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleNewChat = useCallback(() => {
    onNewChat();
    // Always close sidebar after new chat so user sees the fresh conversation
    onClose();
  }, [onNewChat, onClose]);

  const handleSelect = useCallback((id: number) => {
    onSelectConversation(id);
    // Close on mobile after selection
    if (window.innerWidth < 1024) onClose();
  }, [onSelectConversation, onClose]);

  const isEmpty = !Array.isArray(groupedConversations) || groupedConversations.length === 0;

  // Portal to document.body to escape parent stacking contexts
  // (dashboard layout creates z-index:1 context that traps the sidebar below the header)
  return createPortal(
    <>
      <SidebarOverlay $isOpen={isOpen} onClick={onClose} />
      <SidebarContainer
        $isOpen={isOpen}
        role="navigation"
        aria-label="Conversation history"
      >
        <SidebarHeader>
          <NewChatBtn onClick={handleNewChat} aria-label="Start new conversation">
            <Plus size={16} />
            New Chat
          </NewChatBtn>
          <CloseSidebarBtn onClick={onClose} aria-label="Close sidebar">
            <X size={20} />
          </CloseSidebarBtn>
        </SidebarHeader>

        <SearchInput
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          aria-label="Search conversations"
        />

        <ConversationList>
          {isEmpty ? (
            <EmptyState>
              <MessageSquareOff size={32} style={{ opacity: 0.3 }} />
              <div>{searchQuery ? 'No matches found' : 'No conversations yet'}</div>
              <div style={{ fontSize: '12px' }}>
                {searchQuery ? 'Try a different search' : 'Start a new chat to begin'}
              </div>
            </EmptyState>
          ) : (
            groupedConversations.map(group => (
              <div key={group.label}>
                <GroupLabel>{group.label}</GroupLabel>
                {group.items.map(conv => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === activeConversationId}
                    onSelect={handleSelect}
                    onDelete={onDeleteConversation}
                    onRename={onRenameConversation}
                  />
                ))}
              </div>
            ))
          )}
        </ConversationList>
      </SidebarContainer>
    </>,
    document.body
  );
};

export default ConversationSidebar;
