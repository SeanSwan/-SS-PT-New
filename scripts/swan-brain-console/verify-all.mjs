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
 * WHAT IT RUNS, IN ORDER (fail-fast per stage, full summary at the end):
 *   1. tsc --noEmit            (frontend; needs a large heap on this tree — set here)
 *   2. fleet + runtime contracts (vitest)
 *   3. engine contract          (node --test, dependency-free)
 *   4. gallery-verify           (headless Chromium; boots the QA harness on :5199)
 *   5. console-verify           (headless Chromium; boots the console on :4599)
 *
 * The harness servers are started HERE as direct node processes (no shell, no npx
 * wrapper) and killed in a finally block, so the gate is clean on Windows and CI
 * alike. Run: npm run verify  (or: node scripts/swan-brain-console/verify-all.mjs)
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const FRONTEND = resolve(REPO, 'frontend');
const VITE = resolve(FRONTEND, 'node_modules', 'vite', 'bin', 'vite.js');

const RESULTS = [];
const note = (ok, name, detail = '') => {
  RESULTS.push({ ok, name, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

/** Run a command to completion, inheriting output, returning its exit code. */
function run(name, cmd, args, opts = {}) {
  const env = { ...process.env, ...opts.env };
  const r = spawnSync(cmd, args, {
    cwd: opts.cwd ?? REPO,
    env,
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: false,
  });
  const ok = r.status === 0;
  note(ok, name, ok ? '' : `exit ${r.status}`);
  return ok;
}

/** Poll a URL until it answers, or give up. */
async function waitFor(url, seconds) {
  for (let i = 0; i < seconds; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
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

  // 3. Engine contract (no deps).
  const engineOk = run('engine contract (node --test)', process.execPath, [
    '--test', 'scripts/swan-brain-console/engine-contract.test.mjs',
  ]);

  // 4. Gallery verification under headless Chromium, with the QA harness booted here.
  let galleryOk = false;
  let harness = null;
  try {
    harness = spawn(process.execPath, [VITE, '--port', '5199', '--strictPort'], {
      cwd: FRONTEND,
      stdio: 'ignore',
    });
    const up = await waitFor('http://127.0.0.1:5199/qa-worlds.html', 60);
    if (!up) throw new Error('QA harness did not start on :5199');
    galleryOk = run('gallery-verify (20 variants render)', process.execPath, [
      'scripts/swan-brain-console/gallery-verify.mjs',
    ]);
  } catch (err) {
    note(false, 'gallery-verify (20 variants render)', String(err?.message ?? err));
  } finally {
    harness?.kill();
  }

  // 5. Console verification, with the console server booted here.
  let consoleOk = false;
  let consoleServer = null;
  try {
    consoleServer = spawn(process.execPath, ['scripts/swan-brain-console/server.mjs', '--port', '4599'], {
      stdio: 'ignore',
    });
    const up = await waitFor('http://127.0.0.1:4599/', 30);
    if (!up) throw new Error('console server did not start on :4599');
    consoleOk = run('console-verify (operator surface)', process.execPath, [
      'scripts/swan-brain-console/console-verify.mjs',
    ]);
  } catch (err) {
    note(false, 'console-verify (operator surface)', String(err?.message ?? err));
  } finally {
    consoleServer?.kill();
  }

  const failed = RESULTS.filter((r) => !r.ok);
  console.log(`\n[verify] ${RESULTS.length - failed.length}/${RESULTS.length} stages passed`);
  if (failed.length > 0) {
    console.log(`[verify] failed: ${failed.map((f) => f.name).join(' | ')}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main();
