import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const exerciseRoutesSource = readFileSync(
  resolve(__dirname, '../../routes/exerciseRoutes.mjs'),
  'utf8',
);

describe('exercise teach-mode route access', () => {
  it('is authenticated and rate-limited but not trainer/admin-only', () => {
    const routeIdx = exerciseRoutesSource.indexOf("router.get('/:id/teach-mode'");
    expect(routeIdx).toBeGreaterThan(-1);

    const routeLine = exerciseRoutesSource.slice(
      routeIdx,
      exerciseRoutesSource.indexOf('async (req, res)', routeIdx),
    );

    expect(routeLine).toMatch(/\bprotect\b/);
    expect(routeLine).toMatch(/\bapiLimiter\b/);
    expect(routeLine).not.toMatch(/\btrainerOrAdminOnly\b/);
  });
});
