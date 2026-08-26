#!/usr/bin/env node
/**
 * run-blender.mjs — the ONLY sanctioned way to run a Blender pipeline script.
 *
 * WHY (Ox Alpha, N1 review 2026-08-26): Blender exits 0 on an uncaught Python exception.
 * The pipe documents `--python-exit-code 1` as non-optional, but "documented" enforces
 * nothing — the next caller who types `blender -b --python swan_pipe.py` gets exit 0 on a
 * traceback again. This wrapper is the enforcement: it always passes the flag, it locates
 * Blender itself, and it refuses to report success unless the script's SUCCESS SENTINEL
 * (`.swan-pipe.ok`, written only after every planned stage executed and the output dir was
 * atomically swapped in) exists.
 *
 *   node scripts/assets/run-blender.mjs <script.py> --out <dir> [-- script args...]
 *
 *   exit 0  Blender exited 0 AND the sentinel exists
 *   exit 1  Blender failed, or the sentinel is missing (a "success" with no sentinel is a lie)
 *   exit 2  Blender not found / bad usage
 *
 * Locating Blender: SWAN_BLENDER_EXE env var, else the portable install this repo uses
 * (%LOCALAPPDATA%\Programs\blender-4.5.*-windows-x64\blender.exe), else `blender` on PATH.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);
const script = argv[0];
const outIdx = argv.indexOf('--out');
const outDir = outIdx >= 0 ? argv[outIdx + 1] : null;
const dashdash = argv.indexOf('--');
const scriptArgs = dashdash >= 0 ? argv.slice(dashdash + 1) : argv.slice(1);

if (!script || !existsSync(script)) {
  console.error('usage: node scripts/assets/run-blender.mjs <script.py> --out <dir> [-- script args...]');
  process.exit(2);
}

function findBlender() {
  if (process.env.SWAN_BLENDER_EXE && existsSync(process.env.SWAN_BLENDER_EXE)) return process.env.SWAN_BLENDER_EXE;
  const base = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Programs') : null;
  if (base && existsSync(base)) {
    const hit = readdirSync(base).filter((d) => /^blender-4\.5\.\d+-windows-x64$/.test(d)).sort().pop();
    if (hit && existsSync(join(base, hit, 'blender.exe'))) return join(base, hit, 'blender.exe');
  }
  return 'blender'; // PATH fallback; spawn will fail loudly if absent
}

const blender = findBlender();
// --disable-autoexec: an appended/linked .blend (Rigify, N3) can carry drivers that execute
// Python on load. Nothing in this pipeline needs auto-run. (GLM 5.3, N1 security note.)
const args = ['-b', '--disable-autoexec', '--python-exit-code', '1', '--python', script];
if (scriptArgs.length) args.push('--', ...scriptArgs);

console.log(`[run-blender] ${blender}`);
console.log(`[run-blender] ${args.join(' ')}`);
const r = spawnSync(blender, args, { stdio: 'inherit' });

if (r.error) {
  console.error(`[run-blender] EXIT 2 — could not start Blender: ${r.error.message}`);
  process.exit(2);
}
if (r.status !== 0) {
  console.error(`[run-blender] FAILED — Blender exit ${r.status}`);
  process.exit(1);
}
if (outDir) {
  const sentinel = join(resolve(outDir), '.swan-pipe.ok');
  if (!existsSync(sentinel)) {
    console.error(`[run-blender] FAILED — Blender exited 0 but the success sentinel is missing: ${sentinel}`);
    console.error('[run-blender] A run that did not write its sentinel did not complete every planned stage. Not a pass.');
    process.exit(1);
  }
  console.log(`[run-blender] OK — sentinel present: ${sentinel}`);
}
process.exit(0);
