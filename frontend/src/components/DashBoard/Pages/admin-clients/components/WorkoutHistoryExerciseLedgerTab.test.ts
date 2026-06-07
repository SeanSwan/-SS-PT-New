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
const panelContentSourcePath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanelContent.tsx',
);

describe('WorkoutHistoryExerciseLedgerTab extraction', () => {
  it('keeps the all-exercises ledger outside the canonical panel shell', () => {
    const tabSource = readFileSync(ledgerTabSourcePath, 'utf8');
    const contentSource = readFileSync(panelContentSourcePath, 'utf8');

    expect(panelSource).toContain("from './WorkoutHistoryPanelContent'");
    expect(panelSource).toContain('<WorkoutHistoryPanelContent');
    expect(contentSource).toContain("from './WorkoutHistoryExerciseLedgerTab'");
    expect(contentSource).toContain('<WorkoutHistoryExerciseLedgerTab');
    expect(panelSource).not.toContain('data.sessions.flatMap');
    expect(tabSource).toContain('interface WorkoutHistoryExerciseLedgerTabProps');
    expect(tabSource).not.toContain('export interface WorkoutHistoryExerciseLedgerTabProps');
    expect(tabSource).toContain('buildExerciseLedger(sessions)');
  });
});
