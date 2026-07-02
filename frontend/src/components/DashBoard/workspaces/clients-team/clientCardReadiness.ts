/**
 * PURPOSE: Pure readiness + label helpers for the Client Hub grid card.
 * Extracted from ClientHubGridCard.tsx (300-line cap) and extended with
 * account-access and next-session readiness truth for the command center.
 *
 * Tri-state date semantics (data-truth): `undefined` = unknown on this
 * surface (render neutral guidance), `null` = known-empty (render honest
 * empty state), string = real value.
 */

import type { ClientOption } from './ClientSelectorDropdown';
import type { ClientSessionSignal } from './clientSessionSignal';

export type ClientReadinessTone = 'default' | 'warning' | 'danger';

export interface ClientReadinessSignal {
  value: string;
  tone: ClientReadinessTone;
}

const DAY_MS = 86400000;

export const trimmedOrFallback = (value: string | undefined, fallback: string) => {
  const trimmed = value?.trim();
  return trimmed || fallback;
};

export const hasCapturedClientName = (client: ClientOption) =>
  Boolean(client.firstName?.trim() || client.lastName?.trim());

export const onboardingLabelFor = (onboardingPct: number | undefined) => {
  if (onboardingPct === undefined) return 'intake pending';
  return `${onboardingPct}% onboarded`;
};

export const onboardingNoteFor = (onboardingPct: number | undefined) => {
  if (onboardingPct === undefined) return 'needs intake';
  if (onboardingPct >= 100) return 'intake complete';
  return 'intake progress';
};

export const onboardingReadinessFor = (onboardingPct: number | undefined) => {
  if (onboardingPct === undefined) return 'pending';
  if (onboardingPct >= 100) return 'complete';
  return 'in progress';
};

export const onboardingToneFor = (onboardingPct: number | undefined) =>
  onboardingPct !== undefined && onboardingPct < 100 ? 'warning' : 'default';

export const workoutCountFor = (client: ClientOption) => {
  const parsed = Number(client.workoutCount ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

export const workoutProofLabelFor = (client: ClientOption) => (
  workoutCountFor(client) > 0 ? `${workoutCountFor(client)} logged` : 'No logs yet'
);

const formatUtcMonthDay = (timestamp: number) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(timestamp));

export const lastLoggedLabelFor = (client: ClientOption) => {
  if (!client.lastSessionDate || workoutCountFor(client) <= 0) return null;
  const timestamp = Date.parse(client.lastSessionDate);
  if (!Number.isFinite(timestamp)) return null;
  return `Last logged: ${formatUtcMonthDay(timestamp)}`;
};

export const relativeClientDateLabelFor = (client: ClientOption) => {
  const value = client.assignedAt || client.joinDate;
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  const days = Math.max(0, Math.floor((Date.now() - timestamp) / DAY_MS));
  const prefix = client.assignedAt ? 'Assigned' : 'Joined';
  if (days === 0) return `${prefix} Today`;
  if (days === 1) return `${prefix} Yesterday`;
  if (days < 14) return `${prefix} ${days} days ago`;
  if (days < 60) return `${prefix} ${Math.max(2, Math.round(days / 7))} weeks ago`;
  return `${prefix} ${Math.max(2, Math.round(days / 30))} months ago`;
};

/**
 * Session-bank readiness copy keyed off the session signal tone.
 * `neutral` = free tracking (Move Fitness / external), `warning` = low paid
 * inventory, `gold`/`default` = healthy paid inventory.
 */
export const sessionBankReadinessFor = (sessionSignal: ClientSessionSignal) => {
  if (sessionSignal.tone === 'neutral') return 'tracking mode';
  if (sessionSignal.tone === 'warning') return 'low inventory';
  return 'paid inventory';
};

export const getNextSessionReadiness = (client: ClientOption): ClientReadinessSignal => {
  if (client.nextSessionDate === undefined) return { value: 'check schedule', tone: 'default' };
  if (client.nextSessionDate === null) return { value: 'none booked', tone: 'warning' };
  const timestamp = Date.parse(client.nextSessionDate);
  if (!Number.isFinite(timestamp)) return { value: 'check schedule', tone: 'default' };
  const dayDiff = Math.floor(timestamp / DAY_MS) - Math.floor(Date.now() / DAY_MS);
  if (dayDiff < 0) return { value: `overdue: ${formatUtcMonthDay(timestamp)}`, tone: 'warning' };
  if (dayDiff === 0) return { value: 'Today', tone: 'default' };
  if (dayDiff === 1) return { value: 'Tomorrow', tone: 'default' };
  return { value: formatUtcMonthDay(timestamp), tone: 'default' };
};

export const getAccountAccessReadiness = (client: ClientOption): ClientReadinessSignal => {
  if (client.isActive === false) return { value: 'deactivated', tone: 'danger' };
  if (client.accountStatus === 'stub') return { value: 'invite pending', tone: 'warning' };
  if (client.accountStatus === 'invited') return { value: 'claim link sent', tone: 'warning' };
  if (client.accountStatus === 'active') return { value: 'login ready', tone: 'default' };
  // accountStatus unknown on this surface (e.g. trainer roster) — do not
  // overclaim login readiness; report the isActive truth only.
  return { value: 'active', tone: 'default' };
};
