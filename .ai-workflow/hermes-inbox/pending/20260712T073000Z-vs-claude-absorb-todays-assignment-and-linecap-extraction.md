---
surface: vs-claude
utc: 20260712T073000Z
topic: TodaysAssignmentCard absorbed into the Program Shelf (one surface, zero facts lost); dashboard line-cap fixed by EXTRACTION not shaving; two self-caught routing/visibility bugs
tags: [client-dashboard, workout-plans, repo-health, product-doctrine]
---

## What I did / learned
- **SHIPPED (main `5fe6e9cff`):** retired `TodaysAssignmentCard` and absorbed ALL of its truth into the Program Shelf's today-strip (kicker, session title, plan/week/day meta, next exercise, exercise count, the save-after-training / logged-today proof cue, and its smart CTA). The client home had **two cards both narrating "today"** — Sean's ruling: *"no unnecessary clutter."* One surface now, **no facts lost**.
- **SELF-CAUGHT BUG #1 (would have shipped silently):** my shelf's "Log today" hardcoded `?loadPlan=today` and **dropped `assignmentKey` + `assignmentType`** — the member could have tapped Log and been served the WRONG session. The strip now uses the assignment's **own resolved `actionPath`**, which additionally routes a *completed* session to history (instead of allowing a double-log) and a *non-loggable trainer session* to the schedule. **Rule of thumb: never hand-roll a route that a view-model already resolves.**
- **SELF-CAUGHT BUG #2:** I first nested the today-strip **inside** the plan hero card — so a member with a live assignment but an empty plan-vault slot would have watched today's session **vanish entirely** (worse than the clutter being removed). Today's session is its own fact and must render independently of plan state.
- **LINE CAP — fixed the honest way:** `UniversalDashboardLayout.styles.ts` was **301 lines vs a 300 cap** (pre-existing, not from this workstream). I deliberately **did NOT shave two lines** — the cap exists to force *extraction* (Rule 4), and shaving it games the very gate it enforces. Extracted the loading+error chrome to `UniversalDashboardLayout.stateStyles.ts` (self-contained; depends only on `styled` + `motion`), parent **re-exports** it so **no consumer import changed**. Parent: 301 -> 227 lines. Cap test green.
- **Test-preservation technique worth reusing:** when retiring a card whose tests are genuine *truth-guards*, keep its `data-testid` on the **absorbing** surface. The existing guards then keep protecting the new surface instead of being deleted along with the old one.

## Why it matters to Hermes
- Hermes should apply the **absorb-don't-just-delete** rule: when consolidating duplicate surfaces, the merged surface must carry **every fact** the retired one carried, or the "declutter" is really a data loss.
- Hermes should **never** propose shaving lines to pass a size-cap test — the correct response to a line-cap failure is extraction. Flag any agent that suggests otherwise.
- The `actionPath` lesson generalises: routes resolved by a view-model (with query params like assignmentKey/assignmentType) must not be re-derived by hand at the call site.

## State right now
- Client plan visibility: **complete and live**. Home shows the active program (Week N of M + progress) with the other plans on a shelf; tapping any plan opens the full program (every week/day/exercise, "You are here"). One today-strip carries today's session + done-state + the correct CTA.
- Verification: 479/479 across client-dashboard + UserDashboard; `tsc` **0 errors repo-wide**; full frontend suite 5885/5886 — the single failure is an **unrelated `EquipmentManager` full-suite contention flake** (passes in isolation both with these changes and at base), NOT a regression.
- **Remaining gap in the vision:** Swan Coach can SEE a plan but still has **NO update/edit-plan command** (create + delete only). Must be **approval-gated** (Coach proposes a diff -> trainer approves -> applies); the client-side Coach stays propose-only. Needs a real design conversation with Sean (the approval UX is a product decision), not a guess.

## Sean owes / blockers (if any)
- **Next slice (his call):** Swan Coach approval-gated plan editing — the last piece of the plan vision.
- Nothing else blocking; both open decisions from the previous turn are now closed (absorb + line-cap).
