/**
 * CI gate (SWA-115 item 3): no `.mjs` migrations, ever.
 *
 * The production runner (safe-migrate → sequelize-cli) cannot load ESM. 32 `.mjs`
 * migrations sat invisible and unexecuted for months (some would have destroyed live
 * data had they run — see migrations/retired-mjs-20260804/README.md). This test makes
 * the mistake impossible to repeat: adding a top-level `.mjs` migration fails the suite.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../migrations');

describe('migrations directory hygiene', () => {
  it('contains ZERO top-level .mjs migrations (runner cannot execute ESM — use .cjs)', () => {
    const offenders = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.mjs'));
    expect(
      offenders,
      `New .mjs migration(s) detected: ${offenders.join(', ')} — the production runner ` +
      'CANNOT execute ESM migrations; they will silently never apply. Write .cjs. ' +
      'See migrations/retired-mjs-20260804/README.md.',
    ).toEqual([]);
  });

  it('keeps the retired-mjs quarantine folder intact with its README', () => {
    const retired = path.join(migrationsDir, 'retired-mjs-20260804');
    expect(fs.existsSync(path.join(retired, 'README.md'))).toBe(true);
    const files = fs.readdirSync(retired).filter(f => f.endsWith('.mjs'));
    // >= not ===: retiring ANOTHER fossil later is a correct action and must not
    // fail this gate (Kimi F4). Shrinking below the original 32 means someone
    // un-retired a file — that is what this lock exists to catch.
    expect(files.length).toBeGreaterThanOrEqual(32);
  });
});
