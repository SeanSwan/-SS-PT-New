---
decision: v4 Coach Workspace is the one Swan Coach surface; three hostile-review rounds closed REVISE → APPROVE
status: open
supersedes: none
---

# 11 — v4 Coach Workspace: build + hostile-review log (2026-09-22 → 09-23)

**Branch:** `coach/brain-v4` (device clone head `abfd8a070`, 9 commits over the P0.4 merge `114de2c34`).
**Bundle:** `tmp/cowork-coach-audit-20260922/coach-brain-v4-r3.bundle` (verified against the SS-PT repo: requires `7ac64aa66` + `53f93854b`, both present).
**Reviewer:** second-seat hostile reviewer (Claude subagent), 3 rounds. Kimi K3 (Rule 46 gate) has **not** reviewed this yet.

## What shipped on the branch

| # | Commit (device) | What it does |
|---|---|---|
| 1 | `360e12731` | Staff can start a chat again: created-thread adopter + remount-safe admission (C2) |
| 2 | `644cdc2a6` | A refused send is never silent (send sequence tells refusal from supersession) |
| 3 | `fbf10d2aa` | Picked commands reach the command lane; history loads after admission |
| 4 | `62344705f` | **v4 Coach Workspace** — one surface, synced to Style Lens + Theme, Master Schedule in the inspector |
| 5 | `955ac60c7` | Review #1–#3: live thread list, second chat sends, staff land on a real new chat |
| 6 | `27b85de8c` | Review #4–#6, #8: truthful refusals, status line, schedule Ask scopes the right client, unpin works |
| 7 | `36c4b733e` | Review #7, #10–#15: real modal ops sheet, slash/IME keys, schedule follows the signed-in role, client-mode e2e |
| 8 | `729835ee9` | Round 2: a picked command never overrides the client you named; client switch clears the screen |
| 9 | `abfd8a070` | Round 3: status line reports what the admission granted; starters keep drafts; Safari IME guard |

Correction on record: commit 4's message says "coach-workspace 9 files / 45 tests"; the truth at that commit was **7 files / 28 tests**. Not amended (Rule 45).

## Review rounds

- **Round 1 — REVISE (blocking).** 15 findings. Biggest: the sidebar was dead (a legacy drawer effect made it `aria-hidden` + `inert`); every send after "New chat" was refused (the staff snapshot stayed bound to the adopted thread); staff auto-select highlighted a thread the admission refused to load, and the next send created a new thread under the other thread's title.
- **Round 2 — REVISE.** Most round-1 fixes held (the #2 release design survived A-B-A, re-admission races, remounts). New HIGH: the round-1 #11 "keep the picked type through a filled template" fix let a picked `commandType` override the client the operator typed — the backend skips its classifier and wrong-client check for a picked type (`backend/services/ai/commandExecutor.mjs` `stepClassify`). Also HIGH: a client switch left the previous client's conversation on screen.
- **Round 3 — APPROVE.** Remaining false-copy items (#1 refused clear said "cleared", #5 "Loading…" after a failed admission) and #2–#4 fixed in commit 9.

## Evidence (this session)

- vitest `coach-assistant` + `coach-workspace` + `hooks` + `context`: **1853/1853** (the `CoachActionProposalCard.publication` timing flake failed in 3 of 7 full runs this session and passes alone — not caused by this branch, but not proven pre-existing on a baseline full run).
- e2e (dev server, mocked APIs): `coach-workspace-smoke` + `coach-workspace-client` **19/19**. Legacy `coach-command-center-mobile-smoke`: unchanged from baseline (desktop passes; the same 2 phone transcript-share failures).
- Scoped `tsc` (`frontend/tsconfig.ws.local.json`, ~600 files) exit 0 with a positive control. **Full-repo `tsc` not run** — it OOMs in the 8 GB sandbox; run it on Windows before merge.
- Branch diff hash identical across the cloud repo and the device clone (sha256 of `git diff --full-index`).

## Residual risks (known, not fixed)

1. The same-actor cached thread list can stay on screen if the list genuinely becomes empty elsewhere (last thread deleted/archived in another tab).
2. A schedule Ask whose admission takes longer than 8 s drops its prompt without a message.
3. `useAIChat.lastSendReachedNetwork` is one ref per hook; a concurrent sender can overwrite it between a send and its caller's read.
4. Tab in the slash menu completes the command instead of leaving the composer (Escape leaves).
5. Fractional-zoom breakpoint alignment (#14) is reasoned and uses the same media queries in CSS and JS, but was never exercised at a fractional width.
6. `useAIChat.ts` is 1,410 lines and `CoachCommandCenterPage.shell.test.tsx` 310 — both over the 300-line rule before this work; not split here.

## Next slice

Kimi K3 hostile review of the bundle (Rule 46), then Sean opens the PR from `coach/brain-v4`; after merge, retire the legacy Command Center page behind `?coachLegacy=1` once one production week passes without a fallback visit.
