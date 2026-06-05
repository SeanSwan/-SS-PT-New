import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.tsx'),
  'utf8',
);

const tableSourcePath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryExerciseTable.tsx',
);

describe('WorkoutHistoryExerciseTable extraction', () => {
  it('keeps exercise table cells outside the canonical panel shell', () => {
    const tableSource = readFileSync(tableSourcePath, 'utf8');

    expect(panelSource).toContain("from './WorkoutHistoryExerciseTable'");
    expect(panelSource).toContain('<WorkoutHistoryExerciseTable');
    expect(panelSource).not.toContain('calcBrzycki1RM(log.weight, log.reps)');
    expect(tableSource).toContain('export interface WorkoutHistoryExerciseTableProps');
    expect(tableSource).toContain('calcBrzycki1RM(log.weight, log.reps)');
  });
});
