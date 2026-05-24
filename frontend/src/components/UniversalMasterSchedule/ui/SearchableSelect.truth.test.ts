import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/ui/SearchableSelect.tsx'),
  'utf8'
);

describe('SearchableSelect accessibility identity contract', () => {
  it('uses React stable IDs instead of Math.random for ARIA relationships', () => {
    expect(SOURCE).not.toMatch(/Math\.random/);
    expect(SOURCE).toContain('useId');
    expect(SOURCE).toContain('listboxId');
  });
});
