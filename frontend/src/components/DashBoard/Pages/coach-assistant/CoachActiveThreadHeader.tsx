import React from 'react';
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
        <div className="active-thread-main">
          <span className="active-thread-eyebrow">Active thread</span>
          <h3>No thread selected</h3>
          <p>Fresh command lane. Recent and History threads are ready when needed.</p>
        </div>
      </section>
    );
  }

  const title = getConversationTitle(thread);

  return (
    <section className="active-thread-header" role="region" aria-label={`Active coach thread: ${title}`}>
      <div className="active-thread-main">
        <span className="active-thread-eyebrow">Active thread</span>
        <h3>{title}</h3>
        <p>History loaded below. Composer ready for the next command.</p>
      </div>
      <dl className="active-thread-meta" aria-label="Active thread details">
        <div>
          <dt>Client</dt>
          <dd>{clientLabel(thread)}</dd>
        </div>
        <div>
          <dt>History</dt>
          <dd>{messageCountLabel(thread)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{statusLabel(thread)}</dd>
        </div>
        <div>
          <dt>Last activity</dt>
          <dd>{formatThreadMeta(thread)}</dd>
        </div>
      </dl>
    </section>
  );
};

export default CoachActiveThreadHeader;
