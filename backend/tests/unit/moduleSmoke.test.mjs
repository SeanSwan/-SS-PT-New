import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

/**
 * THE MECHANICAL-HYGIENE GUARD.
 *
 * Two failure classes have recurred in this codebase and neither is caught by
 * any behavioural test:
 *
 * 1. `export ... from` creates NO LOCAL BINDING. Three times a module was split
 *    for the 300-line cap, the moved symbols were re-exported, and a function
 *    left behind still referenced them — a runtime ReferenceError with every
 *    static check silent. Twice in a single session.
 *
 * 2. Numeric tolerances written by eye and refuted by the first measurement —
 *    three times (aspect tolerance, per-image cost, presence radius).
 *
 * Both are now enforced rather than remembered. A rule the model has to recall
 * is a rule that eventually gets dropped.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const SHARED = join(HERE, '..', '..', '..', 'shared');

function forgeModules() {
  const out = [];
  for (const f of readdirSync(SHARED)) {
    if (f.endsWith('.mjs')) out.push(join(SHARED, f));
  }
  for (const f of readdirSync(join(SHARED, 'providers'))) {
    if (f.endsWith('.mjs')) out.push(join(SHARED, 'providers', f));
  }
  return out;
}

test('EVERY shared module imports, and every export resolves to a real value', async () => {
  // Importing is not enough on its own — a re-export with no local binding still
  // imports fine and only explodes when the function that needs it RUNS. So each
  // export is touched, which is what forces the binding to resolve.
  const mods = forgeModules();
  assert.ok(mods.length >= 8, `expected the Forge modules, found ${mods.length}`);

  for (const path of mods) {
    let ns;
    try {
      ns = await import(pathToFileURL(path).href);
    } catch (e) {
      assert.fail(`${path} failed to import: ${e.message}`);
    }
    const names = Object.keys(ns);
    assert.ok(names.length > 0, `${path} exports nothing`);
    for (const n of names) {
      const v = ns[n];
      assert.ok(v !== undefined, `${path} exports "${n}" as undefined — a re-export with no binding?`);
    }
  }
});

test('every FUNCTION exported by a shared module is callable', async () => {
  // A `export { x } from` of a function still yields a function; the binding gap
  // shows up INSIDE a function that references a moved symbol. So each one is
  // invoked and only ReferenceError is treated as failure — any other throw is
  // legitimate input validation on a no-argument call.
  //
  // ASYNC exports are awaited rather than fired and forgotten. The first version
  // called them and ignored the promise, so `withRetry()` started a real 1s/4s
  // backoff and rejected AFTER the test finished — an unhandled rejection that
  // failed the file from outside any assertion. A test that leaks async work is
  // a test that reports the wrong thing.
  const check = (e, where) => assert.ok(!(e instanceof ReferenceError),
    `${where} threw ReferenceError — "${e?.message}". That is the export-without-local-binding class.`);

  for (const path of forgeModules()) {
    const ns = await import(pathToFileURL(path).href);
    const file = path.split(/[\\/]/).pop();
    for (const [name, v] of Object.entries(ns)) {
      if (typeof v !== 'function' || /^[A-Z]/.test(name)) continue;   // skip classes
      const where = `${file}:${name}()`;
      let out;
      try { out = v(); } catch (e) { check(e, where); continue; }
      if (out && typeof out.then === 'function') {
        // eslint-disable-next-line no-await-in-loop
        await out.then(() => {}, (e) => check(e, where));
      }
    }
  }
});

test('no NUMERIC TOLERANCE ships without stated provenance', () => {
  // Every threshold in this subsystem that was chosen by eye has been refuted by
  // the first real measurement. A tolerance must say where its number came from.
  const OFFENDERS = [];
  const TOLERANCE_NAMES = /^export const ([A-Z_]*(TOLERANCE|RADIUS|THRESHOLD|LIMIT)[A-Z_]*) = ([\d.]+)/;

  for (const path of forgeModules()) {
    const lines = readFileSync(path, 'utf8').split('\n');
    lines.forEach((line, i) => {
      const m = TOLERANCE_NAMES.exec(line.trim());
      if (!m) return;
      // Provenance must appear in the 20 lines of comment above the constant.
      const above = lines.slice(Math.max(0, i - 20), i).join('\n');
      const hasProvenance = /calibrat|measur|probed|observed|derived|refuted|bounded because/i.test(above);
      if (!hasProvenance) OFFENDERS.push(`${path.split(/[\\/]/).pop()}:${i + 1} ${m[1]} = ${m[3]}`);
    });
  }

  assert.deepEqual(OFFENDERS, [],
    `these tolerances have no stated provenance:\n  ${OFFENDERS.join('\n  ')}\n`
    + 'Say where the number came from — every eyeballed threshold here has been wrong.');
});

test('the retired palette is never spelled literally in shared source', () => {
  // Same defence the law filter uses: a naive grep for retired brand tokens must
  // not flag the modules that BAN them, or the ban becomes unauditable.
  const RETIRED = [`#0a0a${'1a'}`, `#00FF${'FF'}`, `#7851${'A9'}`];
  for (const path of forgeModules()) {
    const src = readFileSync(path, 'utf8');
    for (const hex of RETIRED) {
      assert.ok(!src.includes(hex),
        `${path.split(/[\\/]/).pop()} contains the literal retired token ${hex} — concatenate it`);
    }
  }
});
