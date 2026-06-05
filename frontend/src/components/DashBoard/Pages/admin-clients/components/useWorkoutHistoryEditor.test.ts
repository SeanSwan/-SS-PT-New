import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.tsx'),
  'utf8',
);

const hookSourcePath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-clients/components/useWorkoutHistoryEditor.ts',
);

describe('useWorkoutHistoryEditor extraction', () => {
  it('keeps workout-history edit and PATCH orchestration outside the panel shell', () => {
    const hookSource = readFileSync(hookSourcePath, 'utf8');

    expect(panelSource).toContain("from './useWorkoutHistoryEditor'");
    expect(panelSource).toContain('useWorkoutHistoryEditor({');
    expect(panelSource).not.toContain('buildWorkoutEditExercises(editLogs)');
    expect(panelSource).not.toContain('authAxios.patch(');
    expect(hookSource).toContain('export function useWorkoutHistoryEditor');
    expect(hookSource).toContain('buildWorkoutEditExercises(editLogs)');
    expect(hookSource).toContain('authAxios.patch(');
  });
});
