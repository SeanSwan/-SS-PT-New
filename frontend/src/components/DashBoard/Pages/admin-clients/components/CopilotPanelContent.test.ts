import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel.tsx'),
  'utf8',
);

describe('CopilotPanelContent extraction', () => {
  it('keeps modal body and footer branching outside the panel shell', () => {
    expect(panelSource).toContain("from './CopilotPanelContent'");
    expect(panelSource).not.toContain("state === 'pain_check'");
    expect(panelSource).not.toContain("state === 'draft_review' || state === 'approving'");
    expect(panelSource).not.toContain('<LongHorizonContent');
  });
});
