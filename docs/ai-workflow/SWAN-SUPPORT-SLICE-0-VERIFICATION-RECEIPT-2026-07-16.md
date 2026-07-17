# Swan Support Report Room — Slice 0 Verification Receipt

**Date:** 2026-07-16
**Branch:** `codex/swan-support-report-room-20260716`
**Baseline:** `origin/main` at `93b160cba`
**Status:** `PROCEED WITH AMENDMENTS — PRODUCT CODE NOT STARTED`

## 1. Purpose and Stop Condition

This receipt verifies the real SwanStudios surfaces that a voice-first issue-reporting system would extend. It is the mandatory pre-code gate for the approved Report Room plan.

Slice 0 ends after this receipt and its scoped hygiene inventory. No UI, API, model, migration, provider, or runtime behavior is changed. Sean must review the amendments in section 10 before Slice 1 starts.

## 2. Coordination and Baseline Receipt

- The shared checkout is not an implementation-safe lane: another Codex worktree owns an active prelaunch audit and locks Swan Coach route files.
- This audit is isolated at `C:\tmp\sspt-swan-support-report-room-20260716` on `codex/swan-support-report-room-20260716`.
- Claude's live lane was re-read before these documentation edits and reported no locked files.
- The support branch is intentionally based on the current committed `origin/main`; it does not silently absorb uncommitted shared-checkout work.
- When `origin/main` advanced by four shell/scroll commits during Slice 0, this branch was fast-forwarded and the affected route and App mount evidence was re-verified.
- Before Slice 1, rebase or otherwise reconcile this branch if the prelaunch audit lands changes in authentication, AI chat, notifications, or dashboard routing.

## 3. Canonical Surface Receipt

| Required evidence         | Canonical finding                                                                                                    | Evidence                                                                                                                                                                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root route tree           | The app router uses the route object exported by `main-routes.tsx`; the root route has a route-level error boundary. | `frontend/src/routes/main-routes.tsx:313-320`                                                                                                                                                                                                                     |
| User dashboard route      | `/user-dashboard` and `/user-dashboard/:tab` are protected and mount `UserDashboardV3`.                              | `frontend/src/routes/main-routes.tsx:742-756`                                                                                                                                                                                                                     |
| User dashboard JSX        | `UserDashboardV3` mounts its error boundary, tab bar, and tab content.                                               | `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:87-125`                                                                                                                                                                                               |
| User dashboard Home       | `UserDashboardTabsV3` mounts `HomeTab`; `HomeTab` mounts `SwanCoachDock`.                                            | `frontend/src/components/UserDashboard/UserDashboardTabsV3.tsx:145-154`; `frontend/src/components/UserDashboard/tabs/HomeTab.tsx:170-182`                                                                                                                         |
| Universal dashboard route | `/dashboard/*` is protected for admin, trainer, and client roles and mounts `UniversalDashboardLayout`.              | `frontend/src/routes/main-routes.tsx:877-883`                                                                                                                                                                                                                     |
| Dashboard child mount     | The layout renders the matched dashboard component from its canonical route list.                                    | `frontend/src/components/DashBoard/UniversalDashboardLayout.shellPieces.tsx:90-114`                                                                                                                                                                               |
| Client overview           | `/dashboard/client/overview` maps to `ClientHomeTab`, which reaches `ClientDashboardHome`.                           | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:192-195`; `frontend/src/components/DashBoard/Pages/client-dashboard/ClientHomeTab.tsx:12,43`; `frontend/src/components/DashBoard/Pages/client-dashboard/ClientDashboardHomeTab.tsx:41,190` |
| Coach assistant           | `/dashboard/coach-assistant` maps to `CoachCommandCenterPage`.                                                       | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:213`                                                                                                                                                                                       |
| Existing public fallback  | `/contact` is the only verified public support-like route; it is a contact form, not an issue system.                | `frontend/src/routes/main-routes.tsx:83-86,364-369`; `backend/core/routes.mjs:340`; `backend/routes/contactRoutes.mjs:80-136`                                                                                                                                     |
| Proposed report route     | No `/support`, `/report-issue`, or equivalent issue-report route is mounted.                                         | Repo-wide route search on 2026-07-16; absence recorded in the scoped hygiene inventory.                                                                                                                                                                           |
| Proposed report API       | No `/api/issues`, `/api/support`, or `/api/admin/issues` route is mounted.                                           | Repo-wide backend route search on 2026-07-16.                                                                                                                                                                                                                     |
| Authoritative issue model | No issue-report model or migration exists.                                                                           | Repo-wide model and migration search on 2026-07-16.                                                                                                                                                                                                               |

The final three rows are explicit missing-surface findings, not claims that a dormant route is canonical.

## 4. Surface Classification

| Surface                                                              | Classification                  | Evidence and consequence                                                                                                     |
| -------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/user-dashboard` + `UserDashboardV3`                                | canonical                       | Verified route and JSX mount above. Add a visible support entry here in the later UI slice.                                  |
| `/dashboard/client/overview` + `ClientDashboardHome`                 | canonical                       | Verified through the dashboard route table and JSX chain above. Its current Help entry is not a working support destination. |
| `/dashboard/coach-assistant`                                         | canonical                       | Verified route table entry. Swan Coach may initiate reporting, but support must remain a distinct domain workflow.           |
| `/contact` + `contactRoutes.mjs`                                     | canonical, limited-purpose      | Existing public contact path. Do not repurpose it as the authenticated enterprise issue system.                              |
| `frontend/src/components/UserDashboard/components/ErrorBoundary.tsx` | legacy/orphaned candidate       | Search found only its test consumer, not a canonical runtime mount. No cleanup is authorized in this slice.                  |
| `backend/routes/notificationsRoutes.mjs`                             | dormant/legacy candidate        | No verified import or mount. The singular `notificationRoutes.mjs` is mounted. No cleanup is authorized.                     |
| `backend/middleware/p0Monitoring.mjs` correlation middleware         | dormant                         | It contains correlation logic but no verified application mount. The support plan cannot claim an existing correlation ID.   |
| Report Room UI/API/models                                            | planned/unimplemented blueprint | No route, consumer, API, or authoritative model exists on this baseline.                                                     |

## 5. Backend Route Ownership and Shadow Audit

Relevant mount order in `backend/core/routes.mjs`:

1. `/api/notifications` mounts `notificationRoutes.mjs` at line 346.
2. `/api/ai-chat/stream-spike` mounts before `/api/ai-chat` at lines 651-652.
3. The generic `/api` router mounts at line 767.

`backend/routes/api.mjs:36` mounts the same singular notification router again at `/notifications`. Therefore `/api/notifications` is reachable through two mount chains. This duplication is pre-existing and outside the support feature slice; the implementation must use one documented canonical notification path and must not add a third mount.

No issue route currently overlaps the proposed path. The future owner inbox should mount an exact `/api/admin/issues` router before generic `/api/admin` or `/api` mounts, with route-level authorization verified in tests.

## 6. Existing Voice Transcription Receipt

The current caller is `useGeminiTranscription.ts:56`, which posts to `/api/ai-chat/transcribe`.

The backend path is owned by `backend/routes/aiChatRoutes.mjs`:

- `router.use(protect)` applies authentication at line 305.
- `/transcribe` is declared at lines 987-1021 with `aiRateLimiter` and in-memory Multer upload handling.
- The route accepts up to 25 MB, while `backend/services/ai/voiceTranscriptionService.mjs:16,104-105` rejects above 20 MB.
- The service uses Gemini Developer API `generateContent` with inline base64 audio at lines 108-149.
- Route and service rate limits are process-local memory counters. Failed provider calls consume the transcription counter because the increment occurs before the provider call.
- The existing path is not subscription-gated, but it is coupled to Swan Coach rate limits and lacks the planned daily support quota.
- The service does not persist audio; it logs filename, model, size, and token counts rather than transcript text.

This endpoint is not approved for reuse as universal support transcription.

## 7. Provider and Minor-Safety Gate

SwanStudios contains guardian-consent and minor-user workflows, including `backend/migrations/20260104000006-create-user-consents-table.mjs`. The support entry is intended to be broadly accessible, so its voice provider must support that population.

Current Gemini Developer API terms say API clients may not be directed to, or likely accessed by, people under 18. They also distinguish unpaid-service data handling from paid-service handling. Paid use avoids product-improvement training, but default abuse monitoring and other retention controls still require configuration review.

Required amendment:

- Do not reuse the Gemini Developer API transcription service for the universal Report Room.
- Before voice implementation, select and verify a dedicated speech-to-text processor whose contract permits the intended age range.
- The leading repo-compatible candidate is Google Cloud Speech-to-Text with data logging disabled. Its official data-usage documentation says non-opted-in synchronous/streaming audio is processed in memory and not stored as customer data by the service.
- Keep provider data logging opt-out/default-off, disable product-improvement participation, document retention, and complete a privacy/terms receipt before wiring the route.
- Text reporting must remain fully usable if voice is unavailable or disallowed.

This is a product terms and privacy gate, not legal advice.

## 8. Owner Authorization, Notifications, and PII

- `backend/models/User.mjs:124-127` supports only `user`, `client`, `trainer`, and `admin`; there is no persisted `owner` or `super_admin` role.
- `backend/middleware/authMiddleware.mjs:436-450` allows any admin through `adminOnly`; that is broader than the requested Sean-only inbox.
- `backend/routes/adminEnterpriseRoutes.mjs:815-837` contains private, route-local environment-based super-admin logic, but it is not reusable middleware and includes a role value absent from the User enum.

Required amendment: Slice 1 must introduce a shared, tested, fail-closed owner-only authorization policy using configured owner identity rather than a hardcoded email or ID. The inbox API and admin route must both use it.

The singular notification system is active and can create admin notifications, but the contact route currently embeds raw contact content in a notification. The support implementation must not copy that pattern. Notifications and email may contain issue ID, severity, category, status, and a safe summary only; full transcript, description, contact data, and diagnostics remain behind owner authorization.

## 9. Error Capture and Correlation Amendment

Three canonical error boundaries exist at different scopes:

- App-level: `frontend/src/App.tsx:226-228` with `frontend/src/components/ui/ErrorBoundary.tsx:43-98`.
- Route-level: `frontend/src/routes/main-routes.tsx:320` with `frontend/src/routes/error-boundary.tsx:115-158`.
- User dashboard V3: `frontend/src/components/UserDashboard/UserDashboardStatusStatesV3.tsx:73-105`.

None exposes a verified support correlation ID. Slice 1 must create a server-issued issue/reference ID and a privacy-safe diagnostics contract. Later error-boundary integration may prefill that reference, but it must not serialize error stacks, full URLs, tokens, form values, or customer data into an LLM prompt or notification.

## 10. Approved-Plan Amendments Required Before Slice 1

1. Replace “reuse the existing Gemini transcription endpoint” with “build a dedicated support transcription adapter after an age-range, retention, logging, and data-use receipt.”
2. Treat Google Cloud Speech-to-Text with data logging disabled as the leading candidate, not as selected until credentials, billing, regional behavior, and contract settings are verified.
3. Add shared owner-only middleware and tests; do not use `adminOnly` for full issue access.
4. Create correlation/reference IDs within the issue domain; do not assume dormant monitoring middleware is live.
5. Preserve the existing notification system but emit metadata-only alerts and avoid the duplicate mount chain.
6. Keep text reporting first-class and available when microphone permission, provider eligibility, quota, network, or transcription fails.
7. Reconcile this branch with the active prelaunch audit before implementation touches auth, AI chat, notifications, or dashboard route files.

## 11. Design Router Pretask Receipt

- **Direction:** The Report Room — a calm, premium support chamber, not a generic feedback modal.
- **User route archetype:** C12 operator/reporting panel with C10 information dividers; trust and calm are the intended emotional sequence.
- **Owner inbox archetype:** Dense but legible C12 operator panel with explicit severity, status, ownership, and AI-ready prompt actions.
- **Signature decision:** Voice narration visibly resolves into three structured panes: What happened, What was expected, and Impact.
- **Primary action:** Start speaking; manual typing is the always-available secondary path.
- **Scroll ownership:** Page owns scroll on mobile; desktop detail panels may own one named internal scroll region only when the inbox is split view.
- **Mobile collision rule:** Recorder, stop, review, and submit actions stack with 44 px minimum targets and no hover dependency.
- **Desktop scaling:** QHD and 4K layouts use meaningful workspace width rather than a tiny centered form.
- **Implementation constraints:** styled-components, Crystalline Swan tokens, dark-first fallbacks, reduced-motion support, no MUI, no Tailwind, no new visual asset dependency.
- **External reference gate:** `[MOBBIN UNAVAILABLE]` on this Codex surface; the approved Fable direction and Swan design sources remain authoritative.

## 12. Slice 0 Decision

The product concept remains viable, but the original provider-reuse and existing-correlation assumptions are disproven on the committed baseline. Product implementation is paused for Sean's review of section 10. After approval and lane reconciliation, the next authorized work is Slice 1: issue-domain schema, owner-only authorization, privacy-safe diagnostics, API contracts, and targeted tests—without voice or UI scope creep.
