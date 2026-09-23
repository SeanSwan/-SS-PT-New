import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  assertDevDatabaseUrlAllowed,
  devDatabaseUrlAllowed,
} from '../../utils/devDatabaseUrlGuard.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readSrc = (p) => readFileSync(join(__dirname, '../..', p), 'utf8');

/**
 * H-06 residual: ops scripts that build their OWN Sequelize instance never
 * pass through database.mjs, so the app-level guard did not cover them. They
 * now call assertDevDatabaseUrlAllowed() — the same rule, one line.
 */
describe('assertDevDatabaseUrlAllowed (H-06 residual)', () => {
  const KEYS = ['DATABASE_URL', 'SWAN_DEV_ALLOW_PRODUCTION_DATABASE_URL', 'NODE_ENV'];
  let saved;
  let exitSpy;
  let errorSpy;

  beforeEach(() => {
    saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('__EXIT__');
    });
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    vi.restoreAllMocks();
  });

  it('allows a local DATABASE_URL', () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgres://swan:swan@localhost:5432/swanstudios';
    expect(() => assertDevDatabaseUrlAllowed('test-script')).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('refuses a hosted DATABASE_URL in a non-production context (exit 1)', () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgres://u:p@dpg-abc.oregon-postgres.render.com/swanstudios';
    expect(() => assertDevDatabaseUrlAllowed('test-script')).toThrow('__EXIT__');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy.mock.calls.flat().join(' ')).toContain('H-06 guard');
  });

  it('allows a hosted DATABASE_URL with the explicit override', () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgres://u:p@dpg-abc.oregon-postgres.render.com/swanstudios';
    process.env.SWAN_DEV_ALLOW_PRODUCTION_DATABASE_URL = '1';
    expect(() => assertDevDatabaseUrlAllowed('test-script')).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('is a no-op in production — deploy tooling is unaffected', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgres://u:p@dpg-abc.oregon-postgres.render.com/swanstudios';
    expect(() => assertDevDatabaseUrlAllowed('render-start')).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('stays silent when DATABASE_URL is unset (scripts own that message)', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.DATABASE_URL;
    expect(() => assertDevDatabaseUrlAllowed('test-script')).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('shares one decision core with database.mjs', () => {
    expect(devDatabaseUrlAllowed('postgres://localhost:5432/x')).toBe(true);
    expect(devDatabaseUrlAllowed('postgres://x@abc.neon.tech/db', {})).toBe(false);
  });
});

describe('every raw-connection script is guarded (H-06 residual)', () => {
  const guardedScripts = [
    'backfill-video-catalog', 'check-tables', 'cleanup-qa-and-sessions',
    'cleanup-test-users', 'list-prod-users', 'promote-owners', 'repair-raw-photos',
  ];

  it.each(guardedScripts)('scripts/%s.mjs calls the guard', (name) => {
    const src = readSrc(`scripts/${name}.mjs`);
    expect(src).toContain("from '../utils/devDatabaseUrlGuard.mjs'");
    expect(src).toContain(`assertDevDatabaseUrlAllowed('${name}')`);
  });

  it('database.mjs delegates to the shared core', () => {
    const src = readSrc('database.mjs');
    expect(src).toContain("from './utils/devDatabaseUrlGuard.mjs'");
    expect(src).toContain('coreDevDatabaseUrlAllowed(url)');
  });

  it('safe-migrate only uses DATABASE_URL when the target env IS production', () => {
    const src = readSrc('scripts/safe-migrate.mjs');
    // both raw constructions must sit behind the production check
    const prodGuards = src.match(/env === 'production' && process\.env\.DATABASE_URL/g) || [];
    const rawConstructions = src.match(/new Sequelize\(process\.env\.DATABASE_URL/g) || [];
    expect(rawConstructions.length).toBeGreaterThan(0);
    expect(prodGuards.length).toBe(rawConstructions.length);
  });
});
