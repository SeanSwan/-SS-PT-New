/**
 * CoachIntakeScopeStatus.tsx
 * ==========================
 * Header-level scope receipt for the Coach intake worklist.
 */
import React from 'react';
import styled from 'styled-components';
import type { CoachIntakeQueueScope } from '../../../../services/coachIntakeService';
import type { PlaudIntakeSummary } from '../../../../services/plaudIntakeService';

interface ScopeCopy {
  title: string;
  detail: string;
  count: keyof PlaudIntakeSummary;
  tone: 'cyan' | 'gold' | 'red' | 'purple';
}
const SCOPE_COPY: Record<CoachIntakeQueueScope, ScopeCopy> = {
  actionable: {
    title: 'Viewing actionable queue',
    detail: 'Ready, blocked, and failed items that need operator attention.',
    count: 'actionable',
    tone: 'cyan',
  },
  ready_review: {
    title: 'Viewing ready drafts',
    detail: 'Prepared proposals waiting for explicit approval.',
    count: 'readyReview',
    tone: 'purple',
  },
  needs_client: {
    title: 'Viewing client-resolution holds',
    detail: 'Items blocked until the correct client is confirmed.',
    count: 'needsClient',
    tone: 'gold',
  },
  unprocessed: {
    title: 'Viewing needs-action queue',
    detail: 'New intake waiting for transcript, grouping, or proposal work.',
    count: 'unprocessed',
    tone: 'cyan',
  },
  processing: {
    title: 'Viewing processing queue',
    detail: 'Items currently transcribing, grouping, or preparing drafts.',
    count: 'processing',
    tone: 'purple',
  },
  failed: {
    title: 'Viewing failed queue',
    detail: 'Recovery items only: retry, upload transcript, hold, or discard.',
    count: 'failed',
    tone: 'red',
  },
};
const ScopeStatus = styled.div<{ $tone: ScopeCopy['tone'] }>`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  margin-top: 8px;
  padding: 7px 9px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #030712) 38%, transparent);
  border: 1px solid ${({ $tone }) => {
    if ($tone === 'gold') return 'color-mix(in srgb, var(--accent-gold, #C6A84B) 32%, transparent)';
    if ($tone === 'red') return 'color-mix(in srgb, var(--color-error, #F87171) 32%, transparent)';
    if ($tone === 'purple') return 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 32%, transparent)';
    return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent)';
  }};
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  line-height: 1.35;

  strong {
    color: var(--text-primary, #E0ECF4);
  }
`;
function isScope(value?: string): value is CoachIntakeQueueScope {
  return Boolean(value && Object.prototype.hasOwnProperty.call(SCOPE_COPY, value));
}
export function CoachIntakeScopeStatus({ scope, summary }: {
  scope?: string;
  summary: PlaudIntakeSummary;
}): JSX.Element {
  const copy = SCOPE_COPY[isScope(scope) ? scope : 'actionable'];
  const count = Number(summary[copy.count] || 0);

  return (
    <ScopeStatus aria-label="Active intake queue scope" $tone={copy.tone}>
      <strong>{copy.title}</strong>
      <span>{copy.detail}</span>
      <span>{count} item{count === 1 ? '' : 's'}</span>
    </ScopeStatus>
  );
}

export default CoachIntakeScopeStatus;
