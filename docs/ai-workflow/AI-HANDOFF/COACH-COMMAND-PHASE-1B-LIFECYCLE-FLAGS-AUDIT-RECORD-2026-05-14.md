# Coach Command Phase 1B Lifecycle + Flags Audit Record - 2026-05-14

## Phase Header
- Phase: Coach Command Center Phase 1B hardening
- Scope: deleted conversation lifecycle guardrails and Coach Command rollout flag plumbing
- Start date: 2026-05-14
- End date: 2026-05-14
- Reviewed by: Codex local implementation pass
- Final verdict: IMPLEMENTED PENDING BROADER SMOKE

## Files Involved
| File | Lines | Purpose |
| --- | ---: | --- |
| `backend/routes/aiChatRoutes.mjs` | 759 | AI chat route owner; now blocks direct read/update/delete access to `deleted` conversations. |
| `backend/tests/unit/aiChatConversationLifecycleSafety.test.mjs` | 36 | Source contract test for conversation status lifecycle safety. |
| `frontend/src/config/coachCommandFlags.ts` | 18 | Central flag keys for staged Coach Command rollout slices. |
| `frontend/src/config/coachCommandFlags.test.ts` | 25 | Locks stable flag names and uniqueness. |
| `frontend/src/context/FeatureAccessContext.tsx` | 172 | Admin feature flag defaults now include Coach Command rollout flags through a helper. |
| `frontend/src/context/FeatureAccessContext.coachCommandFlags.test.tsx` | 16 | Locks that admins receive every Coach Command flag by default. |

## Architecture & Runtime Flow
Admin route flow:

`/dashboard/admin/coach-assistant`
-> `UniversalDashboardLayout.tsx`
-> `CoachCommandCenterPage`
-> `useAIChat`
-> `/api/ai-chat/conversations`
-> `backend/routes/aiChatRoutes.mjs`
-> `AiConversation`

Conversation lifecycle contract:

| Operation | Status behavior |
| --- | --- |
| list | Only `active` or `archived` can be requested. |
| direct get by ID | Excludes `deleted` with `status: { [Op.ne]: 'deleted' }`. |
| update title/status | Excludes `deleted`; deleted threads cannot be restored through PATCH. |
| soft delete | Excludes already-deleted records, then writes `status: 'deleted'`. |
| send message | Already restricted to `status: 'active'`. |

Feature flag flow:

`coachCommandFlags.ts`
-> `buildAdminFeatureFlags()`
-> `FeatureAccessProvider`
-> future `useFeatureAccess('coach-command-*')` consumers

## Security Logic & Posture
- Deleted conversation anti-resurrection: direct `GET`, `PATCH`, and `DELETE` now exclude `deleted` records. Blocks stale ID reuse and accidental reactivation through the update route.
- Operator approval posture preserved: no new backend writes were added; flags only prepare rollout gates for future UI behavior.
- PII posture unchanged: the AI message route still uses `strictPiiMiddleware`; this phase did not change prompt payload construction.
- Feature flag posture: admin defaults are explicit and tested, preventing hidden admin rollout dead-ends while keeping future non-admin gating available.

## Best Practices Applied
- Rule 15: planned before implementation.
- Rule 18: followed existing feature flag context and route patterns.
- Rule 26: canonical route/data receipt established before code changes.
- Rule 28: claims are limited to lifecycle and flag hardening, not full PLAUD automation.
- Rule 44: no credentials or secret material added.
- Rule 48: this audit record captures phase scope and future review hooks.

## Known Limitations / Non-Goals
- This does not automate PLAUD/AppLaude folder ingestion.
- This does not create new workout logs or client records.
- This does not refactor the oversized `CoachCommandCenterPage.tsx` or `aiChatRoutes.mjs` files.
- This does not add a browser-rendered mobile smoke screenshot.
- This does not change trainer/client legacy Coach Assistant routes.

## Performance & UX Considerations
- Backend query cost impact is minimal: the added status predicate aligns with the existing `userId,status` model index.
- No visible UI was changed in this phase.
- Feature flags reduce future rollout risk by making new Coach Command slices separately gateable.
- The next UX slice should focus on fast mobile entry: one-tap thread search, selected-client handoff, and zero horizontal overflow checks.

## Test Coverage Summary
- `npx vitest run backend/tests/unit/aiChatConversationLifecycleSafety.test.mjs --reporter verbose`
  - Proves list excludes deleted statuses.
  - Proves direct ID access has non-deleted guards.
  - Proves message append remains active-only and PII middleware remains present.
- `cd frontend; npx vitest run src/config/coachCommandFlags.test.ts src/context/FeatureAccessContext.coachCommandFlags.test.tsx --reporter verbose`
  - Proves flag keys are stable.
  - Proves admin defaults include all Coach Command rollout flags.

## Rollback Plan
1. Revert this audit record.
2. Remove `frontend/src/config/coachCommandFlags.ts` and its two related tests.
3. Restore `FeatureAccessContext.tsx` admin defaults to the prior inline two-flag object.
4. Remove the `Op` import and the three `status: { [Op.ne]: 'deleted' }` predicates from `aiChatRoutes.mjs`.
5. Remove `backend/tests/unit/aiChatConversationLifecycleSafety.test.mjs`.
6. Run the same targeted tests and frontend build after rollback.

## Future Review Hooks
- Re-check whether `GET /api/ai-chat/conversations/:id` should exclude `archived` for mobile operator flows or allow archived read-only access.
- Add an integration test with a real deleted conversation fixture when the backend test harness is stable enough for this route.
- Confirm future Coach Command flag consumers do not bypass backend authorization.
- Revisit `aiChatRoutes.mjs` decomposition; the file is over the 300-line target and owns unrelated chat, transcription, TTS, and coach context concerns.
- Revisit `CoachCommandCenterPage.tsx` decomposition; the page should split layout, mobile dock, thread rail, and operations rail before larger PLAUD wiring.
- Add a mobile browser smoke check for the command dock after the next visible UI slice.

## Codex / AI Review Log
| Time | Reviewer | Verdict | Notes |
| --- | --- | --- | --- |
| 2026-05-14 | Codex | RED | New tests failed before implementation: missing deleted-ID guard and missing Coach Command flag module/helper. |
| 2026-05-14 | Codex | GREEN | Targeted backend and frontend guard tests passed after implementation. |
