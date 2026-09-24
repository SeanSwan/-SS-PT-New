/**
 * FILE: threadGroups.ts
 * PURPOSE: Group coach threads by recency for the workspace sidebar
 * (Today · Yesterday · Previous 7 days · Earlier), newest first inside a group.
 * Pure and clock-injected so it is testable across midnight and DST.
 */
import type { ConversationSummary } from '../../../../hooks/useAIChat';

export type ThreadGroup = { label: string; threads: ConversationSummary[] };

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function threadTime(thread: ConversationSummary): number {
  const time = new Date(thread.lastMessageAt || thread.createdAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function groupThreads(threads: ConversationSummary[], now: Date = new Date()): ThreadGroup[] {
  const today = startOfDay(now);
  const buckets: Record<string, ConversationSummary[]> = { Today: [], Yesterday: [], 'Previous 7 days': [], Earlier: [] };
  [...threads].sort((a, b) => threadTime(b) - threadTime(a)).forEach((thread) => {
    const t = threadTime(thread);
    if (t >= today) buckets.Today.push(thread);
    else if (t >= today - DAY) buckets.Yesterday.push(thread);
    else if (t >= today - 7 * DAY) buckets['Previous 7 days'].push(thread);
    else buckets.Earlier.push(thread);
  });
  return Object.entries(buckets).filter(([, list]) => list.length).map(([label, list]) => ({ label, threads: list }));
}

/** "3:04 PM" today, "Mon" this week, "Aug 12" older — for a thread row's subline. */
export function threadWhen(thread: ConversationSummary, now: Date = new Date()): string {
  const time = threadTime(thread);
  if (!time) return '';
  const date = new Date(time);
  if (time >= startOfDay(now)) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (time >= startOfDay(now) - 6 * DAY) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
