import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.tsx'),
  'utf8',
);

const headerSourcePath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanelHeader.tsx',
);

describe('WorkoutHistoryPanelHeader extraction', () => {
  it('keeps summary chips and tab controls outside the canonical panel shell', () => {
    const headerSource = readFileSync(headerSourcePath, 'utf8');

    expect(panelSource).toContain("from './WorkoutHistoryPanelHeader'");
    expect(panelSource).toContain('<WorkoutHistoryPanelHeader');
    expect(panelSource).not.toContain('<SummaryBar>');
    expect(panelSource).not.toContain('<TabBar');
    expect(headerSource).toContain('export type WorkoutHistoryPanelTab');
    expect(headerSource).toContain('aria-controls={`tab-${tab.id}`}');
  });
});
