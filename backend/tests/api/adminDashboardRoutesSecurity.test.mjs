import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'routes/dashboard/adminDashboardRoutes.mjs'),
  'utf8',
);

describe('admin dashboard route security', () => {
  it('keeps persistent visitor history behind admin authentication', () => {
    expect(SOURCE).toMatch(/router\.get\('\/visitor-history',\s*protect,\s*adminOnly,/);
  });
});
