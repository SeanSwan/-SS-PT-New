import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.tsx'),
  'utf8',
);

const footerSourcePath = resolve(
  process.cwd(),
  'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistorySessionFooter.tsx',
);

describe('WorkoutHistorySessionFooter extraction', () => {
  it('keeps expanded session controls outside the canonical panel shell', () => {
    const footerSource = readFileSync(footerSourcePath, 'utf8');

    expect(panelSource).toContain("from './WorkoutHistorySessionFooter'");
    expect(panelSource).toContain('<WorkoutHistorySessionFooter');
    expect(panelSource).not.toContain('<EditActionBar>');
    expect(footerSource).toContain('export interface WorkoutHistorySessionFooterProps');
    expect(footerSource).toContain('data-testid={`edit-save-${session.id}`}');
  });
});
