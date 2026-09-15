# Bucket-1: browser-verified a11y slice — Sprint Planner (lane C batch)

Date: 2026-09-13 (session). Order: "go — next slice: bucket 1".
Worktree: `tmp/worktrees/rolodex-bootcamp-planner-20260913` · branch `codex/rolodex-bootcamp-planner-20260913`
Base: `c0cbe538d…` — **still no commit**; layered on receipts 19–22. The severe-pain 422 gate was
not touched (H07 remains Sean's call), per the slice contract.

## Defects fixed (each proven in a real browser before/after)

### A1 — sprint cards and slot pills were `role="button"` divs

`SprintPlannerPage.tsx` rendered `SprintCard`/`SlotPill` as divs with `role="button"`, `tabIndex=0`
and a hand-rolled `activateOnKeyboard` Enter/Space shim. Both are now native `<button type="button">`
(`CardButton` styled base added with the Card visuals + UA-chrome resets + `:focus-visible` ring;
`SlotPill` converted in place). The shim and the per-card keyboard/role/tabIndex props are deleted —
native semantics replace them. Proof: `sprint-planner-a11y.spec.ts` asserts `tagName === 'BUTTON'`
for every card and pill via `getByRole('button', …)` and evaluates the elements directly.

Scope note: the assertion is per-element ON PURPOSE — the dashboard SHELL around the page still
contains its own `role="button"` divs; those are outside this slice (nav shell, separate lane).

### A2 — day/focus toggles and view tabs lacked `aria-pressed`

`Tab` (timeline/calendar) and `SprintToggleButton` (Class Days / Focus Rotation in the create modal)
are toggle buttons with no pressed state. Both now carry `aria-pressed`, asserted with real flip
semantics in the spec (the modal pre-selects Mon/Wed/Fri, so the test reads the initial state and
asserts the CLICK INVERTS it — it does).

### A3 — 36px toggle targets

`SprintToggleButton` was `min-height: 36px`. Now 44px (rule 2). Browser-measured at 414×896 and
desktop: cards, pills, tabs and toggles all ≥ 44px (`boundingBox()` assertions in the spec).
Note: lane C's "unstyled retry targets" half-finding is STALE — `BootcampVoiceProposalTray`'s Retry
button extends an `Action` base that already carries 44px + focus-visible + disabled styles.

### A4 — slot-dialog focus steal

`SlotDetailPanel`'s open effect ran on `[onClose]` deps; the parent passes a fresh inline arrow per
render, so EVERY parent re-render re-focused the panel container — yanking focus mid-typing. Fixed:
focus once on mount, `onClose` read through a ref, deps `[]`. Locked by
`SlotDetailPanel.focus.test.tsx` (RTL, real component + real focus): 3 tests — focus survives three
parent re-renders with fresh closures, the panel still focuses ONCE on open, Escape reaches the
LATEST onClose, and Tab trapping still reaches the controls. **Bites proven**: restoring the old
`[onClose]` deps makes the first test fail; fixed version passes.

### A5 — keyboard path + focus return (new browser coverage)

The spec adds end-to-end keyboard proof: focus a slot pill, press Enter → dialog opens; Escape →
dialog closes and **focus returns to the originating pill** (`toBeFocused()`), which also exercises
the panel's restore-focus cleanup in a real browser.

## How it was verified (real Playwright run, no mocks of the app)

- The REAL bundle served by vite (`:5197`), network stubbed at the route layer exactly like the
  existing protected-surface smokes (`/api/**` fulfilled; auth bootstrap mirrors the smoke spec's
  `token` + `tokenTimestamp` + `user` localStorage triple — the first run bounced to the login page
  because only `token` was set; fixed to match the real reader).
- Config: `playwright.config.ts` with `SWAN_PLAYWRIGHT_SKIP_WEBSERVER=1` (the config's own webServer
  would boot the REAL backend against production DB — deliberately bypassed; this scratch worktree
  must never touch it) and `BASE_URL=http://127.0.0.1:5197`.
- Result: **10 passed / 0 failed** across `Desktop Chrome` + `Mobile Chrome` (Pixel 5):
  native-button proof, aria-pressed tabs + flips, toggle 44px, phone-width 44px sweep (414px),
  keyboard open/focus-return. Traces/screenshots land under `frontend/test-results/` on failure only
  (none failed on the final run).
- Honest note: the "responsive matrix" here is two Chromium projects, not the 20-viewport XR matrix
  the coach lane uses; the coach-mobile config pins `testMatch` to its own spec, so extending the
  full matrix to this spec is a config PR away, not a code gap. The 44px and interaction proofs are
  real measurements at 414px — the binding constraint — in both layouts.

## Unit/type verification after the slice

- `SlotDetailPanel.focus.test.tsx`: 3/3 (and provably bites).
- hooks + SprintPlanner suite, BootcampBuilder suite, and `tsc --noEmit` at 16384MB: green
  (exact counts in the closeout; backend untouched this round).

## Deliberately not done here

- Dashboard-shell `role="button"` divs (different surface, own slice).
- Full 20-viewport XR matrix for the sprint route (config change + longer run; the binding checks
  pass at both extremes now).
- The severe-pain 422 gate: untouched, awaiting Sean's H07 decision.

## Label

BUCKET-1 SLICE VERIFIED IN REAL BROWSERS (Desktop + Mobile Chromium, 10/10) with the focus-steal
regression provably biting at the component boundary. NOT DRY (shell roles + full XR matrix remain,
both named), NOT DEPLOYED, no commit, no push, no production DB contact, no paid calls.
