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

const personalRecordsTabSourcePath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPersonalRecordsTab.tsx',
);

describe('WorkoutHistoryPersonalRecordsTab extraction', () => {
  it('keeps the PRs tab render branch outside the canonical panel shell', () => {
    const tabSource = readFileSync(personalRecordsTabSourcePath, 'utf8');

    expect(panelSource).toContain("from './WorkoutHistoryPanelContent'");
    expect(panelContentSource).toContain("from './WorkoutHistoryPersonalRecordsTab'");
    expect(panelContentSource).toContain('<WorkoutHistoryPersonalRecordsTab');
    expect(panelSource).not.toContain('sortedPersonalRecords\\n                .map');
    expect(panelSource).not.toContain('buildPersonalRecordShareSession(pr)');
    expect(panelContentSource).not.toContain('buildPersonalRecordShareSession(pr)');
    expect(tabSource).toContain('export interface WorkoutHistoryPersonalRecordsTabProps');
    expect(tabSource).toContain('buildPersonalRecordShareSession(pr)');
  });
});
