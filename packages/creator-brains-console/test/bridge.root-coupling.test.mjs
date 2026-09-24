#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: packages/creator-brains-console/test/bridge.root-coupling.test.mjs
 * PURPOSE: Pin the ROOT environment key as ONE fact shared by two packages —
 *          closing Astra p2's [UNKNOWN] "child-side root consumption".
 * PART OF: Creator Brains — SS-PT (console↔engine coupling ratchet)
 * ADDED: 2026-09-22
 * ============================================================================
 *
 * THE UNKNOWN, AND HOW IT CLOSES.
 *
 *   Astra (p2 discharge) verified run-daily.mjs passes the store root under
 *   ROOT_ENV "without mutating process.env" — then marked CHILD-SIDE
 *   CONSUMPTION [UNKNOWN] because the packet did not include the engine side.
 *   Both sides are readable here:
 *
 *     console: `export const ROOT_ENV = 'CREATOR_BRAINS_ROOT'` (run-daily.mjs:125),
 *              passed as `env: { ...process.env, [ROOT_ENV]: r }` at :240.
 *     engine:  `root(explicit)` reads `process.env.CREATOR_BRAINS_ROOT`
 *              (scripts/creator-brains/lib/paths.mjs:50).
 *
 *   The names match TODAY — and nothing anywhere checked that. They are two
 *   copies of one vocabulary in two packages (the deny-list-twice class): a
 *   rename on either side is silent, and the child would quietly fall back to
 *   the DEFAULT store while the gate guards a different one — the exact split
 *   the :240 comment says it exists to prevent.
 *
 * THE RATCHET.
 *
 *   This test derives the key from the CONSOLE's constant, sets it in the
 *   environment, and then asks the ENGINE's `root()` what store it resolves to.
 *   One assertion, both sides:
 *     - console renames ROOT_ENV  → env set under the new name, engine reads
 *       nothing, root() returns the default → FAIL.
 *     - engine renames its literal → same FAIL, from the other direction.
 *
 * RUN: node --test packages/creator-brains-console/test/bridge.root-coupling.test.mjs
 * @module creator-brains-console/test/bridge-root-coupling
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ROOT_ENV } from '../lib/run-daily.mjs';
import { root as engineRoot } from '../../../scripts/creator-brains/lib/paths.mjs';

test('ROOT coupling: the key the console passes IS the key the engine reads', () => {
  const probe = mkdtempSync(join(tmpdir(), 'cb-root-coupling-'));
  const prev = process.env[ROOT_ENV];
  try {
    process.env[ROOT_ENV] = probe;
    const resolved = engineRoot(undefined);
    assert.equal(resolved, probe,
      `the console passes the store root under ${ROOT_ENV}, but the engine's root() `
      + `resolved to '${resolved}' — the two packages no longer agree on the key, so a `
      + 'detached child would run against the DEFAULT store while the gate guards another');
  } finally {
    if (prev === undefined) delete process.env[ROOT_ENV];
    else process.env[ROOT_ENV] = prev;
    rmSync(probe, { recursive: true, force: true });
  }
});

test('ROOT_ENV is the documented literal (belt: the coupling test alone would still pass if BOTH sides renamed together)', () => {
  assert.equal(ROOT_ENV, 'CREATOR_BRAINS_ROOT',
    'both sides could drift in unison; the literal is the external contract (CLI docs, other tools)');
});
