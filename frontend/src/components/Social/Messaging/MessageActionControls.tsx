/**
 * FILE: MessageActionControls.tsx
 * PURPOSE: Inline message action controls for reply, edit, reactions, reports, and moderation.
 */
import React from 'react';
import { Edit3, Flag, Pin, PinOff, Reply, SmilePlus, Star, Trash2, X } from 'lucide-react';
import styled from 'styled-components';
import type { MessageData } from './MessagingTypes';

const snippet = (content: string): string => content.trim().replace(/\s+/g, ' ').slice(0, 72) || 'message';

interface MessageActionBarProps {
  message: MessageData;
  canEdit: boolean;
  canDelete: boolean;
  reactionActive: boolean;
  pinned: boolean;
  saved: boolean;
  onReply?: (message: MessageData) => void;
  onEdit?: (message: MessageData) => void;
  onDelete?: (message: MessageData) => void;
  onReport?: (message: MessageData) => void;
  onToggleReaction?: (message: MessageData, reaction: string) => void;
  onTogglePin?: (message: MessageData) => void;
  onToggleSave?: (message: MessageData) => void;
}

export const MessageActionBar: React.FC<MessageActionBarProps> = ({
  message,
  canEdit,
  canDelete,
  reactionActive,
  pinned,
  saved,
  onReply,
  onEdit,
  onDelete,
  onReport,
  onToggleReaction,
  onTogglePin,
  onToggleSave,
}) => {
  if (message.deleted_at) return null;
  const label = snippet(message.content);

  return (
    <ActionRow aria-label="Message actions">
      {onReply && <ActionButton type="button" title="Reply" aria-label={`Reply to message: ${label}`} onClick={() => onReply(message)}><Reply size={14} /></ActionButton>}
      {onToggleReaction && (
        <ActionButton
          type="button"
          title={reactionActive ? 'Remove swan reaction' : 'React with swan'}
          aria-label={`${reactionActive ? 'Remove swan reaction from' : 'React with swan to'} message: ${label}`}
          $active={reactionActive}
          onClick={() => onToggleReaction(message, 'swan')}
        >
          <SmilePlus size={14} />
        </ActionButton>
      )}
      {onTogglePin && <ActionButton type="button" title={pinned ? 'Unpin' : 'Pin'} aria-label={`${pinned ? 'Unpin' : 'Pin'} message: ${label}`} $active={pinned} onClick={() => onTogglePin(message)}>{pinned ? <PinOff size={14} /> : <Pin size={14} />}</ActionButton>}
      {onToggleSave && <ActionButton type="button" title={saved ? 'Unsave' : 'Save'} aria-label={`${saved ? 'Unsave' : 'Save'} message: ${label}`} $active={saved} onClick={() => onToggleSave(message)}><Star size={14} fill={saved ? 'currentColor' : 'none'} /></ActionButton>}
      {canEdit && onEdit && <ActionButton type="button" title="Edit" aria-label={`Edit message: ${label}`} onClick={() => onEdit(message)}><Edit3 size={14} /></ActionButton>}
      {onReport && <DangerButton type="button" title="Report" aria-label={`Report message: ${label}`} onClick={() => onReport(message)}><Flag size={14} /></DangerButton>}
      {canDelete && onDelete && <DangerButton type="button" title="Delete" aria-label={`Delete message: ${label}`} onClick={() => onDelete(message)}><Trash2 size={14} /></DangerButton>}
    </ActionRow>
  );
};

export const MessageReplyPreview: React.FC<{ label: string; content: string }> = ({ label, content }) => (
  <ReplyPreview>
    <strong>{label}</strong>
    <span>{snippet(content)}</span>
  </ReplyPreview>
);

interface ComposerContextProps {
  mode: 'reply' | 'edit';
  label: string;
  content: string;
  onClear: () => void;
}

export const ComposerContext: React.FC<ComposerContextProps> = ({ mode, label, content, onClear }) => (
  <ComposerContextBar>
    <div>
      <strong>{mode === 'reply' ? `Replying to ${label}` : 'Editing message'}</strong>
      <span>{snippet(content)}</span>
    </div>
    <ActionButton type="button" title="Cancel" aria-label="Cancel message action" onClick={onClear}><X size={14} /></ActionButton>
  </ComposerContextBar>
);

export const EditedBadge = styled.span`
  margin-left: 6px;
  color: var(--accent-primary, #60C0F0);
  font-weight: 700;
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`;

const ActionButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) ${({ $active }) => ($active ? '62%' : '28%')}, transparent);
  border-radius: 8px;
  background: ${({ $active }) => ($active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, var(--bg-surface, #1A1A24))' : 'var(--bg-surface, #1A1A24)')};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

const DangerButton = styled(ActionButton)`
  border-color: color-mix(in srgb, var(--error, #EF4444) 48%, transparent);
  color: var(--error, #EF4444);
`;

const ReplyPreview = styled.div`
  display: grid;
  gap: 2px;
  margin-bottom: 8px;
  padding: 8px 10px;
  border-left: 3px solid var(--accent-primary, #60C0F0);
  border-radius: 6px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 86%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.78rem;

  span { color: var(--text-muted, rgba(224, 236, 244, 0.68)); }
`;

const ComposerContextBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);

  div { display: grid; gap: 2px; min-width: 0; }
  span { color: var(--text-muted, rgba(224, 236, 244, 0.68)); overflow-wrap: anywhere; }
`;
