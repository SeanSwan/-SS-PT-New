/**
 * Card 1.0 — a test that BOOTS THE WHOLE APP must declare a hook budget.
 * =====================================================================
 * `createApp()` from core/app.mjs takes ~10s idle and 16.8s under a loaded full
 * run. Vitest's default hookTimeout is 30s, so a file that boots it inside
 * beforeAll without an explicit budget is one CPU-contention spike away from a
 * file-level FAIL that looks like a real regression (that happened on
 * 2026-09-02: memberDirectoryLateralProbe went red/red/green/green across four
 * full runs and cost a slice's worth of investigation).
 *
 * BLUEPRINT CORRECTION (Opus 5, 2026-09-02). v2 card 1.0 said "17 files boot the
 * app in beforeAll". That number came from `grep -l createApp tests/api/*`, which
 * also matches the ELEVEN files that define their OWN local `createApp()` — a
 * three-line express app with one router mounted, which boots in milliseconds and
 * needs no budget. It also counted two files that merely mention core/app.mjs in
 * a comment or read it as a string. The real class is defined by IMPORTING the
 * app factory, and this test derives it that way. At authoring: 6 files, all six
 * already carrying budgets — so the sweep the card asked for was already done and
 * the remaining value is exactly this guard, which stops file #7 joining silently.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIN_BUDGET_MS = 60_000;

/** Every *.test.mjs under tests/ and __tests__/. */
function allTestFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) allTestFiles(full, out);
    else if (/\.test\.mjs$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Does this file boot the REAL app? True only when it imports the factory from
 * core/app.mjs — static or dynamic. A locally-defined createApp() does not count,
 * and neither does a comment or a readFileSync of that path.
 */
function bootsRealApp(src) {
  return /(?:await\s+import|from)\s*\(?\s*['"][^'"]*core\/app\.mjs['"]/.test(src)
    && /\bcreateApp\s*\(/.test(src)
    && !/readFileSync\([^)]*core\/app\.mjs/.test(src);
}

/** The trailing argument of the beforeAll that contains the boot, if any. */
function beforeAllBudget(src) {
  const start = src.indexOf('beforeAll(');
  if (start < 0) return null;
  // Scan to the matching close of this beforeAll call, then read `, <number>)`.
  let depth = 0;
  for (let i = src.indexOf('(', start); i < src.length; i += 1) {
    const ch = src[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        const tail = src.slice(Math.max(0, i - 40), i);
        const m = tail.match(/,\s*([0-9_]+)\s*$/);
        return m ? Number(m[1].replace(/_/g, '')) : null;
      }
    }
  }
  return null;
}

const SELF = fileURLToPath(import.meta.url);

const appBooting = allTestFiles(path.join(BACKEND, 'tests'))
  .concat(allTestFiles(path.join(BACKEND, '__tests__')))
  // Exclude THIS file: its detector self-tests quote the very strings the
  // detector matches, so an unfiltered walk classifies the guard as its own
  // subject (caught on the guard's first run).
  .filter((f) => path.resolve(f) !== path.resolve(SELF))
  .filter((f) => bootsRealApp(readFileSync(f, 'utf8')))
  .map((f) => path.relative(BACKEND, f).replace(/\\/g, '/'));

describe('app-booting probes declare a hook budget', () => {
  it('the class is non-empty — if this fails, the detector broke, not the repo', () => {
    expect(appBooting.length).toBeGreaterThan(0);
  });

  for (const file of appBooting) {
    it(`${file} declares a beforeAll budget >= ${MIN_BUDGET_MS}ms`, () => {
      const budget = beforeAllBudget(readFileSync(path.join(BACKEND, file), 'utf8'));
      expect(budget, `${file}: add an explicit budget, e.g. \`}, 120_000);\` on the beforeAll that calls createApp()`).not.toBeNull();
      expect(budget).toBeGreaterThanOrEqual(MIN_BUDGET_MS);
    });
  }

  it('the detector rejects a locally-defined createApp (the 5.1 over-count)', () => {
    expect(bootsRealApp("function createApp() { return express(); }\ncreateApp();")).toBe(false);
    expect(bootsRealApp("// mirrors backend/core/app.mjs\nconst createApp = () => express();\ncreateApp();")).toBe(false);
    expect(bootsRealApp("const cors = read('backend/core/app.mjs');")).toBe(false);
    expect(bootsRealApp("const { createApp } = await import('../../core/app.mjs');\napp = await createApp();")).toBe(true);
  });
});
