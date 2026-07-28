/**
 * Blueprint: Header notification actions
 * Purpose: Render trusted notification actions in the global header bell without
 * giving raw provider links direct navigation power.
 * Contracts: link actions navigate only to safe internal paths; snooze actions
 * call the canonical notification center with backend-bounded durations.
 */
import React, { memo } from 'react';
import { ArrowRight, Clock } from 'lucide-react';
import styled from 'styled-components';

import type { Notification, NotificationAction } from '../../store/slices/notificationSlice';

const MIN_SNOOZE_MINUTES = 5;
const MAX_SNOOZE_MINUTES = 10080;
const DEFAULT_SNOOZE_MINUTES = 60;
const MAX_HEADER_ACTIONS = 2;

type HeaderAction =
  | {
      key: string;
      kind: 'link';
      label: string;
      href: string;
    }
  | {
      key: string;
      kind: 'snooze';
      label: string;
      durationMinutes: number;
    };

interface HeaderNotificationActionsProps {
  notification: Notification;
  onOpenLink: (notification: Notification, href: string) => void | Promise<void>;
  onSnooze: (notification: Notification, durationMinutes: number) => void | Promise<void>;
}

export function isSafeInternalHref(href: unknown): href is string {
  if (typeof href !== 'string') return false;
  const trimmed = href.trim();
  return trimmed.length > 0 && trimmed.startsWith('/') && !trimmed.startsWith('//');
}

function normalizeSnoozeDuration(durationMinutes: unknown): number {
  if (typeof durationMinutes !== 'number' || !Number.isFinite(durationMinutes)) {
    return DEFAULT_SNOOZE_MINUTES;
  }

  if (durationMinutes < MIN_SNOOZE_MINUTES || durationMinutes > MAX_SNOOZE_MINUTES) {
    return DEFAULT_SNOOZE_MINUTES;
  }

  return Math.round(durationMinutes);
}

function normalizeAction(action: NotificationAction, index: number): HeaderAction | null {
  const type = typeof action.type === 'string' ? action.type.trim().toLowerCase() : '';
  const label = typeof action.label === 'string' ? action.label.trim() : '';

  if ((type === 'link' || type === 'open_link') && isSafeInternalHref(action.href)) {
    return {
      key: `link-${index}-${action.href}`,
      kind: 'link',
      label: label || 'Open',
      href: action.href.trim(),
    };
  }

  if (type === 'snooze') {
    return {
      key: `snooze-${index}-${action.durationMinutes ?? DEFAULT_SNOOZE_MINUTES}`,
      kind: 'snooze',
      label: label || 'Snooze',
      durationMinutes: normalizeSnoozeDuration(action.durationMinutes),
    };
  }

  return null;
}

function normalizeActions(actions: NotificationAction[] | undefined): HeaderAction[] {
  return (actions ?? [])
    .map(normalizeAction)
    .filter((action): action is HeaderAction => Boolean(action))
    .slice(0, MAX_HEADER_ACTIONS);
}

const HeaderNotificationActions = memo(function HeaderNotificationActions({
  notification,
  onOpenLink,
  onSnooze,
}: HeaderNotificationActionsProps) {
  const actions = normalizeActions(notification.actions);

  if (actions.length === 0) return null;

  const handleActionClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    action: HeaderAction,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (action.kind === 'link') {
      void onOpenLink(notification, action.href);
      return;
    }

    void onSnooze(notification, action.durationMinutes);
  };

  return (
    <ActionRow aria-label={`Actions for ${notification.title}`}>
      {actions.map((action) => {
        const Icon = action.kind === 'link' ? ArrowRight : Clock;
        return (
          <HeaderActionButton
            key={action.key}
            type="button"
            onClick={(event) => handleActionClick(event, action)}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Icon size={13} aria-hidden="true" />
            <span>{action.label}</span>
          </HeaderActionButton>
        );
      })}
    </ActionRow>
  );
});

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
`;

const HeaderActionButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  max-width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--glass-border, rgba(96, 192, 240, 0.26));
  border-radius: 999px;
  background: var(--surface-elevated, rgba(0, 48, 128, 0.46));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.1;
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, transform 0.16s ease;

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    background: var(--accent-primary-soft, rgba(96, 192, 240, 0.16));
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

export default HeaderNotificationActions;