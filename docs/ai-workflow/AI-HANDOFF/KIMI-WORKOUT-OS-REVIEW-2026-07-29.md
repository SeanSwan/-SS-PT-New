# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/UNIFIED-WORKOUT-OS-FABLE-BLUEPRINT-2026-07-29.md
**Seed:** (none)
**Tokens:** 7647 in / 8621 out | **Cost:** ~$0.1523 | **Wall:** 191.4s

---

# Hostile Review: Swan Workout OS Blueprint

## 1. Slice Order — the sequence is not harm-reduction-per-hour, it's frontend-comfort-per-hour

**1.1 S6 is dead weight wearing an "enabler" costume.** The doc itself admits the mega-file "shouldn't block" S7 (new service) or S8 (frontend-heavy). A behavior-locked decomposition of a 2,581-line file is a multi-day refactor with zero user value and nonzero regression risk, scheduled *ahead of* the two slices that deliver Sean's actual asks (suggested workouts, Plan Studio). Cut it from the numbered sequence entirely; do it the first time the file genuinely blocks a change.

**1.2 S3/S5 have a built-in stub-and-rework cycle.** S3's accept criteria include the completion moment "from S5 if sequenced first; else stub behind same flag." `PostWorkoutCelebration` is fully built with zero mounts and the receipt is computed server-side with zero consumers. Mounting both is the cheapest felt-win in the entire program and it belongs *inside* S3, not deferred to S5 with a stub you'll rip out. As sequenced, you are planning to do the completion moment twice.

**1.3 S4 does work that S8 throws away.** S4 reconciles all three copilot patterns into `TrainCoachDock` — including Forge's `WorkoutCopilotPanel`. S8 then retires Forge. You are migrating a component into the new pattern so you can delete it two slices later. Scope S4's dock unification to the logger + canonical planner; let Forge's copilot die unmigrated.

**1.4 S7 has an undeclared hard dependency the doc explicitly denies.** S7's spec requires "ALL active pain entries (no 7-day window)" — that *is* the Cortex §5.1 fix. The sequencing note claims Cortex P1 is "never blocking." Both cannot be true. Either pull the pain-window fix into this program as a pre-S7 micro-slice (it's small and it's the safety core of your differentiator), or admit S7 ships on a known-corrupt input. Same pattern repeats with TrainerPermissions fail-open and S4 (who-may-log is the foundation of role-parameterized logging, punted to "parallel ownership").

**1.5 S2 is overscoped for the "days, not weeks" claim.** A token module plus restyling the logger plus killing gold across ~9 planner style files plus a contract test plus visual QA at five breakpoints is not "days." Fold the token module into S3 (its only real consumer) and ship S1 alone as the fast path.

**Recommended order:** S1 → S3+celebration/receipt → S4 (rescoped) → S5 → pain-window fix → S7 → S8 → S9 (if at all). S6 and S10 happen when earned, not on schedule.

## 2. Merge Decisions — where they break

**2.1 The billing branch is undefined, and it's a money bug.** The canonical save transaction does session billing. Role-parameterizing the logger creates three logging contexts — client self-log, trainer on-behalf-of-client, admin personal — with three different deduction semantics, and the blueprint never specifies the matrix. Does a trainer logging a client's homework deduct a session credit? The doc cites `isNonDeductingClientAccount` for demo mode but not for the merge where it's actually load-bearing. This is the single most dangerous omission in the document.

**2.2 Internal contradiction on dictation.** §1.1 lists the dictation strip as a canonical feature of the *client* logger; §5.5 says dictate is "admin/trainer-gated today." If clients can't dictate, your canonical component's headline feature is gated off for its primary user, and §10.2 is not an "open decision," it's an unresolved contradiction in the verified current state. Resolve before S4, not during.

**2.3 The capability inventories are deferred to exactly where losses happen.** "Enumerate in forge package" (EnhancedWorkoutLogger affordances) and "capability inventory in forge package" (Forge/PlanBuilder) means the inventory is produced at build time by the builder, with no review gate, against a Rule-9 promise of "nothing removed without replacement." The inventories belong in this blueprint, where they're auditable, or the promise is unenforceable.

**2.4 Generate mode is a new feature smuggled into a merge slice.** None of the three existing UIs is a "deterministic builder + LLM explain" generator. S8 is sold as a consolidation but is actually consolidation + net-new generation surface. That roughly doubles its size and hides the riskiest work inside a slice whose accept criteria are written for parity, not novelty.

**2.5 Wizard mode will lose the wizard's actual value.** The 4-step wizard's worth is guided sequencing and per-step validation for novice authoring. Flattened into a "mode" of a dense pro canvas, the guardrails don't survive — you get the wizard's screens without its constraints. Either spec how step-validation maps into Templates mode or admit you're keeping the skin and dropping the spine.

**2.6 Draft/revision migration is unspecified.** Forge has "manual draft" state; the wireframe shows "revision r14." What happens to in-flight drafts when Forge redirects? Silence here means someone's half-built plan vanishes at S8.

## 3. Suggested Workouts Engine — the safety core is a hand-wave

**3.1 The pain→exercise exclusion mapping — the entire point of the engine — does not exist in the spec.** "Pain-excluded movements never appear" with no body-region→movement-pattern table, no exclusion rules, no named owner of the mapping. For a business whose differentiator is safety-aware training, the deterministic composer's most important rule set is unspecified. Everything else is plumbing.

**3.2 No progression/regression logic.** Suggestions reference "recency/muscle balance" but there's no rule anchoring a suggested session to the client's last loads, no readiness-gated progression cap, no regression on Yellow/Red. A suggestion engine without progression suggests workouts in a vacuum — it's a random-workout generator with a pain filter.

**3.3 Missing inputs:** session duration availability, equipment access, per-muscle recovery windows, weekly frequency caps, client stated dislikes. "Last-N sessions" is doing all the work and it's doing it vaguely.

**3.4 Cold start is the primary value case and the least specified.** "Plan wins; suggestions fill gap days" is vacuous for the unassigned client with no history — precisely the client this feature exists for. Onboarding-coverage-only output quality is unaddressed.

**3.5 Governance hole.** Doctrine is "one brain, many composers." This is a new composer, and the spec never says it routes through the Cortex brain's eligibility gates. As written, you're building a second brain with its own safety logic — the exact architecture the ratified directive exists to prevent.

**3.6 Invalidation unspecified.** A new pain entry must invalidate cached suggestions immediately — that's safety, not performance. No caching/invalidation semantics are given.

**3.7 Mode B/C conditionals are speculative generality** for Cortex phases that don't exist. Delete until those phases land.

## 4. Demo Mode — over-engineered in the build, under-specified in the operation, and the absorption has a hole

**Over-engineered:** server-validated idempotent XP + Pathfinder badge, checklist hub, three role journeys, CI anchor-coverage infrastructure — for a *solo trainer* who onboards every client personally. The sandbox seeder + watermark + billing exclusion is the valuable 20%. The tour engine is a multi-week build whose competition is a 3-minute Loom video and the 1,961 lines of Teach Me copy you already have. Cut S9 to the sandbox; defer the tour engine indefinitely.

**Under-specified:** demo-client concurrency and reset semantics (two trainers logging for the same demo client simultaneously; "one-tap reset" — per user or global?), and the anchor-maintenance tax. Every future UI change breaks `data-tour` anchors; the CI test catches it, but someone fixes it forever. That cost is unbudgeted anywhere.

**Teach Me absorption has a concrete capability-loss hole:** `getExerciseTeachMe` is per-exercise *education* with content-honesty guards — that is not a UI tour and no spotlight engine replaces it. The absorption path covers route-level essay panels and never states where exercise-level content goes. This violates the doc's own Rule 9 by omission. It's the clearest example of the absorption thesis overreaching: UI onboarding and exercise pedagogy are two products sharing a toggle.

**Checkmark semantics are muddy:** "checkmark = real action done" inside a sandbox is fake by definition, and server-persisted progress will conflate demo play with real usage unless explicitly separated — which isn't specified.

## 5. Missing Entirely (ranked)

1. **In-progress session persistence.** Refresh mid-workout loses the workout — the #1 logger rage moment, unmentioned anywhere. If it exists today, the audit should say so; it doesn't.
2. **The who-logs-what billing matrix** (§2.1 — it's both a merge break and a missing spec).
3. **Measurement infrastructure for S3's "≥30% fewer taps."** No analytics/instrumentation slice exists. The accept criterion is unfalsifiable as written — you'll "hit" it by vibes.
4. **Dual write-path reconciliation** (`WorkoutLog` flat vs `WorkoutExercise`+`Set` normalized). Identified in §1.2 as drift-prone, then never scheduled. You're building new surfaces on a forked data model.
5. **Automated stale-client nudges.** Sean asked for "remind clients"; the blueprint delivers manual 1-tap reminders only. The money feature is automation (no log in N days → nudge), and it's absent.
6. **Empty states.** Today with no plan, no history, no suggestions — the first-run experience of every new client — undesigned.
7. **Offline/degraded-connectivity logging.** Gym wifi is the operating environment; no queue, no local draft, no retry semantics. Failed-save/duplicate-submission states in the runner are also absent.
8. **Effort estimates.** Only S1+S2 get a ("days") sizing. A ten-slice program with one sized slice has no capacity plan — relevant because §10.7 correctly notes Marketing Command Center is the standing #1.
9. **Draft migration for retired surfaces** (§2.6).

## 6. Over-Engineered for Week-One Value at This Scale (ranked by waste)

1. **S9 Demo Mode engine** (XP, badges, checklist hub, CI anchors) — see §4. Sandbox only.
2. **S6 decomposition** — zero user value, self-admittedly non-blocking. Defer until earned.
3. **Apex Rings mount** — gamification cosplay for a solo trainer's adult clientele. Streak + PR celebration covers the dopamine. Delete the endpoint per Rule 34 and move on.
4. **Three-mode Plan Studio at merge time** — ship Generate + Manual; Templates-as-mode is legacy surface area preserved under a merge banner. A template *library* inside Manual mode delivers the wizard's residue at a fraction of the cost.
5. **Five-breakpoint visual QA per slice** — 2560×1440 for a phone-first gym logger is theater. 320/414/1440.
6. **Forge copilot migration in S4** — work scheduled to be deleted in S8.
7. **Est-1RM multi-lift toggle** — defer; the doc already half-says this. Say it fully.

---

## If you only fix five things

1. Write the billing/deduction matrix for role-parameterized logging before S4 starts (money bug).
2. Spec the pain→exercise exclusion mapping and progression rules, and declare the engine a Cortex composer, before S7 starts (safety + governance).
3. Restructure: S1 → S3+celebration → S4(rescoped) → S5 → pain-window → S7 → S8; evict S6 and gut S9 to sandbox-only.
4. Produce the capability inventories for EnhancedWorkoutLogger/Forge/PlanBuilder *in the blueprint*, plus the exercise-TeachMe destination, so Rule 9 is auditable instead of aspirational.
5. Add the missing foundations: session persistence, tap-metrics instrumentation, empty states, and the dual write-path decision — before you build new surfaces on top of their absence.
