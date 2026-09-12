/**
 * FILE: ClientDashboardHome.viewModel.disclosure.test.ts
 * PURPOSE: Lock the progressive-disclosure contract (audit 2026-09-12
 *          A-2/D6): day-1 home cards show only live or loading metrics —
 *          "Not available" tombstone rows stay hidden until a real data
 *          source exists. Honesty is preserved by omission + teach-style
 *          empty states, never by fake numbers.
 */
import { describe, expect, it } from 'vitest';
import { buildInsights, buildTodaySnapshot } from './ClientDashboardHome.viewModel';
import type { HomeTrainingProof } from './HomeTabProofViewModel';

const proof = {
  minutesThisWeek: 90,
  thisWeekCount: 2,
  weeklyCounts: [1, 2, 3, 4, 0, 0, 0],
  latestSessionId: 'session-1',
  shareLine: 'Two sessions this week.',
} as unknown as HomeTrainingProof;

describe('ClientDashboardHome viewModel progressive disclosure', () => {
  it('today snapshot drops "Not available" rows until a live source exists', () => {
    const snapshot = buildTodaySnapshot({ sessions: [], proof, macroSummary: null, macroLoading: false });

    expect(snapshot.rows.some((row) => row.value === 'Not available')).toBe(false);
    expect(snapshot.rows.map((row) => row.label)).not.toContain('Average Heart Rate');
    expect(snapshot.rows.map((row) => row.label)).not.toContain('Calories Burned');
    // Live metrics remain.
    expect(snapshot.rows.map((row) => row.label)).toContain('Workouts Logged');
  });

  it('keeps loading rows visible while data is in flight', () => {
    const snapshot = buildTodaySnapshot({ sessions: [], proof, macroSummary: null, macroLoading: true });

    expect(snapshot.rows.map((row) => row.value)).toContain('Loading');
  });

  it('insights hide source-less metrics instead of showing "Not available"', () => {
    const rows = buildInsights(proof, 40, 3);

    expect(rows.some((insight) => insight.value === 'Not available')).toBe(false);
    expect(rows.map((insight) => insight.label)).toEqual(
      expect.arrayContaining(['Training Volume', 'Consistency']),
    );
  });
});
