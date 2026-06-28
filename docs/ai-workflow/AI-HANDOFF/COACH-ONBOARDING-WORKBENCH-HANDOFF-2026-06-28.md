# Coach Onboarding Workbench Handoff

Date: 2026-06-28
Branch: `codex/coach-onboarding-workbench-20260628`
Scope: Coach-approved client onboarding, coverage ledger, existing-client coverage updates, Workbench UI, and client follow-up notifications.

## Product Goal

Swan Coach onboarding is now a living client-profile workflow instead of a one-time chat result. A trainer can create or improve a client profile through review-gated Coach proposals, keep missing information in a non-gating coverage ledger, issue safe access handoffs, and keep workout logging available while onboarding is incomplete.

## Implemented Contracts

### Access Handoff

Coach-approved onboarding uses the same safe handoff shape as manual client creation:

```js
{
  credentialMode: 'claim_link_ready' | 'claim_link_needed' | 'reset_link_sent' | 'reset_link_needed',
  claimUrl,
  claimCode,
  claimExpiresAt,
  resetEmailSent
}
```

Rules:
- Move Fitness and external clients stay free-tracking/no-session accounts with `availableSessions: 0`.
- Coach approval does not expose raw temporary passwords.
- Claim/reset state is shown through the existing handoff UI contract, not through password-first copy.
- Existing duplicate-email behavior remains review-gated and deterministic.

### Coverage Ledger

Canonical storage is `client_onboarding_coverage_items`.

Statuses:
- `known`
- `unknown`
- `trainer_pending`
- `client_requested`
- `not_applicable`
- `blocked`

Status semantics:
- `known` and `not_applicable` resolve a ledger item and set `resolvedAt`.
- `client_requested` marks the item as requested, sets or preserves `requestedFromClientAt`, clears `resolvedAt`, and can create an in-app follow-up task.
- Missing coverage does not block client creation or workout logging.
- Safety-sensitive gaps should create warnings or follow-up tasks before advanced planning, not raw writes.

### Question Bank

The shared question bank is in `shared/clientOnboardingQuestionBank.mjs` and is imported by backend services and the Workbench UI. It covers these 15 scan categories:

1. `account_identity_source`
2. `compliance_waiver_consent`
3. `contact_communication_preferences`
4. `goals_outcomes`
5. `schedule_availability`
6. `health_injury_risk`
7. `pain_body_map_movement_screen`
8. `measurements_body_composition`
9. `training_history_preferences`
10. `equipment_environment`
11. `nutrition_hydration`
12. `lifestyle_recovery`
13. `baseline_performance`
14. `package_business_admin`
15. `coach_charting_data_priority`

Each question declares storage/scan metadata such as category, field key, prompts, value type, required-for tags, chart priority, Master Prompt path, questionnaire path, profile path, ledger-only status, sensitivity, and default status.

### Coach Proposal Flow

All AI-generated changes remain review-gated:
- `client_onboarding` creates a new client only after trainer/admin approval.
- `client_profile_coverage_update` updates an existing selected client and does not create duplicates.
- Proposal payloads may include `profileFields`, `questionnaireResponses`, and `coverageUpdates`.
- Coach is instructed not to invent medical details, consent, waiver state, claim links, URLs, passwords, or completion state.
- Partial onboarding remains usable. It must not silently mark `isOnboardingComplete` true.

### Workbench UI

The Workbench is lazy-loaded inside Coach Command Center and deep-linkable from Client Hub.

Entry points:
- Coach Command Center tab: `workspace=onboarding`
- Client Hub button: `/dashboard/admin/coach-assistant?workspace=onboarding&source=clients-team&intent=...`

UI surfaces:
- Roster rail from real client data.
- Intake panel with draft directive and quick status chips.
- 15-category coverage ledger summary.
- Access handoff/status panel.
- Existing-client route context preservation via `clientId`, `source`, and `intent=client_profile_coverage_update`.

### Follow-Up Notifications

Coverage items marked `client_requested` can generate in-app notification tasks:
- Notification type stays in-app/client scoped.
- Sensitive fields use category-level secure copy instead of naming medical details in the message.
- No email/SMS send path is introduced in this slice.
- Notification writes are fail-soft so deterministic profile/coverage updates are not rolled back by notification delivery failure.
- Follow-up timestamps are tracked with `requestedFromClientAt` and `resolvedAt`.

## SwanStudios vs Move Fitness vs External

SwanStudios paid clients:
- Keep normal paid-session and billing rules.
- Use reset/claim handoff state without raw temporary password display.

Move Fitness clients:
- Start as free-tracking/no-session clients.
- Receive claim handoff state.
- Workout logging remains available without session deduction.

External clients:
- Start as free-tracking/no-session clients.
- Receive claim handoff state.
- Workout logging remains available without session deduction.

## Verification Snapshot

Backend focused tests:

```bash
npx vitest run backend/tests/api/clientOnboardingCoverageLedgerSource.test.mjs backend/tests/unit/clientOnboardingFollowUpNotificationService.test.mjs backend/tests/unit/clientProfileCoverageUpdateService.test.mjs --reporter verbose
```

Result: 3 files, 11 tests passed.

Backend regression set:

```bash
npx vitest run backend/tests/unit/clientOnboardingFollowUpNotificationService.test.mjs backend/tests/unit/clientProfileCoverageUpdateService.test.mjs backend/tests/unit/clientOnboardingCoverageLedgerService.test.mjs backend/tests/unit/clientOnboardingQuestionBank.test.mjs backend/tests/unit/coachProfileCoverageProposalType.test.mjs backend/tests/unit/coachClientProfileCoverageUpdateApprovalService.test.mjs backend/tests/unit/coachClientOnboardingApprovalService.test.mjs backend/tests/unit/coachActionProposalClassifier.test.mjs backend/tests/unit/coachActionProposalPromptContract.test.mjs backend/tests/unit/coachActionProposalDetailService.test.mjs backend/tests/unit/coachActionProposalApprovalService.test.mjs backend/tests/unit/coachActionProposalService.test.mjs backend/tests/unit/coachProposalReviewSecretGuard.test.mjs backend/tests/unit/clientOnboardingProposalDispatcher.test.mjs backend/tests/api/clientOnboardingCoverageLedgerSource.test.mjs --reporter verbose
```

Result: 15 files, 71 tests passed.

Frontend focused tests:

```bash
npx vitest run src/components/DashBoard/Pages/coach-assistant/CoachOnboardingWorkbench.logic.test.ts src/components/DashBoard/Pages/coach-assistant/CoachOnboardingWorkbench.test.tsx src/components/DashBoard/Pages/coach-assistant/CoachCommandCenter.sectionSplit.test.ts src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterClientMode.test.tsx src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterDeepLinkMatrix.test.tsx src/components/DashBoard/workspaces/ClientsWorkspace.logic.test.ts src/components/DashBoard/workspaces/ClientsWorkspaceTopBar.test.tsx src/components/DashBoard/workspaces/ClientsWorkspace.onboardingWorkbench.test.tsx --reporter verbose
```

Result: 8 files, 49 tests passed.

Frontend type/build:

```bash
npm run type-check
npm run build
```

Result: both passed.

Responsive QA:

```bash
node C:\tmp\sspt-workbench-responsive-qa.cjs
```

Result: passed at 414x896, 1440x900, 2560x1440, and 3840x2160 using mocked API responses and seeded admin auth.

## Known Gates Before Render

- Migration `backend/migrations/20260628080500-add-client-onboarding-follow-up-timestamps.cjs` must be included before deploying the follow-up timestamp fields.
- Local test stderr still shows existing `.env file not found` and SCRAM/password warnings from imported DB modules; the focused suites exit successfully.
- This handoff was produced in an isolated worktree. Render is not updated until the branch is merged/pushed to `main` and Render deploy verification is run.

## Hostile Review Checklist

- No raw temporary password display was added.
- No email/SMS follow-up channel was added.
- Sensitive medical follow-up notifications avoid field-specific prompt text.
- Existing-client update flow does not create duplicate clients.
- Workbench source data comes from the real roster service path, with route fallback only for selected-client context.
- Missing onboarding data is tracked as coverage, not treated as a workout-logging blocker.
