/**
 * buildCoachVoiceRecap — data-truth lock.
 * Every sentence must be a pure function of real proof fields; absent data
 * drops the sentence, zero history returns null (never a fabricated recap).
 */
import { describe, expect, it } from 'vitest';
import { buildCoachVoiceRecap } from './CoachVoiceRecapCard';
import type { HomeTrainingProof } from './HomeTabProofViewModel';

const base: HomeTrainingProof = {
  thisWeekCount: 0,
  minutesThisWeek: 0,
  weeklyCounts: [0, 0, 0, 0],
  weekDelta: null,
  lastSession: null,
  latestSessionId: null,
  shareLine: null,
};

describe('buildCoachVoiceRecap', () => {
  it('returns null for zero history — the orientation strip owns that state', () => {
    expect(buildCoachVoiceRecap(base)).toBeNull();
  });

  it('recaps a real training week with minutes and a positive delta', () => {
    const recap = buildCoachVoiceRecap({
      ...base,
      thisWeekCount: 3,
      minutesThisWeek: 145,
      weeklyCounts: [1, 2, 2, 3],
      weekDelta: 1,
    });
    expect(recap).toBe(
      'You trained 3 times this week for 145 focused minutes. ' +
      "That's 1 more than last week — momentum is building."
    );
  });

  it('drops the minutes clause when minutes are absent — never fabricates', () => {
    const recap = buildCoachVoiceRecap({ ...base, thisWeekCount: 1, weekDelta: null });
    expect(recap).toBe('You trained 1 time this week.');
    expect(recap).not.toMatch(/minutes/);
    expect(recap).not.toMatch(/undefined|NaN|null/);
  });

  it('never shames a down week — no negative-delta sentence exists', () => {
    const recap = buildCoachVoiceRecap({
      ...base,
      thisWeekCount: 1,
      weeklyCounts: [0, 0, 4, 1],
      weekDelta: -3,
    });
    expect(recap).toBe('You trained 1 time this week.');
    expect(recap).not.toMatch(/fewer|less|down|dropped/i);
  });

  it('suppresses the week-over-week clause on a first-ever training week', () => {
    const recap = buildCoachVoiceRecap({
      ...base,
      thisWeekCount: 3,
      minutesThisWeek: 120,
      weeklyCounts: [0, 0, 0, 3],
      weekDelta: 3,
    });
    expect(recap).toBe('You trained 3 times this week for 120 focused minutes.');
    expect(recap).not.toMatch(/last week/);
  });

  it('anchors an idle week to the real last session instead of a zero-guilt line', () => {
    const recap = buildCoachVoiceRecap({
      ...base,
      lastSession: { title: 'Lower Strength', when: '5 days ago' },
    });
    expect(recap).toBe(
      'Your last logged session was Lower Strength (5 days ago). ' +
      'This week is still open — one session restarts the rhythm.'
    );
  });
});
