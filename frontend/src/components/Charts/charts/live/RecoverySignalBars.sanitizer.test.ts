import { describe, expect, it } from 'vitest';
import { sanitizeRecoverySignalRows } from './RecoverySignalBars';

describe('sanitizeRecoverySignalRows', () => {
  it('keeps only finite recovery signal rows and clamps bar percentages', () => {
    const rows = sanitizeRecoverySignalRows([
      { x: '  Bench Press  ', y: '3', painFlags: '2', highRpeFlags: 1, totalSets: '5' },
      { x: 'Bad NaN', y: Number.NaN, painFlags: Number.NaN, highRpeFlags: undefined, totalSets: 0 },
      { x: 'Over cap', y: 500, painFlags: 0, highRpeFlags: 500, totalSets: 1 },
      { x: '', y: 1, painFlags: 1, highRpeFlags: 0, totalSets: 3 },
      { x: 'No signal', y: 'nope', painFlags: 0, highRpeFlags: 0, totalSets: 10 },
    ]);

    expect(rows).toEqual([
      {
        x: 'Bench Press',
        y: 3,
        painFlags: 2,
        highRpeFlags: 1,
        totalSets: 5,
        pct: 60,
      },
      {
        x: 'Over cap',
        y: 500,
        painFlags: 0,
        highRpeFlags: 500,
        totalSets: 1,
        pct: 100,
      },
    ]);
  });

  it('limits the rendered signal list after sanitizing invalid rows', () => {
    const rows = sanitizeRecoverySignalRows(
      [
        { x: 'Empty', y: Number.NaN },
        { x: 'A', y: 1 },
        { x: 'B', y: 1 },
        { x: 'C', y: 1 },
        { x: 'D', y: 1 },
        { x: 'E', y: 1 },
        { x: 'F', y: 1 },
        { x: 'G', y: 1 },
      ],
      3,
    );

    expect(rows.map((row) => row.x)).toEqual(['A', 'B', 'C']);
  });
});
