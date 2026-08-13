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

/**
 * MINIMAL VALID ARGUMENTS, hand-maintained.
 *
 * THE REASON THIS TOIL EXISTS: `markWinner` once called an undefined
 * `annotateRun` and walked straight past the no-argument version of this guard,
 * because it throws on its argument check BEFORE reaching the missing call. A
 * guard with a known hole is worse than no guard — it converts future failures
 * into confident ones. So every export gets arguments good enough to reach its
 * body, and an export with no entry FAILS THE SUITE rather than being skipped.
 *
 * `null` means "invoking this is unsafe or meaningless here" and is an explicit,
 * reviewable decision — not an accidental omission.
 */
const MINIMAL_VALID_ARGS = {
  // pure helpers
  promptSha: ['x'], newVariantId: [], ratioToNumber: ['16:9'],
  aspectDeviation: ['16:9', 1536, 864], colorDistance: [{ r: 0, g: 0, b: 0 }, { r: 1, g: 1, b: 1 }],
  toHex: [{ r: 0, g: 32, b: 96 }], toBuffer: ['']  , imageDimensions: [Buffer.alloc(4)],
  decodePng: [Buffer.alloc(4)], averageColor: [null], paletteAudit: [Buffer.alloc(4)],
  personify: ['Anton Corbijn', 'photograph', 'a lake'],
  // compiler / serializers
  resolveSlots: [{ text: 'a lake' }],
  serializeFor: ['sentence', { subject: 'a lake', medium: 'photograph' }],
  strategyFor: [{ promptStyle: 'sentence' }], fitToBudget: ['some text', 4000],
  compileImage: [{ text: 'a frozen lake', aspect: '16:9' }, { promptStyle: 'sentence', maxPromptChars: 4000 }],
  compileVideo: null,                       // throws E_IMAGE_FIRST_REQUIRED by design
  assertLawful: [{ subject: 'a frozen lake' }, []],
  // records — buildRecord reaches its body with these and validates
  buildRecord: [{ briefId: 'b', provider: 'p', model: 'm', serializer: 'sentence', status: 'ok' }],
  isBuilt: [{}],
  lineage: ['v_0000000000000000', []],
  refine: [null], reroll: [null],           // reach the isBuilt guard, then throw
  // capabilities / providers
  capabilities: [], verify: [], requestDrop: null, awaitDrop: null, consumeDrop: null,
  checkDrop: null, generate: null,          // all touch disk or network
  saveImage: null, findVariant: null, generateBracket: null,
  appendRun: null, readRuns: null, markWinner: null, annotateRun: null, // disk
  withRetry: null,                          // real timers
  retryAfterMs: [{ headers: { get: () => null } }],
  listRuns: null, getRun: null, spendSummary: null,   // disk
  storeStatus: null,                                  // disk
  buildContactSheet: [[], '.', {}],
  assertInsideArtifactRoot: ['.ai-workflow/forge-runs', '.'],
  applyLaws: [{ subject: 'a frozen lake' }, []],
  listReady: null, safeId: ['abc'],         // listReady touches disk
};

/**
 * The strict arg requirement covers FORGE-OWNED modules only.
 *
 * `shared/` also holds files this workstream did not write. Demanding a
 * hand-maintained argument entry for someone else's export would either bloat
 * this map with guesses or push the next author to delete the guard. The
 * import/undefined-export check above still covers everything in `shared/`;
 * only the invoke-with-valid-args contract is scoped to what I own.
 */
const FORGE_OWNED = new Set([
  'aspect.mjs', 'bracket.mjs', 'contactSheet.mjs', 'forgeConfig.mjs',
  'imageDimensions.mjs', 'pixels.mjs', 'swanLawFilter.mjs', 'swanPromptCompiler.mjs',
  'swanPromptSerializers.mjs', 'swanVocabulary.mjs', 'variantLineage.mjs',
  'variantRun.mjs', 'variantVerdict.mjs', 'forgeReadApi.mjs',
  'dropFolderImage.mjs', 'openrouterImage.mjs', 'openrouterModels.mjs', 'transportRetry.mjs',
]);

test('EVERY exported function is INVOKED with valid args — no unreachable bodies', async () => {
  // The version of this that only imported the barrel let `markWinner` ship
  // calling an undefined function. This one reaches function bodies.
  const missing = [];
  const broke = [];
  for (const path of forgeModules()) {
    const ns = await import(pathToFileURL(path).href);
    const file = path.split(/[\\/]/).pop();
    if (!FORGE_OWNED.has(file)) continue;
    for (const [name, v] of Object.entries(ns)) {
      if (typeof v !== 'function' || /^[A-Z]/.test(name)) continue;
      if (!(name in MINIMAL_VALID_ARGS)) { missing.push(`${file}:${name}`); continue; }
      const args = MINIMAL_VALID_ARGS[name];
      if (args === null) continue;           // deliberate, reviewed exclusion
      try { v(...args); } catch (e) {
        if (e instanceof ReferenceError || e instanceof TypeError) {
          broke.push(`${file}:${name}() -> ${e.constructor.name}: ${e.message}`);
        }
        // Any other throw is legitimate validation on minimal input.
      }
    }
  }
  assert.deepEqual(missing, [],
    `these exports have no MINIMAL_VALID_ARGS entry — add one (or an explicit null):\n  ${missing.join('\n  ')}`);
  assert.deepEqual(broke, [],
    `these exports failed on valid arguments:\n  ${broke.join('\n  ')}`);
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
  // WIDENED. The first version matched TOLERANCE|RADIUS|THRESHOLD|LIMIT — which
  // is to say, exactly the constants I had already thought to justify. It walked
  // straight past MAX_RETRIES, SLEEP_MS, BUDGET and FRACTION: survivorship bias
  // as a test suite. Any exported bare number that reads like a tuned knob now
  // has to say where it came from.
  const TOLERANCE_NAMES = new RegExp('^export const ([A-Z_]*(TOLERANCE|RADIUS|THRESHOLD|LIMIT'
    + '|RETRIES|RETRY|SLEEP|BACKOFF|BUDGET|FRACTION|JITTER|CEILING|MAX_|MIN_|_MS|_COUNT)[A-Z_]*)'
    + ' = ([\d.]+)');

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
