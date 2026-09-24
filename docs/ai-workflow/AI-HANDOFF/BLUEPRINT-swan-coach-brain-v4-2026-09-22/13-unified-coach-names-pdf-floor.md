---
decision: Swan Coach is one surface with three one-click views — Chat, Today, Floor — sharing one conversation and one composer; names show on screen while the coach sees IDs; "make me a PDF" and Floor saves are built on the device.
status: open
supersedes: none (extends 10-local-first-hive-brain.md and 12-astra-hostile-repair-20260923.md)
---

# 13 — Unified Swan Coach: names on screen, PDFs from chat, Today and Floor

**Date:** 2026-09-23, repaired 2026-09-24 · **Author:** Claude (Cowork, Opus 5.5) · **Branch:** `claude/coach-unified-20260923` = Codex's `codex/coach-v4-hostile-20260923@84d478c8e` + the commits below (cloud mirror `coach/v4-on-codex`):

| Commit | What |
|---|---|
| `76390f9` | Names on screen, client IDs to the coach (the missing display half of PRIVACY-PROXY.md) |
| `30aa0b7` | "Make me a PDF" from the coach chat, built on this device |
| `32e154e` | Unified workspace: Chat · Today · Floor, Crystalline chat, Waiting on you |
| `78f9531` | Independent hostile-review round (1 HIGH, 5 MED, 6 LOW) fixed |
| (2026-09-24) | **Astra review repairs** — F1–F6 + a second hostile round (1 HIGH, 7 MED, 3 LOW) + the booked-session local-day backend fix (§7) |

**Deployed:** No. The live site still serves `main@53f93854b`; nothing here reaches it until a PR merges.
**Design source:** canvas "Swan Coach Command Center v4" (claude.ai artifact `FPNdYS6Vza4MALUhaSdL2k`), row "Unified — the one Swan Coach" (Chat, Today, Floor; desktop and phone).

## 1. Sean's decisions (2026-09-23)

1. **Names:** "Names on screen, AI stays blind." Typing "what's Jesse's workout" must work; the screen reads names; no model ever receives a name.
2. **Design:** merge v4 (one conversation, one composer, approvals inline) + Crystalline Cockpit (the queue) + Crystalline Conversation (the chat look — "harden and emphasise") + Day Sheet, into one design worn in the header theme. Floor mode is a **one-click toggle** and keeps the "Session so far" side panel.
3. **PDFs:** the chat must be able to produce a PDF of a client's plan and progress from everything the app holds.
4. **Review workflow (2026-09-23, recorded by Astra):** the reviewer is **Astra or Opus 5.5**. Kimi is no longer the main workflow or a required gate; earlier "pending Kimi" wording is history, not a blocker.

## 2. What exists now (trailhead, not destination)

| Capability | Where | Truth notes |
|---|---|---|
| Names joined back on screen | `coach-assistant/coachClientNames.tsx`; used by `CoachCommandLogEntry`, `TurnEntry` notices, the live region | Coach replies and notices render names. **Result and proposal cards still show the raw "Client #id" text** (the 76390f9 message said "cards" — that overstated it). Read-aloud and the logger hand-off keep the ID-only text. |
| PDF from chat | `coachPdfRequest.ts`, `CoachProgressPdf.tsx`, composer intercept, `/pdf` | Builds the existing branded **progress report** (15 canonical chart sections: frequency, attendance, volume, sets/reps, duration, effort, PRs, anchor lifts, exercise frequency, movement/muscle balance, recovery/pain signals, weight, body fat, est. 1RM) with the existing Swan jsPDF kit and Approval Vault. **Not yet in the PDF:** the written plan itself, coach notes, pain-entry history detail. Ambiguous names are refused. |
| View switch | `WorkspaceHeader.tsx` | Chat · Today · Floor; icon-only on 368–767 px (single header row), its own row below 368 px. |
| Today (Day Sheet) | `TodayView.tsx`, `TodayStrip.tsx` | Reads the Universal Master Schedule (`useTodaySchedule`) and the session's plan (`useSessionPlannedWorkout`). Floor/PDF buttons only for roster clients. Morning brief sends `brief_my_day` only if the catalog carries it. The strip is hidden on phones. |
| Floor | `FloorView.tsx` → `FloorLive.tsx` (keyed by client id), `useFloorSession.ts`, `floorSession.ts`, `floorSave.ts` | Opens only for the client the chat's admission **accepted** (checking/refused → nothing stored is shown). Plan seeds exercises; sets stay on the device until **End session**, which saves once via the Workout Logger's own `buildWorkoutFormSubmitBody` + `dailyWorkoutFormService`. Started from Today, the save carries that booking's `scheduledSessionId` (its credit rules, marked complete); a plan-seeded session carries today's assignment only when the logger's helpers prove it is still today's loggable week/day, else the saved message discloses the mismatch. One save per client at a time (survives a view switch); sets added mid-save are kept. Kilograms convert to the pound dials and say so. **No per-set notes, RPE, pain level, or supersets yet** — the logger remains the full editor. |
| Waiting on you | `ThreadSidebar.tsx` | Intake / audio / drafts counts + queue holds from `useCoachIntakeQueue`; the inspector no longer repeats it. |
| Client at a glance | `ClientGlanceCard.tsx` (inspector, when pinned) | Last workout (`/api/workouts/:id/history`) and active pain flags (`/api/pain-entries/:id/active`); failed reads say so. |

## 3. Privacy (Rule 8) — how each new path stays blind

- The server still swaps typed names for `Client #<id>` before any model call and keeps replies ID-only (`accessibleClientIdentityPrivacy.mjs`, `aiChatRoutes`). The browser only joins names back **for display**.
- A PDF request and a Floor set are intercepted in `WorkspaceComposer` **before** `handleSubmit`: neither text nor the name in it is sent to Swan Coach (e2e: zero `/api/ai-chat/.../messages` calls).
- The PDF is built in the browser from first-party chart reads; the name on it comes from the viewer's RBAC'd roster.
- Floor saves go to the first-party workout log, not to any model.

## 4. Evidence — first build (2026-09-23; superseded by §7.3 for the current state)

- Unit: `coach-workspace` + `coach-assistant` + `hooks` + `progress-proof` + `services/pdf` → **1933/1933**. Every new guard was mutation-checked (the test fails with the guard removed).
- E2E (dev server, mocked APIs): **30 passed** — workspace smoke, client spec, the new `coach-workspace-unified.spec.ts` (Today → Floor → one save; no sideways scroll and 44 px targets on Today/Floor at 320/360/375/414/768/1440/2560; chat header controls on screen). The 2 legacy `?coachLegacy=1` phone transcript-share checks fail identically without these commits (also recorded in `11`).
- Scoped `tsc -p frontend/tsconfig.ws.local.json` exit 0. **Full-repo tsc not run** (OOM in the sandbox) — run on Windows before merge.
- Baseline failures outside this scope (identical with and without these commits): `Shared/AICommandBar.retirement` and 3 `WorkoutLogger` files (17 tests) — the cloud repo is a subset snapshot.
- Test delta (Rule 81): one re-anchor — the Floor conflict message now appends what happened to the sets. One e2e fixture re-anchor — the header-control count treats the view switch as one control (it is one segmented control; the budget otherwise stayed ≤ 5).

## 5. Residual risks (current, after the 2026-09-24 repairs)

1. Result and proposal cards still print `Client #id` (display mapping not yet applied inside those cards).
2. Floor shows only the latest coach turn; an approval card behind a newer reply is only reachable from Chat.
3. Floor has no per-set RPE/pain/notes. The backend keeps one workout per client per day, so sets logged after a same-day save must be added in the logger (Floor says so and links it).
4. The PDF covers progress charts, not the written plan document (`ProtectedPlanPdfDialog` exists separately).
5. Deep links to `?view=today|floor` are not supported yet.
6. PDF names that are all lowercase **and** unknown ("for olivia") still fall back to the pinned client (the preview names the person before download). A verb-only mention ("Send Olivia Patel her PDF") is not detected as a subject.
7. A re-check of the same client's access while Floor is open remounts it: stored sets survive, the unsaved dial value does not.
8. The S83 backend dependency (vs-claude lane) still blocks merging to main. Real PostgreSQL billing/completion, live provider privacy and production behaviour remain **unproven** (mocked APIs only).
9. Pre-existing, not caused here (each reproduced with this work stashed): the `?coachLegacy=1` phone transcript-share checks (2), the refused-"No client" e2e flake (2/10 at base — a stored pin sometimes clears despite a refused admission; plan-55/61 lane), `CoachCommandCenterVoiceLifecycle` and `CoachActionProposalCard.publication` load-timing flakes, and three backend snapshot tests (`historyBackfill` ×2, `phase1cXpIntegration` ×1) plus `workoutPrDetection` ×1.

## 6. Next slice

**PR the branch** for Sean's review (Astra or Opus 5.5 as reviewer). Then: names inside result/proposal cards; plan + coach notes in the chat PDF; `?view=` deep links; Floor per-set RPE/pain; the refused-clear pin race (with the plan-55/61 owner).

## 7. Astra review round (2026-09-24)

Review: `Z:/HostileReviews/2026-09-23-222640-swan-coach-unified-astra-review-for-opus-5-5.md` (DEFECTS-FOUND, 3H/3M/1L) on `9ac7f0369`. Astra's probes were copied byte-identical (sha256 checked) and kept as regression tests: `Floor.review.test.tsx`, `Unified.review.test.tsx`, `e2e/coach-review-adversarial.spec.ts`. Local RED matched Astra's exactly (6 failing + 1 control passing).

### 7.1 Astra findings → repairs

| # | Finding | Repair |
|---|---|---|
| F1 H | Floor dropped booking/plan identity → wrong billing, no completion | Today passes a `FloorLink` (scheduled/booked/confirmed only); stored with the sets; `floorSave.ts` sends `scheduledSessionId` + the booking's date, and today's plan assignment only when the logger's helpers prove it (week/day match); unreadable plan → nothing saved. Billing rule stated before the tap; the logger's receipt after. |
| F2 H | 403 still showed cached Floor sets + End session | `floorAccess()`: FloorLive mounts only when `selectionPhase==='ready'` and the accepted target is this client; checking/refused screens show nothing stored. |
| F3 H | Sets added during a pending save were deleted | Module in-flight registry (synchronous guard, survives remounts); success removes only the submitted sets; Undo frozen while saving; a new set never resets "saving"; 30 s abort and 5xx/network → "may still have landed". |
| F4 M | PDF subject fell back to the pin | `pdfSubject()` → client / ambiguous / multiple / unknown / none; pin only for none. |
| F5 M | kg recorded as lb | Units parsed; kg converted (nearest ½ lb) and announced; an unattached kg word is refused. |
| F6 M | Today didn't advance with time | `useNowClock` (minute boundaries + wake) in Today and the strip; the schedule hook re-reads at local midnight. |
| F7 L | Old archive verdict invalid | Not rewritten (Astra: preserve history); this round publishes a valid successor record. |

### 7.2 Second hostile round (fresh-context reviewer, then verified here)

1 HIGH, 7 MED, 3 LOW; every one verified against code before acting. **HIGH:** the workout-form route filed a booked session under its **UTC** day, then refused it as "in the future" of the client's local day — every booking from ~5 PM Pacific was un-loggable against its booking (the Workout Logger's own flow too). Fixed in `routes/dailyWorkoutFormRoutes.mjs` and the Swan Coach command path `services/workout/aiWorkoutScheduledSessionService.mjs` (sibling sweep): the booking's local day in the client's zone. MED/LOW fixed: same-day booking attaches to unbooked sets; stale/used links never return (Floor consumes the page's link; other-day links ignored); billing copy no longer promises a homework exemption; plan-cursor mismatch disclosed; PDF false positives on ordinary words ("for june", "and mark"), possessive/"on"/"to" unknown names, "Maria Smith", acronyms and month abbreviations; midnight re-read moved into the schedule hook; truthful "after the save" copy (one workout per day); an off-screen save outcome is shown on return; 4xx vs unknown outcomes. Also found in e2e: the chat header clipped "More coach tools" in the 1024–1199 px band (docked sidebar) and at 768 px while "Connecting" — the bar now measures its own width (`useCompactWidth`).

### 7.3 Evidence (current session, 2026-09-24)

- Frontend unit (coach-workspace, coach-assistant, hooks, progress-proof, services/pdf; 2 workers): **1985/1986** — the one failure is the VoiceLifecycle load flake, identical with this work stashed.
- Scoped `tsc` exit 0 (full-frontend tsc was already run green by Astra on Windows at `9ac7f0369`; re-run on Windows before merge).
- Backend: workout-form route suites + the two new date tests + AI daily-form suites **81/81**; the new tests were RED before the fix.
- E2E (mocked APIs): **36 passed**; failures are the 2 legacy phone checks and the refused-clear flake (all pre-existing). Astra's mounted denied-access probe passes. New: header fits its longest status at 768/1024/1100/1150/1199/1280.
- Mutation checks: 15 (Astra F1–F6) + 13 (second round) + 1 (header) — each guard removed turns a test red.

### 7.4 Test delta (Rule 81)

| File | Before | After | Class | Why the new assertion is right |
|---|---|---|---|---|
| `FloorView.test.tsx` model | no admission fields | `selectionPhase:'ready'`, accepted = pinned client | RE-ANCHOR | Floor now requires the accepted admission (F2); the old model described an unadmitted client. |
| `TodayView.test.tsx:50` | `startFloor(12)` | `startFloor(12, {scheduledSessionId:'a', …})` | RE-ANCHOR | Today now hands the booking to Floor so the save completes it (F1). |
| `TodayView.test.tsx` midnight | expected `schedule.refresh` from TodayView | expects only the picked slot to clear | RE-ANCHOR | The re-read moved into the schedule hook (tested in `useTodaySchedule.test.ts`). |
| `tests/api/dailyWorkoutFormRoutesSecurity.test.mjs:137` | pinned `new Date(sessionDate).toISOString().split('T')[0]` | pins `formatDateOnlyInTimeZone(…, trainingDateContext.timeZone)` + `not.toContain` the UTC form | RE-ANCHOR (Rule 79) | The pinned expression was the bug; behaviour is locked by the new route test. |

No SILENCE rows. Everything else is net-new coverage.
