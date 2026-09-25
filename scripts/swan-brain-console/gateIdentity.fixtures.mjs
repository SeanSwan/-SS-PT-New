/**
 * gateIdentity.fixtures — the shared fixtures for the two gate-identity suites.
 * @module scripts/swan-brain-console/gateIdentity.fixtures
 *
 * WHY THIS IS A MODULE AND NOT TWO COPIES
 * The identity suite (the refusals) and the contract suite (the boundaries that must NOT be
 * refused) both need the same two things: a way to read one gate out of a throwaway repo, and
 * a render artifact built by the REAL producer. Duplicating either would let the two suites
 * drift apart on what a "normal" artifact is — and the whole point of the contract suite is
 * that it exercises the same shape the identity suite refuses, so a drift between them would
 * quietly remove the guard. `scripts/qa/local-frontend-server.fixtures.mjs` is the precedent
 * for a non-`*.test.mjs` fixture module in this repo.
 *
 * `renderDoc` builds through `buildRenderResult` rather than hand-writing the JSON, so the
 * default case cannot drift from what `shot-diff.mjs` actually writes. `summary` is
 * overridable precisely so a test can make the rows and the summary disagree — which is the
 * contradiction, and is the one shape the real builder cannot produce.
 *
 * BOUNDS: writes only inside a fresh temp directory, which each caller removes.
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

import { readGateHealth, GATES } from './gateHealth.mjs';
import { artifactContract } from './gateIdentity.mjs';
import { buildRenderResult } from './renderResult.mjs';
import { summarize } from './baselineComparison.mjs';

/** A fixed clock, so "fresh" is a fact about the fixture and not about when the suite ran. */
export const NOW = Date.parse('2026-09-20T12:00:00Z');
export const STALE = 14;

export const render = GATES.find((g) => g.id === 'three-worlds-render');
export const planning = GATES.find((g) => g.id === 'planning-validation');
export const PLANNING = artifactContract('planning-validation');

/** Write one gate file into a throwaway repo root and read the whole report from it. */
export function gateFrom(files, id) {
  const root = mkdtempSync(join(tmpdir(), 'gate-identity-'));
  for (const [rel, contents] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, typeof contents === 'string' ? contents : JSON.stringify(contents));
  }
  try {
    return readGateHealth(root, { now: NOW }).gates.find((g) => g.id === id);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

/**
 * A render artifact built by the real producer, with the caller's `summary` substituted AFTER
 * the build.
 *
 * ROUND 14 (Astra J06) — `summary` USED TO BE FORWARDED INTO THE BUILDER, WHICH SILENTLY DESTROYED IT.
 *
 * The intent was always "replace the summary so the rows and the summary disagree". The
 * implementation passed the caller's object to `buildRenderResult` as its `summary` argument —
 * but that builder reads `summary.pass` and `summary.fail` (the PRODUCER's vocabulary), while
 * every caller here supplies `{passed, failed, total}` (the READER's). So:
 *
 *     passed: undefined   -> written as `passed: undefined` -> DROPPED by JSON.stringify
 *     failed: NaN         -> written as `failed: NaN`       -> serialised as `null`
 *
 * The document that reached the reader therefore contained `{"failed": null, "total": 1}` — which
 * `summaryDefect` refuses as malformed counts, for a reason that has nothing to do with the
 * contradiction under test. The "exact H02 document" was not that document, and the test that
 * claimed to be the H02 regression was passing on a different defect.
 *
 * So the builder now always receives the producer's OWN summary (`summarize(results)`), and the
 * caller's object is assigned to the finished document. That is what "make the rows and the
 * summary disagree" means: a document the producer could not have written, not a malformed one.
 *
 * `...rest` still spreads LAST, so a caller can set `gate`, `variants` or `timestamp` directly.
 */
export function renderDoc({
  results = [{ id: 'alpha', status: 'pass' }],
  population = null,
  summary = null,
  ...rest
} = {}) {
  const doc = buildRenderResult({
    results, summary: summarize(results), now: new Date(NOW), population,
  });
  if (summary !== null) doc.summary = summary;
  return { ...doc, ...rest };
}
