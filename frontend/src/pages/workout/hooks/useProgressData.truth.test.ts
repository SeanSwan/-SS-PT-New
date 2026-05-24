import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(resolve(process.cwd(), 'src/pages/workout/hooks/useProgressData.ts'), 'utf8');

describe('useProgressData truth contract', () => {
  it('does not ship hardcoded workout progress or statistics fallbacks', () => {
    expect(SOURCE).not.toMatch(/mockProgress/);
    expect(SOURCE).not.toMatch(/mockStatistics/);
    expect(SOURCE).not.toMatch(/Using mock data for development/);
    expect(SOURCE).not.toMatch(/temp-user-id/);
    expect(SOURCE).not.toMatch(/Squats|Bench Press|Deadlift/);
  });
});
