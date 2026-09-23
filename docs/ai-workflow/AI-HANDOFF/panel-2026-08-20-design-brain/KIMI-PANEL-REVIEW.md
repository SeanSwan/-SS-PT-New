# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/panel-2026-08-20-design-brain/DESIGN-BRAIN-AUDIT-PACKET.md
**Seed:** (none)
**Tokens:** 4798 in / 4283 out | **Cost:** ~$0.0786 | **Wall:** 43.0s | **finish_reason:** stop

---

# Hostile Review — Seat Findings (ranked, most severe first)

## F1. The audit's own P0 list will reproduce the disease it diagnoses: three new artifact-generating subsystems, zero enforcement of the loop between them

**CLAIM:** The audit correctly identifies "writer exists, no consumer" as the core defect — then prescribes three more writer-shaped components (ledger reader, Visual Director, Plate Forge) whose integration contract is one sentence ("the router requires a receipt"). The single mechanism that actually closed nothing in the current system — an orchestrator that *refuses to proceed* without the prior stage's output — is still unspecified.

**EVIDENCE/REASONING:** The audit's own evidence shows the failure mode is never "component missing," it's "component exists, nothing calls it": rejection ledger (writer, no reader), Forge (exists, not invoked pre-layout), doctrine (exists, not enforced), skills (installed, invisible to router). Every one of those was a *built artifact nobody consumed*. The blueprint's P0 row "Inject the profile into Atelier before direction generation" has an acceptance test ("changing the profile fixture changes the generated pre-brief") — good — but there is no equivalent test that *Atelier is invoked at all* on a real user request, that the Visual Director *blocks merge*, or that the Plate Forge runs *before* divergence rather than after. "The router requires a receipt" is doctrine again unless the router is code with a hard gate. The audit even catches a prior plan doing exactly this ("REVISE verdict… could create another artifact that nothing reads") and then ships the same shape.

**CONCRETE FIX:** Make the orchestrator the P0, and make it a state machine in code, not a prompt. States: BRIEF → MATERIALS → DIRECTIONS → RENDER → CRITIQUE → REVISE → VERIFY → LEARN. Each transition requires a typed artifact from the previous state (schema-validated, hash-pinned); the UI-slice entrypoint cannot emit final code from any state except VERIFY. Acceptance test: an integration test that calls the design entrypoint with the taste profile deleted, the Forge disabled, and the Director stubbed to return nothing — the run must *fail loudly at the correct state*, not degrade gracefully to prose doctrine. Second test: grep-level CI check that no code path from the UI entrypoint reaches the renderer without a `material_pack_id` and a `critique_report_id` in context. Behavioral delta: "substantial UI work shipped without a Director receipt" goes from possible-by-default to impossible-by-construction.

---

## F2. The audit never root-causes *why* the model produces slop at generation time — it treats slop as a missing-loop problem when it's primarily a *distribution* problem

**CLAIM:** The audit's theory (no material pack, no critique loop, open taste loop) explains why slop isn't *caught*, not why it's *produced*. The actual mechanisms of the AI look are: (a) the model regresses to the modal web page under uncertainty — every underspecified degree of freedom gets filled with the training-distribution mean (centered hero, three cards, gradient CTA); (b) token-by-token local decisions with no global compositional commitment, so nothing on the page *depends* on anything else — and memorability is precisely long-range dependency; (c) "safe" instruction-following collapses variance: asked for "premium," the model picks the highest-probability rendering of premium, which is by definition generic. A critique loop bolted on afterward can only polish toward the mean it started from.

**EVIDENCE/REASONING:** This is why the doctrine corpus hasn't helped: doctrine constrains *surface tokens* (colors, glow, spacing) — the cheap-to-satisfy dimensions — while leaving *structure* free to regress to the mean. The audit notices the symptom ("Swan-colored but ordinary AI component composition… a palette does not create a composition") but its fix (Plate Forge + Director) addresses inputs and post-hoc review, not the generation act itself. Note the implication: even with a perfect Visual Director, if each round's *generator* still samples from the same modal distribution, the loop converges to "polished template," and the ≥70% blind-preference gate could pass against the *current* system while still producing slop relative to award-winning human work.

**CONCRETE FIX:** Attack the generation distribution directly, three mechanisms, in leverage order:
1. **Forced structural commitment before any code.** The direction generator must emit a one-paragraph *compositional thesis* per direction — "the page is a single vertical light-shaft the user scrolls down; all content hangs off it; the schedule table IS the hero" — plus an explicit "what this page refuses to do" list (no cards, no centered hero, no three-column features). Acceptance test: a classifier (or rubric-graded LLM judge with the rubric below) scores pairwise structural distance between the three directions' theses *and* between each thesis and a corpus of 50 known-generic SaaS layouts; all three must exceed a distance threshold from the generic corpus, and the "refusals" must be checkable in the rendered DOM (refused pattern absent → assert via selector).
2. **Ban-list at generation, not critique.** Distill the top ~30 AI-slop fingerprints (three-card feature rows, icon-left bullet lists, gradient pill CTAs, "Welcome to X" heroes, bento grids, stats bars) into a machine-checkable generator constraint. Acceptance test: render 20 briefs; a DOM-pattern detector must find zero banned fingerprints in first-viewport output. This is cheap, deterministic, and removes the modal attractor rather than grading around it.
3. **Reference-anchored generation.** The P1 reference lane is mis-prioritized — it's actually the strongest anti-slop lever because it shifts the sampling distribution toward a specific, non-modal target. Generator must cite, per section, which extracted reference principle it is instantiating. Acceptance test: sections without a cited principle fail validation; blind judges rate "resembles its reference's *principles*" above threshold.

---

## F3. The Visual Director as specified will produce confident-sounding prose — the audit names the risk and then builds it anyway

**CLAIM:** "An LLM looks at a screenshot and critiques composition" is the least reliable link in the entire proposed chain, and the audit hardens everything *around* it (receipts, lanes, confidence fields) while leaving the core judgment ungrounded. Confidence fields emitted by the same model that made the judgment are decoration. Keep/Fix/Elevate/Wildcard is a good *report format* and a bad *measurement instrument*.

**EVIDENCE/REASONING:** LLM aesthetic judgment is (a) sycophantic toward the artifact when the same model family generated it, (b) verbose-positive (finds "strong visual hierarchy" in almost anything), (c) non-reproducible — same screenshot, different run, different critique. The audit's own standard ("not one number pretending beauty is objective") doesn't excuse the absence of *any* reliability engineering. Meanwhile the genuinely reliable signals — contrast ratios, overflow, tap-target size, type-size ladders, alignment-grid deviation, DOM depth, banned-pattern detection — are *computable without an LLM* and the audit lumps them into the same "critique" step as taste judgments.

**CONCRETE FIX:** Split the Director into two tiers with different trust levels:
- **Tier 1 — deterministic analyzer (no LLM).** Computed metrics: contrast failures, overflow/clipping, viewport-specific breakage, type-scale ratio, spacing-token deviation, alignment entropy, banned-fingerprint detector (F2), first-viewport information scent (is the primary action's label visible without scroll — measurable). These auto-apply or hard-block. Acceptance test: seeded fixtures with known defects must be caught at 100% recall; zero LLM calls in this tier (assert in CI).
- **Tier 2 — LLM critic, but only as a *pairwise comparator*, never an absolute grader.** LLMs are far more reliable at "which of A/B is stronger and why" than "critique A." So: the Director never critiques a lone artifact; it compares the current render against (i) the previous round and (ii) at least one reference screenshot, with randomized presentation order to kill position bias. Acceptance tests: (a) *reliability* — same pair, 5 runs, order-swapped: agreement ≥90%, else the judgment is discarded as noise; (b) *validity* — calibration set of 30 human-ranked pairs: the critic must agree with human ordering ≥80% before its output is allowed to drive auto-anything; (c) *anti-sycophancy* — the critic model must not be the generator model, and the harness must include adversarial pairs where the generated artifact is objectively worse (broken contrast) to verify the critic doesn't rubber-stamp.
- Delete the per-finding "confidence" field unless it's derived from the agreement tests above; self-reported confidence is worse than absent.

---

## F4. The ≥70% blind-preference benchmark gates the wrong thing and is gameable; it measures "better than the old slop," not "not slop"

**CLAIM:** Twelve briefs, blind pairwise vs. current system, ≥70% preference. This gate can be passed by output that is still obviously AI-generated — it only has to beat a baseline the audit itself rates 2/5. It also conflates preference with quality (non-designer raters prefer familiar-looking pages — which *is* the slop attractor), has no statistical power analysis (12 briefs × few raters → huge variance), and says nothing about the founder's actual bar ("cinematic depth… excellent 375px through 4K").

**EVIDENCE/REASONING:** Preference-vs-weak-baseline is the classic way AI products declare victory while staying mediocre. And rater selection is unspecified: if raters are Sean alone, you've built a Sean-preference machine (fine for taste learning, useless as a quality gate); if raters are random humans, familiarity bias actively punishes the distinctive art direction Sean wants.

**CONCRETE FIX:** Three-layer gate:
1. **Absolute bar, not relative:** each output scored against a rubric derived from Sean's stated bar (first-viewport usefulness, compositional signature moment present, density-without-clutter, 375→3840 integrity) by calibrated raters including at least one working designer. Gate: median ≥4/5, no dimension <3. This can't be gamed by beating a weak baseline.
2. **AI-detection test:** mix system outputs with human-made award-site screenshots and current-system outputs; blind raters classify "AI-generated or human-made." Gate: upgraded outputs classified "human" at a rate statistically indistinguishable from the human corpus, and *separated* from the current-system corpus. This directly operationalizes "slop."
3. **Keep the pairwise gate** but against *external references* (the award-winning sites the reference lane studies), not against the old system — target can start at ≥30% and ratchet. Plus a power floor: minimum rater count and a confidence interval on the preference rate, not a bare point estimate.

---

## F5. Kernel/pack split is right; the proposed *contract* between them is missing, and the taste-profile scoping rule as written will silently fail

**CLAIM:** "Hierarchy user → domain → project → artifact-type" sounds correct and is unenforceable as stated, because taste events don't arrive labeled with their correct scope — a rejection reason like "too dark" recorded in a classroom session is *ambiguous evidence* about the user globally. Naive distillation will either over-generalize (classroom pastel preference leaks into Swan via the user level) or under-generalize (everything stays project-scoped and the profile never accumulates power). The audit asserts separation but specifies no mechanism for scope *inference* or *promotion*.

**EVIDENCE/REASONING:** This is a standard hierarchical-modeling problem and the audit treats it as a folder structure. Also unaddressed: the kernel must not import Swan canon vocabulary ("crystalline," "dark vault") into shared prompts — if any kernel prompt template contains brand tokens, contamination is structural, not just data-level. The audit flags the risk ("domain contamination") but its only fix is "separate packs," with no test.

**CONCRETE FIX:**
- **Contract:** kernel defines typed interfaces only — `Brief`, `MaterialPack`, `DirectionSet`, `CritiqueReport`, `TasteEvent`, `TasteProfile` — plus the state machine (F1). A pack supplies: canon tokens, banned-fingerprint list, reference corpus, rubric, and governing questions. Kernel code and kernel prompts must pass a CI lint: zero pack-specific tokens (assert "crystalline|vault|sapphire" absent from kernel; assert "pastel|worksheet" absent from Swan pack).
- **Taste scoping:** every TasteEvent is written at (user, domain, project, artifact-type) with *no automatic promotion*. Promotion requires: same-direction signal across ≥3 projects in a domain → promote to domain; across ≥2 domains → *candidate* for user level, surfaced to the human for explicit approval, never auto-applied. Acceptance test: fixture with 20 classroom rejections of "dark backgrounds" → Swan direction briefs must be byte-identical to the no-profile baseline; fixture with cross-domain signal → briefs change only after the approval flag is set. Behavioral, not structural.

---

## F6. Missing entirely from both system and audit: the highest-value gaps, ranked

**CLAIM:** Both the repo and the upgrade plan omit capabilities a real design team considers load-bearing. Ranked by money-left-on-the-table:

1. **Content before composition.** No stage produces or requires *real copy and real data* before layout. LLMs design around lorem-grade placeholder copy, which guarantees generic layout because the layout has nothing specific to express. A human art director starts from the actual message. **FIX:** a CONTENT state before MATERIALS: real headline, real section copy, real data shapes (or explicitly user-approved drafts). Acceptance test: renderer receives no lorem ipsum (lint); direction theses must quote the actual headline they compose around.
2. **Conversion/task model.** The doctrine is all aesthetics; nothing models what the page must *accomplish* (book a session, find the schedule). "Operational clarity" is in Sean's bar but has no instrument. **FIX:** every brief carries a primary task; the Director's deterministic tier verifies the task's entry point is visible in first viewport at 375px and measures interaction cost (clicks/scroll depth to complete). Acceptance test: task-completion path length is reported per direction and is a selection criterion, not an afterthought.
3. **Motion as a first-class artifact.** "Useful animation" is in the bar; the plan has "optional motion brief" and nothing else — no motion spec, no verification that animation serves comprehension rather than decoration. **FIX:** motion spec per direction (what moves, why, duration/easing budget, reduced-motion fallback); Playwright verifies reduced-motion compliance and flags animation that delays content visibility.
4. **Cost/latency budget as a design constraint.** Plate Forge + 5-viewport × multi-state captures + multi-round critique is expensive and slow; the audit's hardening section is absent on this. **FIX:** per-run token/image/compute budget enforced by the state machine; cheap deterministic tier runs on every save, expensive LLM critique only on human request or pre-ship. Acceptance test: a full run's cost is logged and CI fails if median cost per brief exceeds budget by 2×.
5. **Regression memory for *visual* decisions.** The taste ledger records rejections; nothing records "we tried this composition in March and it tested badly," so the system will re-propose killed directions (the ledger has kill data — but F1's missing consumer means divergence never filters on it). **FIX:** the DIVERGE state must query killed fingerprints for the project and attach "previously killed: X, reason: Y" to any near-duplicate proposal. Acceptance test: fixture with a killed direction; generator re-proposing a structurally similar direction must either suppress it or surface the kill record.

---

## F7. P0/P1 ordering is wrong in one place that matters: the Studio surface is P1 but it's the only component that generates high-quality taste data

**CLAIM:** The audit sequences taste-reader → Director → Forge → Studio. But the taste profile's value is bounded by the quality of its input events, and today's events are coarse (winner/rejection + free-text reason). The Studio's structured annotations (element-level, region-level, tweak chips, graft operations) are what make taste events *specific enough to distill*. Building the distiller first means distilling noise, faster.

**EVIDENCE/REASONING:** The audit's own P0 table includes "Require a reason — or explicit skip — for every rejection" and "quarantine unreliable unknown reasons" — an admission that current event quality is poor. A distiller over poor events produces a profile that confidently encodes garbage, and the acceptance test ("changing the profile changes the briefs") *passes anyway* — it tests plumbing, not signal quality.

**CONCRETE FIX:** Re-sequence: (1) orchestrator/state machine (F1) — cheap, unlocks everything; (2) deterministic Director tier + banned-fingerprint ban (F2/F3) — immediate slop reduction with zero LLM risk; (3) minimal Studio annotation capture (can be ugly — structured region/element comments writing to the ledger); (4) *then* taste distiller over the richer events; (5) Plate Forge and reference lane. The LLM-critic tier and full Studio polish come last, gated on the calibration tests in F3.

---

## F8. Hardening holes the audit ignores entirely

**CLAIM:** The audit's blueprint has no hardening section; the remit's hardening list is unanswered by it. Specifics:

- **Privacy:** the reference lane and any external-model critique can leak client PII (trainer client names, health-adjacent data) in screenshots/DOM sent to external models. **FIX:** a redaction pass (deterministic PII detector over DOM text + screenshot region masking) *inside* the capture step, before any bytes leave; CI test with seeded PII fixtures asserting redaction. Zero-trust: the critic receives redacted artifacts only, no exceptions.
- **Determinism/reproducibility:** taste-influenced generation makes runs non-reproducible, which makes regression debugging impossible. **FIX:** every run records profile version, pack version, seeds, model versions; a `--replay` mode re-executes a historical run from its manifest. Acceptance test: replay of a 30-day-old run reproduces the same direction theses (allowing only model-drift deltas, which are then measurable rather than mysterious).
- **Doctrine/runtime drift:** the audit diagnoses this and prescribes… more docs (the runtime contract is described in prose). **FIX:** the doctrine corpus is *generated from* the machine-readable canon (tokens, ban-list, rubrics), never the reverse; CI fails if hand-written doctrine contradicts machine-readable rules. This inverts the current relationship and is the only durable fix for "regressing into prose-only doctrine": make prose a build artifact.
- **Failure modes:** Forge generates an off-brand pack → the plan says "kill the pack" but the state machine must bound retries (else infinite image spend); Director critic fails calibration → system must degrade to deterministic-tier-only, not to uncalibrated LLM critique. Both need explicit tests.

---

**Agreements (one line each):** The "constitution vs. brain" framing is correct. The gold-standard-dashboard critique (parity with the past ≠ excellence) is the audit's best point. Separate Learning Experience pack on a shared kernel is the right call. "No single beauty score" is right — the failure is what the audit put in its place (F3).
