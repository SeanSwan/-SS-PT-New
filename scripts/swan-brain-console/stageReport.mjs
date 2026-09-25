/**
 * stageReport — the vocabulary a gate stage result is recorded and reported in.
 * @module scripts/swan-brain-console/stageReport
 *
 * WHY THIS IS A MODULE (round 18, 2026-09-24 — sable)
 * `verify-all.mjs` sat exactly at Rule 4's 300-line ceiling, and the round-18 fix — teaching the
 * gate to tell "nothing was measured" apart from "measured and failed" — pushed it to 376. The
 * honest options were to declare a third exception (refused: `lineBudget.test.mjs` caps the list
 * at two, and its own header says a budget that porous is not a budget), to delete the
 * explanation, or to extract on the seam that was already there.
 *
 * The seam is real and it is a subject boundary: HOW a stage result is recorded, labelled and
 * summarised is a different subject from WHICH stages run. This module is the first; the gate is
 * the second. Nothing here knows what any stage measures.
 */
import { spawnSync } from 'node:child_process';

/**
 * Can this runner create a child process with a PIPED STDIN?
 *
 * THE PROBE MUST REPRODUCE THE CONDITION THE SUITES ACTUALLY NEED (round 18, 2026-09-24).
 *
 * Measured repeatedly and reproducibly (10/10 runs, all variants):
 *   `stdio: ['pipe','ignore','ignore']`   -> status null, error EBUSY   (piped stdin)
 *   `stdio: ['ignore','pipe','pipe']`     -> status 0                   (piped stdout/stderr)
 *   `{ encoding: 'utf8' }` alone          -> status null, error EBUSY   (default = piped stdin)
 *   `{ encoding: 'utf8', input: '' }`     -> status null, error EBUSY   (piped stdin)
 *   `stdio: ['ignore','ignore','ignore']` -> status 0
 *
 * So the FAILING CONFIGURATION is a piped stdin, not output capture — and `{ encoding: 'utf8' }`
 * leaves stdin at the DEFAULT pipe, which is why suites that only wanted to read a child's output
 * were failing as though the child had misbehaved.
 *
 * WHAT THIS DOES NOT ESTABLISH — the cause. Astra's round-18 adjudication rejected the stronger
 * claim that "the sandbox cannot create a writable pipe into a child's stdin": ten identical
 * outcomes show a reproducible configuration-level correlation, not a mechanism. Sandbox policy,
 * runtime behaviour and an interception layer are all consistent with the table above. The
 * statement here is therefore deliberately configuration-level, and is the strongest form the
 * evidence supports.
 *
 * The first version of this probe used `stdio: ['ignore','ignore','ignore']` — which SUCCEEDS
 * here, so it reported a clean environment while four suites were failing. A capability probe
 * that does not reproduce the failing condition is a probe that certifies the wrong thing.
 */
export function spawnCapability() {
  const probe = spawnSync(process.execPath, ['-e', 'process.exit(0)'], { encoding: 'utf8' });
  if (probe.error || probe.status === null) {
    return { ok: false, reason: probe.error?.code ?? 'status null' };
  }
  return { ok: true, reason: null };
}

/**
 * The first few non-empty lines of a child's stderr, for a readiness-failure message.
 *
 * Bounded on purpose: a Node stack trace is long, and forty lines of trace inside a FAIL line
 * buries the stage name it is attached to. Three lines is enough to separate "MODULE_NOT_FOUND"
 * from "safe-delete refused the bulk delete" from "EADDRINUSE", which are the three failures
 * this probe has actually produced.
 */
export function firstLines(text, max = 3) {
  const lines = String(text).split('\n').map((l) => l.trim()).filter(Boolean);
  return lines.length ? lines.slice(0, max).join(' | ') : '(the child said nothing on stderr)';
}

/**
 * Build a stage recorder bound to one working directory.
 *
 * THREE OUTCOMES, NOT TWO (round 18). `note` used to take a boolean, so a stage that could not
 * RUN and a stage that ran and FAILED printed the same word. That is exactly how round 18
 * produced four "failures" in code that was never executed: a runner that cannot create child
 * processes reports `status: null` with empty stdio, `run()` read `status === 0`, and every
 * spawn-dependent stage became a product failure by default — wrong in the direction that costs
 * the most, because it blamed the product.
 *
 * `'blocked'` is the third outcome: NOTHING WAS MEASURED. It gets its own word, because "the gate
 * is red" and "I could not tell you about the gate" must not look the same to whoever reads the
 * summary next. Same distinction `exitCodes.mjs` draws between 2 and 3.
 */
export function createStageReport({ cwd }) {
  const results = [];

  const note = (ok, name, detail = '') => {
    const blocked = ok === 'blocked';
    const passed = ok === true;
    results.push({ ok: passed, blocked, name, detail });
    console.log(`${blocked ? 'BLOCKED' : (passed ? 'PASS' : 'FAIL')}  ${name}${detail ? ` — ${detail}` : ''}`);
  };

  /**
   * Run a command to completion, inheriting output, returning its exit code.
   *
   * A stage that never executed is NOT a failed stage. When the child could not be created —
   * `error` set, or `status: null` (which also covers a signal kill and a timeout) — the stage is
   * reported BLOCKED with the cause named. Reporting it FAIL is how an environment defect gets
   * read as a product defect, and a gate that cannot distinguish the two has no signal left: the
   * next real regression hides inside the standing noise.
   */
  function run(name, cmd, args, opts = {}) {
    const env = { ...process.env, ...opts.env };
    const r = spawnSync(cmd, args, {
      cwd: opts.cwd ?? cwd,
      env,
      // `capture` pipes stdout/stderr — which is safe here — while keeping stdin 'ignore'.
      stdio: opts.capture ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'],
      encoding: opts.capture ? 'utf8' : undefined,
      shell: false,
    });
    if (r.error || r.status === null) {
      const cause = r.error?.code ?? (r.signal ? `killed by ${r.signal}` : 'status null');
      note('blocked', name, `the runner could not execute this stage (${cause}) — nothing was measured`);
      return false;
    }
    if (opts.capture) {
      process.stdout.write(r.stdout ?? '');
      process.stderr.write(r.stderr ?? '');
    }
    const ok = r.status === 0;
    /*
     * A STAGE WHOSE ONLY FAILURES ARE ENVIRONMENT BLOCKERS IS BLOCKED, NOT FAILED
     * (round 18, 2026-09-24 — CORRECTED after Astra's adjudication, which rejected the first
     * version of this code.)
     *
     * The first version classified the stage FAILED and merely appended "not a defect" to the
     * detail — so the summary still read *"the product was measured and did not pass"* while the
     * sole failure was a suite that never executed. That is the same defect this whole round was
     * written to expose: a verdict that does not follow from the evidence. Astra's words: if the
     * only failure is an import-time capability failure, the defensible accounting is BLOCKED, and
     * a blocked stage must not be reported as a product failure.
     *
     * The classification is now DERIVED from node --test's own counts rather than asserted:
     *
     *     `# fail N`   vs   the number of SPAWN-UNAVAILABLE occurrences
     *
     * Equal      -> every failure is a suite that could not execute -> BLOCKED.
     * Not equal  -> at least one real assertion failed -> FAILED, with the blocker still named,
     *               because Astra's second condition is that a genuine failure must never be
     *               hidden behind a blockage.
     */
    if (!ok && opts.capture) {
      const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
      const blockedSuites = (out.match(/SPAWN-UNAVAILABLE/g) ?? []).length;
      const totalFail = Number((out.match(/^# fail (\d+)/m) ?? [])[1] ?? NaN);
      if (blockedSuites > 0 && Number.isFinite(totalFail) && totalFail === blockedSuites) {
        note(
          'blocked',
          name,
          `${blockedSuites} suite(s) could not execute — SPAWN-UNAVAILABLE (environment); every assertion that did run passed`,
        );
        return false;
      }
      if (blockedSuites > 0) {
        note(
          false,
          name,
          `exit ${r.status} · ${blockedSuites} suite(s) also could not execute — SPAWN-UNAVAILABLE (environment, not a defect)`,
        );
        return false;
      }
    }
    note(ok, name, ok ? '' : `exit ${r.status}`);
    return ok;
  }

  /**
   * Print the aggregate verdict and return the process exit code.
   *
   * A blocked stage is not green. Exit 1 covers both "measured and failed" and "not measured",
   * because CI must not treat an unrun gate as a passing one — the distinction a reader needs
   * lives in the two summary lines below, which is where it can actually be acted on.
   */
  function summary() {
    const passed = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok && !r.blocked);
    const blocked = results.filter((r) => r.blocked);
    console.log(
      `\n[verify] ${passed.length}/${results.length} stages passed`
      + (blocked.length ? ` · ${blocked.length} blocked` : '')
      + (failed.length ? ` · ${failed.length} failed` : ''),
    );
    if (failed.length > 0) {
      console.log(
        `[verify] FAILED — the product was measured and did not pass: ${failed.map((f) => f.name).join(' | ')}`,
      );
    }
    if (blocked.length > 0) {
      /*
       * "NOTHING WAS MEASURED" WAS TOO STRONG (Astra, round-18 adjudication). The node-contract
       * stage is blocked because one suite could not execute — but 559 of its assertions DID run
       * and pass. Its problem is INCOMPLETE measurement, not absent measurement. This line has to
       * be true of both that and a stage where the harness never started, so it says the thing
       * they actually share: no verdict is available. The per-stage detail above distinguishes them.
       */
      console.log(
        `[verify] BLOCKED — no verdict is available for these stages, so they are NOT evidence about the product: ${blocked.map((f) => f.name).join(' | ')}`,
      );
    }
    return failed.length || blocked.length ? 1 : 0;
  }

  return { note, run, results, summary };
}
