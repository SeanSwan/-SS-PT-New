# APPLAUD Local Sync Audit Record - 2026-05-14

## 1. Phase Header

Phase: APPLAUD local folder sync and suggested merge groups.
Scope: Windows one-click launcher, local audio folder watcher, source timestamp persistence, read-only group suggestions, and merge UI group selection.
Dates: 2026-05-14.
Reviewed by: Codex builder pass plus Codex hostile review after each slice.
Final verdict: IMPLEMENTED LOCALLY, NOT PUSHED.

## 2. Files Involved

Runtime backend:

| File | Purpose |
|---|---|
| `scripts/applaud-sync/swan-applaud-sync.mjs` | Watches APPLAUD export folders, uploads stable recent audio files, dedupes by local SHA-256 state. |
| `scripts/launchers/Start-Swan-Applaud-Sync.ps1` | Windows launcher that prompts for folder/login config, stores auth token with DPAPI, starts APPLAUD plus sync. |
| `scripts/launchers/Start-Swan-Applaud-Sync.cmd` | Double-click wrapper for the PowerShell launcher. |
| `backend/migrations/20260514190000-add-plaud-clip-recorded-at.cjs` | Adds `recorded_at`, expands `clip_source` to include `applaud_local_sync`, and adds an index. |
| `backend/controllers/plaud/plaudUploadController.mjs` | Accepts trusted local sync metadata: `recordedAt` and `clipSource`. |
| `backend/models/PlaudClip.mjs` | Adds Sequelize fields for `recordedAt` and `applaud_local_sync` source validation. |
| `backend/services/plaudClipGroupService.mjs` | Builds read-only suggested clip groups from pending clips. |
| `backend/controllers/plaud/plaudIntakeController.mjs` | Adds group candidate handler. |
| `backend/routes/plaud/plaudIntakeRoutes.mjs` | Mounts `GET /api/plaud/intake/groups`. |
| `backend/controllers/plaud/plaudListController.mjs` | Returns `recordedAt` and `clipSource` to the frontend. |
| `backend/controllers/plaud/plaudMergeController.mjs` | Orders merge clips by `COALESCE(recorded_at, uploaded_at)` when chronology mode is requested. |
| `backend/services/plaudIntakeQueueService.mjs` | Uses `recorded_at` for intake timeline ordering and labels local sync source. |

Runtime frontend:

| File | Purpose |
|---|---|
| `frontend/src/services/plaudClipGroupService.ts` | Calls `GET /api/plaud/intake/groups`. |
| `frontend/src/components/PlaudClipMerge/PlaudClipGroupRail.tsx` | Renders suggested groups as one-click selection controls. |
| `frontend/src/components/PlaudClipMerge/PlaudClipMergePanel.tsx` | Loads groups and applies selected group clip IDs to the queue. |
| `frontend/src/hooks/usePlaudClipQueue.ts` | Adds exact `selectClipIds` action with max 5 clips. |
| `frontend/src/services/plaudClipService.ts` | Adds `recordedAt` and `clipSource` DTO fields. |
| `frontend/src/components/PlaudClipMerge/PlaudClipQueue.tsx` | Shows APPLAUD sync source and recorded timestamp. |
| `frontend/src/components/PlaudClipMerge/plaudClipTimeline.ts` | Prefers recorded time over upload time for selected clip chronology. |

Tests and docs:

| File | Purpose |
|---|---|
| `backend/tests/unit/swanApplaudSyncAgent.test.mjs` | Verifies stable scan, upload, source tag, recorded timestamp, and dedupe. |
| `backend/tests/unit/plaudUploadRecordedAt.test.mjs` | Verifies timestamp normalization and trusted source override. |
| `backend/tests/unit/plaudClipGroupService.test.mjs` | Verifies grouping, confidence, gap split, and max 5 clips. |
| `backend/tests/unit/plaudClipGroupsRoute.test.mjs` | Verifies group route contract. |
| `frontend/src/components/PlaudClipMerge/PlaudClipMergePanel.render.test.tsx` | Verifies safe errors and one-click group selection. |
| `docs/ai-workflow/references/PLAUD-APPLAUD-RUNBOOK.md` | Documents the Windows local sync fallback. |

## 3. Architecture And Runtime Flow

Local sync path:

```text
APPLAUD/PLAUD local export folder
  -> Start-Swan-Applaud-Sync.cmd
  -> Start-Swan-Applaud-Sync.ps1
  -> swan-applaud-sync.mjs
  -> POST /api/plaud/clips/upload
  -> plaud_clips row with recorded_at + clip_source='applaud_local_sync'
  -> existing PLAUD merge queue
```

Suggested group path:

```text
PlaudClipMergePanel
  -> GET /api/plaud/intake/groups
  -> plaudClipGroupService reads pending plaud_clips
  -> frontend renders PlaudClipGroupRail
  -> click group calls usePlaudClipQueue.selectClipIds
  -> trainer still chooses client and approves merge
```

## 4. Security Logic And Posture

- Local recordings are never deleted or moved. This blocks accidental source-data loss.
- Auth token is acquired by the launcher and stored with Windows DPAPI under `%LOCALAPPDATA%`. This avoids writing plaintext bearer tokens to repo files.
- Local dedupe uses SHA-256 fingerprints in a state file. This prevents accidental duplicate upload without relying on filenames.
- Only stable audio files are uploaded. The default stable window reduces partial-file reads while APPLAUD is still writing.
- Upload source override is allowlisted. `clipSource='applaud_local_sync'` is accepted; arbitrary client-provided source values fall back to `manual_upload`.
- `recordedAt` rejects invalid and far-future values. This prevents hostile timestamp poisoning for chronology.
- Group endpoint is read-only and returns clip metadata only. It does not return transcript, parsed workout payload, client names, or decrypted merge content.
- Group selection is not final write behavior. Trainer client selection, merge, review, and approval gates remain in the existing workflow.

Bypass risks if implemented wrong:

- If the launcher wrote tokens in plaintext, local malware or accidental commits could expose auth.
- If source overrides were not allowlisted, users could forge `applaud_webhook` or future source types.
- If group suggestions wrote merge requests directly, a wrong group could attach audio to the wrong client without review.

## 5. Best Practices Applied

- Rule 2: group buttons and launcher flow preserve practical 44px-plus interactions.
- Rule 6: new UI styling uses CSS variables with fallback colors where brand styling is introduced.
- Rule 8: group endpoint avoids client names and transcript payloads.
- Rule 17: each implementation slice received a hostile review before the next slice.
- Rule 18: reused existing PLAUD upload, intake, merge, and review paths.
- Rule 26 and Rule 31: route ownership verified through `backend/core/routes.mjs` and `backend/routes/plaud/plaudIntakeRoutes.mjs`.
- Rule 42: backend drift audit was run after backend changes.
- OWASP access-control posture: all new group routes inherit existing PLAUD feature flag, auth, and admin/trainer role middleware.

## 6. Known Limitations And Non-Goals

- This does not implement automatic client matching.
- This does not auto-merge or auto-approve any workout data.
- This does not delete APPLAUD source files after upload.
- This does not solve official PLAUD cloud OAuth. It is a local folder sync fallback.
- Grouping uses `recorded_at` when available and `uploaded_at` when not. Old rows without `recorded_at` remain lower confidence.
- No Playwright browser smoke was run for this slice because the work was verified through unit/render tests and production build; browser QA can be the next pass before pushing.

## 7. Performance And UX Considerations

- Folder scan defaults to recent stable files and stores upload state locally, keeping repeated scans cheap.
- Group endpoint limits response size and caps candidate groups.
- Group size is capped at five clips to match the merge API.
- The merge panel now supports one-click group selection while preserving manual clip selection.
- The group fetch uses a mounted guard to avoid state updates after unmount.

## 8. Test Coverage Summary

Passed verification:

- `cd backend && npx vitest run tests/unit/swanApplaudSyncAgent.test.mjs tests/unit/plaudUploadRecordedAt.test.mjs tests/unit/plaudClipGroupService.test.mjs tests/unit/plaudClipGroupsRoute.test.mjs --reporter verbose`
- `cd frontend && npx vitest run src/components/PlaudClipMerge/PlaudClipMergePanel.render.test.tsx --reporter verbose`
- `cd frontend && npm run build`
- `node --check` on new/changed backend scripts and migration files during implementation.

Not covered:

- Real APPLAUD app export behavior on Sean's machine.
- End-to-end authenticated browser upload through the double-click launcher.
- Database migration execution against production. Render migration/deploy flow still needs the normal push path.

## 9. Rollback Plan

Code rollback:

1. Revert the commit that contains this slice.
2. Redeploy Render from the reverted main branch.

Database rollback:

1. Run the migration down for `20260514190000-add-plaud-clip-recorded-at.cjs` only if no production rows need `recorded_at` or `applaud_local_sync`.
2. If rows exist with `clip_source='applaud_local_sync'`, the down migration converts them to `manual_upload` before restoring the older check constraint.

Operational rollback:

1. Stop `Start-Swan-Applaud-Sync.ps1` or close its terminal.
2. Leave APPLAUD source recordings untouched.
3. Delete local sync config/state under `%LOCALAPPDATA%\SwanStudios\applaud-sync` only if Sean wants a clean first-run setup.

## 10. Future Review Hooks

- Verify the actual APPLAUD export folder and file timestamp behavior on Sean's machine.
- Add a browser smoke test for the merge panel group rail after authenticated local login.
- Consider client-matching suggestions only after a privacy review and explicit trainer approval gate.
- Add a visible local sync health indicator in the Coach Command Center.
- Review whether old upload-time-only clips should get lower-priority grouping UI.
- Confirm Render migration ordering before pushing to main.
- Re-check APPLAUD/PLAUD filename and metadata formats if the desktop/mobile app changes.

## 11. Codex / AI Review Log

- Slice 1 local sync launcher and agent: tested with unit scan/upload/dedupe and local dry-run.
- Slice 2 recorded timestamp and source persistence: hostile review found missing local source tagging; fixed with `applaud_local_sync`.
- Slice 3 group candidates: hostile review checked route ownership, read-only behavior, max group size, and PII surface.
- Slice 4 frontend group rail: hostile review found async unmount risk; fixed with a mounted guard.
- Final verification: backend tests, frontend render test, frontend production build, and backend drift audit passed.
