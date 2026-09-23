#!/usr/bin/env node

/**
 * Acceptance Gate
 * ===============
 * Run a slice's acceptance test file and refuse to report success unless the
 * runner's OWN output proves the declared number of cases actually executed.
 *
 * WHY THIS EXISTS (N-1, found 2026-09-20 while executing S0)
 * ---------------------------------------------------------
 * Every acceptance command in the migrations-reconciliation package was written
 * `node --test <file>`. This repo's tests are VITEST tests — they import
 * `describe`/`it` from 'vitest' and rely on `globals: true` plus a setupFiles
 * chain. Run under `node --test`, such a file produces:
 *
 *     $ node --test tests/unit/migrationGuardTableNames.test.mjs
 *     1..1
 *     # tests 1
 *     # suites 0
 *     # pass 1
 *     # fail 0
 *     exit=0
 *
 * That file declares 5 cases. `describe`/`it` resolve against node_modules, so
 * they are DEFINED — they register with vitest's collector, which is not
 * running. Nothing throws, the module loads cleanly, and node counts the FILE as
 * one passing test. **0 of 5 assertions executed, exit 0.** Measured on two
 * files: 0 of 5, and 0 of 9.
 *
 * So a gate written that way prints PASS while running nothing — and it also
 * disarms the slice's mutation requirement, because there is no executing
 * assertion for a mutant to redden.
 *
 * THE SECOND SHAPE, which a naive fix misses: even under the CORRECT runner, a
 * run in which nothing executed still exits 0:
 *
 *     $ npx vitest run <file> -t ZZZ_NEVER_MATCHES
 *     Test Files  1 skipped (1)
 *           Tests  5 skipped (5)
 *     exit=0
 *
 * So "exit 0" is not a pass, and "the file was collected" is not a pass. The only
 * acceptable evidence is the reporter's PASSED count matching the count the slice
 * declared.
 *
 * USAGE
 *   node scripts/acceptance-gate.mjs <test-file> --expect <N> [--label <text>]
 *                                   [--config <vitest config>] [--self-test]
 *                                   [-- <extra args passed to vitest>]
 *
 *   --self-test   Run the NEGATIVE CONTROL: re-run the same file with a test-name
 *                 filter that deselects every case, and assert this gate REFUSES
 *                 it. A gate that cannot fail an empty run is not a gate.
 *
 * EXIT  0 = the declared number of cases passed · 1 = refused · 2 = bad usage
 */

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');

/** A test-name filter guaranteed to match nothing. */
const NEVER_MATCHES = 'ZZZ_ACCEPTANCE_GATE_SELECTS_NOTHING';

/**
 * Strip ANSI SGR sequences.
 *
 * NOT OPTIONAL. Vitest colourises its summary even when stdout is NOT a TTY, so
 * the line a parser wants is actually:
 *
 *   \u001b[2m      Tests \u001b[22m \u001b[1m\u001b[32m5 passed\u001b[39m\u001b[22m\u001b[90m (5)\u001b[39m
 *
 * A `^\s*Tests` anchor therefore NEVER matches — the line begins with ESC, not
 * with whitespace — and the numbers are individually wrapped in escapes, so even
 * a loose `Tests\s+(\d+)` mis-reads. Measured here: the first version of this
 * gate reported "no Tests summary line" on a run that plainly printed one.
 *
 * (TAP output from `node --test` carries no escapes, which is why the `node
 * --test` measurements elsewhere did not hit this. Vitest does.)
 */
const stripAnsi = (s) => String(s ?? '').replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');

/**
 * Decide whether a runner's output is acceptable evidence.
 *
 * Pure, and exported, so it can be tested against real captured outputs rather
 * than only exercised through a subprocess.
 *
 * @returns {{ ok: boolean, reason: string, passed: number|null, skipped: number|null, failed: number|null }}
 */
export function judgeVitestOutput(output, exitCode, expected) {
  const text = stripAnsi(output);

  // TAP shape, i.e. `node --test` ran this file. Refuse on sight: whatever the
  // counts say, the runtime is not the one these tests were written for.
  if (/^TAP version \d+/m.test(text) || /^# suites /m.test(text)) {
    const tests = Number((text.match(/^# tests (\d+)/m) || [])[1] ?? NaN);
    const suites = Number((text.match(/^# suites (\d+)/m) || [])[1] ?? NaN);
    return {
      ok: false,
      reason: 'the output is TAP (node --test), not vitest — the declared runner and the '
        + `test file's runtime disagree. TAP reported tests=${tests} suites=${suites}. `
        + (suites === 0
          ? 'suites=0 means the FILE was counted as the only test: zero cases executed.'
          : ''),
      passed: null, skipped: null, failed: null,
    };
  }

  const summaryLine = (text.match(/^\s*Tests\s+(.+)$/m) || [])[1];
  if (!summaryLine) {
    return {
      ok: false,
      reason: 'no "Tests" summary line in the runner output — the case count cannot be '
        + 'verified, so this run proves nothing',
      passed: null, skipped: null, failed: null,
    };
  }

  const num = (re) => {
    const m = summaryLine.match(re);
    return m ? Number(m[1]) : 0;
  };
  const passed = num(/(\d+)\s+passed/);
  const failed = num(/(\d+)\s+failed/);
  const skipped = num(/(\d+)\s+skipped/);
  const todo = num(/(\d+)\s+todo/);

  if (exitCode !== 0) {
    return { ok: false, reason: `the runner exited ${exitCode}`, passed, skipped, failed };
  }
  if (failed > 0) {
    return { ok: false, reason: `${failed} case(s) failed`, passed, skipped, failed };
  }
  if (skipped > 0) {
    return {
      ok: false,
      reason: `${skipped} case(s) were SKIPPED — a skipped case did not execute, so it is not `
        + 'evidence. ("skipped" is the shape a name filter or a .skip produces, and it exits 0.)',
      passed, skipped, failed,
    };
  }
  if (todo > 0) {
    return { ok: false, reason: `${todo} case(s) are TODO — not executed`, passed, skipped, failed };
  }
  if (passed !== expected) {
    return {
      ok: false,
      reason: `the runner reported ${passed} passed, but this slice declares ${expected}. `
        + 'A count that does not match is a gate that did not run the gate.',
      passed, skipped, failed,
    };
  }
  return {
    ok: true,
    reason: `${passed} passed, matching the declared ${expected}`,
    passed, skipped, failed,
  };
}

/** Run vitest on `file` and return { output, exitCode, spawnError }. */
function runVitest(file, { config, extraArgs = [], nameFilter } = {}) {
  const args = ['vitest', 'run', file];
  if (config) args.push('--config', config);
  if (nameFilter) args.push('-t', nameFilter);
  args.push(...extraArgs);

  const r = spawnSync('npx', args, {
    cwd: backendDir,
    encoding: 'utf8',
    timeout: 600_000,
    // `shell: true` is REQUIRED on Windows: npx is a .cmd shim, and without a
    // shell spawnSync fails with ENOENT — which then looks exactly like "the
    // runner produced no summary line", i.e. the failure is misattributed to the
    // test run instead of to the gate's own spawn. safe-migrate.mjs passes
    // shell:true for the same reason.
    shell: true,
    // Neutralise ambient flags that would change the run under the gate.
    env: { ...process.env, CI: 'true' },
  });

  if (r.error) {
    return { output: '', exitCode: 127, spawnError: r.error.message };
  }
  return {
    output: `${r.stdout ?? ''}\n${r.stderr ?? ''}`,
    exitCode: r.status === null ? 124 : r.status,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    const self = (await import('node:fs')).readFileSync(fileURLToPath(import.meta.url), 'utf8');
    console.log(self.slice(self.indexOf('/**'), self.indexOf('*/') + 2));
    return;
  }

  const dashdash = argv.indexOf('--');
  const extraArgs = dashdash === -1 ? [] : argv.slice(dashdash + 1);
  const head = dashdash === -1 ? argv : argv.slice(0, dashdash);

  let file = null, expected = null, label = null, config = null, selfTest = false;
  for (let i = 0; i < head.length; i++) {
    const a = head[i];
    if (a === '--self-test') { selfTest = true; continue; }
    if (a === '--expect' || a === '--label' || a === '--config') {
      const v = head[i + 1];
      if (v === undefined) { console.error(`[gate] ${a} needs a value`); process.exit(2); }
      if (a === '--expect') expected = Number(v);
      if (a === '--label') label = v;
      if (a === '--config') config = v;
      i++;
      continue;
    }
    if (!a.startsWith('--') && file === null) { file = a; continue; }
    console.error(`[gate] unexpected argument ${JSON.stringify(a)}`);
    process.exit(2);
  }

  if (!file) { console.error('[gate] missing <test-file>'); process.exit(2); }
  if (!Number.isInteger(expected) || expected < 1) {
    console.error('[gate] --expect <N> is required and must be a positive integer');
    process.exit(2);
  }

  // The slice documents write paths REPO-ROOT-relative (`backend/tests/...`), but
  // vitest must be run from `backend/`. Resolve against the caller's cwd and hand
  // vitest a backend-relative path, so the documented command is copy-pasteable
  // from the repo root AND correct when run from inside backend/.
  const abs = path.resolve(process.cwd(), file);
  const rel = path.relative(backendDir, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    console.error(`[gate] ${file} does not resolve inside backend/ (${backendDir})`);
    process.exit(2);
  }
  const vitestPath = rel.split(path.sep).join('/');

  const name = label ?? file;
  console.log(`[gate] ${name}`);
  console.log(`[gate] declared cases: ${expected}`);

  const { output, exitCode, spawnError } = runVitest(vitestPath, { config, extraArgs });

  // A spawn failure is the GATE's fault, not the test's — report it as such, so
  // it is never mistaken for a missing summary line in the runner's output.
  if (spawnError) {
    console.error(`[gate] FAIL — could not spawn the runner at all: ${spawnError}`);
    process.exit(1);
  }

  const verdict = judgeVitestOutput(output, exitCode, expected);

  if (!verdict.ok) {
    console.error(`[gate] FAIL — ${verdict.reason}`);
    process.exit(1);
  }
  console.log(`[gate] PASS — ${verdict.reason}`);

  if (selfTest) {
    // THE NEGATIVE CONTROL. Re-run the same file with a filter that deselects
    // every case. The gate MUST refuse it. If it passes, the gate is measuring
    // "the file was collected" rather than "the cases ran".
    console.log('[gate] self-test: re-running with a filter that matches nothing ...');
    const empty = runVitest(vitestPath, { config, extraArgs, nameFilter: NEVER_MATCHES });
    const emptyVerdict = judgeVitestOutput(empty.output, empty.exitCode, expected);

    if (emptyVerdict.ok) {
      console.error('[gate] SELF-TEST FAILED — the gate PASSED a run in which zero cases '
        + 'executed. It is not a gate.');
      process.exit(1);
    }
    console.log(`[gate] self-test PASS — the zero-execution run was refused: ${emptyVerdict.reason}`);
  }
}

// Invocation guard, same shape and for the same reason as safe-migrate.mjs: the
// judge function must be importable by a test without running a suite.
const invokedDirectly = Boolean(process.argv[1])
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((err) => {
    console.error('acceptance gate failed:', err);
    process.exit(1);
  });
}
