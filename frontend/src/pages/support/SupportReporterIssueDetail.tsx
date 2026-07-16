/**
 * FILE: SupportReporterIssueDetail.tsx
 * PURPOSE: Reporter-visible issue status, owner replies, and safe follow-up.
 */
import { X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import type {
  SupportIssue,
  SupportIssueClient,
  SupportIssueEvent,
} from '../../services/supportIssueService';
import { ErrorText, Muted } from './SupportReportRoom.styles';
import {
  CloseButton, Conversation, Detail, DetailHeader, DetailTitle,
  Message, MessageMeta, ReplyArea, ReplyButton, ReplyLabel,
} from './SupportReporterIssueDetail.styles';

interface Props {
  issueId: string;
  client: SupportIssueClient;
  onClose: () => void;
}

const eventAuthor = (event: SupportIssueEvent) => event.eventType === 'reporter_reply' ? 'You' : 'SwanStudios';

const SupportReporterIssueDetail: React.FC<Props> = ({ issueId, client, onClose }) => {
  const [issue, setIssue] = useState<SupportIssue | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    client.getIssue(issueId)
      .then((result) => { if (active) setIssue(result); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'The report could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client, issueId]);

  const sendReply = async () => {
    const body = reply.trim();
    if (!body) return;
    setBusy(true); setError('');
    try {
      const event = await client.addReply(issueId, body);
      setIssue((current) => current ? { ...current, events: [...(current.events ?? []), event] } : current);
      setReply('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The follow-up could not be sent.');
    } finally { setBusy(false); }
  };

  return (
    <Detail aria-labelledby="report-detail-title">
      <DetailHeader>
        <div><DetailTitle id="report-detail-title">Report details</DetailTitle>{issue && <Muted>{issue.referenceCode} · {issue.status.replace(/_/g, ' ')}</Muted>}</div>
        <CloseButton type="button" onClick={onClose} aria-label="Close report details"><X size={18} aria-hidden="true" /></CloseButton>
      </DetailHeader>
      {loading && <Muted role="status">Loading report details…</Muted>}
      {error && <ErrorText role="alert">{error}</ErrorText>}
      {issue && (
        <>
          {issue.resolutionSummary && <Muted><strong>Resolution:</strong> {issue.resolutionSummary}</Muted>}
          <Conversation aria-label="Report conversation">
            {(issue.events ?? []).filter((event) => event.body).map((event) => (
              <Message key={event.id}>
                <MessageMeta>{eventAuthor(event)} · {new Date(event.createdAt).toLocaleString()}</MessageMeta>
                <p>{event.body}</p>
              </Message>
            ))}
          </Conversation>
          {!['closed', 'duplicate'].includes(issue.status) && (
            <>
              <ReplyLabel htmlFor="support-reporter-reply">Add more detail
                <ReplyArea id="support-reporter-reply" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={8000} />
              </ReplyLabel>
              <ReplyButton type="button" onClick={sendReply} disabled={busy || !reply.trim()}>{busy ? 'Sending…' : 'Send follow-up'}</ReplyButton>
            </>
          )}
        </>
      )}
    </Detail>
  );
};

export default SupportReporterIssueDetail;
