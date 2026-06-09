import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.tsx'),
  'utf8',
);
const panelContentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanelContent.tsx'),
  'utf8',
);
const sessionCardSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistorySessionCard.tsx'),
  'utf8',
);

const tableSourcePath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryExerciseTable.tsx',
);

describe('WorkoutHistoryExerciseTable extraction', () => {
  it('keeps exercise table cells outside the canonical panel shell', () => {
    const tableSource = readFileSync(tableSourcePath, 'utf8');

    expect(panelSource).toContain("from './WorkoutHistoryPanelContent'");
    expect(panelContentSource).toContain("from './WorkoutHistorySessionCard'");
    expect(sessionCardSource).toContain("from './WorkoutHistoryExerciseTable'");
    expect(sessionCardSource).toContain('<WorkoutHistoryExerciseTable');
    expect(panelSource).not.toContain('calcBrzycki1RM(log.weight, log.reps)');
    expect(panelContentSource).not.toContain('calcBrzycki1RM(log.weight, log.reps)');
    expect(tableSource).toContain('export interface WorkoutHistoryExerciseTableProps');
    expect(tableSource).toContain('calcBrzycki1RM(log.weight, log.reps)');
  });
});
