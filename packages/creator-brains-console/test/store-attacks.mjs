/*
 * Store-attack harness — build the REAL filesystem shapes a hostile or broken
 * store produces, so a test can attack one rather than describe one.
 *
 * WHY THIS IS NOT IN `fixtures.mjs`. That module seeds a HEALTHY store and sits
 * at 289 of the 300-line cap (rule 4). These helpers are the opposite concern:
 * they construct the shapes the containment rules exist to refuse.
 *
 * WHY THIS IS NOT IN A `.test.mjs`. S1-H13 — a harness exported from a test file
 * re-registers that file's tests in every importer, so one test is counted once
 * per importer. A harness is not a test, and `node --test` must not see it.
 *
 * WHY THE ATTACKS ARE REAL. Astra's fix note asks for real Windows filesystem
 * tests as a release gate, and this suite has learned twice why: a test that
 * cannot construct its own attack proves nothing. A mocked filesystem proves the
 * check RUNS; only a real junction proves it SEES what `readFileSync` follows.
 * Junctions are creatable without administrator rights on Windows, which is why
 * they are used rather than symlinks (a file symlink returns EPERM without
 * Developer Mode, so it is not available as a release gate here).
 *
 * @module creator-brains-console/test/store-attacks
 */

import assert from 'node:assert/strict';
import { mkdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';

import { tempRoot } from '../../../scripts/creator-brains/test/helpers.mjs';

/**
 * Does `target` lie OUTSIDE `root`, judged BY PATH COMPONENT (R8-07)?
 *
 * ── THE DEFECT THIS REPLACES, AND WHY IT SURVIVED A ROUND ────────────────────
 *
 * `junction()` proved its attack with `!real.toLowerCase().startsWith(realStore
 * .toLowerCase())` — the SAME string-prefix containment test R7-01 had removed from
 * `lib/containment.mjs` one round earlier. R7-01's fix was aimed at the guard; this
 * copy stood one file over, in the fixture validator, and round 8 found it there. That
 * is the sixth consecutive round in which "a fix aimed at a row is not a fix aimed at
 * a class" held, and it is why this predicate is now a named function with its own
 * tests rather than an expression inside an assertion.
 *
 * A prefix test is wrong in BOTH directions, and only the second one is quiet:
 *
 *   OVER-PERMISSIVE — `C:\store-evil` starts with `C:\store`, so a junction resolving
 *     to a SIBLING whose name merely begins with the store's name was judged INSIDE
 *     the store. The assertion then fires and reports "the attack was not
 *     constructed" against a junction that escaped perfectly well: a false alarm that
 *     reads as a broken fixture.
 *   OVER-REFUSING — a directory genuinely inside the store whose name begins with two
 *     dots (`..notes`) is not a parent component, and R7-01 recorded exactly this
 *     over-refusal as a defect. A guard that refuses legal input is a defect too.
 *
 * A parent component is exactly `..`, or `..` followed by a SEPARATOR. A longer name
 * that merely begins with two dots is an ordinary name and is inside. A `relative()`
 * result that is absolute means the two paths do not share a root at all, which is
 * also outside.
 *
 * IT IS DELIBERATELY NOT `lib/containment.mjs`'s `inside()`. Importing the production
 * guard would make this validator agree with the guard BY CONSTRUCTION, so a bug in
 * the guard would be invisible to the very test whose job is to notice it. The rule is
 * restated here from `node:path` primitives, independently.
 */
export function escapes(root, target) {
  const rel = relative(root, target);
  return rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}

/** A generation directory OUTSIDE the store, with content a leak would expose. */
export function outsideGeneration(label) {
  const outside = tempRoot(`${label}-outside`);
  const gen = join(outside, 'gen-0001');
  mkdirSync(gen, { recursive: true });
  writeFileSync(join(gen, 'index.md'), '# OUTSIDE\n\nthis file is not in the store', 'utf8');
  writeFileSync(join(gen, 'topics.md'), '- outside topic', 'utf8');
  writeFileSync(join(gen, 'timeline.md'), '- 00:00 outside', 'utf8');
  writeFileSync(join(gen, 'rules.jsonl'), `${JSON.stringify({
    claim_id: 'leaked-claim-1',
    creator_id: 'outside',
    video_id: 'v1111111111',
    t_start_ms: 1000,
    topic: 'leaked',
    statement: 'a claim that lives outside the brains store',
    key_phrase: 'leaked claim',
    cites: [],
    modality: 'asserts',
    polarity: 'affirms',
  })}\n`, 'utf8');
  return outside;
}

/**
 * Point a brain at a generation OUTSIDE the store through a REAL traversal.
 *
 * WHY A TRAVERSAL AND NOT A JUNCTION. These are different vectors with different
 * guards: a junction is lexically inside and escapes only through `realpathSync`,
 * while a traversal escapes LEXICALLY — the console's own `inside()` check is the
 * only thing that sees it. A test built on a junction cannot exercise that check.
 *
 * THE OUTSIDE DIRECTORY IS REAL AND READABLE, and that is the point. `generation`
 * is written verbatim into `current.json` and the engine joins it as
 * `join(base, ns, generation)`. If the directory did not exist the engine would
 * skip the entry and the route would refuse for the wrong reason — "nothing to
 * read" rather than "escapes the store" — so the test would pass with the guard
 * removed. Here the content is genuinely reachable, so a missing guard serves it.
 *
 * @returns the traversal actually written, so the caller can assert it escapes.
 */
export function repointOutside(r, ns, label) {
  const outside = outsideGeneration(label);
  const from = join(r, 'brains', ns);
  const traversal = relative(from, join(outside, 'gen-0001'));
  assert.ok(
    escapes(from, join(outside, 'gen-0001')),
    `the traversal '${traversal}' does not leave the store — the attack was not constructed`,
  );
  repoint(r, ns, traversal);
  return traversal;
}

/** Point an existing brain at a different generation. */
export function repoint(r, ns, generation) {
  writeFileSync(
    join(r, 'brains', ns, 'current.json'),
    JSON.stringify({ schema_version: 1, creator_id: ns, label: ns, title: 'Hostile', generation }),
    'utf8',
  );
}

/**
 * Make a junction and PROVE it resolves outside the store before returning.
 *
 * The proof is the point: a test that fails to create its attack must fail
 * loudly, not pass quietly against an ordinary directory.
 *
 * THE PROOF IS `escapes()`, NOT A PREFIX TEST (R8-07). See its header — the prefix
 * form judged a sibling named `store-evil` to be inside the store, which turned a
 * correctly-constructed attack into a false "the attack was not constructed".
 */
export function junction(target, linkPath, storeRoot) {
  symlinkSync(target, linkPath, 'junction');
  const real = realpathSync(linkPath);
  const realStore = realpathSync(storeRoot);
  assert.ok(
    escapes(realStore, real),
    `the junction at '${linkPath}' resolved to '${real}', which is INSIDE the store — the attack was not constructed`,
  );
  return real;
}
