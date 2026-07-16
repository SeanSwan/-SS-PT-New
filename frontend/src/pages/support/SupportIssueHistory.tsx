/**
 * FILE: SupportIssueHistory.tsx
 * PURPOSE: Reporter-visible receipts, status, conversation detail, and follow-up.
 */
import React, { useState } from 'react';
import type { SupportIssue, SupportIssueClient } from '../../services/supportIssueService';
import SupportReporterIssueDetail from './SupportReporterIssueDetail';
import {
  HistoryItem, HistoryList, HistoryMeta, Muted, Panel, PanelHeading,
  PanelIntro, RetryButton,
} from './SupportReportRoom.styles';

interface Props {
  issues: SupportIssue[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string;
  client: SupportIssueClient;
  onRetry: () => void;
  onLoadMore: () => void;
}

const label = (value: string) => value.replace(/_/g, ' ');
const date = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Date unavailable' : parsed.toLocaleDateString();
};

const SupportIssueHistory: React.FC<Props> = ({ issues, loading, loadingMore, hasMore, error, client, onRetry, onLoadMore }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <Panel aria-labelledby="report-history-title" aria-busy={loading || loadingMore}>
      <PanelHeading id="report-history-title">Your reports</PanelHeading>
      <PanelIntro>Receipts and current status stay here so you never have to wonder what was sent.</PanelIntro>
      {loading && <Muted role="status" aria-live="polite">Loading your reports…</Muted>}
      {!loading && error && (
        <div role="alert"><Muted>{error}</Muted><RetryButton type="button" onClick={onRetry}>Try again</RetryButton></div>
      )}
      {!loading && !error && issues.length === 0 && (
        <Muted><em>No reports yet.</em> When you send one, its receipt and status will appear here.</Muted>
      )}
      {!loading && issues.length > 0 && (
        <HistoryList>
          {issues.map((issue) => (
            <HistoryItem key={issue.id}>
              <strong>{issue.title}</strong>
              <HistoryMeta>
                <span>{issue.referenceCode}</span><span>{label(issue.status)}</span>
                <span>{label(issue.severity)}</span><span>{date(issue.lastActivityAt)}</span>
              </HistoryMeta>
              <RetryButton type="button" onClick={() => setSelectedId(issue.id)}>View report</RetryButton>
            </HistoryItem>
          ))}
        </HistoryList>
      )}
      {!loading && !error && hasMore && (
        <RetryButton type="button" onClick={onLoadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading older reports...' : 'Load older reports'}
        </RetryButton>
      )}
      {selectedId && (
        <SupportReporterIssueDetail issueId={selectedId} client={client} onClose={() => setSelectedId(null)} />
      )}
    </Panel>
  );
};

export default SupportIssueHistory;