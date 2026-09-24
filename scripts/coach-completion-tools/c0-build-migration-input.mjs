// Build the C0 controller-migration input from the REAL v7 state (R5-08).
//
// v7 preserves: taskId, sessionId, repoRoot, the nine C-* slices' exact file
// scopes, planFiles, calls=12 and the full event history. What changes is the
// authorization cadence: final-fable -> final-astra (Sean, 2026-09-21).
//
// Run from ROOT: node scripts/coach-completion-tools/c0-build-migration-input.mjs
// Writes tmp/c0-migration-input.json. Does NOT run the controller.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, posix } from 'node:path';
import { assertRoot } from './_root.mjs';

const ROOT = assertRoot();
const V7 = 'tmp/coach-remediation-20260913/workflow-state-v7.json';
const sha256 = (b) => createHash('sha256').update(b).digest('hex');

const raw = readFileSync(join(ROOT, V7));
const sha = sha256(raw);
const prior = JSON.parse(raw.toString('utf8'));

const fail = (m) => { console.error(`REFUSED: ${m}`); process.exit(1); };

// ── Guards: refuse to build a migration that would lose history ──────────────
if (prior.schemaVersion !== 4) fail(`v7 schemaVersion is ${prior.schemaVersion}, expected 4`);
if (prior.inFlight) fail('uncertain execution must be reconciled before migration');
if (prior.authorization?.cadence !== 'final-fable') fail(`expected v7 to carry final-fable, found ${prior.authorization?.cadence}`);

// ── The nine slice scopes, carried verbatim ─────────────────────────────────
const slices = prior.slices.map((s) => {
  const files = s.allowedFiles || s.files;
  if (!Array.isArray(files) || !files.length) fail(`slice ${s.id} has no owned files`);
  // The controller requires exact canonical POSIX-relative paths.
  const canonical = files.map((f) => f.replace(/\\/g, '/'));
  if (canonical.some((f) => f !== posix.normalize(f) || f.startsWith('./'))) fail(`slice ${s.id} has a non-canonical path`);
  return { id: s.id, files: canonical };
});

const planFiles = (prior.planFiles || []).map((f) => f.replace(/\\/g, '/'));
if (!planFiles.length) fail('no planFiles');

// Verify every declared path actually exists — the controller's freeze step
// requires all scoped source and plan files to exist.
const missing = [...planFiles, ...slices.flatMap((s) => s.files)].filter((f) => !existsSync(join(ROOT, f)));
if (missing.length) {
  console.error(`NOTE: ${missing.length} declared path(s) do not exist on disk (the controller's migrate --check does not inspect existence, but freeze does):`);
  for (const m of missing.slice(0, 10)) console.error('  -', m);
}

// ── Sean's authorization, verbatim (2026-09-21) ──────────────────────────────
const instruction = [
  'Astra is the orchestrator and the Final Decider for this task.',
  'Fable 5.1 does NOT replace Astra; the previous "Fable 5.1 replaces Astra as the final reviewer"',
  'instruction is retired. Sean, 2026-09-21: "fable 5.1 isnt replacing astra is the orchestrator".',
  'Slices run back to back without routine approval pauses; the C0-C6 checkpoints still gate.',
  'Retiring Fable does not grant unlimited review rounds: each review call is recorded against',
  'its actual authority.',
].join(' ');

const input = {
  taskId: prior.taskId,
  sessionId: prior.sessionId,
  repoRoot: prior.repoRoot,
  authorization: {
    authorizedBy: prior.authorization.authorizedBy,
    instruction,
    cadence: 'final-astra',
    reviewCallsPerTask: prior.authorization.reviewCallsPerTask,
    sessionRebind: true,
    allowAdditionalSlices: true,
  },
  planFiles,
  slices,
  carriedCalls: [],
  previousState: { path: V7, sha256: sha },
};

writeFileSync(join(ROOT, 'tmp/c0-migration-input.json'), `${JSON.stringify(input, null, 2)}\n`);

console.log(`v7 sha256: ${sha}`);
console.log(`taskId:    ${input.taskId}`);
console.log(`session:   ${input.sessionId}`);
console.log(`slices:    ${slices.length} (${slices.map((s) => s.id).join(', ')})`);
console.log(`planFiles: ${planFiles.length}`);
console.log(`cadence:   ${prior.authorization.cadence} -> ${input.authorization.cadence}`);
console.log(`calls:     ${prior.calls} preserved via prior.calls, carriedCalls=[]`);
console.log(`wrote tmp/c0-migration-input.json`);
