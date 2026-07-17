import { describe, expect, it } from 'vitest';
import { dayDividerIds, dayLabelFor } from './coachTranscriptDays';
import type { CommandLogEntry } from './CoachCommandCenter.data';

const NOW = new Date('2026-07-17T12:00:00');

const entry = (id: string, at?: string): CommandLogEntry => ({ id, actor: 'coach', label: 'Swan Coach', body: 'x', at });

describe('coachTranscriptDays (v2 P1.5)', () => {
  it('labels today/yesterday/older honestly', () => {
    expect(dayLabelFor('2026-07-17T08:00:00', NOW)).toBe('Today');
    expect(dayLabelFor('2026-07-16T23:59:00', NOW)).toBe('Yesterday');
    expect(dayLabelFor('2026-07-12T10:00:00', NOW)).toBe(new Date('2026-07-12T10:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' }));
    expect(dayLabelFor('2025-12-31T10:00:00', NOW)).toContain('2025');
    expect(dayLabelFor(undefined, NOW)).toBeNull();
    expect(dayLabelFor('garbage', NOW)).toBeNull();
  });

  it('emits one divider per day boundary, skipping timestamp-less entries', () => {
    const dividers = dayDividerIds([
      entry('a', '2026-07-15T09:00:00'),
      entry('b', '2026-07-15T10:00:00'),
      entry('c'),
      entry('d', '2026-07-16T07:00:00'),
      entry('e', '2026-07-17T07:00:00'),
    ], NOW);
    expect([...dividers.entries()]).toEqual([
      ['a', new Date('2026-07-15T09:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })],
      ['d', 'Yesterday'],
      ['e', 'Today'],
    ]);
  });
});
