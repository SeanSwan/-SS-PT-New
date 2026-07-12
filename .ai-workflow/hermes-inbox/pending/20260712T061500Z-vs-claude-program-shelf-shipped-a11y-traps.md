---
surface: vs-claude
utc: 20260712T061500Z
topic: Client Program Shelf + full-plan modal SHIPPED to main; two silent a11y traps worth remembering; main has one pre-existing red line-cap test
tags: [client-dashboard, workout-plans, accessibility, swan-coach, repo-health]
---

## What I did / learned
- **SHIPPED (main `003c67fa8`):** the client's home page now ALWAYS shows their active plan (hero card: Week N of M, progress bar, next exercise) with their other plans on a sideways shelf; tapping any plan opens the FULL program (every week -> day -> exercise) with "You are here" on the current week and "Today" on the current day. Before this, **no surface in the app rendered a structured plan at all** — a member could only see a PDF.
- **Doctrine is now enforced by CI, not convention:** tests assert the client UI exposes NO activate/switch/edit affordance. If a future agent "helpfully" adds client self-service over programming, the build fails. Status pills are read-outs; footer copy reads "Your coach sets your plan."
- **A11Y TRAP #1 (silent, cost me a test):** putting `role="listitem"` on a `<button>` **overrides the implicit button role** — assistive tech stops announcing it as actionable, and `getByRole('button')` stops finding it. If a shelf/carousel of tappable cards is needed, they are **buttons**, not list items.
- **A11Y TRAP #2 (silent, broke an UNRELATED test):** `role="status"` on a *persistent* empty-state card registers a **page-wide aria-live region**. It broke `ClientObservatoryHome`'s XP-truth guard (which asserts no status role appears after a malformed quick-post). `role="status"` is for content that **updates and should be announced** — static empty-state content already sits in the reading order and must NOT claim it.
- **Repo health:** `main` currently has ONE red frontend test that is **not mine** — `UniversalDashboardLayout.styles.ts` is **301 lines vs a 300-line cap** (`UniversalDashboardLayout.retryContract.test.ts`). I deliberately did **not** shave two lines: the cap exists to force extraction (Rule 4), and shaving it would be gaming a quality gate. Proper fix = a small extraction slice; the file may be owned by another agent (Rule 67).

## Why it matters to Hermes
- Hermes can now truthfully tell Sean (or a client-facing surface) that **a member can see their whole program in-app** — that was false until today.
- Both a11y traps are the kind that pass review and silently degrade the product; Hermes should flag them if it ever sees `role="listitem"` on a button or `role="status"` on static content.
- Hermes should NOT claim `main` is fully green — one pre-existing line-cap failure stands, by choice, awaiting Sean.

## State right now
- Client plan visibility: **DONE and live**. Backend client-scoped full-plan read (with IDOR ownership-in-query + 404-not-403) also live.
- **Remaining gap in the vision:** Swan Coach still has **NO update/edit-plan command** (create + delete only). Any edit capability must be **approval-gated** (Coach proposes a diff -> trainer approves -> applies); the client-side Coach stays propose-only. This is the next slice and it needs a real design conversation with Sean, not a guess.
- Frontend baseline: 5882/5883 tests pass (the 1 failure is the pre-existing line-cap above); `tsc` 0 errors repo-wide.

## Sean owes / blockers (if any)
- **Decision:** (a) do the `UniversalDashboardLayout.styles.ts` extraction to green the line-cap test, or (b) start Swan Coach approval-gated plan editing.
- **Open product question (unanswered, deliberately not decided for him):** the home still shows BOTH the new Program Shelf and the older "Today's Assignment" card — they overlap on "today". Sean should say whether the shelf absorbs it or both stay.
- **Hardware (closed but worth remembering):** the ghost-typing was his **Corsair keyboard** (stuck/repeating paste replaying the clipboard), not any AI agent. Fix lives in iCUE key assignments **and the onboard/hardware profile**.
