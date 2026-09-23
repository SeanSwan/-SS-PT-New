---
decision: Swan Coach is one surface with three one-click views — Chat, Today, Floor — sharing one conversation and one composer; names show on screen while the coach sees IDs; "make me a PDF" and Floor saves are built on the device.
status: open
supersedes: none (extends 10-local-first-hive-brain.md and 12-astra-hostile-repair-20260923.md)
---

# 13 — Unified Swan Coach: names on screen, PDFs from chat, Today and Floor

**Date:** 2026-09-23 · **Author:** Claude (Cowork) · **Branch (cloud):** `coach/v4-on-codex` = Codex's `codex/coach-v4-hostile-20260923@84d478c8e` + 4 commits:

| Commit | What |
|---|---|
| `76390f9` | Names on screen, client IDs to the coach (the missing display half of PRIVACY-PROXY.md) |
| `30aa0b7` | "Make me a PDF" from the coach chat, built on this device |
| `32e154e` | Unified workspace: Chat · Today · Floor, Crystalline chat, Waiting on you |
| `78f9531` | Independent hostile-review round (1 HIGH, 5 MED, 6 LOW) fixed |

**Deployed:** No. The live site still serves `main@53f93854b`; nothing here reaches it until a PR merges.
**Design source:** canvas "Swan Coach Command Center v4" (claude.ai artifact `FPNdYS6Vza4MALUhaSdL2k`), row "Unified — the one Swan Coach" (Chat, Today, Floor; desktop and phone).

## 1. Sean's decisions (2026-09-23)

1. **Names:** "Names on screen, AI stays blind." Typing "what's Jesse's workout" must work; the screen reads names; no model ever receives a name.
2. **Design:** merge v4 (one conversation, one composer, approvals inline) + Crystalline Cockpit (the queue) + Crystalline Conversation (the chat look — "harden and emphasise") + Day Sheet, into one design worn in the header theme. Floor mode is a **one-click toggle** and keeps the "Session so far" side panel.
3. **PDFs:** the chat must be able to produce a PDF of a client's plan and progress from everything the app holds.

## 2. What exists now (trailhead, not destination)

| Capability | Where | Truth notes |
|---|---|---|
| Names joined back on screen | `coach-assistant/coachClientNames.tsx`; used by `CoachCommandLogEntry`, `TurnEntry` notices, the live region | Coach replies and notices render names. **Result and proposal cards still show the raw "Client #id" text** (the 76390f9 message said "cards" — that overstated it). Read-aloud and the logger hand-off keep the ID-only text. |
| PDF from chat | `coachPdfRequest.ts`, `CoachProgressPdf.tsx`, composer intercept, `/pdf` | Builds the existing branded **progress report** (15 canonical chart sections: frequency, attendance, volume, sets/reps, duration, effort, PRs, anchor lifts, exercise frequency, movement/muscle balance, recovery/pain signals, weight, body fat, est. 1RM) with the existing Swan jsPDF kit and Approval Vault. **Not yet in the PDF:** the written plan itself, coach notes, pain-entry history detail. Ambiguous names are refused. |
| View switch | `WorkspaceHeader.tsx` | Chat · Today · Floor; icon-only on 368–767 px (single header row), its own row below 368 px. |
| Today (Day Sheet) | `TodayView.tsx`, `TodayStrip.tsx` | Reads the Universal Master Schedule (`useTodaySchedule`) and the session's plan (`useSessionPlannedWorkout`). Floor/PDF buttons only for roster clients. Morning brief sends `brief_my_day` only if the catalog carries it. The strip is hidden on phones. |
| Floor | `FloorView.tsx` → `FloorLive.tsx` (keyed by client id), `useFloorSession.ts`, `floorSession.ts` | Plan seeds exercises; sets stay on the device until **End session**, which saves once via the Workout Logger's own `buildWorkoutFormSubmitBody` + `dailyWorkoutFormService` (POST `/api/workout-forms`). A message that is only a set fills the dials. **No per-set notes, RPE, pain level, or supersets yet** — the logger remains the full editor. |
| Waiting on you | `ThreadSidebar.tsx` | Intake / audio / drafts counts + queue holds from `useCoachIntakeQueue`; the inspector no longer repeats it. |
| Client at a glance | `ClientGlanceCard.tsx` (inspector, when pinned) | Last workout (`/api/workouts/:id/history`) and active pain flags (`/api/pain-entries/:id/active`); failed reads say so. |

## 3. Privacy (Rule 8) — how each new path stays blind

- The server still swaps typed names for `Client #<id>` before any model call and keeps replies ID-only (`accessibleClientIdentityPrivacy.mjs`, `aiChatRoutes`). The browser only joins names back **for display**.
- A PDF request and a Floor set are intercepted in `WorkspaceComposer` **before** `handleSubmit`: neither text nor the name in it is sent to Swan Coach (e2e: zero `/api/ai-chat/.../messages` calls).
- The PDF is built in the browser from first-party chart reads; the name on it comes from the viewer's RBAC'd roster.
- Floor saves go to the first-party workout log, not to any model.

## 4. Evidence (current session)

- Unit: `coach-workspace` + `coach-assistant` + `hooks` + `progress-proof` + `services/pdf` → **1933/1933**. Every new guard was mutation-checked (the test fails with the guard removed).
- E2E (dev server, mocked APIs): **30 passed** — workspace smoke, client spec, the new `coach-workspace-unified.spec.ts` (Today → Floor → one save; no sideways scroll and 44 px targets on Today/Floor at 320/360/375/414/768/1440/2560; chat header controls on screen). The 2 legacy `?coachLegacy=1` phone transcript-share checks fail identically without these commits (also recorded in `11`).
- Scoped `tsc -p frontend/tsconfig.ws.local.json` exit 0. **Full-repo tsc not run** (OOM in the sandbox) — run on Windows before merge.
- Baseline failures outside this scope (identical with and without these commits): `Shared/AICommandBar.retirement` and 3 `WorkoutLogger` files (17 tests) — the cloud repo is a subset snapshot.
- Test delta (Rule 81): one re-anchor — the Floor conflict message now appends what happened to the sets. One e2e fixture re-anchor — the header-control count treats the view switch as one control (it is one segmented control; the budget otherwise stayed ≤ 5).

## 5. Residual risks

1. Result and proposal cards still print `Client #id` (display mapping not yet applied inside those cards).
2. Floor shows only the latest coach turn; an approval card that scrolls behind a newer reply is only reachable from Chat.
3. Floor has no per-set RPE/pain/notes; a day that already has a saved workout returns a conflict — the sets stay on the device and the coach opens the logger to merge.
4. The PDF covers progress charts, not the written plan document (`ProtectedPlanPdfDialog` exists separately).
5. Deep links to `?view=today|floor` are not supported yet.
6. The S83 backend dependency (owned by the vs-claude lane) still blocks merging the v4 branch to main — unchanged by this work.

## 6. Next slice

**PR the branch** (Codex's `84d478c8e` + these 4 commits) for Sean's review, with the Kimi K3 gate (Rule 46). Then: names inside result/proposal cards; plan + coach notes in the chat PDF; `?view=` deep links; Floor per-set RPE/pain.
