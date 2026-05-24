import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(resolve(process.cwd(), 'controllers/adminDashboardMetricsController.mjs'), 'utf8');

describe('admin dashboard health truth', () => {
  it('does not report randomized uptime percentages', () => {
    expect(SOURCE).not.toContain('Math.random');
    expect(SOURCE).not.toContain('99.90');
    expect(SOURCE).not.toContain('95.00');
  });
});
