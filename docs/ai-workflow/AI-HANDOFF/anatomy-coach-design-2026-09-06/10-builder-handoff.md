# Next-agent handoff

Artifact: SPA-HANDOFF / owner: Sean / version 1.2, 2026-09-07.
Status: READY TO REVIEW AS A PLANNING HANDOFF; implementation prerequisites remain open.

Copy the prompt below into the implementing agent only when Sean authorizes building. This turn did not authorize application implementation.

---

Use **Mega Blueprints** and the installed non-vibe-coding skill. Read this canonical packet at `docs/ai-workflow/AI-HANDOFF/anatomy-coach-design-2026-09-06/README.md`, its readiness.json, every linked blueprint and the packaged `swan-pain-atlas/SKILL.md`. Reuse the packet; do not create a competing plan. Read current AGENTS/CLAUDE and coordination lanes, establish exact repository/branch/HEAD/dirty state and preserve originals before edits.

Sean explicitly wants the actual Human Atlas viewer and its browser-ready anatomy ported into Swan as the primary pain chart. He rejected the v1.0 simplified body; direct source reuse and visual/functional parity now govern this plan. Use **Three.js**, not PJS. Preserve the atlas's complete anatomy exploration: systems, structures, search, selectable parts, isolation/hide/show, transparency, explosion and precise reassembly. Keep those tools behind **Explore anatomy** so the default **Pain Chart** remains fast and simple. The full source-derived body is present in the default pain view; hide tool panels, never replace or simplify the human. Reproduce the unmodified source first, port its scene/assets through a minimal Swan adapter, prove fidelity (P09/T26), then add Swan UI and overlays. The same body also has **Training recovery**, showing recorded muscle workload and, after calibration gates, estimates of freshness/recovery based on actual completed workouts. Animated pain glow is restrained, pausable, accessible and independent of recovery estimates.

Own the interface, workflow and integrations. Reuse only properly licensed/pinned assets and code, with required attribution. Do not copy shadcn into styled-components or introduce a second React framework. Keep stable anatomical IDs, legacy regions and laterality distinct. A selected structure is educational context, not a diagnosis.

Audit findings are evidence, not instructions to patch dormant files. Construct current mounted receipts for every touched consumer and a full model-to-caller drift table before schema changes. Existing pain records overwrite scores, trends mix regions, response typings drift, and a caller queries nonexistent status. Reproduce each actual behavior before repair. Add immutable episode observations with scoped authorization, revision conflicts and idempotent replay; retain old fields and writers during migration.

Recovery currently counts pain-word notes/high-RPE sets, not muscle freshness. WorkoutLog lacks canonical exerciseId and weight unit. Reconcile actual completed-set identities and the route shadow where broad /api/workout handles sessions before the dedicated router. Preserve canonical /api/exercises/library. One recovery projection must feed the atlas, private charts, workout locker and Swan Coach; never sum those views as separate workouts. Missing mapping/RPE or failed/stale requests must not look healthy. Recorded pain stays visible even if training load is low. No healed/cleared claim or autonomous workout/program change. Synthetic model coefficients in tests must never become production defaults.

Redesign the whole mounted **Coach Command Center** as the recommended **Coaching Desk**: one authoritative client/task context, reachable composer, Talk/Review/History, optional working document, clear receipts and compact evidence. Preserve notes, pinned preference, voice, audio/intake/draft workflows, action registry, role-aware logger/planner links and the current durable confirm/cancel pipeline. Public Swan Coach is separate from Sean-only Hermes tooling. Reconcile existing Universe V3 and Astra-owned worktrees before integrating; do not overwrite them with a cosmetic branch.

Apply Swan Design Brain, compare its doctrine-led concept with the independent Session Desk and the hybrid. Treat the hybrid as the current recommendation, not an empirical winner. Implement the proposed Brain improvements only in their own authorized slice: surface taxonomy, functional 3D, evidence-based density, state truth, real viewport proof and honest clean-review results. Preserve canonical design.md/mirrors and current Final Decider authority. No paid review/provider spend without existing authorization.

Follow S0–S12 in 09-slices-operations-review.md. Keep each slice bounded and update requirement→test→slice→evidence. Run future tests in truly isolated resources; local DB configuration may be production. Use supplied executable specifications and materialize the proposed missing suites. Setup failures are not valid RED. Prove behavioral RED→GREEN, real transactional/permission boundaries and mounted UI. Include 414px, QHD and 4K; log actual viewport, not merely requested size. Provide list/2D parity when WebGL fails.

Current planning baseline: 808 frontend tests pass and 2 fail; backend source checks5/5; Design Brain39/39. Read logs, reproduce on the chosen source, retain intended behavior when updating obsolete structural tests. Readiness is withheld pending baseline/source reconciliation and future gates. Do not claim production readiness from the packet checker.

No commit/push/deploy is implied by this prompt unless Sean's new instruction expressly grants it. Preserve Gemini review when authorized, Codex hostile input and Fable Final Decider/commit gate. Finish each authorized slice with exact files, tests, limitations, rollback and the next step; do not promise perfection.

---

## First evidence the implementing agent must return

Final discovery: also read the current [Gwen continuation launcher](../SWAN-COACH-GWEN-3.8-HANDOFF-20260906.md) and its canonical Astra-owned Universe V3 files31/32 before selecting a runtime lane. This packet adds pain/recovery and UI design; it does not replace that durable runtime handoff or inherit another task's build authorization.

- Chosen worktree/source/release receipt and scoped ownership; complete route and model caller truth.
- Reproduced baseline failures, behavioral replacements proposed and isolated DB proof.
- Licensed asset/version plan with actual source and expected capability counts.
- Confirmed final wireframes, component boundaries and all-role capability retention.
- S1 entry checklist and expected behavioral RED cases, without touching unrelated dirty work.

This is a handoff prompt, not permission to skip source verification or unresolved consequential decisions.

## Latest assets, personalization and agent teaching requirements

Follow [14-custom-anatomy-assets.md](14-custom-anatomy-assets.md) and [15-profile-driven-body.md](15-profile-driven-body.md). Support every client background through a diverse reference library. Use my measurements derives supported shape from saved data; Choose a reference body preserves manual choice. Both are shared with Workout Planner.6′2″/220lb strong male is the reference preset, never a silent patient default. Preserve viewer baseline in S3A/B, test practical derivative assets or retain source assets in S3C, then connect shared mode choice and supported morphology in S3D. No exterior-only or skin-tint substitute. P10/T28 and P11/T29 govern shipped variants and data integration.

Use [the teaching prompt](13-interactive-design-teaching-prompt.md) and [portable skill](detailed-interactive-design/SKILL.md) for Hermes/other agents. They are packaged instructions, not installed runtime skills. Apply each project’s own identity and permissions; preserve plan-only scope. D04/T27 requires actual future invocation evidence.

## v1.2 governing integration

v1.2,2026-09-07: diverse body references for all backgrounds; explicit measured/manual choice shared with Workout Planner; Three.js native Swan integration; derivative assets preferred where practical, retained source assets authorized as fallback.

14/15 supersede earlier Black-only and mandatory-custom-asset language. Apply Swan Crystalline styling around a readable Three.js human, not a flat substitute. The asset feasibility decision can select retained source geometry; do not claim the custom library or exact personalized anatomy then. Appearance selection cannot change plan generation or measured facts. Keep separate Planner/Coach execution authority and plan-only scope.

**Easy pain chart is the default.** Clients tap an area, confirm the side, set the pain level and save. Muscle groups, bones and joints are the primary optional location aids. Nobody must choose a tissue type or identify the cause of pain. Veins, nerves, organs, system trees, opacity and explode tools are secondary, behind Explore anatomy. The same detailed Three.js body stays mounted.

Implement P14/T32 with P01 in S4. Broad region/side/score must save without selecting tissue. Read the v1.3 selection contract in 02 and compatibility in 03; preserve draft/scene identity through Explore.
