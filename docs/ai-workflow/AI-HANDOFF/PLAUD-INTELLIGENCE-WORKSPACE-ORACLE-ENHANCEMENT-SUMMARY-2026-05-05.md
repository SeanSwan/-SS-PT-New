# PLAUD Intelligence Workspace - Oracle Enhancement Summary

**Date:** 2026-05-05  
**Scope:** Upgrade the Phase 3/5 PLAUD plan using Oracle research plus verified repo structure.  
**Status:** Active roadmap update; first placement slice implemented.

## What changed from the original PLAUD plan

The original working plan treated PLAUD mainly as a manual multi-clip merge page plus an Applaud webhook receiver. The enhanced plan treats PLAUD as a **Training intake workspace**: one queue where manual clips, Applaud webhook recordings, imported transcripts, and trainer dictation become reviewed workout logs.

The biggest product change is placement. PLAUD is no longer only a Clients & Team -> Training sub-surface. That embedded client view still matters, but the canonical trainer/admin workflow is now a top-level Training workspace:

- Admin canonical route: `/dashboard/admin/plaud`
- Trainer canonical route: `/dashboard/trainer/plaud`
- Legacy compatibility route remains: `/dashboard/plaud-merge`
- Client-context secondary surface remains under Clients & Team -> Training

## First implemented slice

Implemented the first practical slice from Oracle's recommendation:

- Added `PlaudIntelligenceWorkspacePage` as a top-level Training workspace.
- Mounted it in the live `UniversalDashboardLayout` admin and trainer role route arrays.
- Added admin sidebar navigation through `WORKSPACE_CONFIG`.
- Added trainer sidebar navigation under the Build section.
- Wrapped the existing `PlaudMergeWorkspace` instead of duplicating merge/transcribe/apply logic.
- Added a source-contract test that locks the new placement and Swan Coach action-lane intent.

This intentionally preserves the current working merge flow while making it easy to find.

## Swan Coach / Hive Mind requirement

Sean's requirement is that PLAUD must be connected to the Swan Coach Hive Mind as an action-capable intake system, not as a separate upload tool.

The target interaction is dictation-first:

1. Trainer records many short PLAUD clips during or after sessions.
2. Swan Coach can inspect available clips, timestamps, filenames, transcripts, and merge candidates.
3. Swan Coach proposes ordering and grouping, especially when clips were recorded close together.
4. Swan Coach asks for confirmation when the grouping, client, date, or workout boundary is uncertain.
5. Swan Coach produces structured workout review cards.
6. Deterministic code owns final client lookup, RBAC, date guardrails, duplicate checks, and database writes.

## Required structured Coach actions

Future Swan Coach commands should be schema-bound actions, not free-form prose:

- `plaud_list_intake_items`: return queue items the trainer/admin can access.
- `plaud_analyze_clip_set`: summarize clip metadata, transcript status, and ordering signals.
- `plaud_propose_clip_order`: order selected clips by recording timestamp, upload fallback, and transcript boundary.
- `plaud_group_session_candidates`: group clips recorded near each other into likely training sessions.
- `plaud_merge_candidate_group`: initiate merge only after policy checks and user confirmation.
- `plaud_split_workouts`: split a transcript into workout cards by time/date/client boundary.
- `plaud_resolve_client_candidates`: return locally filtered client candidates with confidence, never raw unrestricted client data.
- `plaud_request_confirmation`: ask for client/date/order/duplicate confirmation when confidence is not high.
- `plaud_prepare_log_payload`: hand approved parsed workouts to the shared workout-log mapper.
- `plaud_apply_approved_workout`: write only after deterministic authorization and final human approval.

## Timestamp grouping rule

Recording time is a first-class data signal:

- Primary signal: device recording timestamp.
- Secondary signal: Applaud event timestamp or clip uploaded time.
- Tertiary signal: transcript references such as "today," "next set," "after squats," or "second workout."
- Guardrail: if timestamps conflict with transcript dates or imply a future workout, force manual confirmation.
- Session heuristic: clips recorded close together are grouped as one candidate session, but the trainer must be able to split or reorder them before merge.

## AI boundary

Swan Coach may interpret, summarize, propose, and request confirmation. It must not independently choose final client rows, bypass trainer assignment rules, auto-log ambiguous workouts, or write raw transcript decisions directly to the database.

Deterministic code remains authoritative for:

- Auth and RBAC.
- Client assignment scope.
- Source ownership.
- Clip access.
- Date normalization and future-date blocking.
- Duplicate detection.
- Final workout-log payload validation.
- Audit events and retention.

## Updated ship order

1. Canonical placement and navigation.
2. Unified intake inbox across manual, webhook, transcript, and dictation sources.
3. Swan Coach structured action contract.
4. Client resolver v2 with one-tap confirmation and new-client draft flow.
5. Timestamp-based clip ordering and session grouping.
6. Multi-date and multi-workout splitter.
7. Review/edit workspace with partial approvals.
8. Applaud auto-ingestion UX and retry visibility.
9. Audit, retention, RBAC, and log-scrubbing hardening.
10. QA, observability, rollback flags, and Playwright coverage.
11. Multi-trainer/admin oversight and reassignment flows.

## Current next slice

The next implementation slice should be the Swan Coach structured action contract plus intake item shape. Do not build another parsing universe. Connect PLAUD to the existing transcript intake and workout log mapper path:

- `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useTranscriptIntake.ts`
- `frontend/src/components/DashBoard/Pages/coach-assistant/utils/parsedWorkoutToLogPayload.ts`
- `backend/services/workoutLogParserService.mjs`
- `backend/routes/workoutLogUploadRoutes.mjs`
- `backend/services/ai/commandDispatcher.mjs`

The first backend contract should be read/propose/confirm only. Final writes stay on the existing approved workout-log path.
