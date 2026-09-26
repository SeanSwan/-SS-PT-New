/**
 * a6-briefs.test.mjs — slice A6's STORE tests: the brief store, and the write-path scan.
 *
 * TWO HALVES, AND THEY ARE THE TWO THINGS `AC3.1`'s persistence half and `INV2` actually need.
 *
 *   1. **`AC3.1` / `T-I-01`** — *"the persisted `text` for a given `briefId` is byte-identical
 *      to what Sean typed."* The surface half was closed in A4b; this is the STORE half. The
 *      awkward text is the point: quotes, angle brackets, an ampersand, a CRLF pair and an
 *      em-dash, because a round trip through `JSON.stringify` is exactly where a newline or an
 *      entity gets normalised. And **the write is asserted to have HAPPENED** — a byte-identity
 *      claim that passes over a no-op is the defect `T-I-01`'s A4b half already had to avoid.
 *
 *   2. **`INV2` / `T-P-02` + `T-P-03`** — the write-path scan. A0 §5's rule is that Astra reads
 *      through modules and writes only through paths `paths.mjs` names. That is a claim about
 *      COMPLETENESS, so the scan is written to fail on the thing completeness checks miss: a
 *      file that starts writing and was never declared. The declared list is compared to the
 *      measured list IN BOTH DIRECTIONS, which is what makes it a scan rather than a recital.
 *
 * THE SCAN STRIPS COMMENTS FIRST, and that is not tidiness. `smoke.mjs` records three checks
 * that were wrong on first run for exactly this reason — a scan that read the stylesheet's own
 * comment saying "no `overflow-x: hidden`" and reported a violation. This module's own docstrings
 * name `writeFileSync`, `taste/` and `docs/ai-workflow/design-brain/`; a scan that read them
 * would report violations against the files that explain why there are none.
 *
 * TEMP FILES GO TO `os.tmpdir()`, NEVER THE REPO. The brief store under test is a COPY; the real
 * one at `.ai-workflow/astra/briefs.jsonl` holds operator text and is never touched by a test.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';

import {
  BRIEF_FIELDS, assertBrief, listBriefs, readBrief, readBriefStore, saveBrief,
} from '../core/variants.mjs';
import { ASTRA_ROOT, BRIEF_STORE_PATH, REPO_ROOT, repoRelative } from '../core/paths.mjs';
import * as PATHS from '../core/paths.mjs';
import { PRIOR_PATH } from '../core/tuningStage.mjs';
import { stripComments } from '../surface/smokeHarness.mjs';

/** A fresh store per test, outside the repo. Left on disk — nothing here deletes anything. */
const freshStore = () => join(mkdtempSync(join(tmpdir(), 'astra-a6-')), 'briefs.jsonl');

/** Operator text that a careless round trip would mangle. */
const AWKWARD = 'a frozen lake — "quoted", <angled> & ampersand\r\nsecond line\ttabbed';

// ---------------------------------------------------------------------------
// AC3.1 / T-I-01 — the persisted text is byte-identical, AND the write happened
// ---------------------------------------------------------------------------

test('T-I-01 the persisted `text` is byte-identical for a briefId, and the write really happened', () => {
  const path = freshStore();
  const brief = { briefId: 'b_a6_1', text: AWKWARD, surfaceClass: 'public', intent: 'hero', aspect: '16:9' };

  assert.equal(existsSync(path), false, 'the store does not exist until something is written');
  const result = saveBrief(brief, { path, now: () => '2026-09-26T00:00:00.000Z' });

  // THE WRITE HAPPENED. Without this the byte-identity claim below passes over a no-op — the
  // exact hole A4b had to close on the surface half of the same requirement.
  assert.equal(result.written, true, 'the write must report that it wrote');
  assert.ok(result.bytes > 0, 'and must report a non-zero size');
  assert.equal(statSync(path).size, result.bytes,
    'the file must have grown by exactly the record that was reported');

  const back = readBrief('b_a6_1', { path });
  assert.ok(back, 'the brief must be readable by the id it was stored under');
  assert.equal(back.text, AWKWARD, 'BYTE-IDENTICAL: AC3.1 is a claim about the bytes, not about the words');
  assert.equal(back.text.length, AWKWARD.length);
  // And it survived as ONE line, which is what makes the store line-addressable and
  // crash-recoverable — a truncated tail loses one brief, not the file.
  assert.equal(readFileSync(path, 'utf8').trimEnd().split('\n').length, 1,
    'the CRLF in the text must not become a record separator');
  assert.deepEqual(Object.keys(back), [...BRIEF_FIELDS],
    'the record shape is the declared one — an extra field is a field nothing validates');
});

test('T-I-01 a brief is IMMUTABLE: the same text is idempotent, different text is refused', () => {
  const path = freshStore();
  const brief = { briefId: 'b_a6_2', text: 'the first text' };
  saveBrief(brief, { path });

  const again = saveBrief({ ...brief }, { path });
  assert.equal(again.written, false, 'a retry must not append a second row');
  assert.equal(readBriefStore({ path }).records.length, 1,
    'a duplicate would make "how many briefs" a count of WRITES rather than of briefs');

  assert.throws(() => saveBrief({ briefId: 'b_a6_2', text: 'a different text' }, { path }),
    /E_BRIEF_IMMUTABLE/,
    'editing history in place would make every compile recorded against it unattributable');
  assert.equal(readBrief('b_a6_2', { path }).text, 'the first text',
    'and the refusal must have changed nothing — a guard that throws AFTER writing is not a guard');
  assert.equal(readBriefStore({ path }).records.length, 1);
});

test('T-I-01 an unaddressable brief is refused rather than stored', () => {
  const path = freshStore();
  assert.throws(() => assertBrief({ briefId: '', text: 'x' }), /E_BRIEF_ID_INVALID/);
  assert.throws(() => assertBrief({ briefId: 'has spaces', text: 'x' }), /E_BRIEF_ID_INVALID/);
  assert.throws(() => assertBrief({ briefId: 'b\ninjected', text: 'x' }), /E_BRIEF_ID_INVALID/,
    'an id carrying a newline would split one record into two lines');
  assert.throws(() => assertBrief({ briefId: 'ok', text: 42 }), /E_BRIEF_TEXT_INVALID/,
    'persisting a non-string would make the byte-identity claim meaningless');
  assert.equal(existsSync(path), false, 'a refused brief must write nothing at all');
});

test('T-I-01 a corrupt row is COUNTED, never silently dropped', () => {
  const path = freshStore();
  saveBrief({ briefId: 'good', text: 'one' }, { path });
  writeFileSync(path, '{not json\n', { encoding: 'utf8', flag: 'a' });
  writeFileSync(path, '{"noBriefId":true}\n', { encoding: 'utf8', flag: 'a' });
  const store = readBriefStore({ path });
  assert.equal(store.records.length, 1, 'the good row survives');
  assert.equal(store.skipped, 2, 'and both bad rows are REPORTED — a store that drops one silently is worse');
  const list = listBriefs({ path });
  assert.equal(list.count, 1);
  assert.equal(list.skipped, 2, 'the surface must be able to say the count is not the whole file');
});

// ---------------------------------------------------------------------------
// The store's location — named in `paths.mjs`, and outside the prunable root
// ---------------------------------------------------------------------------

test('the brief store path is named in `paths.mjs`, absolute, and outside `forge-runs`', () => {
  assert.equal(repoRelative(BRIEF_STORE_PATH), '.ai-workflow/astra/briefs.jsonl');
  assert.ok(BRIEF_STORE_PATH.startsWith(REPO_ROOT), 'the path must resolve inside the repo');
  // WHY IT IS NOT UNDER `forge-runs`: `forge-prune` deletes inside that root by an allowlist, so
  // a brief stored there could be deleted by "prune the generated images" — and the guard would
  // not have stopped it, it would have PERMITTED it.
  assert.doesNotMatch(repoRelative(BRIEF_STORE_PATH), /forge-runs/,
    'operator text must not live inside the prunable artifact root');
  assert.equal(dirname(BRIEF_STORE_PATH), join(REPO_ROOT, '.ai-workflow', 'astra'));
});

// ---------------------------------------------------------------------------
// T-P-02 / T-P-03 / INV2 — the write-path scan
// ---------------------------------------------------------------------------

/** A call that MUTATES the filesystem. `rm`/`unlink` count: deletion is a write. */
const MUTATING = /\b(writeFileSync|appendFileSync|renameSync|unlinkSync|rmSync|rmdirSync|mkdirSync|createWriteStream|truncateSync|copyFileSync|writeFile|appendFile|unlink|rm)\s*\(/;

/**
 * THE DECLARED WRITERS. Every file in Astra's shipped source that mutates the filesystem, and
 * the `paths.mjs` export(s) its destinations derive from.
 *
 * This list is the whole point of the scan: a file that starts writing and is not here FAILS,
 * which is the direction a completeness check has to fail in to be worth having.
 */
const DECLARED_WRITERS = Object.freeze({
  'core/tuningStage.mjs': ['TUNING_PATH'],
  'core/variants.mjs': ['BRIEF_STORE_PATH'],
});

/** Path-shaped literals that must never be a WRITE destination, as resolved values. */
const FORBIDDEN_VALUE = Object.freeze([
  { what: 'a taste tree', re: /(^|[\\/])taste[\\/]/ },
  { what: 'the design-brain docs tree', re: /docs[\\/]ai-workflow[\\/]design-brain/ },
  { what: 'a token file', re: /(^|[\\/])tokens?[\\/]/ },
]);

/** Every shipped `.mjs`/`.js` under `scripts/astra`, excluding tests and captured evidence. */
function shippedFiles(dir = ASTRA_ROOT, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['tests', 'evidence', 'node_modules'].includes(entry.name)) continue;
      shippedFiles(full, out);
    } else if (/\.(mjs|js)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** `[firstArgumentText, ...]` for every mutating call, comments stripped. */
function mutatingCalls(src) {
  const code = stripComments(src);
  return [...code.matchAll(new RegExp(MUTATING.source, 'g'))].map((m) => {
    const rest = code.slice(m.index + m[0].length);
    const first = rest.slice(0, Math.min(...[rest.indexOf(','), rest.indexOf(')')]
      .map((i) => (i === -1 ? rest.length : i))));
    return { callee: m[1], firstArg: first.trim() };
  });
}

test('T-P-02/T-P-03 the writers are declared, and the declaration matches what is measured', () => {
  const files = shippedFiles();
  assert.ok(files.length >= 25, `the walk found only ${files.length} shipped files — it is not covering the tree`);

  const measured = new Map();
  for (const full of files) {
    const rel = relative(ASTRA_ROOT, full).split('\\').join('/');
    const calls = mutatingCalls(readFileSync(full, 'utf8'));
    if (calls.length) measured.set(rel, calls);
  }

  // NON-VACUITY: a scan that found nothing would pass every assertion below while proving
  // nothing. The tree has six mutating call sites, and the scan must see them.
  assert.ok(measured.size >= 2, `the scan found writers in ${measured.size} file(s) — it is not seeing them`);
  const total = [...measured.values()].reduce((n, c) => n + c.length, 0);
  assert.ok(total >= 5, `the scan found ${total} mutating call(s) — expected at least 5`);

  // BOTH DIRECTIONS. Undeclared is the defect; stale is how the list rots into a recital.
  assert.deepEqual([...measured.keys()].sort(), Object.keys(DECLARED_WRITERS).sort(),
    'a file that mutates the filesystem and is not declared here is a write path no scan can see');

  for (const [rel, dests] of Object.entries(DECLARED_WRITERS)) {
    const src = readFileSync(join(ASTRA_ROOT, rel), 'utf8');
    for (const name of dests) {
      assert.match(src, new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*'\\./paths\\.mjs'`),
        `${rel} declares ${name} but does not import it from paths.mjs — the destination is not traceable`);
    }
  }
});

test('T-P-02/T-P-03 no mutating call assembles its own path at the call site', () => {
  const offenders = [];
  for (const full of shippedFiles()) {
    const rel = relative(ASTRA_ROOT, full).split('\\').join('/');
    for (const call of mutatingCalls(readFileSync(full, 'utf8'))) {
      // A LITERAL DESTINATION IS THE DEFECT. "A path assembled inline at a call site is a path
      // no scan can see" — `paths.mjs`'s own words. The argument may be an identifier, a
      // template built from one, or a call over one; it may not be a bare string.
      if (/^['"`]/.test(call.firstArg)) {
        offenders.push(`${rel}: ${call.callee}(${call.firstArg.slice(0, 40)}…)`);
      }
    }
  }
  assert.deepEqual(offenders, [],
    'these calls name their own destination instead of deriving it from a paths.mjs export');
});

test('T-P-03 no WRITE can reach a taste, docs or token tree', () => {
  // WHAT THIS PROVES, AND WHAT IT DOES NOT — stated because a scan whose scope is unstated is
  // the defect class this slice inherited (A5's `AC5.4` transport check read one route list
  // while the routes lived in another).
  //
  //   PROVES  (a) no mutating call names a literal destination, so no write can spell a
  //               forbidden path at its call site (asserted above, and the two together are
  //               the whole guarantee `T-P-03` asks for);
  //           (b) every path constant `paths.mjs` exports resolves OUTSIDE those trees, which
  //               is what closes the loop — a write can only reach a `paths.mjs` export;
  //           (c) no file that contains a mutating call contains a forbidden-tree literal,
  //               which is the cheap net over the gap between (a) and (b).
  //
  //   DOES NOT  resolve a destination through a helper's parameter list. `atomicWrite(path, …)`
  //             receives its path from a caller; (b) is what covers it instead.
  //
  // A READ ALLOWLIST IS NOT A WRITE, and this test is scoped to writes because of it:
  // `core/doctrine.mjs` exports `SEARCH_ROOT = 'docs/ai-workflow/design-brain'` and imports only
  // `readFileSync`/`existsSync`/`readdirSync`. Astra reading the contract docs is the design;
  // Astra writing them would be the violation, and a scan that conflated the two would fail on
  // correct code — which is how a check gets weakened rather than fixed.

  // (b) the keystone: the resolved values, not the source text.
  const pathExports = Object.entries(PATHS).filter(([, v]) => typeof v === 'string' && /[\\/]/.test(v));
  assert.ok(pathExports.length >= 6, `only ${pathExports.length} path constants found in paths.mjs — the scan is not seeing them`);
  const badPaths = [];
  for (const [name, value] of pathExports) {
    for (const { what, re } of FORBIDDEN_VALUE) {
      if (re.test(value)) badPaths.push(`paths.mjs ${name} → ${what}: ${value}`);
    }
  }
  assert.deepEqual(badPaths, [], 'a paths.mjs export resolving into a forbidden tree is a write path that CAN reach it');

  // (c) the net, scoped to files that actually mutate.
  const findings = [];
  for (const full of shippedFiles()) {
    const rel = relative(ASTRA_ROOT, full).split('\\').join('/');
    const src = readFileSync(full, 'utf8');
    if (!mutatingCalls(src).length) continue;   // a read allowlist is not a write
    const code = stripComments(src);
    for (const { what, re } of FORBIDDEN_VALUE) {
      const hit = re.exec(code);
      if (hit) findings.push(`${rel}: ${what} — ${hit[0]}`);
    }
  }
  assert.deepEqual(findings, [],
    'a file that WRITES must not also name a taste, docs or token path');
});

test('T-P-02/T-P-03 the two path constants that ARE destinations resolve inside the repo', () => {
  // The scan above proves the DESTINATIONS are imported; this proves the imported values are
  // the ones claimed. `PRIOR_PATH` is derived rather than declared, so it is checked as a
  // derivation — a sibling of the config, never inside it.
  assert.equal(PRIOR_PATH, `${join(REPO_ROOT, 'scripts', 'design-brain', 'config', 'tuning.json')}.prior.jsonl`);
  assert.equal(dirname(PRIOR_PATH), dirname(join(REPO_ROOT, 'scripts', 'design-brain', 'config', 'tuning.json')));
  for (const p of [BRIEF_STORE_PATH, PRIOR_PATH]) {
    assert.ok(p.startsWith(REPO_ROOT), `${p} escapes the repo root`);
    assert.equal(p, join(REPO_ROOT, relative(REPO_ROOT, p)), `${p} is not a normalised path`);
  }
});
