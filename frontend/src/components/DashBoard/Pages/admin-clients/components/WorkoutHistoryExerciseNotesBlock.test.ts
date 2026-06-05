import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.tsx'),
  'utf8',
);

const notesBlockSourcePath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryExerciseNotesBlock.tsx',
);

describe('WorkoutHistoryExerciseNotesBlock extraction', () => {
  it('keeps exercise-note rendering outside the canonical panel shell', () => {
    const notesBlockSource = readFileSync(notesBlockSourcePath, 'utf8');

    expect(panelSource).toContain("from './WorkoutHistoryExerciseNotesBlock'");
    expect(panelSource).toContain('<WorkoutHistoryExerciseNotesBlock');
    expect(panelSource).not.toContain('buildWorkoutHistoryNotesDisplay(groupSets, activeLogs)');
    expect(notesBlockSource).toContain('export interface WorkoutHistoryExerciseNotesBlockProps');
    expect(notesBlockSource).toContain('buildWorkoutHistoryNotesDisplay(groupSets, activeLogs)');
  });
});
