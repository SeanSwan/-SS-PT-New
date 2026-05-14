# Coach Command Center + PLAUD/AppLaude Unified Workflow - AI Village Planning Prompt

Date: 2026-05-14
Surface: SwanStudios admin/trainer Coach Command Center
Mode: Planning review before implementation

## Mission

Review the plan to unify Swan Coach Command Center, PLAUD/AppLaude voice memo intake, transcript upload, staged workout-log approval, minimal client creation, persistent named coach conversations, and mobile-first trainer/admin operation.

This review must look for missing context, security/privacy gaps, data model drift, UI/UX friction, mobile edge cases, implementation risks, and better sequencing. The plan should preserve the operator approval model: Swan Coach may prepare drafts and recommendations, but final writes to client data require admin/trainer approval.

## Current Product Intent

The operator records training-session voice notes with a PLAUD device. AppLaude or another local home-PC bridge should forward those notes into SwanStudios. SwanStudios should stage those intakes, analyze/transcribe/parse them into draft workout logs, ask for clarification when needed, resolve likely client/date/session matches, and let the operator approve the final write target.

The desired daily flow is:

1. Operator opens SwanStudios on desktop or phone.
2. Operator lands quickly on Coach Command Center.
3. Today's voice notes, transcript uploads, typed notes, and coach chats are visible in one staging workspace.
4. Swan Coach proposes drafts: workout logs, client onboarding, client updates, clarification holds, duplicate-risk holds, and failed-intake recovery.
5. Operator approves final writes to the correct client.
6. If the client does not exist, operator can create a minimal/stub client from the staged flow and fill phone/email/profile details later.
7. Operator can also start or continue a named client-specific conversation to generate a quick workout for today, then optionally stage/save/log that plan with approval.

## Non-Negotiables

- No automatic writes to client profiles, workout logs, XP, charts, or client data.
- No PII to external LLMs. Client names, emails, phone numbers, raw transcript identifiers, and sensitive notes must not be sent to external model providers unless privacy proxying/redaction is enforced.
- No invented client contact details. Stub clients must not fake emails/phones or send invitations without an explicit later step.
- Keep `/dashboard/admin/coach-assistant` as the primary admin route.
- Do not build a generic chatbot UI. This must stay a command/staging console for active coaching operations.
- Mobile must be usable one-handed after login, with a fixed bottom command dock and no horizontal overflow at 300, 332, 390, or 430 px.
- Use existing SwanStudios patterns: React 18, TypeScript, styled-components, Crystalline/Enchanted Apex tokens, 44 px touch targets, dark-first WCAG contrast.
- Do not add yoga/meditation language. Use stretching/flexibility where needed.

## Existing Evidence From Repo

### Active admin route and surface

- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx`
  - Admin `/coach-assistant` mounts `CoachCommandCenterPage`.
  - Admin `/plaud` redirects into Coach Command Center with PLAUD workspace context.
  - Trainer `/plaud` still mounts a separate PLAUD workspace, so trainer parity may require a later pass.

### Current Coach Command Center

- `frontend/src/components/DashBoard/Pages/coach-assistant/CoachCommandCenterPage.tsx`
  - Uses `useCoachIntakeQueue({ scope: 'actionable', limit: 12 })`.
  - Reads query params such as `workspace=plaud`, `mergeRequestId`, and `review=next`.
  - Renders the unified PLAUD and Coach intake queue plus `PlaudMergeWorkspace`.
  - Has the mobile fixed command dock and required placeholder/actions.
  - Still uses static prototype command threads/logs from `CoachCommandCenter.data.ts`; the composer creates local log entries instead of using the real AI chat conversation backend.

### Existing saved conversation system

- `frontend/src/components/DashBoard/Pages/coach-assistant/SwanCoachAssistantPage.tsx`
  - Uses `useAIChat`, `useCoachAssistant`, `ConversationSidebar`, conversation rename/delete, voice transcription, and selected client context.
- `frontend/src/hooks/useAIChat.ts`
  - Supports create/list/load/send/rename/archive AI conversations.
- `backend/routes/aiChatRoutes.mjs`
  - Provides REST endpoints for AI chat conversations and messages.
- `backend/models/AiConversation.mjs`
  - Stores conversation context, target user, message history, title, and status.

### PLAUD/AppLaude auto-ingestion

- `backend/routes/plaud/plaudWebhookRoutes.mjs`
  - Mounts POST `/api/plaud/webhook/applaud` only when feature flags/env/schema checks pass.
- `backend/controllers/plaud/plaudApplaudWebhookController.mjs`
  - Validates webhook events, deduplicates, fetches audio, inserts `plaud_clips`, and marks items pending merge.
  - Current v1 ignores transcript-ready events and expects SwanStudios to transcribe its own audio.
- `backend/services/applaudAudioFetcher.mjs`
  - Provides bounded/allowlisted audio fetch.
- `docs/ai-workflow/references/PLAUD-APPLAUD-RUNBOOK.md`
  - Describes Plaud device -> Plaud cloud -> AppLaude local polling -> webhook -> queue.

### PLAUD merge and review flow

- `frontend/src/components/PlaudClipMerge/PlaudMergeWorkspace.tsx`
  - Existing merge/review workspace.
- `frontend/src/components/PlaudClipMerge/PlaudClientResolver.tsx`
  - Existing client resolution flow.
- `frontend/src/components/PlaudClipMerge/PlaudMergeReview.tsx`
  - Requires client resolution and approval before logging.
- `backend/controllers/plaud/plaudMergeController.mjs`
  - Merges clips, transcribes, parses, encrypts review payload, and creates merge requests.
- `backend/controllers/plaud/plaudMergeRequestsController.mjs`
  - Lists/decrypts review payloads and handles approve/discard metadata.
- `frontend/src/components/PlaudClipMerge/PlaudMergeWorkspace.apply.ts`
  - Applies approved review to `/api/admin/clients/:clientId/workouts`, then approves the merge request.

### Unified Coach intake / proposals

- `backend/routes/coachIntakeRoutes.mjs`
  - Provides `/api/coach/intake`, `/api/coach/intake/queue`, health, retention, and purge-plan endpoints.
- `backend/services/coachIntakeItemService.mjs`
  - Merges Coach intake items with PLAUD queue items.
- Migration `20260506120000-create-coach-intake-items.cjs`
  - Defines source types including voice note, plaud clip, audio upload, transcript file, typed note, and chat narrative.
  - Defines `coach_action_proposals` for `client_onboarding`, `workout_log`, `client_data_update`, and frontend dispatch proposals.
- `backend/services/ai/coachActionProposalApprovalService.mjs`
  - Approval of `client_onboarding` creates client records.
  - Approval of `workout_log` calls the existing workout logging service.
- `backend/services/ai/coachActionProposalPromptContract.mjs`
  - Says workout logs require selected/confirmed client and final writes require trainer approval.

### Workout logging / progress data

- `backend/routes/adminWorkoutLoggerRoutes.mjs`
  - POST `/api/admin/clients/:clientId/workouts`.
- `backend/services/workout/workoutLogService.mjs`
  - Creates WorkoutSession/WorkoutLog records, updates totals, awards XP/streaks, and creates social posts when configured.
- `backend/routes/dailyWorkoutFormRoutes.mjs` and `backend/models/DailyWorkoutForm.mjs`
  - Power detailed progress/chart endpoints, but this may be a partially separate data path from admin workout logging.
- `frontend/src/components/UserDashboard/components/ProfileChartsGrid.tsx`
  - Some chart types are hidden due data-chain truth concerns. Do not build the ultimate chart until the data source is audited.

### Client creation

- `backend/controllers/adminClientController.mjs`
  - Current admin full-client creation requires email/username style account fields.
- `backend/services/coachClientOnboardingApprovalService.mjs`
  - Existing proposal-approved onboarding path is closer to minimal/stub creation, but it needs review for required fields and safe hidden/stub behavior.

## Proposed Sequencing

### Phase 1 - Make Coach Command Center real

- Keep existing visual Command Center and mobile dock.
- Replace static `COMMAND_THREADS` and local-only command logs with the real `useAIChat` conversation system.
- Add real named conversation list, rename/archive/search, selected conversation load, and new coach thread creation.
- Preserve selected client context and queue context.
- Composer should submit to AI chat/coach backend, not just append prototype logs.
- Keep PLAUD queue and merge workspace visible in the same Command Center.

### Phase 2 - Single staging inbox

- Treat AppLaude/PLAUD clips, transcript uploads, typed notes, and chat narratives as unified intake sources.
- Stage all sources in a single Today/Actionable inbox.
- Add statuses for ready review, needs client, clarification hold, duplicate risk, failed intake recovery, transcript parsing, and attachments.
- Add grouped session suggestions but avoid auto-writing.

### Phase 3 - Approval workflows

- Use `coach_action_proposals` for workout logs, client onboarding, and client updates.
- Add/finish minimal stub client creation from staged flow.
- Approval writes through existing workout logging/onboarding services only after explicit operator action.

### Phase 4 - Quick workout mode

- Add a workflow for "create today's workout for selected client".
- If client history exists, use prior workouts/goals/progress data.
- If info is thin, generate a draft from explicit operator context and mark confidence/context gaps.
- Offer "stage as plan" or "log completed workout" only via approval proposal.

### Phase 5 - Ultimate client progress chart

- Audit WorkoutSession/WorkoutLog/DailyWorkoutForm/chart endpoints first.
- Create a truthful aggregate progress read model only after logging path is stable.
- Include workouts, cardio, stretching/flexibility, measurements, goals, XP, and history only when backed by real data.

### Phase 6 - Trainer parity

- Bring the same workflow to trainer route with role/access restrictions.
- Preserve admin-only capabilities where needed.

## Questions For AI Village

1. What is the highest-risk gap in unifying AppLaude/PLAUD intake with Coach Command Center?
2. Should Phase 1 only wire real conversations, or should it also move PLAUD review state into conversation context?
3. How should stub/minimal client creation be modeled so it is useful but does not pollute production accounts or fake contact data?
4. Which existing logging path should be canonical for future charts: WorkoutSession/WorkoutLog, DailyWorkoutForm, or a new read model over both?
5. What mobile interactions will matter most for a trainer using this in the gym between clients?
6. What should be blocked until Phase 2/3 because it creates too much risk if done in Phase 1?
7. What evidence/tests should be required before deployment?
8. What implementation order reduces rework across admin, trainer, PLAUD, AI chat, and chart systems?

## Desired Output

Provide:

- APPROVE / REVISE / REJECT for the sequencing.
- Missing context and exact files to inspect before coding.
- Specific security/privacy blockers.
- Specific frontend/mobile UX changes.
- Specific backend/data-model changes.
- Recommended first implementation slice that is small enough to build and verify safely.
