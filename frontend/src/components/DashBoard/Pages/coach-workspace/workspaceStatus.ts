/**
 * FILE: workspaceStatus.ts
 * PURPOSE: brain-v4 hostile review #5 — the v4 workspace never rendered the
 * controller's selectedStatus, and for note saves, voice failures and "wait for
 * the current message" that status is the ONLY feedback. This decides what the
 * composer's one live status line shows.
 */

/** The controller's initial value: true at mount, but nothing has happened yet. */
const RESTING = new Set(['', 'No coach thread selected']);

const WARN = /(not saved|not sent|not shown|fail|not available|too long|wait for|waiting for|choose a)/i;

export type WorkspaceStatus = { text: string; tone: 'warn' | 'info' };

export function workspaceStatus(selectedStatus: string | null | undefined): WorkspaceStatus | null {
  const text = (selectedStatus ?? '').trim();
  if (RESTING.has(text)) return null;
  return { text, tone: WARN.test(text) ? 'warn' : 'info' };
}
