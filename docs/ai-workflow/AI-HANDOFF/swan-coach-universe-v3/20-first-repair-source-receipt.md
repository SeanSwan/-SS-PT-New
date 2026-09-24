# SCU-SOURCE-RECEIPT — first data-truth repair batch

Owner: Astra. Version: 3.2, 2026-09-06 UTC. Status: pre-edit source receipt.
Scope: strict workout payload, read-back validator and progress helper.
Runtime HEAD before edits: b88dd9e5c894908d9f193411fe66117294d190ef.

## Canonical workout caller chain

| Link | Source evidence |
|---|---|
| Role routes | frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:109,211,238 |
| Actual role render | UniversalDashboardLayout.shell.tsx:133 → shellPieces.tsx:94–108 renders Component |
| Actual transcript | Pages/coach-assistant/CoachCommandCenterPage.tsx:180 → CoachChatTranscript.tsx:145 |
| Proposal JSX | CoachCommandLogEntry.tsx:192 renders CoachActionProposalCard |
| Review action | CoachActionProposalCard invokes approveCoachProposal with reviewToken |
| Exact frontend API | frontend/src/services/coachProposalService.ts:111 uses /api/coach/proposals/${encodeURIComponent(id)}/approve |
| Backend mount | backend/core/routes.mjs:443 app.use('/api/coach/proposals', coachProposalRoutes) |
| Handler | backend/routes/coachProposalRoutes.mjs:30 → approveCoachActionProposal |
| Domain write | backend/services/ai/coachActionProposalApprovalService.mjs:227 → submitAiWorkoutLogAsDailyForm |
| Normalizer | backend/services/workout/aiWorkoutDailyFormService.mjs:86 → normalizeAiExercises |

Mount shadow check: intake mounts separately at /api/coach/intake:442; stream-spike,
ai-chat and ai-command at 713–715 do not match /api/coach/proposals/:id/approve.
Inside proposal router, GET /:id precedes POST /:id/approve; HTTP methods differ.
Other POSTs are /:id/clarification-answer and /:id/reject; no matching shadow.
Proposal middleware currently restricts admin/trainer. Client path is NOT proven.

## Real model fields

DailyWorkoutForm.mjs:199 onward:
id UUID; sessionId UUID → session_id; clientId INTEGER → client_id;
trainerId INTEGER → trainer_id; date DATEONLY; formData JSONB → form_data;
sessionDeducted BOOLEAN → session_deducted. Table daily_workout_forms.
WorkoutSession.mjs:25 onward:
id UUID; userId INTEGER; date DATE; clientRequestId STRING(64); duration INTEGER.
WorkoutLog.mjs:8 onward:
id INTEGER; sessionId UUID; exerciseName STRING; setNumber INTEGER; reps INTEGER;
weight FLOAT; tempo, rest, rpe, notes, exerciseNote, setType, isometricHoldSeconds.
No integer version or workout-log canonical ID/unit column was established.

| Caller field | Real authority | Status |
|---|---|---|
| verifier.dailyFormId positive integer | DailyWorkoutForm.id UUID | DRIFT: add real UUID support |
| verifier.version integer | No model version column | Legacy helper-only; v2 needs semantic fingerprint |
| normalized exerciseId/exerciseKey/unit | formData.exercises JSONB | Dropped by current normalizer |
| workoutRows.weight | WorkoutLog.weight FLOAT | Match numeric projection; unit mapping unproved |
| session ownership | WorkoutSession.userId | Must compare to authorized clientId |
| progress scheduledCount | Actual scheduled-session membership | Count helper alone cannot prove adherence |

## Sibling classification

Normal daily-form service consumes the normalizer. It is called by proposal
approval, adminWorkoutLoggerController, workoutLogWriteDispatcher and
historyBackfillService. Strict mode must be opt-in until all relevant consumers
satisfy its data contract; legacy normalization stays compatible.
Pure coachWorkoutResultVerifier and coachProgressEvidence have no production
service/route caller in the scoped backend search. They are dormant helpers.
Repairing them is not a claim that charts or a saved workout path are integrated.
No model edits are part of this batch. Full schema drift artifact precedes S3 DDL.

## Regression evidence before edits

AR01/AR02/AR06/AR07/AR08 failed for assertions against real functions.
AR11 separately failed because a UUID form ID yields unknown.
AR09/AR10 matching/mismatched-owner controls passed.
The first batch repairs these boundaries; receipt service repairs await lane
ownership. Neither new helper tests nor this source receipt is a live smoke test.

## Default logger dictation producer (pre-edit R3-3 receipt)

Admin /log-my-workout is selected at UniversalDashboardLayout.routes.tsx:151;
AdminPersonalWorkoutLogger.tsx:29 renders the real shared WorkoutLogger.
WorkoutLogger.tsx:204 calls useWorkoutLoggerDictation and :739 renders its strip
when dictation is permitted and voiceModeV2 is off. The client route at :222 also
uses this logger; trainer EnhancedWorkoutLogger wraps it through its view.
useWorkoutLoggerDictation.ts:77 calls the real useCoachCommand. That hook posts
to /api/ai-command/execute and defaults omitted inputMode to text. The backend
mount is core/routes.mjs:715; aiCommandRoutes.mjs:216 owns POST /execute with
protect, kill-switch and rate-limit middleware. Confirm/cancel are distinct POST
paths; ai-chat and stream-spike mounts do not overlap this path.
voiceConfirmationTier.mjs:210 treats text/ui as known-safe channels and :211
requires physical confirmation for identity-crossing voice or unknown inputs.
This repair preserves voice provenance at the producer; it changes no models,
permission rules or shared command hook. Real mic/browser permission behavior
and other producers remain separate gates. The regression mounts the actual
logger and command hooks, substitutes speech capture and HTTP, and checks the
request payload produced after dictated and edited input.
