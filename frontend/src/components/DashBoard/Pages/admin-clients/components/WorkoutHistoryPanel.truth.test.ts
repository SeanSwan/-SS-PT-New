import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutHistoryPanel.tsx'),
  'utf8',
);

describe('WorkoutHistoryPanel truth contract', () => {
  it('uses deterministic temporary row ids while editing workout sets', () => {
    expect(SOURCE).not.toMatch(/Math\.random/);
    expect(SOURCE).not.toMatch(/id: -Date\.now\(\)/);
    expect(SOURCE).toContain('nextTemporarySetIdRef');
  });
});
