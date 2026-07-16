/**
 * ┌─── SUB-COMPONENT: ConversationItem ────────────────────────┐
 * │ PARENT: ConversationSidebar                                 │
 * │ PURPOSE: Single conversation row with title, date, actions  │
 * │ Props: { conversation, isActive, onSelect, onDelete, onRename } │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Row click] → loadConversation(id) → messages render        │
 * │ [Trash icon] → deleteConversation(id) → removed from list   │
 * │ [Edit icon] → inline rename → renameConversation(id, title) │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { MessageSquare, Trash2, Pencil, Check, X } from 'lucide-react';
import type { ConversationSummary } from '../../../../hooks/useAIChat';
import {
  ConvItemRow,
  ConvItemContent,
  ConvItemTitle,
  ConvItemMeta,
  ConvItemActions,
  ConvActionBtn,
  ThreadIcon,
  InlineTitleInput,
} from './styles/CoachSidebarStyles';

interface ConversationItemProps {
  conversation: ConversationSummary;
  isActive: boolean;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onRename: (id: number, title: string) => void;
}

// Format relative time: "2h ago", "Yesterday", "Mar 28"
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffHr < 48) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const ConversationItem: React.FC<ConversationItemProps> = memo(({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onRename,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    const frame = window.requestAnimationFrame(() => editInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isEditing]);

  const handleSelect = useCallback(() => {
    if (!isEditing) onSelect(conversation.id);
  }, [conversation.id, isEditing, onSelect]);

  const handleRowKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect();
    }
  }, [handleSelect]);

  const handleStartEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(conversation.title || 'Untitled');
    setIsEditing(true);
  }, [conversation.title]);

  const handleConfirmEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRename(conversation.id, editTitle.trim());
    }
    setIsEditing(false);
  }, [conversation.id, editTitle, onRename]);

  const handleCancelEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
  }, []);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(conversation.id);
  }, [conversation.id, onDelete]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editTitle.trim()) onRename(conversation.id, editTitle.trim());
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  }, [conversation.id, editTitle, onRename]);

  return (
    <ConvItemRow
      $active={isActive}
      onClick={handleSelect}
      onKeyDown={handleRowKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Open ${conversation.title || 'Untitled'} coach thread`}
    >
      <ThreadIcon aria-hidden="true">
        <MessageSquare size={16} />
      </ThreadIcon>
      <ConvItemContent>
        {isEditing ? (
          <InlineTitleInput
            ref={editInputRef}
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <>
            <ConvItemTitle>{conversation.title || 'Untitled'}</ConvItemTitle>
            <ConvItemMeta>
              {conversation.messageCount} msgs · {formatRelativeTime(conversation.lastMessageAt || conversation.createdAt)}
            </ConvItemMeta>
          </>
        )}
      </ConvItemContent>
      <ConvItemActions>
        {isEditing ? (
          <>
            <ConvActionBtn type="button" onClick={handleConfirmEdit} aria-label="Confirm rename">
              <Check size={14} />
            </ConvActionBtn>
            <ConvActionBtn type="button" onClick={handleCancelEdit} aria-label="Cancel rename">
              <X size={14} />
            </ConvActionBtn>
          </>
        ) : (
          <>
            <ConvActionBtn type="button" onClick={handleStartEdit} aria-label="Rename conversation">
              <Pencil size={14} />
            </ConvActionBtn>
            <ConvActionBtn type="button" onClick={handleDelete} aria-label="Delete conversation">
              <Trash2 size={14} />
            </ConvActionBtn>
          </>
        )}
      </ConvItemActions>
    </ConvItemRow>
  );
});

ConversationItem.displayName = 'ConversationItem';

export default ConversationItem;
