/**
 * BLUEPRINT: Owner Support Issue Detail
 * PURPOSE: Triage, communicate, audit, and export a de-identified repair prompt.
 * SECURITY: Internal notes and reporter replies remain distinct server actions.
 */
import { Copy as CopyIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import type {
  AdminSupportIssueClient,
  OwnerIssueChanges,
  OwnerSupportIssue,
} from '../../../../services/adminSupportIssueService';
import type { SupportIssueSeverity, SupportIssueStatus } from '../../../../services/supportIssueService';
import {
  ActionCard, ActionGrid, Alert, AuditList, Button, DetailGrid, DetailHeader, Fact,
  FieldLabel, Input, Panel, PanelTitle, Select, Status, TextArea,
} from './OwnerSupportInbox.styles';

interface Props {
  issue: OwnerSupportIssue | null;
  loading: boolean;
  client: AdminSupportIssueClient;
  onUpdated: (issue: OwnerSupportIssue) => void;
  onReload: () => Promise<void>;
}

const statuses: SupportIssueStatus[] = ['new', 'triaged', 'in_progress', 'waiting_on_reporter', 'resolved', 'closed', 'duplicate'];
const severities: SupportIssueSeverity[] = ['critical', 'high', 'medium', 'low'];
const REFERENCE_PATTERN = /^SWR-\d{8}-[A-F0-9]{8}$/;

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const fallback = document.createElement('textarea');
  fallback.value = text;
  fallback.setAttribute('readonly', '');
  fallback.style.position = 'fixed';
  fallback.style.opacity = '0';
  document.body.appendChild(fallback);
  fallback.select();
  try {
    const legacyDocument = document as Document & { execCommand?: (command: string) => boolean };
    if (!legacyDocument.execCommand?.('copy')) throw new Error('Clipboard access is unavailable.');
  } finally {
    fallback.remove();
  }
}

const SupportIssueDetailPanel: React.FC<Props> = ({ issue, loading, client, onUpdated, onReload }) => {
  const [status, setStatus] = useState<SupportIssueStatus>('new');
  const [severity, setSeverity] = useState<SupportIssueSeverity>('medium');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [duplicateReference, setDuplicateReference] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [note, setNote] = useState('');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!issue) return;
    setStatus(issue.status);
    setSeverity(issue.severity);
    setResolutionSummary(issue.resolutionSummary ?? '');
    setDuplicateReference('');
    setOwnerUserId(issue.assignedOwnerUserId ? String(issue.assignedOwnerUserId) : '');
    setMessage('');
    setError('');
  }, [issue]);

  if (loading) return <Panel><p role="status">Loading issue detail...</p></Panel>;
  if (!issue) return <Panel><p>Select an issue to review its full report.</p></Panel>;

  const needsResolution = status === 'resolved' || status === 'closed';
  const needsDuplicate = status === 'duplicate';
  const lifecycleValid = (!needsResolution || resolutionSummary.trim().length >= 4)
    && (!needsDuplicate || Boolean(issue.duplicateOfIssueId) || REFERENCE_PATTERN.test(duplicateReference.trim()));

  const run = async (label: string, operation: () => Promise<void>) => {
    setBusy(label); setMessage(''); setError('');
    try { await operation(); } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The issue action failed.');
    } finally { setBusy(''); }
  };

  const saveTriage = () => run('triage', async () => {
    const changes: OwnerIssueChanges = {
      status,
      severity,
      assignedOwnerUserId: ownerUserId ? Number(ownerUserId) : null,
      duplicateOfIssueId: needsDuplicate ? issue.duplicateOfIssueId : null,
    };
    if (needsDuplicate && duplicateReference.trim()) {
      delete changes.duplicateOfIssueId;
      changes.duplicateOfReferenceCode = duplicateReference.trim();
    }
    if (needsResolution) changes.resolutionSummary = resolutionSummary.trim();
    const updated = await client.updateIssue(issue.id, changes);
    onUpdated(updated);
    setMessage('Triage saved.');
  });

  const addNote = () => run('note', async () => {
    await client.addNote(issue.id, note.trim());
    setNote(''); setMessage('Private note added.'); await onReload();
  });

  const addReply = () => run('reply', async () => {
    await client.addReply(issue.id, reply.trim());
    setReply(''); setMessage('Reporter update sent.'); await onReload();
  });

  const copyPrompt = () => run('prompt', async () => {
    const result = await client.getRepairPrompt(issue.id);
    await copyText(result.prompt);
    setMessage('Agent prompt copied.');
  });

  return (
    <Panel aria-labelledby="support-detail-title">
      <DetailHeader>
        <div><PanelTitle id="support-detail-title">{issue.title}</PanelTitle><Status>{issue.referenceCode}</Status></div>
        <Button type="button" $primary onClick={copyPrompt} disabled={Boolean(busy)}>
          <CopyIcon size={16} aria-hidden="true" /> Copy agent prompt
        </Button>
      </DetailHeader>
      {error && <Alert role="alert">{error}</Alert>}
      {message && <Status role="status">{message}</Status>}
      <DetailGrid>
        <Fact><h3>What happened</h3><p>{issue.description}</p></Fact>
        <Fact><h3>Expected behavior</h3><p>{issue.expectedBehavior || 'Not provided.'}</p></Fact>
        <Fact><h3>Impact</h3><p>{issue.impact || 'Not provided.'}</p></Fact>
        <Fact><h3>Steps to repeat</h3><ol>{issue.reproductionSteps.length ? issue.reproductionSteps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>) : <li>Not provided.</li>}</ol></Fact>
        <Fact><h3>Technical context</h3><pre>{JSON.stringify(issue.diagnostics, null, 2)}</pre></Fact>
        <Fact><h3>Queue facts</h3><p>Reporter #{issue.reporterUserId}{'\n'}{issue.category} | {issue.source}{'\n'}Opened {new Date(issue.createdAt).toLocaleString()}</p></Fact>
      </DetailGrid>
      <ActionGrid>
        <ActionCard>
          <strong>Triage</strong>
          <FieldLabel>Issue status<Select aria-label="Issue status" value={status} onChange={(event) => setStatus(event.target.value as SupportIssueStatus)}>{statuses.map((value) => <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>)}</Select></FieldLabel>
          <FieldLabel>Severity<Select aria-label="Issue severity" value={severity} onChange={(event) => setSeverity(event.target.value as SupportIssueSeverity)}>{severities.map((value) => <option key={value} value={value}>{value}</option>)}</Select></FieldLabel>
          <FieldLabel>Owner user ID<Input aria-label="Owner user ID" inputMode="numeric" value={ownerUserId} onChange={(event) => setOwnerUserId(event.target.value.replace(/\D/g, ''))} placeholder="Unassigned" /></FieldLabel>
          {needsResolution && <FieldLabel>Resolution summary<TextArea aria-label="Resolution summary" value={resolutionSummary} onChange={(event) => setResolutionSummary(event.target.value)} maxLength={4000} required /></FieldLabel>}
          {needsDuplicate && <FieldLabel>Duplicate issue reference<Input aria-label="Duplicate issue reference" value={duplicateReference} onChange={(event) => setDuplicateReference(event.target.value.toUpperCase())} maxLength={21} placeholder="SWR-YYYYMMDD-XXXXXXXX" required={!issue.duplicateOfIssueId} /></FieldLabel>}
          {!lifecycleValid && <Status role="status">Add the required lifecycle details before saving.</Status>}
          <Button type="button" $primary onClick={saveTriage} disabled={Boolean(busy) || !lifecycleValid}>Save triage</Button>
        </ActionCard>
        <ActionCard>
          <FieldLabel>Internal note<TextArea aria-label="Internal note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={8000} /></FieldLabel>
          <Button type="button" onClick={addNote} disabled={Boolean(busy) || !note.trim()}>Add private note</Button>
          <FieldLabel>Reply to reporter<TextArea aria-label="Reply to reporter" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={8000} /></FieldLabel>
          <Button type="button" $primary onClick={addReply} disabled={Boolean(busy) || !reply.trim()}>Send reporter update</Button>
        </ActionCard>
      </ActionGrid>
      <Fact>
        <h3 id="support-audit-title">Audit history</h3>
        <AuditList aria-labelledby="support-audit-title">
          {issue.events?.length ? issue.events.map((event) => (
            <li key={event.id}>
              <strong>{event.eventType.replace(/_/g, ' ')}</strong>
              <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
              <span>{event.body || 'No message recorded.'}</span>
            </li>
          )) : <li>No issue activity recorded yet.</li>}
        </AuditList>
      </Fact>
    </Panel>
  );
};

export default SupportIssueDetailPanel;