import React from 'react';
import { Clock3, MessageCircle } from 'lucide-react';
import type { ConversationSummary } from '../../../../hooks/useAIChat';
import { formatThreadMeta, getConversationTitle } from './CoachCommandCenter.logic';

type CoachActiveThreadHeaderProps = {
  thread: ConversationSummary | null;
};

function positiveId(value: number | string | null | undefined): string | null {
  const raw = String(value ?? '').trim();
  return /^[1-9]\d*$/.test(raw) ? raw : null;
}

function clientLabel(thread: ConversationSummary): string {
  const targetUserId = positiveId(thread.targetUserId);
  return targetUserId ? `Client #${targetUserId}` : 'No client bound';
}

function messageCountLabel(thread: ConversationSummary): string {
  const count = Number(thread.messageCount || 0);
  return `${count} ${count === 1 ? 'msg' : 'msgs'}`;
}

function statusLabel(thread: ConversationSummary): string {
  return thread.status?.trim() || 'active';
}

const CoachActiveThreadHeader: React.FC<CoachActiveThreadHeaderProps> = ({ thread }) => {
  if (!thread) {
    return (
      <section className="active-thread-header is-empty" role="region" aria-label="Active coach thread">
        <MessageCircle size={16} aria-hidden="true" />
        <span>New chat</span>
        <small>No client selected</small>
      </section>
    );
  }

  const title = getConversationTitle(thread);

  return (
    <section className="active-thread-header" role="region" aria-label={`Active coach thread: ${title}`}>
      <MessageCircle size={16} aria-hidden="true" />
      <strong>{title}</strong>
      <span>{clientLabel(thread)}</span>
      <span>{messageCountLabel(thread)}</span>
      <span>{statusLabel(thread)}</span>
      <small><Clock3 size={13} aria-hidden="true" /> {formatThreadMeta(thread)}</small>
    </section>
  );
};

export default CoachActiveThreadHeader;
