import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/SessionDashboard/SessionErrorBoundary.tsx'),
  'utf8',
);

describe('SessionErrorBoundary truth contract', () => {
  it('does not use Math.random for error tracking identifiers', () => {
    expect(SOURCE).not.toMatch(/Math\.random/);
    expect(SOURCE).toContain('createSessionErrorId');
    expect(SOURCE).toContain('randomUUID');
  });
});
