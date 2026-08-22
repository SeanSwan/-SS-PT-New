# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/USER-DASHBOARD-WAVE23-PANEL-PACKET-2026-08-21.md
**Seed:** (none)
**Tokens:** 4443 in / 3035 out | **Cost:** ~$0.0589 | **Wall:** 47.8s | **finish_reason:** stop

---

## VERDICT
REVISE — the 2d empty-state guard is self-defeating, the Wave-3 sidebar policy contradicts its own recorded rationale, and 2c's new admin/trainer destinations assert an `intent=log_workout` behaviour that is nowhere shown to exist.

## BLOCKERS

1. **P1 — 2d: `isFilteredView` can never be true in the state it exists for.** The guard is `activeFilter !== 'all' && activities.length > 0`. The empty state only renders when the (filtered) activity list is empty — i.e. when `activities.length === 0`. So in exactly the scenario being fixed (member has posts, selects "Workouts", zero matches), `activities.length > 0` is false, `isFilteredView` is false, and the user sees "No recent activity yet / Start a workout or create a post!" — the original lie, preserved. The condition must read from the *unfiltered* list (`allActivities.length > 0` or a `hasAnyActivity` boolean computed before filtering). Evidence: the diff as supplied; the fix is only correct if `activities` is the pre-filter array, in which case the empty state would never render at all — either way one of the two is broken. The claimed mutation-testing should have caught this; that it didn't means the guarding test asserts the copy, not the state transition.

2. **P1 — Wave 3: `shouldShowProfileSidebar` implements the opposite of its recorded rationale.** The file's own rationale: "A tab added later and never considered renders full width" (the safe failure mode). But the code returns `true` (sidebar shown, 300px rail applied) for any unknown string not in the exclusion Set — i.e. a future unconsidered tab gets the rail, which is the crush failure mode the rationale says they chose to avoid. Either the rationale is a lie or the default is inverted; as written, `shouldShowProfileSidebar('someFutureTab') === true`. The `null → false` vs `unknown string → true` asymmetry the author asked about is a symptom of the same inversion.

3. **P1 — 2c: `?intent=log_workout` is an asserted capability with no shown consumer.** `getLogWorkoutDashboardPath` sends admins to `/dashboard/admin/client-management?intent=log_workout` and trainers to `/dashboard/trainer/clients?intent=log_workout`. No code in the packet shows either page reading an `intent` param. If nothing consumes it, the renamed "Open Workout Logger" button is a *new* lie of exactly the Wave-1 kind: it names an action (log a workout) and delivers a navigation to a client list. This is the same class of bug as the pre-fix "Log This Style," one layer deeper.

4. **P2 — 2a: `setPosition` is returned but never defined in the shown source.** The hook returns `{ position, setPosition, containerRef, containerProps }` but only declares `setPositionState`. Either an alias was elided from the packet (then unverifiable) or the shipped file doesn't compile — but `tsc` passed, so the packet source is not the shipped source, which undermines review of everything else in 2a.

## ATTACKS

- **Correctness**
  - 2a: `onPointerLeave: onPointerUp` ends the drag if the pointer leaves the track *without* pointer capture having engaged (capture is `?.`-guarded and silently no-ops on failure; older Safari touch). Drag just stops mid-gesture with no error. Also, capture is set on `e.target`, which may be the 44px `::after`-padded handle or an edge label — if any child ever loses `pointer-events: none` in a restyle, capture retargets events to that child and `onPointerMove` on the container still fires via bubbling, but `onPointerLeave` semantics change. Fragile, not wrong today.
  - 2a: `onKeyDown` closes over `position` and is memoised into `containerProps` — fine — but rapid key repeat between renders uses stale `position`? No: each render re-creates the handler. OK. However `Home`/`End` landing on 5/95 while `aria-valuemin/max` are also 5/95 is at least self-consistent; defensible.
  - 2a: clamping `initialPosition` in the lazy initializer but never re-clamping if the prop changes — consumer passing a new `initialPosition` is silently ignored. Minor.
  - 2d: removing the cap means `filterActivities` now runs over up to 20 items — fine — but the filter chips still promise "Workouts"/"Achievements" over a feed that only contains *posts*. The author's own question is correct: the chips are still a lie; the copy fix only patches the empty state.
  - 3: width figures are computed, not measured — `minmax(216px,260px)` and `minmax(300px,380px)` flex, so the 412px claim depends on container padding/gap not shown.
- **Security**
  - 2b: `POST /api/photos/:userId` — the packet shows `clientId` used for validation and `ClientPhoto.create({ userId: clientId, ... })`, but never shows where `clientId` comes from. If it's derived from the `:userId` route param rather than the authenticated session, this is a straight IDOR: any member records photos (with attacker-chosen `url`, `storageKey`, `visibility`) onto another user's profile. `isOwnedPhotoStorageKey` scopes the *key prefix*, not the *caller*. Not proven by the document, but nothing in the document disproves it — highest-value thing to check in the actual route handler.
  - 2b: `url` is stored and later rendered into `<img src>` — if `url` is free-text (the admin UI has a human *type it by hand*), stored-XSS-via-`javascript:`-URL is mostly neutralised by `<img>`, but an off-origin `url` is a tracking-pixel / data-leak vector on every member dashboard. No allowlist shown.
  - 2c: role comes from client-side `AuthContext`; the deep links are navigation only, so no direct authz issue — provided the destination routes enforce server-side role checks. Not shown.
- **Data-truth / schema drift**
  - 2b: the new copy says "Two photos of the same angle are needed" — but nothing in the shown record schema (`photoType`, `takenAt`, `tags`) enforces or even represents "same angle." If angle-matching is by `photoType` alone, the copy overpromises; if by tags, the member can't set tags. Copy asserts a pairing rule the schema may not support.
  - Cross-cutting: `#A0A0B0 → --text-muted`, `#E0E0E0 → --text-secondary` are semantic guesses; in the default theme these may shift by several points of lightness. 27 unverified visual deltas shipped under a "compliance" label. And `--text-on-accent` derived from the *primary button* background applied to a purple avatar gradient is exactly the mismatch the author suspects — if avatar gradient ≠ primary button colour, contrast is unproven in all 16 themes.
  - House-rule violation: an 877-line styles file exists and was edited, not split (≤300 lines/file rule). The compliance pass enforced Rule 6 while entrenching a Rule-violating file.

## HIGHEST RISK

The 2d `isFilteredView` guard, because it is a *shipped fix for a trust bug that re-ships the same lie* — the exact failure class this whole exercise exists to kill, and it passed 462 tests plus mutation testing, which means the test harness is asserting copy strings rather than behaviour. Cheapest de-risk: one integration test that seeds 6 general posts + 1 older workout post, selects the "Workouts" chip, and asserts the rendered empty-state title — that test goes red today and forces the `activities.length > 0` → `allActivities.length > 0` correction. Same pattern (seed state → interact → assert DOM) would have caught blocker 3; add `shouldShowProfileSidebar('unknown-future-tab') === false` as a one-line policy test.

## CONFIDENCE

Could not verify from the document:
- Whether `activities` in the 2d guard is the filtered or unfiltered array — my P1 assumes the empty state renders on the filtered list being empty, which is the only sensible reading, but the parent component source would settle it in one minute.
- Whether `client-management` / `trainer/clients` handle `?intent=log_workout` — if they do, blocker 3 downgrades to P2 naming quibbles. Grep for `intent` in those pages.
- Whether `clientId` in the photo-record endpoint is session-derived — the IDOR in Attacks is a hypothesis, not a finding; the route handler's first five lines settle it.
- Whether `setPosition` is a real alias (packet elision) — the shipped file settles it.
- Whether `onPointerLeave` + optional capture actually strands touch drags on real iOS Safari — needs a device, not a document.
- All 27 hex→token mappings and `--text-on-accent` contrast across 16 themes — needs a computed-contrast sweep, not eyeballs.
- The 412px Home column figure — computed, not measured, by the author's own admission.
