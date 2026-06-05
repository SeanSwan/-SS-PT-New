import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel.tsx'),
  'utf8',
);

describe('WorkoutCopilotPanel structure', () => {
  it('keeps the shell under the project line cap after child extraction', () => {
    const lineCount = panelSource.split(/\r?\n/).length;

    expect(lineCount).toBeLessThanOrEqual(300);
  });
});
