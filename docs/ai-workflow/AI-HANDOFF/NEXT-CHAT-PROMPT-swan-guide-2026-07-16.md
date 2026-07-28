# NEXT-CHAT MASTER PROMPT — Swan Guide (Teach Me Upgrade) Phase 0 + Phase 1

**Created:** 2026-07-16 · **Source of truth:** `docs/ai-workflow/brainstorms/swan-guide-teach-me-upgrade-2026-07-16.md` (grill-me complete — read it FIRST, it holds every decision + rationale)

## Paste-ready prompt for the fresh session

> Build the Swan Guide upgrade per the completed brainstorm at `docs/ai-workflow/brainstorms/swan-guide-teach-me-upgrade-2026-07-16.md`. All decisions are already made — do not re-litigate them. Run `swan-orchestrator` for the pre-task gate, then `swan-design-router` for the UI slices. Execute Phase 0, then Phase 1, as specified below.

## Locked decisions (from the grill — details in the brainstorm doc)
1. **Job:** activation coach — get new users to their first core-loop action (log/progress/book) in visits 1–3.
2. **Audience order:** client + user dashboards first; trainer later; admin last.
3. **Form:** Checklist Hub + Spotlight Tours — per-section skill checklist with done-states; each item launches a spotlight tour highlighting real controls via `data-tour` anchors. In-house styled-components engine; NO tour library, NO MUI.
4. **Checkmark = real action done** (workout logged, booking made); `completionSignal` per item; tour-viewed only for informational items.
5. **First-run:** soft auto-offer card per section (Start / Later / Don't show again); never mid-task; header Teach Me toggle stays.
6. **Rewards:** small one-time XP per completed section + "Pathfinder" badge for all sections. Server-validated, idempotent, real-action-gated. (XP amount + badge art = open flag for Sean.)
7. **Naming:** user-facing label stays **"Teach Me"**; internal system name = Swan Guide.
8. **Voice:** warm coach — ≤2 short verb-first sentences per step, zero internal jargon (banned: "Command Strip", "training proof", "truthful", "hidden writes", "canonical", "surface"), celebrate completions.
9. **State-awareness v1:** small flag set (hasLoggedWorkout, hasBooking, hasAssignedTrainer/plan) swaps copy variants.
10. **Coach:** escape hatch per step — `coachPrompt` per step deep-links Swan Coach (extends existing onAskCoach hook). Coach does NOT drive tours in v1.
11. **Adopted enhancement:** admin activation funnel readout (Phase 2.5 — who's stuck at which first step). NOT adopted: cross-section journey nudge, exercise teach-mode bridge (backlog).
12. **Build-quality defaults (included):** data-tour anchor registry + CI coverage test; guide copy-standard reference doc in `docs/ai-workflow/references/`; every task tour's final step is the user tapping the REAL control.

## Coordination constraints (Rule 67 — verify before touching anything)
- **Branch freshness:** the old wip tree was 672 commits behind main. Start from a FRESH worktree off current `origin/main`. Run `git rev-list --left-right --count origin/main...HEAD` first.
- **Codex prelaunch audit** (worktree `C:/tmp/sspt-prelaunch-audit-20260716`, branch `codex/prelaunch-audit-20260716`) had claims on `DashboardTeachMeGuide.tsx`, its test, `UserDashboard.V3.tsx`, `UniversalDashboardLayout.shell.tsx`, including a `role`→`dashboardRole` prop rename. **Check whether that audit has merged to main before starting.** If not merged, coordinate via `.ai-workflow/coordination/` lanes; do not collide.
- Read `.ai-workflow/coordination/codex.lane.md` + `claude.lane.md` + `review-queue.md` at session start; claim your files in the Claude lane.

## Existing system map (verified on origin/main 2026-07-16)
- Canonical guide: `frontend/src/components/Shared/DashboardTeachMeGuide.tsx` (264 ln) + `.logic.ts` (4 role base guides) + ~10 per-route refiner files (~1,400 ln of copy — MINE these for tour scripts, don't discard) + `TeachMeToggle.tsx` (297 ln; localStorage "seen"; onAskCoach hook).
- Mounts: `UniversalDashboardLayout.shell.tsx:124` (admin/trainer/client header popover) and `UserDashboard.V3.tsx:118,155` (**mounted twice — unify to one responsive mount so offer/progress state can't double-fire**).
- Existing tests to extend: `DashboardTeachMeGuide.routeMatrix.test.ts` + per-role route tests.
- Separate system, out of scope: `frontend/src/features/teach-mode/` (exercise how-to teaching).

## Phase 0 — plain-language copy triage (ships first, no architecture change)
- Rewrite ALL existing guide copy (logic.ts base guides + every refiner file) in the warm-coach voice per the copy standard. Kill the duplicated fast-path display and the AI-doctrine guardrail note ("No hidden writes…").
- Write the copy-standard reference doc (`docs/ai-workflow/references/SWAN-GUIDE-COPY-STANDARD.md`) FIRST, then apply it.
- Acceptance: every step ≤2 sentences, verb-first, zero banned jargon (add a test asserting banned phrases don't appear in guide copy); existing route tests still green.

## Phase 1 — Swan Guide engine + first tours
- Engine: spotlight overlay + step card (mobile = fixed bottom sheet, reduced-motion safe, focus-managed, 44px targets), tour-definition schema (typed data files per section: steps, anchors, copy variants by state flag, `completionSignal`, `coachPrompt`), checklist hub panel replacing the essay panel, soft auto-offer card, server-persisted per-user progress (per-user, cross-device; storage shape = architect's call), idempotent XP/badge award hooks (server-validated — remember the 2026-07-15 self-award incident class).
- `data-tour` anchor convention + registry + CI test (tour references a missing anchor or dead route → build fails).
- First tours: 2–3 most-frozen client/user sections — Sean names them at kickoff (candidates: user Home, Log Workout, Progress).
- Gates: swan-orchestrator receipt before code (Rule 26 receipt for the mounts you touch), swan-design-router for all UI, hostile review + closeout-evidence-lock at end; batch-push cadence (Rule 70).

## Phase 2+ (later, not this chat unless Sean says so)
- Deep tours per section as each surface is declared final (client/user → trainer → admin).
- Phase 2.5: admin activation funnel readout.
- Open flags from the brainstorm: XP amount + badge art; section list; persistence shape.
