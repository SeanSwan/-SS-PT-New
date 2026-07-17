/** Queue rail for owner support issues. */
import React from 'react';

import type { OwnerSupportIssue } from '../../../../services/adminSupportIssueService';
import { Meta, Panel, PanelTitle, Queue, QueueButton } from './OwnerSupportInbox.styles';

interface Props {
  issues: OwnerSupportIssue[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (issueId: string) => void;
}

const SupportInboxQueue: React.FC<Props> = ({ issues, selectedId, loading, onSelect }) => (
  <Panel aria-labelledby="support-queue-title">
    <PanelTitle id="support-queue-title">Issue queue</PanelTitle>
    {loading ? <p role="status">Loading support queue…</p> : null}
    {!loading && issues.length === 0 ? <p>No issues match these filters.</p> : null}
    <Queue>
      {issues.map((issue) => (
        <li key={issue.id}>
          <QueueButton
            type="button"
            $active={selectedId === issue.id}
            aria-pressed={selectedId === issue.id}
            onClick={() => onSelect(issue.id)}
          >
            <strong>{issue.title}</strong>
            <Meta>{issue.referenceCode} · {issue.severity} · {issue.status.replace(/_/g, ' ')}</Meta>
          </QueueButton>
        </li>
      ))}
    </Queue>
  </Panel>
);

export default SupportInboxQueue;
