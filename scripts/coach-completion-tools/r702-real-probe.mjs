// R7-02 CONTROL. The correct predecessor of v9 is what v9 DECLARES as its origin —
// `v9.origin.state` — not whatever v8.json happens to contain today. v8.json on disk
// is a LATER snapshot (219 events / 10 slices / new authorization) than the state the
// v9 migration snapshotted (216 events / 9 slices), so comparing them measures my probe's
// mistake, not the gate's behaviour.
//
// R7-13: THE INPUT IS GITIGNORED, SO THIS CONTROL CANNOT ALWAYS RUN. `workflow-state-v9.json` lives
// under `tmp/`, which `.gitignore:146` ignores — so a fresh clone or worktree of this branch does not
// have it, and this probe crashed with `ENOENT: Z:\…\tmp\coach-completion-20260921\workflow-state-v9.json`.
// A control that crashes on a clean checkout is WORSE than one that is absent, because a crashing
// control reads as a broken gate; and it is NOT acceptable to swap in a fabricated fixture, because
// this control's entire value is that it runs against the REAL supported state and caught my own
// over-refusal. So it now exits 3 (incomplete, per the exit-code contract — never a silent pass and
// never a silent skip) and SAYS which input is missing and what to supply.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkControllerMigration } from '../coach-completion-admission.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REL = 'tmp/coach-completion-20260921/workflow-state-v9.json';
const ROOT = (process.argv.find((a) => a.startsWith('--root=')) || '').slice(7) || resolve(HERE, '..', '..');
const STATE = resolve(ROOT, REL);

if (!existsSync(STATE)) {
  console.error(`INCOMPLETE — the real v9 state is not present at ${REL}.`);
  console.error(`  looked in: ${ROOT}`);
  console.error('  That path is GITIGNORED (`.gitignore:146`), so a clean checkout will not have it.');
  console.error('  Supply it with --root=<worktree that has tmp/ state>, or copy the file in.');
  console.error('  This control is NOT skipped silently: a control that cannot run must not read as a pass.');
  process.exit(3); // 3 = incomplete. Distinct from 0 (pass) and 2 (blocked), by contract.
}

const v9 = JSON.parse(readFileSync(STATE, 'utf8'));
const declaredPredecessor = v9.origin.state;
if (!declaredPredecessor) {
  console.error('INCOMPLETE — v9 carries no `origin.state`, so the declared predecessor cannot be read.');
  process.exit(3);
}

const v = checkControllerMigration({ before: declaredPredecessor, after: v9 });
console.log('CONTROL: declared predecessor -> v9 violations:', v.length, '(expected 0)');
v.slice(0, 8).forEach((x) => console.log('   ', x.slice(0, 160)));
if (v.length) process.exitCode = 1; // a violation here IS the finding; non-zero so a caller cannot miss it
