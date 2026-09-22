// C0 admission — build the v9 controller-migration input (build-order step 11).
//
// Astra Review 6 C→S ruling: migrate the ACTIVE execution vocabulary to C0–C5,
// retaining the complete historical owned-path union by assigning every retained
// path to an active verification owner "even when no edit is planned". The
// supported controller enforces the same invariant structurally:
//   workflow-override.mjs initialize(): "migration cannot drop previous owned scope"
//
// R6-06 corrections applied: EXACT path assignments (no area globs in the output),
// future deliverables (C2/C4 files not yet created) admitted before creation, and
// the three distinct scopes kept separate: package authorization (this input),
// controller scope (v9), live editing locks (lane files — not represented here).
//
// Cadence: final-astra (Sean 2026-09-21; Astra is orchestrator and Final Decider).
// Run from WORKTREE ROOT: node scripts/coach-completion-tools/c0-build-v9-migration-input.mjs
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ownerOf } from './c0-owner-rules.mjs';
import { assertRoot } from './_root.mjs';

const ROOT = assertRoot();
const PKG = 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19';
const V7 = 'tmp/coach-remediation-20260913/workflow-state-v7.json';
const sha256 = (b) => createHash('sha256').update(b).digest('hex');
const fail = (m) => { console.error(`REFUSED: ${m}`); process.exit(2); };

const v7raw = readFileSync(join(ROOT, V7));
const v7sha = sha256(v7raw);
const prior = JSON.parse(v7raw.toString('utf8'));
if (prior.schemaVersion !== 4) fail(`v7 schemaVersion is ${prior.schemaVersion}, expected 4`);
if (prior.inFlight) fail('uncertain execution must be reconciled before migration');

// ── Forged build-order scope paths (exact, verbatim from 04-build-order.md) ──
const SCOPE_C0_PACKAGE = [
  ...['00-README', '01-architecture', '02-wireframes', '03-contracts', '04-build-order', '05-slices', '06-bans', '07-checkpoints', '09-tests']
    .map((s) => `${PKG}/${s}.md`),
  `${PKG}/evidence/candidate-manifest.json`,
  `${PKG}/evidence/preservation.json`, `${PKG}/evidence/dirty-baseline.json`,
  `${PKG}/evidence/source-bindings.json`, `${PKG}/evidence/run-contract.json`,
  `${PKG}/evidence/admission.json`, `${PKG}/evidence/coverage-mapping.json`,
  `${PKG}/evidence/g0-db-receipt.json`, `${PKG}/evidence/g0-db-receipt-v2.json`,
  `${PKG}/evidence/controller-migration-input.json`,
  'scripts/coach-completion-checkpoint.mjs', 'scripts/coach-completion-checkpoint.test.mjs',
  'scripts/coach-completion-admission.mjs', 'scripts/coach-completion-admission.test.mjs',
  'backend/tests/helpers/coachRunnerOrchestration.mjs',       // build-order row 5 (future)
  'backend/tests/unit/coachRunnerOrchestration.test.mjs',     // build-order row 6 (future)
  'backend/run-coach-postgres.mjs',
  'backend/tests/helpers/coachRunnerLifecycle.mjs', 'backend/tests/helpers/coachRunnerReport.mjs',
  'backend/tests/helpers/coachRunnerVerdict.mjs', 'backend/tests/helpers/coachRunnerSequence.mjs',
  'backend/tests/helpers/coachDatabaseLease.mjs',
  'backend/tests/unit/coachRunnerLifecycle.test.mjs', 'backend/tests/unit/coachRunnerVerdict.test.mjs',
  'backend/tests/unit/coachRunnerSequence.test.mjs', 'backend/tests/unit/coachRunnerRefusalPath.test.mjs',
  'backend/tests/unit/coachDatabaseLease.test.mjs',
  'backend/package.json',
  'AGENTS.md', // user-workflow-overrides block — the authorization evidence this migration encodes
];
const SCOPE_C1 = [
  'backend/tests/helpers/coachTestDatabase.mjs', 'backend/tests/helpers/coachTestDatabaseLoader.mjs',
  'backend/tests/helpers/registerCoachTestDatabase.mjs',
  'backend/vitest.coach-postgres.config.mjs',
  'backend/tests/helpers/coachTimeoutProfiles.mjs',
  'backend/tests/helpers/coachConsentRealModelHarness.mjs',
  'backend/tests/integration/coachConsentRealModel.postgres.test.mjs',
  'backend/tests/integration/coachConsentRealModelInterleavings.postgres.test.mjs',
  'backend/tests/integration/coachConsentPersistence.postgres.test.mjs',
  'backend/tests/integration/coachMemoryPersistence.postgres.test.mjs',
  'backend/tests/integration/coachReadAuthorization.postgres.test.mjs',
  'backend/tests/helpers/coachConsentPersistenceFixtures.mjs', // build-order C1 (future)
  'backend/models/CoachFact.mjs', 'backend/models/associations.mjs',
  'backend/services/coachFactService.mjs', 'backend/services/coachFactMemoryPolicy.mjs',
  'backend/services/notificationPreferenceUpdateService.mjs',
  'backend/controllers/notificationSettingsController.mjs', // consent writer (C1 acceptance target)
  'backend/controllers/profileController.mjs',              // profile writer (C1 acceptance target)
];
const SCOPE_C2 = [
  'backend/tests/helpers/coachMigrationCompletion.config.cjs',        // future
  'backend/tests/unit/coachMigrationCompletionConfig.test.mjs',       // future
  'backend/tests/helpers/coachMigrationCompletionFixtures.mjs',       // future
  'backend/tests/integration/coachMigrationCompletion.postgres.test.mjs', // future
  'backend/migrations/20260325000001-create-pain-entry-corrective-exercises.cjs',
];
const SCOPE_C3 = [
  'frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachCreatedThreadAdoption.test.tsx',
  'frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.createdThreadCompletion.test.tsx', // future
  'frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachSelectionNavigationBlocker.test.tsx',
  'frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachCommandCenterSelection.ts',
  'frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.controller.ts',
  'frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachCreatedThreadAdoption.ts',
  'frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachSelectionNavigationBlocker.ts',
  'frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useCoachSelectionSettledAction.ts',
  'frontend/src/hooks/coachPublicationScope.ts',
];
const SCOPE_C4 = [
  'frontend/playwright.coach-completion.config.ts',                    // future
  'frontend/e2e/coach-memory-consent-completion.real.spec.ts',         // future
  'frontend/e2e/coach-created-thread-completion.spec.ts',              // future
  'frontend/e2e/coach-memory-consent-remediation.spec.ts',             // future
  'frontend/e2e/workout-logger-rest-adjust.spec.ts',                   // future
  'frontend/e2e/coach-command-center-mobile.spec.ts',                  // future
  'frontend/src/components/DashBoard/UniversalDashboardLayout.styles.ts',       // conditional
  'frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.bridgeMobileDockStyles.ts', // conditional
];
const SCOPE_C5_FUTURE = [
  `${PKG}/evidence/verification-receipt.json`,   // future (C5)
  `${PKG}/evidence/module-line-audit.json`,      // future (C5)
  'docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/README.md',
  'docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/77-open-findings-register.md',
];

// ── Historical v7 union → active owners (deterministic path rules) ───────────
const historical = prior.slices.flatMap((s) => s.allowedFiles || s.files || []);
const uniq = (a) => [...new Set(a)];
const inC = (p) =>
  SCOPE_C0_PACKAGE.includes(p) || SCOPE_C1.includes(p) || SCOPE_C2.includes(p) ||
  SCOPE_C3.includes(p) || SCOPE_C4.includes(p) || SCOPE_C5_FUTURE.includes(p);

const C0 = uniq([...SCOPE_C0_PACKAGE]);
const C1 = uniq([...SCOPE_C1]);
const C2 = uniq([...SCOPE_C2]);
const C3 = uniq([...SCOPE_C3]);
const C4 = uniq([...SCOPE_C4]);
const C5 = uniq([...SCOPE_C5_FUTURE]);

const assign = (p) => {
  if (inC(p)) return; // already explicitly owned
  // Same ONE rule set the candidate manifest uses — the controller scope and the
  // candidate manifest cannot drift (c0-owner-rules.mjs, alongside this file).
  const owner = ownerOf(p);
  if (!owner) fail(`historical path has no owner: ${p}`);
  ({ C0, C1, C2, C3, C4, C5 })[owner].push(p);
};
for (const p of uniq(historical)) assign(p);

// ── The controller's own union invariant, checked HERE before it can fail THERE ──
const newFiles = new Set([...C0, ...C1, ...C2, ...C3, ...C4, ...C5]);
const dropped = historical.filter((p) => !newFiles.has(p));
if (dropped.length) fail(`migration would drop ${dropped.length} previously owned path(s):\n  ${dropped.slice(0, 10).join('\n  ')}`);

// Every active scope path must be unique across slices (controller requirement).
const allPaths = [...C0, ...C1, ...C2, ...C3, ...C4, ...C5];
if (new Set(allPaths).size !== allPaths.length) {
  const seen = new Set();
  for (const p of allPaths) { if (seen.has(p)) console.error(`DUPLICATE: ${p}`); seen.add(p); }
  fail('a path is assigned to more than one active slice');
}

// ── planFiles: v7's carried forward + the nine forged documents ──────────────
const planFiles = uniq([...(prior.planFiles || []).map((f) => f.replace(/\\/g, '/')),
  ...['00-README', '01-architecture', '02-wireframes', '03-contracts', '04-build-order', '05-slices', '06-bans', '07-checkpoints', '09-tests']
    .map((s) => `${PKG}/${s}.md`)]);

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
  repoRoot: ROOT.replace(/\\/g, '/'),
  authorization: {
    authorizedBy: prior.authorization.authorizedBy,
    instruction,
    cadence: 'final-astra',
    reviewCallsPerTask: prior.authorization.reviewCallsPerTask,
    sessionRebind: true,
    allowAdditionalSlices: true,
  },
  planFiles,
  slices: [
    { id: 'C0-PREPARATION-AND-RUNNER-SAFETY', files: C0.sort() },
    { id: 'C1-PERSISTENCE-ACCEPTANCE', files: C1.sort() },
    { id: 'C2-MIGRATION-VERIFICATION', files: C2.sort() },
    { id: 'C3-SELECTION-COMPOSITION', files: C3.sort() },
    { id: 'C4-MOUNTED-VERIFICATION', files: C4.sort() },
    { id: 'C5-EVIDENCE-AND-BASELINE', files: C5.sort() },
  ],
  carriedCalls: [],
  previousState: { path: V7, sha256: v7sha },
};

if (!input.authorization.authorizedBy || input.authorization.authorizedBy !== 'user') fail('authorization must be user');
if (!Number.isSafeInteger(input.authorization.reviewCallsPerTask) || input.authorization.reviewCallsPerTask < prior.calls + 1) {
  fail(`call cap ${input.authorization.reviewCallsPerTask} does not retain at least one final admission over ${prior.calls} consumed calls`);
}

const OUT = join(PKG, 'evidence', 'controller-migration-input.json');
writeFileSync(OUT, `${JSON.stringify(input, null, 2)}\n`);
console.log(`v7 sha256: ${v7sha}`);
console.log(`taskId: ${input.taskId} · session: ${input.sessionId} · cadence: ${prior.authorization.cadence} -> final-astra`);
console.log(`calls: ${prior.calls} / cap ${input.authorization.reviewCallsPerTask}`);
console.log(`historical union: ${uniq(historical).length} paths — all retained`);
console.log(`planFiles: ${planFiles.length}`);
for (const s of input.slices) console.log(`  ${s.id}: ${s.files.length} files`);
console.log(`wrote ${OUT}`);
