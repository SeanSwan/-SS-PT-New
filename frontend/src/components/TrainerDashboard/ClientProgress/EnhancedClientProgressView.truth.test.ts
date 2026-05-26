/**
 * EnhancedClientProgressView truth locks
 * =====================================
 * Guards the canonical trainer /dashboard/trainer/client-progress surface
 * against placeholder tabs and invented progress defaults.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE = readFileSync(
  resolve(__dirname, './EnhancedClientProgressView.tsx'),
  'utf8',
);

describe('EnhancedClientProgressView truth locks', () => {
  it('does not expose a placeholder gamification tab on the trainer progress route', () => {
    expect(SOURCE).not.toMatch(/Gamification &amp; Social Progress/);
    expect(SOURCE).not.toMatch(/Integration with existing gamification functionality will be completed in the next phase/);
    expect(SOURCE).not.toMatch(/This tab will show the gamification content/);
  });

  it('does not seed missing progress metrics with a fake midpoint value', () => {
    expect(SOURCE).not.toMatch(/\|\|\s*50/);
    expect(SOURCE).not.toMatch(/progressMetrics:\s*\{[^}]*strength:\s*50/s);
  });

  it('does not invent a generic client goal when the API has no goals', () => {
    expect(SOURCE).not.toMatch(/Fitness Improvement/);
  });
});
