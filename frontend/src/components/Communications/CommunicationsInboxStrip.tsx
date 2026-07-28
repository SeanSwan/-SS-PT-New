/**
 * FILE: CommunicationsInboxStrip.tsx
 * PURPOSE: Mounted Communications OS inbox buckets backed by the canonical notification center.
 */
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { AlertCircle, Award, CalendarCheck, CreditCard, Dumbbell, Megaphone, MessageSquare, Shield, Users } from 'lucide-react';

import { useCommunicationCenter } from '../../hooks/useCommunicationCenter';
import type { Notification } from '../../store/slices/notificationSlice';
import { type CommunicationInboxBucketKey } from './communicationInboxModel';

interface PreviewLinkAction {
  label: string;
  type: 'link';
  href: string;
}

interface PreviewSnoozeAction {
  label: string;
  type: 'snooze';
  durationMinutes: number;
}

type PreviewAction = PreviewLinkAction | PreviewSnoozeAction;

const SNOOZE_MIN_MINUTES = 5;
const SNOOZE_MAX_MINUTES = 10080;
const DEFAULT_PREVIEW_SNOOZE_MINUTES = 60;

const normalizePreviewSnoozeDuration = (durationMinutes: unknown): number => {
  const value = Number(durationMinutes);
  if (!Number.isInteger(value)) return DEFAULT_PREVIEW_SNOOZE_MINUTES;
  return value >= SNOOZE_MIN_MINUTES && value <= SNOOZE_MAX_MINUTES
    ? value
    : DEFAULT_PREVIEW_SNOOZE_MINUTES;
};

const getSafePreviewActions = (notification: Notification | null): PreviewAction[] => (
  notification?.actions?.flatMap((action): PreviewAction[] => {
    const label = action.label.trim();
    if (!label) return [];

    if (action.type === 'link') {
      const href = typeof action.href === 'string' ? action.href.trim() : '';
      if (!href.startsWith('/') || href.startsWith('//')) return [];
      return [{ label, type: 'link', href }];
    }

    if (action.type === 'snooze') {
      return [{ label, type: 'snooze', durationMinutes: normalizePreviewSnoozeDuration(action.durationMinutes) }];
    }

    return [];
  }).slice(0, 2) || []
);

const ICONS = {
  action_required: AlertCircle,
  messages: MessageSquare,
  schedule: CalendarCheck,
  training: Dumbbell,
  billing: CreditCard,
  community: Users,
  achievements: Award,
  system: Shield,
  admin: Megaphone,
} satisfies Record<CommunicationInboxBucketKey, React.ElementType>;

const CommunicationsInboxStrip: React.FC = () => {
  const {
    buckets,
    activeBucket,
    loading,
    error,
    snoozeNotification,
    selectBucket,
  } = useCommunicationCenter({
    fetchOnMount: true,
    subscribeToSocket: true,
  });
  const latest = activeBucket.latest;
  const previewActions = useMemo(() => getSafePreviewActions(latest), [latest]);
  const handleSnoozeAction = (durationMinutes: number) => {
    if (!latest) return;
    void snoozeNotification(latest.id, durationMinutes);
  };

  return (
    <InboxRegion aria-label="Communications inbox">
      <BucketRail aria-label="Communication categories">
        {buckets.map((bucket) => {
          const Icon = ICONS[bucket.key];
          return (
            <BucketButton
              key={bucket.key}
              type="button"
              $active={bucket.key === activeBucket.key}
              aria-pressed={bucket.key === activeBucket.key}
              aria-label={`${bucket.label} ${bucket.total} total ${bucket.unread} unread`}
              onClick={() => selectBucket(bucket.key)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{bucket.label}</span>
              <strong>{bucket.unread || bucket.total}</strong>
            </BucketButton>
          );
        })}
      </BucketRail>

      <InboxPreview aria-live="polite">
        {loading ? (
          <PreviewTitle>Syncing inbox...</PreviewTitle>
        ) : error ? (
          <PreviewTitle>Inbox temporarily unavailable</PreviewTitle>
        ) : latest ? (
          <>
            <PreviewKicker>{activeBucket.label}</PreviewKicker>
            <PreviewTitle>{latest.title}</PreviewTitle>
            {previewActions.length > 0 ? (
              <PreviewActions>
                {previewActions.map(action => (action.type === 'link' ? (
                  <PreviewActionLink key={`${action.label}-${action.href}`} href={action.href}>
                    {action.label}
                  </PreviewActionLink>
                ) : (
                  <PreviewActionButton
                    key={`${action.label}-${action.durationMinutes}`}
                    type="button"
                    onClick={() => handleSnoozeAction(action.durationMinutes)}
                  >
                    {action.label}
                  </PreviewActionButton>
                )))}
              </PreviewActions>
            ) : latest.actionLabel && <PreviewAction>{latest.actionLabel}</PreviewAction>}
          </>
        ) : (
          <>
            <PreviewKicker>{activeBucket.label}</PreviewKicker>
            <PreviewTitle>Clear</PreviewTitle>
          </>
        )}
      </InboxPreview>
    </InboxRegion>
  );
};

export default React.memo(CommunicationsInboxStrip);

const InboxRegion = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 0.36fr);
  gap: 0.75rem;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  border-radius: 8px;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--bg-surface, #1A1A24) 90%, var(--accent-primary, #60C0F0) 7%),
    var(--bg-base, #0A0A0F));
  padding: 0.75rem;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const BucketRail = styled.div`
  display: grid;
  grid-template-columns: repeat(9, minmax(92px, 1fr));
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 2px;

  @media (max-width: 1180px) {
    grid-template-columns: repeat(9, minmax(112px, 1fr));
  }
`;

const BucketButton = styled.button<{ $active?: boolean }>`
  min-height: 56px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid ${({ $active }) => ($active
    ? 'var(--accent-primary, #60C0F0)'
    : 'var(--border-soft, rgba(96, 192, 240, 0.16))')};
  border-radius: 8px;
  background: ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, var(--bg-surface, #1A1A24))'
    : 'color-mix(in srgb, var(--bg-surface, #1A1A24) 88%, transparent)')};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  padding: 0.55rem 0.65rem;
  text-align: left;

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font: 700 0.72rem/1.1 'Sora', sans-serif;
  }

  strong {
    color: var(--accent-secondary, #8B5CF6);
    font: 800 0.8rem/1 'Sora', sans-serif;
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

const InboxPreview = styled.div`
  min-height: 56px;
  display: grid;
  align-content: center;
  gap: 0.25rem;
  border-left: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
  padding-left: 0.75rem;

  @media (max-width: 820px) {
    border-left: 0;
    border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.14));
    padding-left: 0;
    padding-top: 0.75rem;
  }
`;

const PreviewKicker = styled.span`
  color: var(--accent-primary, #60C0F0);
  font: 700 0.68rem/1 'Fira Code', monospace;
`;

const PreviewTitle = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font: 800 0.86rem/1.2 'Sora', sans-serif;
`;

const PreviewActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

const PreviewActionLink = styled.a`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: 700 0.72rem/1 'Sora', sans-serif;
  padding: 0 0.7rem;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

const PreviewActionButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--accent-secondary, #8B5CF6);
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 16%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font: 700 0.72rem/1 'Sora', sans-serif;
  padding: 0 0.7rem;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

const PreviewAction = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
  font: 600 0.72rem/1.2 'Sora', sans-serif;
`;
