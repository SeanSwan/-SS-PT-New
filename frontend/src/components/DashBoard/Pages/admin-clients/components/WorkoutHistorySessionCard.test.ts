import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.tsx'),
  'utf8',
);

const cardSourcePath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistorySessionCard.tsx',
);

describe('WorkoutHistorySessionCard extraction', () => {
  it('keeps expandable session-card rendering outside the canonical panel shell', () => {
    const cardSource = readFileSync(cardSourcePath, 'utf8');

    expect(panelSource).toContain("from './WorkoutHistorySessionCard'");
    expect(panelSource).toContain('<WorkoutHistorySessionCard');
    expect(panelSource).not.toContain('<SessionHeader>');
    expect(panelSource).not.toContain('buildWorkoutHistoryExerciseTableState(activeLogs)');
    expect(cardSource).toContain('export interface WorkoutHistorySessionCardProps');
    expect(cardSource).toContain('aria-expanded={isExpanded}');
  });
});
