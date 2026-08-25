#!/usr/bin/env node
/**
 * @swan/forge — strangler backlog regeneration, in ONE process.
 *
 * Replaces the former shell one-liner in `npm run backlog:regen`, which was broken three ways
 * on Windows and failed SILENTLY (T2 round-0 finding, 2026-08-25):
 *   1. `grep "^[R4]"` is a character class (lines starting with R or 4), not the literal `[R4]`
 *      — it captured ZERO rows, so the command "succeeded" and produced an empty backlog.
 *   2. `tr "\\" /` was malformed ("unescaped backslash at end of string"), so consumer paths kept
 *      their Windows separators and resolved to nothing downstream.
 *   3. `/tmp/...` means different directories to cmd.exe (which npm uses) and to Git Bash, so the
 *      intermediates were written where the next stage could not read them.
 * Combined, a documented "regenerate, never hand-edit" command would have rewritten the backlog
 * with every file marked unreachable — i.e. proposed the entire consumer tree for quarantine.
 *
 * This script shells out to nothing: `execFileSync` with an argv array (no shell parsing), the OS
 * temp dir for intermediates, and one explicit path normalisation. It preserves the document's
 * hand-written preamble and replaces only the generated table body.
 *
 * Usage (from packages/swan-forge):  node scripts/regen-backlog.mjs [--check]
 *   --check  exit 2 if the doc on disk differs from what this run would write
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const HERE = resolve(new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const PKG = resolve(HERE, '..');
const REPO = resolve(PKG, '..', '..');
const SRC = join(REPO, 'frontend', 'src');
const ENTRY = join(SRC, 'main.jsx');
const DOC = join(REPO, 'docs', 'ai-workflow', 'AI-HANDOFF', 'FORGE-STRANGLER-BACKLOG-2026-08-25.md');

const run = (script, args) => execFileSync(process.execPath, [join(HERE, script), ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

// 1. R4 rows (legacy-import telemetry) — literal match, not a character class.
const driftOut = execFileSync(process.execPath, [join(HERE, 'drift-lint.mjs'), '--consumer', SRC], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
// Paths must be REPO-RELATIVE and forward-slashed in the doc: drift-lint echoes back whatever
// root it was given (absolute here), and gen-backlog joins reachability on `frontend/src/<rel>`.
// Leaving them absolute silently broke that join — every row rendered `reachable: n/a` and a
// PROVEN-dormant file was tiered as a migration target (caught by reading the output, T2 round 0).
const repoPrefix = REPO.replace(/\\/g, '/') + '/';
const r4 = driftOut.split('\n').filter((l) => l.startsWith('[R4] '))
  .map((l) => l.replace(/\\/g, '/').replace(repoPrefix, ''))
  .join('\n');
const r4Count = r4 ? r4.split('\n').length : 0;
if (!r4Count) { console.error('REFUSING: drift-lint returned zero [R4] rows — that is a tooling failure, not an empty backlog.'); process.exit(2); }

// 2. Candidate paths, relative to frontend/src, forward-slashed.
const cands = [...new Set(r4.split('\n').map((l) => {
  const m = l.match(/^\[R4\] (.+?):\d+ /);
  if (!m) return null;
  const p = m[1].replace(/\\/g, '/');
  const i = p.indexOf('frontend/src/');
  return i >= 0 ? p.slice(i + 'frontend/src/'.length) : null;
}).filter(Boolean))].sort();

const tmp = mkdtempSync(join(tmpdir(), 'forge-backlog-'));
const candFile = join(tmp, 'candidates.txt');
const r4File = join(tmp, 'r4.txt');
const reachFile = join(tmp, 'reach.txt');
writeFileSync(candFile, cands.join('\n') + '\n');
writeFileSync(r4File, r4 + '\n');

// 3. Reachability (its own MISSING guard refuses to call an unresolvable path dead).
const reach = run('reachability.mjs', [SRC, ENTRY, candFile]);
writeFileSync(reachFile, reach);
const missing = reach.split('\n').filter((l) => l.startsWith('MISSING')).length;
if (missing) { console.error(`REFUSING: ${missing} candidate path(s) did not resolve — fix the path plumbing before regenerating (a MISSING path must never become an UNREACHABLE verdict).`); process.exit(2); }

// 4. Body, joined onto the preserved preamble.
const body = run('gen-backlog.mjs', [r4File, reachFile]);
// The reachability column is the whole point of the join — if nothing matched, the tiering is
// fiction (every row defaults to "migrate me"), so refuse rather than publish a plausible lie.
if (/\| n\/a \|/.test(body) && !/\| (yes|NO) \|/.test(body)) { console.error('REFUSING: no row joined to a reachability verdict — the path keys do not match. Backlog NOT written.'); process.exit(2); }
const current = readFileSync(DOC, 'utf8');
const cut = current.indexOf('\n## ');
if (cut < 0) { console.error('REFUSING: no generated section found in the doc — refusing to overwrite a hand-written file.'); process.exit(2); }
const next = current.slice(0, cut) + body.replace(/\s*$/, '') + '\n';

if (process.argv.includes('--check')) {
  if (next !== current) { console.error('DRIFT: the backlog on disk does not match a fresh regeneration. Run: npm run backlog:regen'); process.exit(2); }
  console.error(`backlog check OK — ${r4Count} R4 row(s), ${cands.length} candidate(s), 0 missing`);
} else {
  writeFileSync(DOC, next);
  console.error(`backlog regenerated — ${r4Count} R4 row(s), ${cands.length} candidate(s), 0 missing`);
}
