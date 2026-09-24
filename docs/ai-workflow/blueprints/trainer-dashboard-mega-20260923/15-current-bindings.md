# Current bindings — isolated candidate r3

Owner: Codex/Astra. Observed 2026-09-24. This supplements historical packet evidence; source hashes and preservation are in the delivery bundle. The reviewed source repairs are committed on local branch `codex/trainer-dashboard-repairs-current-20260924`, based on HEAD `89a9e3294b81a46d8d32175191f7d3b1355417bd`; this branch is not checked out. The active worktree and index were preserved. No database access, provider call, push or deployment is claimed.

## Repository and ownership

- Canonical repository: `<HOME>/Desktop/@Everything/quick-pt/SS-PT`.
- Baseline HEAD: `05fc32b99dc4f307d8e3f794857a774fca4b00f6`; branch `creator-brains-engine-r2-20260915`; 909 dirty/untracked entries at observation.
- Caller path `<HOME>/Desktop/quick-pt/SS-PT` has no Git repository. The isolated candidate is under its `outputs/trainer-dashboard-review-20260924` directory.
- `node scripts/lane-at-root.mjs orientation --json` read 98 records and returned `complete:false`. Invalid timestamps and ambiguous paths remain. Rule 67 prohibits treating this as clearance. No peer claim was removed or repaired.
- Sandbox Git subprocess checks misreported no repository; direct Git and the escalated ownership check established the facts above. No native-hook execution is claimed.
- Original documents/source are preserved and verified with SHA-256. New candidate files remain separate until exact-path ownership and source hashes permit application.

## Actual source seams

| Surface | Current binding | Evidence boundary |
|---|---|---|
| Trainer Home | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx` trainer `/overview` -> `Pages/trainer-dashboard/TrainerHomeTab.tsx` | Static route binding verified. `TrainerOverviewPage` is a replaced historical component, not the enhancement entry point. |
| Trainer navigation | `Pages/trainer-dashboard/TrainerStellarSidebar.tsx` plus mounted `Shared/DashboardTeachMeGuide` refiners | Do not equate sidebar absence with unreachable routes. Equipment, sprint and video have guide links. Runtime role reachability remains unproven. |
| Wearable panel | `frontend/src/components/VideoChat/VideoRoom.tsx` -> `WearableDataPanel.tsx` | Old panel generated random values. Candidate contains it; browser proof uses an isolated component fixture, not the complete room. |
| Wearable endpoint | `backend/core/routes.mjs:466` -> `backend/routes/videoSessionRoutes.mjs` `/api/video-sessions/:id/wearable` | Baseline handler calls session.update with arbitrary client metrics. Isolated route tests reproduce the write; no production persistence inspection. |
| Legacy storage | `backend/models/VideoSession.mjs`, `video_sessions.wearableData` JSONB | Candidate preserves stored bytes and withholds unverified metrics. No forensic claim that every historical row is synthetic. |
| Other wearable domain | `backend/core/routes.mjs:373` -> `wearableDataRoutes.mjs`, `WearableData.mjs`, `wearableDataInterop.mjs` | A separate sync/query/normalization domain already exists. It is not repaired or certified here; S7 must bind/reuse appropriate seams instead of claiming all ingestion is absent. |
| User identity | `backend/models/User.mjs` uses `DataTypes.INTEGER` primary key | Confirms why opaque wire IDs cannot become assumed SQL UUIDs. Physical migration design still requires full model/association inventory. |
| Equipment | `frontend/src/components/EquipmentManager/EquipmentManagerPage.tsx` plus existing retry/batch/merge tests | Existing behavior must be retained; decomposition/detail upgrades remain S1/S4. |
| Sprint | `frontend/src/components/SprintPlanner/SprintPlannerPage.tsx`, `frontend/src/hooks/BootcampSprintAuthPipeline.truth.test.ts` | The current canonical tree has a static auth/mount contract test; the listed UI tests belong to another stale worktree lane and are absent here. D10 UI-level coverage gap remains open. S5/B-08 must supply actual component/job tests. |
| Video transport | `frontend/package.json` has no LiveKit client SDK; legacy room still has placeholder transport | S6 needs certified media and consent/revocation proof. Backend service names do not prove working media. |

## S0 containment contract

- Provider buttons remain disabled with explicit unavailable copy; the panel makes GET availability checks only. It never creates a reading or claims a connected provider.
- Closed panel renders no controls. Pending requests abort/ignore late completion after close or session switch. Failures show Retry. Keyboard close returns focus.
- Authorized legacy POST is refused with `409 WEARABLE_INGESTION_DISABLED`, without parsing client claims into trusted measurements and without model updates.
- Wearable GET returns `wearableData:null` and an unavailable/unverified status. General session DTOs use the same quarantine so alternate reads cannot reveal legacy readings.
- General detail/list/end DTOs omit stored joinToken and disclose trainerNotes only to the actual assigned trainer or admin.
- End/notes/micro-win/ROM/transcribe mutations require the assigned trainer or admin. A trainer attending as the client has participant rights only; denied calls perform zero writes.
- Existing participant-visible transcription/recording policy remains OPEN; mutation authorization repair is not a consent or no-recording-v1 implementation.
- This is the video-session path only. No old row is deleted, rewritten, classified as proven synthetic, or exported to a model.
- Rollout must include both frontend containment and backend denial; a stale browser must not retain a working write endpoint. Rollback must preserve backend denial and historical-data quarantine. Reverting to random writes is forbidden; use a forward repair or disable the entire legacy wearable surface.

## Preconditions retained

B-01 is bound only for these existing seams. B-02 tokens, B-03 provider/media certification, B-04 compensation/availability/timezone, B-05 retention/deletion, B-06 performance baselines, B-07 visual acceptance, B-08 sprint operation semantics and B-09 PLAUD adaptation remain required for their slices.

Shared application and independent final Claude review remain PENDING. This candidate does not satisfy whole-product readiness.
