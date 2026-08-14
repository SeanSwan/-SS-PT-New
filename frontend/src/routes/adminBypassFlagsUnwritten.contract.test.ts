import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * ============================================================================
 * FILE: adminBypassFlagsUnwritten.contract.test.ts
 * PURPOSE: Keep the retired admin-bypass flags unwritten, forever.
 * AUTHOR: Claude Opus 5 | CREATED: 2026-08-14
 * ============================================================================
 *
 * BACKGROUND
 * `protected-route.tsx` once skipped role checks when two localStorage keys were
 * set. That branch is gone, and a production build was grepped to prove it: 0
 * reads of either key, 0 sourcemaps. But three places still WROTE the keys — the
 * EmergencyDashboard constructor, its goToAdminDashboard handler, and a
 * `window.adminAccess.force()` console helper in config.js.
 *
 * A write with no reader is not harmless leftover. It is a working half of a
 * bypass, sitting in the tree with a name that tells the next reader exactly what
 * consumer to write. Deleting the writes once fixes today; this test fixes every
 * day after, by making the re-introduction fail CI instead of shipping.
 *
 * WHY A SOURCE SCAN AND NOT A UNIT TEST
 * There is no runtime behaviour left to assert — that is the point. The invariant
 * is about what the codebase CONTAINS, so the codebase is what gets read.
 *
 * THE POSITIVE CONTROL IS NOT OPTIONAL
 * A scanner that silently reads nothing reports the same clean result as a
 * codebase that is genuinely clean. While writing this file, an ad-hoc
 * `grep --include=*.tsx --include=*.ts` for these very flags returned zero
 * writes — because both real writers live in `.jsx` and `.js`. The wrong answer
 * looked exactly like the right one. So the walker's reach is asserted first, and
 * `removeItem` (which MUST still exist) is the canary that proves it.
 */

const SRC = resolve(__dirname, '..');
const CODE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const SKIP_DIR = new Set(['node_modules', 'dist', 'build', '.vite', 'coverage']);

/**
 * Test and spec files are excluded from the scan. They contain these exact
 * strings as ASSERTION DATA — `adminDashboardLocalRecovery.contract.test.ts:31`
 * asserts the login source does NOT contain `setItem('bypass_admin_verification'`,
 * and a naive scan reports that guard as the very violation it prevents. The
 * first run of this file did exactly that. A scanner that cannot tell code from
 * a description of code produces confident nonsense.
 */
const TEST_FILE = /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/;

const BYPASS_FLAGS = ['bypass_admin_verification', 'admin_emergency_mode'] as const;

/**
 * Reading these keys is permitted in exactly two places, both verified:
 *  - `config.js` — dev console diagnostic; mirrors the value back, grants nothing.
 *  - `routes/protected-route.tsx` — the legacy bypass branch, gated on
 *    NODE_ENV === 'development' and PROVEN absent from a production build
 *    (0 `getItem` reads, 0 sourcemaps, 2026-08-14). It is pinned in place by
 *    adminDashboardLocalRecovery.contract.test.ts, which asserts its stale-flag
 *    cleanup still exists — so it is deliberately NOT deleted here.
 * With every writer now removed, that branch is unreachable unless a developer
 * hand-types the keys into devtools. A NEW reader anywhere else is a regression.
 */
const ALLOWED_READERS = new Set(['config.js', 'routes/protected-route.tsx']);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIR.has(entry)) continue;
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (CODE_EXT.test(entry)) out.push(full);
  }
  return out;
}

const files = walk(SRC).filter((f) => !TEST_FILE.test(f));
const sources = files.map((path) => ({ path, text: readFileSync(path, 'utf8') }));

/** `setItem('flag'` / `setItem("flag"` / backticks, tolerating whitespace. */
const writeRe = (flag: string) => new RegExp(String.raw`setItem\s*\(\s*['"\`]${flag}['"\`]`);
const readRe = (flag: string) => new RegExp(String.raw`getItem\s*\(\s*['"\`]${flag}['"\`]`);
const removeRe = (flag: string) => new RegExp(String.raw`removeItem\s*\(\s*['"\`]${flag}['"\`]`);

const rel = (p: string) => p.slice(SRC.length + 1).replace(/\\/g, '/');

describe('retired admin-bypass flags stay unwritten', () => {
  it('CONTROL — the walker actually reaches the frontend source tree', () => {
    // If these ever go to zero the assertions below are vacuous, not passing.
    expect(files.length).toBeGreaterThan(500);
    expect(files.some((f) => f.endsWith('.jsx'))).toBe(true);
    expect(files.some((f) => f.endsWith('.js'))).toBe(true);
    expect(files.some((f) => f.endsWith('.tsx'))).toBe(true);
  });

  it('CONTROL — the matcher finds the defensive removeItem calls that must remain', () => {
    // The canary. These cleanup calls are deliberately kept, so a scan that cannot
    // see them cannot be trusted to have seen a setItem either.
    for (const flag of BYPASS_FLAGS) {
      const cleaners = sources.filter((s) => removeRe(flag).test(s.text));
      expect(cleaners.length, `no removeItem('${flag}') found — matcher or walker is broken`)
        .toBeGreaterThan(0);
    }
  });

  it.each(BYPASS_FLAGS)('nothing in frontend/src writes %s', (flag) => {
    const writers = sources.filter((s) => writeRe(flag).test(s.text)).map((s) => rel(s.path));
    expect(writers, `re-introduced a writer for the retired bypass flag '${flag}'`).toEqual([]);
  });

  it.each(BYPASS_FLAGS)('no NEW reader of %s appears outside the known two', (flag) => {
    const readers = sources.filter((s) => readRe(flag).test(s.text)).map((s) => rel(s.path));
    const unexpected = readers.filter((p) => !ALLOWED_READERS.has(p));
    expect(unexpected, `new consumer of retired bypass flag '${flag}'`).toEqual([]);
  });

  it('CONTROL — the known readers are still found (the allowlist is not vacuous)', () => {
    // If protected-route.tsx were renamed or its branch silently deleted, the
    // assertion above would pass by finding nothing. This makes that visible.
    const readers = sources
      .filter((s) => BYPASS_FLAGS.some((f) => readRe(f).test(s.text)))
      .map((s) => rel(s.path));
    expect(readers).toContain('routes/protected-route.tsx');
    expect(readers).toContain('config.js');
  });

  it('the emergency dashboard grants itself nothing', () => {
    const dash = sources.find((s) => s.path.endsWith('EmergencyDashboard.jsx'));
    expect(dash, 'EmergencyDashboard.jsx not found — did it move?').toBeTruthy();
    expect(dash!.text).not.toMatch(/setItem\s*\(\s*['"`](bypass_admin_verification|admin_emergency_mode|use_emergency_admin_route)/);
  });

  it('no console helper offers to force admin access', () => {
    const config = sources.find((s) => rel(s.path) === 'config.js');
    expect(config, 'config.js not found').toBeTruthy();
    expect(config!.text).not.toContain('adminAccess.force');
    expect(config!.text).not.toMatch(/force:\s*function/);
  });
});
