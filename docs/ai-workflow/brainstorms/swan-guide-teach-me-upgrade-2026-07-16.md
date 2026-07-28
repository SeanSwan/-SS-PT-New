# Brainstorm: Swan Guide — Teach Me System Upgrade

**Date:** 2026-07-16  ·  **Status:** complete  ·  **For:** DashboardTeachMeGuide / TeachMeToggle upgrade → interactive guidance layer across all four dashboards
**Handoff:** `docs/ai-workflow/AI-HANDOFF/NEXT-CHAT-PROMPT-swan-guide-2026-07-16.md` (fresh-chat master prompt for Phase 0 + Phase 1)

## Summary
Upgrade the existing "Teach Me" system (static role-aware text panels mounted on the dashboard shells) into an interactive, toggleable, role-and-state-aware guidance layer whose job is getting every user into their core loop (log → proof → next action → share) within their first few visits. Sean's verdict on current copy: "not deep, the explanation is not even helping, it's confusing." Agreed approach from prior session turn: build the ENGINE now, write deep per-section content as each surface freezes; plain-language copy triage as immediate relief.

## Pre-grill context (from codebase audit, origin/main)
- Canonical system: `frontend/src/components/Shared/DashboardTeachMeGuide.tsx` (264 lines) + `DashboardTeachMeGuide.logic.ts` (4 role base guides) + ~10 per-route refiner files (~1,400 lines) + `TeachMeToggle.tsx` (297 lines, localStorage "seen" tracking, Ask Coach deep-link).
- Mounts: `UniversalDashboardLayout.shell.tsx:124` (admin/trainer/client header popover) + `UserDashboard.V3.tsx:118,155`.
- Separate system NOT in scope: `features/teach-mode/` (exercise how-to teaching in exercise detail panels).
- Diagnosed weaknesses: essay-in-a-popover (10 content zones, fastPath duplicated), internal doctrine jargon in user-facing copy ("Command Strip", "training proof", "No hidden writes"), tells-instead-of-shows (no element spotlighting), no real progress state (localStorage "seen" only), no first-run offer (defaults closed).
- COORDINATION: Codex prelaunch-audit worktree has an active claim renaming `role`→`dashboardRole` on DashboardTeachMeGuide.tsx/test + both mounts. Build must start from post-audit main in a fresh worktree. This wip tree is 672 commits behind main.

## Key Decisions
- **#1 job = Activation coach** — get new users to complete their first core-loop action in visits 1–3; reference depth is secondary.
- **Role priority = Client + User first**, trainer next, admin last (Sean human-onboards trainers; Sean is the admin).
- **Form = Checklist Hub + Spotlight Tours** — per-section skill checklist with done-states; each item launches a spotlight tour over the real UI (data-tour anchors, in-house styled-components engine, no tour library, no MUI).
- **Checkmark = real action done** (workout logged, booking made), tour-viewed only for informational items. Checklist doubles as an activation tracker.
- **First-run = soft auto-offer** — welcome card with Start / Later / Never per section; never mid-task; header toggle stays.
- **Rewards = small one-time XP per completed section + "Pathfinder" badge for all sections**; server-validated, idempotent, real-action-gated (unfarmable).
- **Name = "Teach Me" stays user-facing**; "Swan Guide" is the internal system name.
- **Voice = Warm coach** — ≤2 short verb-first sentences per step, zero internal jargon, celebrate completions.
- **State-awareness v1 = small flag set** (hasLoggedWorkout, hasBooking, hasAssignedTrainer/plan) swapping copy variants.
- **Coach = escape hatch per step** — context-aware Ask Coach deep-link with per-step prompt; Coach does not drive tours in v1.
- **Sequencing = 3-phase hybrid**: Phase 0 plain-language rewrite of existing panels now → Phase 1 Swan Guide engine + first client/user tours → Phase 2 deep tours as each section freezes. Built off fresh main AFTER Codex's prelaunch audit merges.

## Q&A Log
### Q1: What is the Swan Guide's #1 job?
- **Recommended:** Activation coach — get a brand-new user to complete their first core-loop action (log a workout, check progress, book a session) within their first 1–3 visits; that's the flow/habit retention moment. Reference help is secondary.
- **Sean's answer:** Activation coach (accepted recommendation).
- **Implication:** Content leads with "do this now" and ends with the user completing the action, not reading about it. Depth-of-reference is secondary and can arrive later per-section. Success metric = first loop action completed, not docs coverage.

### Q2: Which roles get deep guided content first?
- **Recommended:** Client + User dashboards first (paying/retention audience, zero-context arrivals, activation = revenue proof); trainer next (human-onboarded by Sean for now); admin last (Sean is the admin).
- **Sean's answer:** Client + User first (accepted recommendation).
- **Implication:** Phase 2 content order: client/user surfaces → trainer → admin. Engine still ships role-aware for all four (existing base guides remain as fallback), but deep walkthrough content is client/user-led.

### Q3: What form does the teaching take on screen?
- **Recommended:** Checklist Hub + Spotlight Tours — panel becomes a short per-section skill checklist with done-states; each item launches a step-by-step spotlight tour that dims the page and highlights the real controls (via data-tour anchors), walking the user through actually doing the task.
- **Sean's answer:** Checklist + Spotlight (accepted recommendation).
- **Implication:** Engine needs: spotlight overlay + step card components (in-house, styled-components), data-tour anchor convention on real UI elements, per-item done-state persistence, and a tour-definition schema per section. Fixes both diagnosed failures: show-don't-tell + felt progress.

### Q4: What earns a checklist item's checkmark?
- **Recommended:** Real-action completion wherever detectable (first workout log saved, first booking made, progress opened); tour-completed only for pure informational items. The guide is an activation tracker, not a reading tracker.
- **Sean's answer:** Real action done (accepted recommendation).
- **Implication:** Checklist items need a `completionSignal` in the schema (e.g. `hasWorkoutLog`, `hasBooking`, `visitedRoute`, fallback `tourCompleted`). Backend involvement: completion state must be derivable from data the frontend already fetches (counts/flags), or a small per-user guide-progress record. Checklist doubles as an activation funnel we can read later.

### Q5: First-run behavior — how pushy?
- **Recommended:** Soft auto-offer — small welcome card on first visit to each major section ("Want a 30-second tour of this page?") with Start / Later / Don't show again. Later re-offers once; Never is forever. Header toggle remains for opt-in anytime.
- **Sean's answer:** Soft auto-offer (accepted recommendation).
- **Implication:** Needs per-section offer-state persistence (offered / snoozed / never / toured) — must be per-user and survive devices, which pushes persistence server-side. Offer card is its own small component; must never fire mid-task (only on section entry, once settled).

### Q6: Gamification tie-in?
- **Recommended:** Small one-time XP per completed section checklist (real-action-gated per Q4, so unfarmable) + one badge for completing all sections (working name "Pathfinder"). Idempotency keys on awards (standing gotcha).
- **Sean's answer:** Small XP + badge (accepted recommendation).
- **Implication:** Backend: guide-progress record must trigger idempotent XP award on section completion; badge added to badge manifest. Keeps XP economy honest because checkmarks require real actions. Security note: after the 2026-07-15 unlimited-point-self-award incident, the award path must be server-validated, never client-asserted.

### Q7: User-facing name?
- **Recommended:** Keep "Teach Me" as the visible button label (Sean's original, plain-language, already shipped); "Swan Guide" is the internal system name for files/docs/API.
- **Sean's answer:** Keep "Teach Me" (accepted recommendation).
- **Implication:** No user-facing rename churn. New engine files can use SwanGuide naming internally without touching the shipped label.

### Q8: Copy voice?
- **Recommended:** Warm coach — second person, short verb-first sentences, encouraging without cheese, celebrates completions ("That's your first workout logged. Your charts are real now."). Matches trainer-led brand; the opposite of current doctrine-speak.
- **Sean's answer:** Warm coach (accepted recommendation).
- **Implication:** Copy standard for ALL guide content (including the Phase 0 triage of existing panels): ≤2 short sentences per step, verb-first, zero internal jargon (banned: "Command Strip", "training proof", "truthful", "hidden writes", "canonical", "surface"), celebrate real completions. This standard goes in the content schema doc so every future author (human or AI) inherits it.

### Q9: State-awareness depth in v1?
- **Recommended:** Small flag set — hasLoggedWorkout, hasBooking, hasAssignedTrainer/plan — swapping copy variants per step so empty-account users hear "your FIRST workout" and populated accounts hear reference framing. Deep personalization (streaks, tier, staleness) deferred.
- **Sean's answer:** Small flag set v1 (accepted recommendation).
- **Implication:** Tour schema gets optional copy variants keyed by flag. Flags derive from data the dashboards already fetch — no new heavy endpoints; at most a lightweight guide-progress/flags read. Aligns with Q4's completionSignal (same flags do double duty).

### Q10: Swan Coach's role in the guide?
- **Recommended:** Escape hatch per step — every tour step/checklist item carries a context-aware "Ask Coach" deep-link pre-loaded with that step's question. Coach does not drive tours in v1 (avoids coupling activation to Coach reliability + token cost).
- **Sean's answer:** Escape hatch per step (accepted recommendation).
- **Implication:** Tour schema gets optional `coachPrompt` per step (extends the existing onAskCoach hook already threaded through TeachMeToggle). Coach-driven tours ("want me to show you?") noted as a future layer, not v1.

### Q11: Build sequencing?
- **Recommended:** 3-phase hybrid — Phase 0 copy relief now; Phase 1 engine + tours for the 2–3 most-frozen client/user sections; Phase 2 content follows each section's freeze. Off fresh main, post-Codex-audit.
- **Sean's answer:** 3-phase hybrid (accepted recommendation).
- **Implication:** Phase 0 touches only content files (logic.ts + refiners — NOT in Codex's lock list, but still built off fresh main). Phase 1 is the net-new engine. Content authoring becomes a repeatable per-section task any agent can run once the schema + copy standard exist.

## Key Highlights
- The guide is an **activation system, not documentation** — every design decision (real-action checkmarks, tour-ends-in-doing, XP) flows from that.
- Because checkmarks require real actions, guide progress **doubles as per-client activation telemetry** — Sean can see who's stuck at which first step (Phase 2 suggestion below).
- The existing ~1,400 lines of refiner copy are **raw material for tour scripts** — mine them, don't discard them.
- Biggest technical risk is **anchor rot** (tours pointing at UI that got refactored) — mitigated by a data-tour anchor registry + CI coverage test.

## Architecture Notes (parent / children / whole)
- **Parent surfaces:** `UniversalDashboardLayout.shell.tsx` (admin/trainer/client shells) and `UserDashboard.V3.tsx` (user dashboard).
- **Children / composed parts:** TeachMeToggle (entry button + panel), guide content (per-role base + per-route refiners), Ask Coach deep-link into Swan Coach.
- **Fit with Product Core Loop:** the guide's whole job is activation — moving new users into log → save → chart → next-action → share with the fewest clicks.

## Suggestions & Enhancements (Phase 2 — grill-me's recommendations)
1. **Admin activation funnel readout** — since checkmarks = real actions, aggregate guide-progress into a small admin view: "3 clients haven't logged their first workout; 2 never booked." Serves the admin proof-of-value priority (who needs intervention) at near-zero extra cost because the data now exists. Phase 2.5 slice, not v1. — **VERDICT: ADOPTED (Sean 2026-07-16)**
2. **Cross-section journey nudge** — when a section's checklist completes, the hub points at the NEXT section's first item. — **VERDICT: NOT adopted for now** (Sean selected only #1; revisit post-v1 if activation data shows drop-off between sections)
3. **data-tour anchor registry + CI test** — test fails when a tour references an anchor that no longer exists (extends routeMatrix test pattern). Guard against silent tour breakage during parallel refactoring. — **VERDICT: INCLUDED (build-quality default, unobjected)**
4. **Guide copy standard as a reference doc** — warm-coach voice + banned-jargon list + ≤2-sentence rule in `docs/ai-workflow/references/`, loadable by swan-design-router. — **VERDICT: INCLUDED (build-quality default, unobjected)**
5. **Tour's final step IS the real control** — every task tour ends with the user tapping the actual button; learning ends in doing. — **VERDICT: INCLUDED (build-quality default, unobjected)**
6. **Bridge to exercise teach-mode (later)** — client checklist links into `features/teach-mode` exercise teaching. — **VERDICT: NOT adopted for now** (backlog note only)

## Parent / Children / Whole Observations
- `UserDashboard.V3.tsx` mounts the guide TWICE (lines 118 + 155, likely desktop/mobile variants) — the engine should unify to one mount with responsive behavior so offer/progress state can't double-fire.
- The current panel shows the fast path twice (quick strip + first-move panel) — the checklist hub replaces both; no duplicated facts in the new design.
- `features/teach-mode/` (exercise how-to) stays a separate system; only bridged via suggestion #6.
- Codex's prelaunch audit renames the guide's `role` prop → `dashboardRole` — engine work MUST branch from post-audit main.

## Minimal-Click Opportunities
- **New client → first logged workout:** today ≈ 4+ taps plus reading and guesswork (find Teach Me → open panel → read essay → find link → navigate → locate control). With soft auto-offer + spotlight: **2 taps** (Start → tap the spotlighted Log Workout).
- **Checklist item → doing it:** item tap navigates AND spotlights in one action — no "go there, then figure it out."
- **Stuck → help:** per-step Ask Coach is 1 tap with the question pre-written (today: open Coach, type your question ≈ 1 tap + typing).

## Open Flags
- [ ] XP amount per section + badge art for "Pathfinder" — needs Sean's call when the gamification economy numbers are in front of him (align with existing award sizes).
- [ ] Which 2–3 client/user sections are "most frozen" for Phase 1 first tours — Sean to name them when Phase 1 starts (candidates: user Home, Log Workout, Progress).
- [ ] Server persistence shape (new small table vs existing user-preferences store) — architect decides in the Phase 1 plan; requirement locked (per-user, cross-device).
