import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/hooks/useSessionTemplates.ts'),
  'utf8'
);

describe('useSessionTemplates identity contract', () => {
  it('does not use Math.random for persisted custom template IDs', () => {
    expect(SOURCE).not.toMatch(/Math\.random/);
    expect(SOURCE).toContain('createSessionTemplateId');
    expect(SOURCE).toContain('randomUUID');
  });
});
