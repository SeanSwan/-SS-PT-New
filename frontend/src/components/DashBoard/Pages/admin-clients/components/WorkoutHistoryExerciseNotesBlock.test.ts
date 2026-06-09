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

const notesBlockSourcePath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryExerciseNotesBlock.tsx',
);

describe('WorkoutHistoryExerciseNotesBlock extraction', () => {
  it('keeps exercise-note rendering outside the canonical panel shell', () => {
    const notesBlockSource = readFileSync(notesBlockSourcePath, 'utf8');

    expect(panelSource).toContain("from './WorkoutHistoryPanelContent'");
    expect(panelContentSource).toContain("from './WorkoutHistorySessionCard'");
    expect(sessionCardSource).toContain("from './WorkoutHistoryExerciseNotesBlock'");
    expect(sessionCardSource).toContain('<WorkoutHistoryExerciseNotesBlock');
    expect(panelSource).not.toContain('buildWorkoutHistoryNotesDisplay(groupSets, activeLogs)');
    expect(panelContentSource).not.toContain('buildWorkoutHistoryNotesDisplay(groupSets, activeLogs)');
    expect(notesBlockSource).toContain('export interface WorkoutHistoryExerciseNotesBlockProps');
    expect(notesBlockSource).toContain('buildWorkoutHistoryNotesDisplay(groupSets, activeLogs)');
  });
});
