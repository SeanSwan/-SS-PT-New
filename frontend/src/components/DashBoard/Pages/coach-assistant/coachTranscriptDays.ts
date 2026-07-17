/**
 * FILE: coachTranscriptDays.ts (v2 P1.5)
 * PURPOSE: Day-divider labels so older history reads as days, not a soup of
 * bare clock times. Pure + unit-testable.
 */
import type { CommandLogEntry } from './CoachCommandCenter.data';

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function dayLabelFor(at: string | undefined, now: Date = new Date()): string | null {
  if (!at) return null;
  const parsed = new Date(at);
  if (Number.isNaN(parsed.getTime())) return null;
  const dayDelta = Math.round((startOfDay(now) - startOfDay(parsed)) / 86_400_000);
  if (dayDelta <= 0) return 'Today';
  if (dayDelta === 1) return 'Yesterday';
  return parsed.toLocaleDateString([], { month: 'short', day: 'numeric', ...(parsed.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
}

/** Entry ids (oldest→newest order) that should show a day divider ABOVE them. */
export function dayDividerIds(ordered: CommandLogEntry[], now: Date = new Date()): Map<string, string> {
  const dividers = new Map<string, string>();
  let lastLabel: string | null = null;
  for (const entry of ordered) {
    const label = dayLabelFor(entry.at, now);
    if (label && label !== lastLabel) {
      dividers.set(entry.id, label);
      lastLabel = label;
    }
  }
  return dividers;
}
