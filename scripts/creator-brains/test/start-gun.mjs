#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/start-gun.mjs
 * PURPOSE: Make "two REAL concurrent runs" actually CONCURRENT. Not a test —
 *          the helper both concurrency gates share.
 * PART OF: Creator Brains — SS-PT acquisition engine (test harness, additive)
 * ADDED: 2026-09-22 (hostile-review round)
 * ============================================================================
 *
 * WHY THIS EXISTS — MEASURED, NOT HYPOTHESISED.
 *
 *   `journal-preservation` case (2) and `concurrency` HR14f both assert
 *   "exactly one run is refused". Both spawned their two children with
 *   `Promise.all([spawnOne(), spawnOne()])` and a comment reading "Start both
 *   at once". Spawn-at-once is NOT lock-at-together: the children each pay a
 *   full module-load (run.mjs and its import graph) BEFORE the lock attempt,
 *   and on a loaded Windows box that stagger can exceed the whole stub run —
 *   so child B reaches the lock only after child A has released it, BOTH
 *   proceed, zero are refused, and the gate reports "exactly one refused, got
 *   0" — which reads exactly like a lost mutex.
 *
 *   Measured 2026-09-22: A1-06 case (2) went red 2 times in 11 isolation runs
 *   with the failure body `both ok=true, lockRefused=false, both children
 *   alive and reporting`. `lock.mjs` acquires with `openSync(..., 'wx')` —
 *   O_EXCL is atomic, so two simultaneous attempts CANNOT both succeed. The
 *   only way both succeed is that they were not simultaneous. The red was the
 *   fixture's overlap assumption failing, not the lock.
 *
 * HOW IT WORKS.
 *
 *   Child side: interpolate GATE_SNIPPET into the runner. It writes a
 *   `ready-<pid>` file, then spins until `GO` exists (10 s cap so a lost parent
 *   can never deadlock a child). Parent side: spawn the children, `await
 *   release()` (polls until the expected number of ready files appear, then
 *   writes `GO`, and returns how many it actually saw), and assert the count —
 *   that assertion is the mutation control: delete the gate and `seen` is 0.
 *
 *   No env var -> no gate. Single-child cases can pass `env` through untouched.
 *
 * RUN: (imported; not a test)
 * @module creator-brains/test/start-gun
 */

import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Child-side gate. Self-contained: its own fs import, no outer-scope names. */
export const GATE_SNIPPET = `
  if (process.env.CB_START_GUN) {
    const g = process.env.CB_START_GUN;
    const fsg = await import('node:fs');
    fsg.writeFileSync(g + '/ready-' + process.pid, '', 'utf-8');
    const t0g = Date.now();
    while (!fsg.existsSync(g + '/GO') && Date.now() - t0g < 10000) { /* wait */ }
  }
`;

/**
 * Build a gun for `expected` children.
 * `env` goes into each child's env; `release()` returns the ready count seen.
 */
export function startGun(expected) {
  const dir = mkdtempSync(join(tmpdir(), 'cb-gun-'));
  const ready = () => readdirSync(dir).filter((f) => f.startsWith('ready-'));
  return {
    dir,
    env: { CB_START_GUN: dir },
    async release(timeoutMs = 15000) {
      const t0 = Date.now();
      while (ready().length < expected && Date.now() - t0 < timeoutMs) {
        await new Promise((res) => { setTimeout(res, 5); });
      }
      const seen = ready().length;
      writeFileSync(join(dir, 'GO'), '', 'utf-8');
      return seen;
    },
    dispose() { rmSync(dir, { recursive: true, force: true }); },
  };
}
