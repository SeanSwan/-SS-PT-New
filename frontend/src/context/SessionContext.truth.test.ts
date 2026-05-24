import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(resolve(process.cwd(), 'src/context/SessionContext.tsx'), 'utf8');

describe('SessionContext truth contract', () => {
  it('does not use Math.random for cross-tab session identity', () => {
    expect(SOURCE).not.toMatch(/Math\.random/);
    expect(SOURCE).toContain('createSessionTabId');
    expect(SOURCE).toContain('randomUUID');
  });
});
