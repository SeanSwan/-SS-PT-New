#!/usr/bin/env node
/**
 * verify-all — the single local gate for the Three.js fleet + Swan Brain Console.
 * @module scripts/swan-brain-console/verify-all
 *
 * WHY THIS EXISTS
 * Round 3 named the gap: the CI workflow ran the suites directly, but there was no
 * ONE local command, so every green number depended on a human remembering six
 * invocations and a server incantation. A guard you have to assemble by hand is a
 * guard that quietly stops running. This script IS `npm run verify` now.
 *
 * WHAT IT RUNS, IN ORDER (every stage runs; a full summary at the end):
 *   1. tsc --noEmit            (frontend; needs a large heap on this tree — set here)
 *   2. fleet + runtime contracts (vitest)
 *   3. engine + server contracts (node --test, dependency-free)
 *   4. gallery-verify           (headless Chromium; boots the QA harness on an ephemeral port)
 *   5. console-verify           (headless Chromium; boots the console on an ephemeral port,
 *                                after `assertTargetIdentity` proves it is THIS build)
 *
 * PORTS ARE EPHEMERAL, AND THE CONSOLE STAGE IS IDENTITY-GATED (2026-09-19). Both stages
 * used to bind a fixed port. A leftover server from another session then owned it, the
 * server spawned here died with EADDRINUSE, and the readiness probe still PASSED — because
 * the foreign server also satisfied the marker. Observed live: the leftover was a pre-S3
 * console. See `freePort` and `verifyTarget.mjs`.
 *
 * AGGREGATE, NOT FAIL-FAST. This header used to claim "fail-fast per stage", and that was
 * false — `run()` returns a status that `main()` never inspects, so all five stages always
 * execute. That behaviour is kept deliberately (one run should show you every failure, not
 * just the first), but the sentence was corrected rather than the code, because a gate whose
 * documentation misdescribes it is how a reviewer stops trusting the gate. Falsified by
 * Astra (gpt-6-astra), round 2, 2026-09-19. A stage whose own server fails to start is
 * reported as a failure and the rest still run.
 *
 * The harness servers are started HERE as direct node processes (no shell, no npx
 * wrapper) and killed in a finally block, so the gate is clean on Windows and CI
 * alike. Run: npm run verify  (or: node scripts/swan-brain-console/verify-all.mjs)
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { assertTargetIdentity } from './verifyTarget.mjs';
import { createStageReport, firstLines, spawnCapability } from './stageReport.mjs';
// Round 28 D1 — the probe above is advisory, and this is what stops it disagreeing in silence.
import { reconcileProbe } from './probeReconcile.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const FRONTEND = resolve(REPO, 'frontend');
const VITE = resolve(FRONTEND, 'node_modules', 'vite', 'bin', 'vite.js');

/**
 * Ask the OS for a free port, then release it for the child to bind.
 *
 * WHY NOT A FIXED PORT. Measured 2026-09-19: a console left over from an earlier session
 * owned `:4599`. The server this script spawned died with `EADDRINUSE`, and `waitFor`
 * still returned true — because the FOREIGN server also contains `CONSOLE_MARKER`. The
 * gate would then have driven the wrong build, and could have reported the stage green.
 *
 * A fixed port makes that a race; an ephemeral port removes the race, and the identity
 * assertion in the console stage makes losing any remaining race loud instead of silent.
 * Both are needed: the port is a probability, the assertion is a proof.
 */
function freePort() {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolvePort(port));
    });
  });
}

/**
 * Identity markers the readiness probes require before a stage is allowed to run.
 * Reachability is not identity — see `waitFor`. Both are substrings of the served HTML.
 */
const HARNESS_MARKER = '<title>Three.js fleet QA harness</title>';
const CONSOLE_MARKER = 'Swan Brain Console';

/*
 * The stage recorder — `note`, `run`, `spawnCapability` and `firstLines` — lives in
 * `stageReport.mjs`. Round 18 moved it there: HOW a result is recorded and labelled is a
 * different subject from WHICH stages run, and this file was at Rule 4's ceiling. Nothing below
 * needs to know how a stage is reported, only which ones exist.
 */

/**
 * Poll a URL until it answers AND proves it is the app we asked for, or give up.
 *
 * REACHABILITY IS NOT IDENTITY (round 5, 2026-09-19). Vite serves an SPA fallback, so ANY
 * dev server on the port answers 200 for ANY path. Measured: a foreign Vite app holding
 * 5199 returned 200 for /qa-worlds.html while serving a completely different page, and the
 * gate then drove the wrong app — 0 checks reported, then an unhandled Playwright timeout
 * with no explanation of the real problem.
 *
 * `expect` is a substring the response body must contain, which makes this probe prove
 * IDENTITY rather than mere liveness. Omitting it is allowed for callers that genuinely
 * cannot know a marker, but every caller here passes one.
 */
async function waitFor(url, seconds, expect) {
  for (let i = 0; i < seconds; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        if (!expect) return true;
        if ((await res.text()).includes(expect)) return true;
      }
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

/*
 * The list of suites this gate runs, and the check that it names all of them, live in
 * `contractSuites.mjs`. They were here, and they were wrong twice — round 6 found six
 * pre-existing suites (92 tests) that `npm run verify` had never run. The check that makes the
 * list self-verifying needs to be importable to be testable, and this file calls `main()` at
 * module load, so it cannot be.
 */
import { NODE_CONTRACT_SUITES, missingSuites } from './contractSuites.mjs';

async function main() {
  const { note, run, results, summary } = createStageReport({ cwd: REPO });

  const spawnProbe = spawnCapability();
  if (!spawnProbe.ok) {
    console.log(
      `[verify] WARNING — this runner cannot create a child process with a piped stdin `
      + `(${spawnProbe.reason}). Suites that capture a child's output report SPAWN-UNAVAILABLE: `
      + 'that is an environment blocker, not a defect in the subject.\n',
    );
  }

  // 1. Type check. This tree needs more than Node's default heap; the CI runner
  // budget is handled by the workflow, and locally we set it here.
  const tscOk = run('tsc --noEmit (frontend)', process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit'], {
    cwd: FRONTEND,
    env: { NODE_OPTIONS: '--max-old-space-size=14336' },
  });

  // 2. Fleet + runtime contracts.
  const vitestOk = run('fleet + runtime contracts (vitest)', process.execPath, [
    'node_modules/vitest/vitest.mjs', 'run', 'src/pages/HomePage/three-worlds/__tests__/',
  ], { cwd: FRONTEND });

  // 3. Dependency-free contracts: the engine verdict, the server's request boundary, the
  //    read-only MCP tool surface, its stdio transport, gate health, the render comparator's
  //    artifact contract, and the console panels. Every file runs in ONE invocation so none
  //    can be quietly dropped from the gate.
  //
  //    That sentence is not decoration, and it has now been wrong twice. `gateHealth.test.mjs`
  //    was written in S4 and passed on its own — while this list did not name it, so
  //    `npm run verify` would never have run it. Round 6 then found six MORE suites in the
  //    same condition, because the list was maintained by hand and checked by nothing. The
  //    check below is the fix: the list is still explicit, but it can no longer be silently
  //    incomplete.
  const missing = missingSuites();
  const engineOk = missing.length === 0 && run(
    'engine + app + mcp + gate contracts (node --test)',
    process.execPath,
    ['--test', ...NODE_CONTRACT_SUITES],
    // Captured, not inherited, so the stage can name any suite that could not execute
    // (SPAWN-UNAVAILABLE) instead of reporting a bare exit code that reads as a product defect.
    { capture: true },
  );
  note(
    missing.length === 0,
    'every *.test.mjs under this gate\'s own roots is named by this gate',
    missing.length ? `NEVER RUN by this gate: ${missing.join(', ')}` : '',
  );

  // 4. Gallery verification under headless Chromium, with the QA harness booted here.
  let galleryOk = false;
  let harness = null;
  try {
    const harnessPort = await freePort();
    const harnessUrl = `http://127.0.0.1:${harnessPort}/qa-worlds.html`;
    // Same reason as the console spawn below: the child's own stderr is the diagnosis.
    const harnessErr = [];
    harness = spawn(process.execPath, [VITE, '--port', String(harnessPort), '--strictPort'], {
      cwd: FRONTEND,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    harness.stderr.on('data', (d) => harnessErr.push(String(d)));
    const up = await waitFor(harnessUrl, 60, HARNESS_MARKER);
    if (!up) {
      throw new Error(
        `QA harness did not start on :${harnessPort} (or :${harnessPort} is serving another `
        + `app — the marker ${HARNESS_MARKER} was not found). The child process said: `
        + `${firstLines(harnessErr.join(''))}`,
      );
    }
    /*
     * KNOWN LIMITATION, recorded rather than left implicit. This stage proves identity with
     * a MARKER, and a marker cannot distinguish this build from a stale build of the same
     * app — the same gap that let a pre-S3 console satisfy the console probe. A content
     * comparison is not available here because Vite TRANSFORMS the entry HTML and the
     * modules it serves, so bytes on disk and bytes on the wire legitimately differ.
     * The console stage below does the stronger check because its server streams assets
     * verbatim. Until the harness has a build-id route, this remains marker-only.
     */
    galleryOk = run('gallery-verify (20 variants render)', process.execPath, [
      'scripts/swan-brain-console/gallery-verify.mjs', harnessUrl,
    ]);
  } catch (err) {
    /*
     * BLOCKED, not FAIL. This catch is reached only when the readiness probe threw — the harness
     * never came up — so no variant was ever exercised. That is a statement about the environment,
     * not about the 20 variants, and the two must not share a verdict. The detail carries the
     * child's own stderr, which is the diagnosis.
     */
    note('blocked', 'gallery-verify (20 variants render)', `the harness never started, so no variant was exercised — ${String(err?.message ?? err)}`);
  } finally {
    harness?.kill();
  }

  // 5. Console verification, with the console server booted here.
  let consoleOk = false;
  let consoleServer = null;
  try {
    /*
     * THE STAGE THAT WAS SILENTLY DRIVABLE BY A FOREIGN BUILD.
     *
     * On a fixed :4599, a leftover console from another session causes the server spawned
     * here to die with EADDRINUSE — while `waitFor` returns true, because the foreign
     * console contains `CONSOLE_MARKER` too. The stage then measured the wrong build.
     * Observed live on 2026-09-19: the leftover server was a pre-S3 console that 404'd
     * `/registry/tabs.json`, and the old probe passed it.
     *
     * Two independent fixes: an ephemeral port removes the collision, and
     * `assertTargetIdentity` proves the content served is the content on disk. The
     * assertion is the one that matters — it fails loudly even if the race is lost.
     */
    const consolePort = await freePort();
    const consoleUrl = `http://127.0.0.1:${consolePort}/`;
    /*
     * `cwd: REPO` IS LOAD-BEARING (round 10, 2026-09-20), and this was the ONLY spawn in
     * this file without one — every other spawn either pins a cwd or passes an ABSOLUTE
     * path. The command here is a RELATIVE path, so without a cwd it resolves against the
     * CALLER's working directory.
     *
     * Run `node scripts/swan-brain-console/verify-all.mjs` from anywhere but the repo root —
     * including from `scripts/swan-brain-console`, which is exactly where you are when you
     * are working on the console — and the child dies instantly with MODULE_NOT_FOUND,
     * `waitFor` polls for 30s, and the stage reports the message below, which blames ports
     * and foreign apps. Measured A/B, same tree and same command, cwd the only difference:
     * 4/6 stages from `scripts/swan-brain-console`, 5/6 from the repo root. `npm run verify`
     * always runs from the root, which is why this never fired there.
     *
     * THE CHILD'S STDERR IS NOW KEPT. `stdio: 'ignore'` discarded it, so two unrelated
     * failures — this one and a Vite startup that the sandbox's safe-delete shim aborts —
     * both surfaced as the same sentence about ports. A readiness probe that guesses a cause
     * and throws away the evidence is a probe that costs the reader the diagnosis.
     */
    const consoleChildErr = [];
    consoleServer = spawn(process.execPath, ['scripts/swan-brain-console/server.mjs', '--port', String(consolePort)], {
      cwd: REPO,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    consoleServer.stderr.on('data', (d) => consoleChildErr.push(String(d)));
    const up = await waitFor(consoleUrl, 30, CONSOLE_MARKER);
    if (!up) {
      throw new Error(
        `console server did not start on :${consolePort} (or :${consolePort} is serving another `
        + `app — the marker ${CONSOLE_MARKER} was not found). The child process said: `
        + `${firstLines(consoleChildErr.join(''))}`,
      );
    }
    await assertTargetIdentity(consoleUrl);
    consoleOk = run('console-verify (operator surface)', process.execPath, [
      'scripts/swan-brain-console/console-verify.mjs', consoleUrl,
    ]);
  } catch (err) {
    // Same rule as the gallery stage: the server never started, so the surface was never driven.
    note('blocked', 'console-verify (operator surface)', `the console server never started, so the surface was never driven — ${String(err?.message ?? err)}`);
  } finally {
    consoleServer?.kill();
  }

  /*
   * RECONCILE THE TWO INSTRUMENTS (round 28 D1, 2026-09-25). The probe at the top of this function
   * is a single start-of-run sample; the verdicts above are the measurement. Until this line,
   * nothing compared them, so the gate could warn that the environment was capable while a stage
   * reported BLOCKED — or warn that it was incapable while every stage passed — and leave the reader
   * to arbitrate between two vocabularies. The probe stays advisory: this prints, it never
   * reclassifies a stage and never touches the exit code.
   */
  const reconcile = reconcileProbe(spawnProbe.ok, results.filter((r) => r.blocked).length);
  if (reconcile) console.log(`[verify] NOTE — ${reconcile}`);

  process.exit(summary());
}

main();
