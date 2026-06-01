import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-exercises/components/ExerciseStatsPanel.tsx'),
  'utf8'
);
const commandCenterSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-exercises/AdminExerciseCommandCenter.tsx'),
  'utf8'
);

describe('ExerciseStatsPanel action contract', () => {
  it('wires refresh to the parent stats refresh function', () => {
    expect(panelSource).not.toContain('TODO: Implement refresh functionality');
    expect(panelSource).toContain('onRefresh?: () => void');
    expect(panelSource).toContain('onRefresh?.()');
    expect(commandCenterSource).toContain('onRefresh={refreshStats}');
  });

  it('exports stats and activity to a real CSV file', () => {
    expect(panelSource).not.toContain('TODO: Implement export functionality');
    expect(panelSource).toContain('exportStatsRows');
    expect(panelSource).toContain('new Blob');
    expect(panelSource).toContain('URL.createObjectURL');
    expect(panelSource).toContain("link.download = `exercise-analytics-${new Date().toISOString().slice(0, 10)}.csv`");
  });

  it('uses the hook-provided top exercises instead of local mock rows', () => {
    expect(panelSource).not.toContain('Mock top exercises data');
    expect(panelSource).toContain('topExercises: ExerciseUsage[];');
    expect(commandCenterSource).toContain('topExercises,');
    expect(commandCenterSource).toContain('topExercises={topExercises}');
  });
});
