// C0 — the ONE ownership rule set shared by the candidate-manifest builder and
// the v9 migration-input builder. First match wins. Order encodes precedence:
// explicit runner/prep surfaces (C0) → migration/schema guards (C2) → consent,
// memory and workout persistence surfaces (C1) → mounted/e2e surfaces (C4) →
// selection composition (C3) → C5 catch-all (cross-slice baseline/preservation
// owner, per the Astra C→S ruling: every retained path gets an active
// verification owner even when no edit is planned).
//
// A path matching NO rule is a REFUSAL, never a default.
const PKG = 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19';
const FE_ASSIST = 'frontend/src/components/DashBoard/Pages/coach-assistant/';

const RULES = [
  // ── C0 — preparation, runner safety, evidence, controller states, tooling ──
  ['C0', (p) => p.startsWith(`${PKG}/`)],
  // R7-02 (Rule 4 split, 2026-09-22): the controller-preservation gate and its mutation-matrix suite
  // were extracted out of `coach-completion-admission.mjs`, so they must be owned HERE too — an
  // unowned candidate path is a REFUSAL by this file's own contract, not a default. Filing them under
  // the same owner as the gate they were cut from is what makes the split invisible to the manifest.
  // R7-04 added `coach-completion-preservation.mjs` the same way.
  ['C0', (p) => /^scripts\/coach-completion-(checkpoint|admission|manifest|controller-preservation|preservation)(\.successor|\.test)*\.mjs$/.test(p)],
  ['C0', (p) => p === 'backend/run-coach-postgres.mjs' || p === 'backend/package.json'],
  ['C0', (p) => /^backend\/tests\/helpers\/coach(Runner|DatabaseLease|ChildRunner|SuiteSelection|TargetMarker|TimeoutProfiles)[A-Za-z]*\.mjs$/.test(p) || /^backend\/tests\/helpers\/cohortChecks\.mjs$/.test(p)],
  ['C0', (p) => /^backend\/tests\/helpers\/(resetCoachTestSchema|registerCoachTestDatabase)([A-Za-z]*)\.mjs$/.test(p)],
  ['C0', (p) => /^backend\/tests\/helpers\/coachTargetPreflight\.mjs$/.test(p)],
  // R7-08: `coachRunPlan` and `coachRunnerOrchestration` are runner-SELECTION suites, so they belong
  // to the same owner as the runner they test — not to a generic test bucket.
  ['C0', (p) => /^backend\/tests\/unit\/(coach(Runner|DatabaseLease|ChildRunner|SuiteSelection|TargetMarker|TargetPreflight|TimeoutProfiles|RunPlan|RunnerOrchestration)[A-Za-z]*|cohortChecks)\.test\.mjs$/.test(p)],
  ['C0', (p) => p === '.gitignore'],
  ['C0', (p) => p === 'AGENTS.md'],
  ['C0', (p) => /^tmp\/coach-completion-20260921\//.test(p)],
  ['C0', (p) => /^tmp\/(c0-|recover-controller|run-checkpoint|verify-|probe-|append-runner-slice|rewrap-checkpoints|build-review6-packet)/.test(p)],
  // ── R7-13: THE TOOLING MUST OUTLIVE `tmp/` ─────────────────────────────────────────────────────
  // `tmp/` is GITIGNORED (`.gitignore:146`). Sixteen C0 files lived there — including the
  // candidate-manifest BUILDER that enforces this very rule set, and the snapshot verifier that
  // produced `preservation.json`'s claim. Proven stranded, not assumed:
  //   `git check-ignore -v tmp/c0-owner-rules.mjs` -> ".gitignore:146:tmp/  tmp/c0-owner-rules.mjs"
  // and PROVEN REFERENCED, which is what makes it a correctness problem rather than housekeeping:
  // every closure record names its provenance (`r7-02-…md` cites `scripts/coach-completion-tools/r702-mutation-probe.mjs`,
  // `preservation.json` cites `scripts/coach-completion-tools/c0-verify-snapshot.mjs`), so committing the receipts while the
  // tooling stays ignored lands DANGLING references — evidence whose cited verifier cannot be
  // produced. Moved to `scripts/coach-completion-tools/`, owned here so the manifest can see it.
  // moved out of `tmp/` (which is GITIGNORED) rather than deleting the `tmp/` rule: historical
  // records and the v7/v8 state files still live there and still need an owner. `_root.mjs` is the
  // guarded-root helper (see its header) that stops a builder writing a stray replica of the
  // evidence tree when it is invoked from somewhere other than the worktree root.
  ['C0', (p) => /^scripts\/coach-completion-tools\//.test(p)],

  // ── C2 — migration delivery and schema guards ──────────────────────────────
  ['C2', (p) => /^backend\/migrations\//.test(p)],
  ['C2', (p) => /(^|\/)(coachMigration|coachFactsMigration|migrationFkTypeCompat|migrationGuardTableNames)/.test(p)],
  ['C2', (p) => /^backend\/utils\/(modelTableGuard|tableCreationOrder)\.mjs$/.test(p)],

  // ── C1 — persistence acceptance: consent, memory, workout persistence ──────
  ['C1', (p) => /^backend\/tests\/integration\/coach(Consent|Memory|ReadAuthorization|RuntimeEvidence|WorkoutAtomic|WorkoutPoolBudget)[A-Za-z]*\.postgres\.test\.mjs$/.test(p)],
  ['C1', (p) => /^backend\/tests\/helpers\/coach(Consent|TestDatabase)[A-Za-z]*\.mjs$/.test(p)],
  ['C1', (p) => /^backend\/(vitest\.coach-postgres\.config\.mjs|tests\/helpers\/coachApprovalFixture\.mjs)$/.test(p)],
  ['C1', (p) => /^backend\/services\/(coachFact|coachConsent|notification|coachMemory)[A-Za-z]*\.mjs$/.test(p)],
  ['C1', (p) => /^backend\/models\/(CoachFact\.mjs|associations\.mjs)$/.test(p)],
  ['C1', (p) => /^backend\/routes\/coachMemoryRoutes\.mjs$/.test(p)],
  ['C1', (p) => /^backend\/controllers\/(notificationSettingsController|profileController)\.mjs$/.test(p)],
  ['C1', (p) => /^backend\/tests\/(api|unit)\/(coachMemoryRoutesAuthz|notificationSettingsCoachNudgeConsent|profileNotificationPreferenceWrites|coachFact[A-Za-z0-9.]*|coachMemoryRoutesMounted|coachConversationReadAuthorization)\.test\.mjs$/.test(p)],
  ['C1', (p) => /^backend\/tests\/helpers\/coach(ReadAuthorization|RuntimeEvidence)\.postgres\.config\.mjs$/.test(p)],
  ['C1', (p) => /^frontend\/src\/services\/(coachMemoryService|coachNudgePreferencesService)\.ts$/.test(p)],
  ['C1', (p) => /^frontend\/src\/components\/(UserDashboard\/components\/(CoachNudgePreferences|UserSettingsHub)[A-Za-z.]*|UniversalMasterSchedule\/NotificationPreferencesModal[A-Za-z.]*)\.(tsx|ts)$/.test(p)],
  ['C1', (p) => /^frontend\/src\/components\/DashBoard\/Pages\/client-dashboard\/ClientProfilePage[A-Za-z.]*\.t(s|sx)$/.test(p)],

  // ── C4 — mounted verification: e2e, browser, Logger/rest surfaces ─────────
  ['C4', (p) => /^frontend\/(playwright[A-Za-z0-9.-]*\.ts|e2e\/)/.test(p)],
  ['C4', (p) => p === 'frontend/src/components/DashBoard/UniversalDashboardLayout.styles.ts' || p === 'frontend/src/components/DashBoard/UniversalDashboardLayout.tsx'],
  ['C4', (p) => p === `${FE_ASSIST}CoachCommandCenter.bridgeMobileDockStyles.ts`],
  ['C4', (p) => p.startsWith('frontend/src/components/WorkoutLogger/')],
  ['C4', (p) => /^frontend\/src\/utils\/aiWorkoutEvents(\.test)?\.ts$/.test(p)],

  // ── C3 — selection composition (coach-assistant + confirmation surfaces) ───
  ['C3', (p) => p.startsWith(FE_ASSIST)],
  ['C3', (p) => p.startsWith('frontend/src/components/CoachConfirm/')],
  ['C3', (p) => /^frontend\/src\/hooks\/(coach[A-Za-z]*|useCoachCommand)(\.[A-Za-z0-9]+)*\.(ts|tsx)$/.test(p)],
  ['C3', (p) => /^frontend\/src\/(services\/coachProposalService\.ts|hooks\/coachPublicationScope\.ts|services\/dashboardSurfaceContext(\.test)?\.ts)$/.test(p)],
  ['C3', (p) => /^frontend\/src\/components\/DashBoard\/workspaces\/clients-team\/ClientTrainingCommandBar[A-Za-z.]*\.tsx$/.test(p)],

  // ── C5 — cross-slice baseline / preservation catch-all ────────────────────
  ['C5', (p) => p.startsWith('docs/ai-workflow/AI-HANDOFF/swan-coach-universe-v3/')],
  ['C5', (p) => p.startsWith('evidence/remediation-20260913/')],
  ['C5', (p) => /^frontend\/\.(hermes\/|m68-probe-)/.test(p)],
  ['C5', (p) => p === 'frontend/src/services/api.service.ts' || p === 'frontend/vite.config.ts'],
  ['C5', (p) => p.startsWith('backend/services/ai/')],            // historical coach AI baseline, no edits planned
  ['C5', (p) => p === 'backend/services/aiChatService.mjs' || p === 'backend/services/dashboardSurfaceRegistry.mjs'],
  ['C5', (p) => /^backend\/routes\/aiChatRoutes\.mjs$/.test(p)],
  ['C5', (p) => /^backend\/tests\/(api|unit)\/(aiChat|clientAccess|dashboardSurfaceRegistry|coachCallerInventory|coachContextTableNames|coachProactiveNudge|coachInferenceBoundary|coachEvidenceTools|coachContextCache|coachProgressEvidence|coachProgressRecordReader|coachSubstitutionDraft|coachMilestoneShareDraft|coachProviderMounted|coachContextEngine|aiProviderRouterIntegration|aiCommandRouteFallbackSource|coachIntentRoutes|dailyWorkoutForm)[A-Za-z0-9.]*\.mjs$/.test(p)],
  ['C5', (p) => p === 'backend/middleware/aiRateLimiter.mjs' || p === 'backend/routes/dailyWorkoutFormRoutes.mjs'],
  ['C5', (p) => p.startsWith('frontend/src/components/DashBoard/Pages/admin-workout-planner/')],
  ['C5', (p) => /^frontend\/src\/context\/(SessionContext|GlobalClientContext|globalClientPin)[A-Za-z0-9.]*(\.(t|tsx))?$/.test(p) || /^frontend\/src\/context\/(SessionContext|GlobalClientContext|globalClientPin)[A-Za-z0-9.]*\.(ts|tsx)$/.test(p)],
  ['C5', (p) => /^frontend\/src\/hooks\/useAIChat[A-Za-z0-9.]*\.(ts|tsx)$/.test(p)],
  ['C5', (p) => p === 'frontend/src/components/DashBoard/UniversalDashboardLayout.mobileSidebar.contract.test.ts'],
];

export const ownerOf = (p) => {
  for (const [slice, match] of RULES) if (match(p)) return slice;
  return null;
};
