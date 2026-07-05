import { describe, expect, it } from 'vitest';
import {
  buildAttendanceFacts,
  buildCategoryFacts,
  buildPrFacts,
  buildRecoveryFacts,
  buildSeriesFacts,
} from './progressChartFacts';

const factById = (facts: { id: string; value: string }[], id: string) =>
  facts.find((fact) => fact.id === id)?.value;

describe('buildSeriesFacts', () => {
  it('returns no facts for an empty series instead of fabricating zeros', () => {
    expect(buildSeriesFacts([])).toEqual([]);
  });

  it('computes latest, best, average, and logged count from verified points', () => {
    const facts = buildSeriesFacts(
      [
        { x: '06/01', y: 1000 },
        { x: '06/08', y: 3000 },
        { x: '06/15', y: 2000 },
      ],
      { unit: 'lbs', pointsLabel: 'wks' },
    );
    expect(factById(facts, 'latest')).toBe('2,000 lbs');
    expect(factById(facts, 'best')).toBe('3,000 lbs');
    expect(factById(facts, 'avg')).toBe('2,000 lbs');
    expect(factById(facts, 'count')).toBe('3 wks');
  });

  it('keeps decimal precision when asked (RPE-style series)', () => {
    const facts = buildSeriesFacts(
      [
        { x: 'W1', y: 6.5 },
        { x: 'W2', y: 7.4 },
      ],
      { decimals: 1 },
    );
    expect(factById(facts, 'latest')).toBe('7.4');
    expect(factById(facts, 'avg')).toBe('7');
  });
});

describe('buildCategoryFacts', () => {
  it('names the top category with its share of the truthful total', () => {
    const facts = buildCategoryFacts(
      [
        { x: 'push', y: 3000 },
        { x: 'pull', y: 1000 },
      ],
      { unit: 'lbs', itemLabel: 'patterns' },
    );
    expect(factById(facts, 'top')).toBe('push');
    expect(factById(facts, 'share')).toBe('75%');
    expect(factById(facts, 'total')).toBe('4,000 lbs');
    expect(factById(facts, 'count')).toBe('2');
  });

  it('returns no facts when nothing is tracked', () => {
    expect(buildCategoryFacts([])).toEqual([]);
  });
});

describe('buildPrFacts', () => {
  it('surfaces the heaviest verified PR and distinct lifts', () => {
    const facts = buildPrFacts([
      { x: '2026-05-01', y: 135, exercise: 'Bench Press', reps: 5 },
      { x: '2026-06-01', y: 225, exercise: 'Deadlift', reps: 3 },
      { x: '2026-06-20', y: 145, exercise: 'Bench Press', reps: 5 },
    ]);
    expect(factById(facts, 'best')).toBe('Deadlift 225 lbs');
    expect(factById(facts, 'latest')).toBe('2026-06-20');
    expect(factById(facts, 'exercises')).toBe('2');
    expect(factById(facts, 'count')).toBe('3');
  });
});

describe('buildRecoveryFacts', () => {
  it('totals pain and redline flags with alert emphasis only when present', () => {
    const facts = buildRecoveryFacts([
      { x: 'Squat', y: 3, painFlags: 2, highRpeFlags: 1, totalSets: 12 },
      { x: 'Bench', y: 1, painFlags: 0, highRpeFlags: 1, totalSets: 9 },
    ]);
    expect(factById(facts, 'pain')).toBe('2');
    expect(factById(facts, 'redline')).toBe('2');
    expect(factById(facts, 'sets')).toBe('21');
    expect(facts.find((fact) => fact.id === 'pain')?.emphasis).toBe('alert');
  });

  it('keeps default emphasis when no flags exist', () => {
    const facts = buildRecoveryFacts([
      { x: 'Row', y: 0, painFlags: 0, highRpeFlags: 0, totalSets: 6 },
    ]);
    expect(facts.find((fact) => fact.id === 'pain')?.emphasis).toBe('default');
  });
});

describe('buildAttendanceFacts', () => {
  it('reads show-rate and totals straight from the verified bundle', () => {
    const facts = buildAttendanceFacts({
      data: [{ x: 'completed', y: 9 }],
      reliabilityPercent: 90,
      totals: { completed: 9, skipped: 1, cancelled: 0, resolved: 10 },
    });
    expect(factById(facts, 'showRate')).toBe('90%');
    expect(factById(facts, 'completed')).toBe('9');
    expect(factById(facts, 'resolved')).toBe('10');
  });

  it('returns no facts when there is no attendance history', () => {
    expect(buildAttendanceFacts({
      data: [],
      reliabilityPercent: 0,
      totals: { completed: 0, skipped: 0, cancelled: 0, resolved: 0 },
    })).toEqual([]);
  });
});
