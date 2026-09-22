// C0 close — write the admission summary and the C0 PASS receipt.
// Run from WORKTREE ROOT: node scripts/coach-completion-tools/c0-write-receipts.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const EV = 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19/evidence';

const admission = {
  generatedAt: new Date().toISOString(),
  slice: 'C0-PREPARATION-AND-RUNNER-SAFETY',
  status: 'PASS',
  task: 'swan-coach-universe-v3-g02-robustness',
  controller: {
    path: 'tmp/coach-completion-20260921/workflow-state-v9.json',
    sha256: sha('tmp/coach-completion-20260921/workflow-state-v9.json'),
    cadence: 'final-astra',
    readBack: 'supported controller status: active, index 0, scopes index-paired, 216 origin events preserved',
  },
  candidateManifest: {
    path: `${EV}/candidate-manifest.json`,
    sha256: sha(`${EV}/candidate-manifest.json`),
    entries: 360,
  },
  verification: {
    commands: [
      'node --test tests/unit/coachRunner{Sequence,RefusalPath,Lifecycle,Verdict}.test.mjs',
      'node --test scripts/coach-completion-checkpoint.test.mjs scripts/coach-completion-admission.test.mjs',
      'SWAN_COACH_CONTROLLER_BEFORE=<v7> SWAN_COACH_CONTROLLER_AFTER=<v9> node tmp/run-checkpoint.mjs',
      'workflow.mjs migrate --check over 5 negative inputs (each refused, exit 1)',
      'SWAN_COACH_TEST_PORT=55533 node run-coach-postgres.mjs',
    ],
    exitCodes: [0, 0, '0 (six gates CLEAN; successor NOT-CHECKED pre-receipt by design)', '5 refusals', 0],
    totals: {
      runnerUnits: '67/67 node:test (59 pre-handoff + 8 orchestration)',
      checkpointAdmission: '22/22 checkpoint + admission module file',
      vitestGroup: '12 files, 157/157 (includes R5-11 real-model consent suites)',
      nodeGroupTAP: '8+8+2 = 18/18, 0 skipped',
      fullRun: 'exit 0',
    },
    fullRunLog: {
      path: 'tmp/coach-completion-20260921/full-guarded-run-20260921T2255.log',
      sha256: sha('tmp/coach-completion-20260921/full-guarded-run-20260921T2255.log'),
    },
  },
  connectionIdentity: '127.0.0.1:55533 coach_test_20260906/coach_test_admin, probed from the runner namespace (g0-db-receipt-v2.json)',
  markerFate: 'created atomically before the lease; protectionVerified true; cleared on the clean verdict',
  clusterLifecycle: 'operator window; v1 container (no published port) stopped 2026-09-22T04:46:17Z; -host container shutdown at session window end',
  notes: 'The successor gate is NOT-CHECKED in the pre-receipt aggregate by design; this receipt is the predecessor artifact C1 admission must supply (with its sha256).',
};
writeFileSync(`${EV}/admission.json`, `${JSON.stringify(admission, null, 2)}\n`);

const receipt = {
  slice_id: 'C0-PREPARATION-AND-RUNNER-SAFETY',
  task_id: 'swan-coach-universe-v3-g02-robustness',
  worktree: process.cwd().replace(/\\/g, '/'),
  branch: 'codex/swan-coach-astra-owned-20260906',
  base_head: '70547685c0fc8496342bf61210bf3b576f7e425c (intact base; original 53005a6da tree object corrupt — rescue refs pinned, incident recorded in 07-checkpoints.md)',
  candidate_manifest: { path: `${EV}/candidate-manifest.json`, sha256: sha(`${EV}/candidate-manifest.json`) },
  controller_state_path: 'tmp/coach-completion-20260921/workflow-state-v9.json',
  controller_state_sha256: sha('tmp/coach-completion-20260921/workflow-state-v9.json'),
  owned_paths: 49,
  requirements: 'PKG/05-slices.md#C0 PASS list',
  status: 'PASS',
  generatedAt: new Date().toISOString(),
};
writeFileSync(`${EV}/c0-pass-receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`);
console.log('receipt sha256:', sha(`${EV}/c0-pass-receipt.json`));
console.log('admission + receipt written');
