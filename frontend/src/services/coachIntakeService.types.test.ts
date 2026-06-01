import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('coachIntakeService type boundary', () => {
  it('keeps the service capped while re-exporting public intake contracts', () => {
    const source = readFileSync(resolve(__dirname, 'coachIntakeService.ts'), 'utf8');

    expect(source).toContain("from './coachIntakeService.types'");
    expect(source).toContain('export type {');
    expect(source).toContain('CoachIntakeItem');
    expect(source).toContain('CoachIntakeRetentionPurgePlan');
    expect(source).toContain('CoachIntakeEventsResponse');
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
