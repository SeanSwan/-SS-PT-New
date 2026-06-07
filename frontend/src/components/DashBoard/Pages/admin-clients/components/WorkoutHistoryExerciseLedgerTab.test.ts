import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.tsx'),
  'utf8',
);

const ledgerTabSourcePath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryExerciseLedgerTab.tsx',
);

describe('WorkoutHistoryExerciseLedgerTab extraction', () => {
  it('keeps the all-exercises ledger outside the canonical panel shell', () => {
    const tabSource = readFileSync(ledgerTabSourcePath, 'utf8');

    expect(panelSource).toContain("from './WorkoutHistoryExerciseLedgerTab'");
    expect(panelSource).toContain('<WorkoutHistoryExerciseLedgerTab');
    expect(panelSource).not.toContain('data.sessions.flatMap');
    expect(tabSource).toContain('export interface WorkoutHistoryExerciseLedgerTabProps');
    expect(tabSource).toContain('buildExerciseLedger(sessions)');
  });
});
