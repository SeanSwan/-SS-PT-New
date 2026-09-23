# Hostile Review Panel — 2026-08-21

**Document under review:** `docs/ai-workflow/AI-HANDOFF/panel-2026-08-20-design-brain/DESIGN-BRAIN-AUDIT-PACKET.md`
**Seed context:** (none)
**Seats run:** glm, kimi, grok, qwen · **Estimated spend:** ~$0.1562
**Coverage:** PARTIAL — 4 of 5 seats ran (sol not requested).

> Fable 5 is the FINAL SEAT and the Final Decider (CLAUDE.md Co-Orchestrator
> Hierarchy, Rule 46). These seat replies are ADVISORY INPUT. Fable reads all
> of them, arbitrates contradictions against the house rules, and owns the
> verdict. A seat reply is a HYPOTHESIS until verified (Rule 30) — findings
> must be checked against the real code before any of them is acted on.

| Seat | Model | Status | Wall | Reply |
|---|---|---|---|---|
| glm | GLM 5.3 | ✅ ok | 667.9s | [reply](./GLM-PANEL-REVIEW.md) |
| kimi | Kimi K3 | ✅ ok | 43.0s | [reply](./KIMI-PANEL-REVIEW.md) |
| grok | Grok 4.6 | ✅ ok | 271.6s | [reply](./GROK-PANEL-REVIEW.md) |
| qwen | Qwen 3.8 (local) | ✅ ok | 52.6s | [reply](./QWEN-PANEL-REVIEW.md) |
| hy3 | Tencent HY3 | ✅ ok (standalone run) | 165.5s | [reply](./HY3-PANEL-REVIEW.md) |
| fable | Fable 5 (final seat) | ✅ ok (written blind, before reading others) | — | [reply](./FABLE-PANEL-REVIEW.md) |

Real spend: Kimi $0.0786 + Grok $0.0983 + HY3 $0.0052 ≈ **$0.18 total paid**; GLM on Z.ai plan credit; Qwen local $0.

## Failures
- none — all six seats returned.

## Fable synthesis

1. **Consensus (all six seats, independently):**
   - **The audit prescribes its own disease.** Its three parallel P0 builds (taste reader, Visual Director, Plate Forge) repeat the repo's characteristic failure — writer-shaped artifacts with no enforced consumer. The real P0 is a code-level orchestrator/state machine whose transitions require typed, schema-validated artifacts, plus one thin walking-skeleton pass of the WHOLE loop before any stage is deepened.
   - **The Visual Director as specced is a prose generator with a camera.** All six seats demand: deterministic metric extraction first (contrast, overflow, tap targets, density, type ladder — computed, never eyeballed), LLM critique restricted to pairwise comparison of residuals, findings that must cite a selector/crop or auto-drop, and a planted-defect calibration harness with precision/recall gates before any critique is trusted.
   - **The audit's slop theory misses the generation layer.** Slop is *produced* at sampling time (template-prior mode collapse, adjective→token substitution, component-library gravity, uniform-quality sameness), not merely *uncaught*. Critique loops bolted onto an unconstrained generator converge to "polished template." Generation-side forcing is required: layout IR/skeleton commitment before code, slop-fingerprint denylist, per-direction hard constraints, reference/exemplar anchoring.
   - **Content is the missing co-equal root cause.** Generic copy and lorem-mode data fire the human slop detector before visuals do. A content-truth stage (real copy, real data shapes, banned-register linter) must precede layout.
   - **Motion is invisible to a stills-only Director** while being the top of Swan's own taste hierarchy — scroll/video capture and motion lint are required.
   - **The ≥70%/12-brief benchmark is statistically underpowered and gameable** — beating a 1.5/5 baseline certifies "slightly-less-slop."
   - Kernel/domain-pack split is right; the contract, taste-scope isolation mechanism, and cost/latency budgets are all missing.

2. **Contradictions arbitrated:**
   - **Material-first vs layout-first.** The audit mandates one shared material pack before directions diverge; Qwen/GLM argue layout-first; Grok shows the audit's "same pack so the user judges structure" actually *forces* every direction to be the same poster with different padding. **Verdict: co-evolution wins** — structure is judged on a cheap gray-box/sketch tier first; materials are generated per chosen direction (or per direction-world on awe surfaces), surface-typed (`awe_photo | type_data | print_none`). This REVERSES an audit P0.
   - **Taste loop first vs later.** Audit puts the reader at P0#1; Grok shows a taste loop closed against slop rounds learns only negatives; GLM shows cold-start (n≈3 events/month) makes a reader-first build inert; Kimi shows the Studio's structured annotations are what make events distillable. **Verdict: ledger schema (scope fields + reason enum) lands EARLY so events accumulate correctly; the day-one profile is hand-seeded from Sean's documented standing tastes + a 10–12-pair calibration interview; the distiller ships after annotation-quality events exist.**
   - **Universal kernel loop.** The audit's DISCOVER→…→LEARN mandates CREATE MATERIALS for all domains; Grok is right that this is a cinematic-web loop pretending to be universal (it would put cinematic plates on operator dashboards and illustrated heroes on worksheets). **Verdict: stages become pack-configurable policy; kernel owns the state machine, not the aesthetic.**
   - **Launch scope.** Three domain packs at launch is scope suicide (Grok, Fable). **Verdict: Swan-awe + Swan-operational are the launch packs; Learning Experience Studio ships as a pack *schema* + contamination test only, built after the kernel closes on Swan revenue surfaces.**

3. **Unique insights worth keeping:**
   - **Fable:** the direction→production handoff is unowned — a fidelity gate (production page must win/tie pairwise vs its own winning mockup; structural fingerprint must match the chosen skeleton) is the only thing that stops premium directions shipping as slop cousins. Also: engineering budget is inverted (~25 reference-compliance modules vs ~3 creation modules, verified).
   - **GLM:** image-model bake-off BEFORE Plate Forge v2 (verify the foundation can hit the bar); anchor/exemplar corpus with a measurable style-transfer test; claims-coverage CI (every "must/enforces" doc claim links a test ID or carries `ASPIRATIONAL(expiry)`); site-level coherence pass with a one-signature-moment budget; Wilson-CI statistics.
   - **Grok:** adjective-doctrine linter — runtime generator prompts may NOT contain "cinematic/crystalline/awe"; exemplars and budgets replace adjectives, prose lives in a human-only brand book; the autonomy matrix (objective/craft/direction/identity) as the real "builder decision rights" contract; Sean-gate = 8/8 pairwise to replace current, not 70%.
   - **Kimi:** AI-detection benchmark (outputs mixed with human award-site work must be classified "human" at indistinguishable rates); taste scope *promotion* mechanism (≥3 same-direction projects → domain; cross-domain → human-approved only); killed-direction regression memory; doctrine generated FROM machine-readable canon, never the reverse.
   - **HY3:** `metricAgreement` replaces self-reported confidence; JSON-Patch specs from Studio annotations (not comments); interaction-state timeline + region locking.
   - **Qwen:** taste schema with explicit polarity + constraint mapping ("too busy" → `max_elements_per_section`).

4. **Blind spots (no seat covered):** licensing/provenance economics of the exemplar vault at scale; how the Design Brain integrates with the live pair-coding lanes (two agents, one tree — who runs the loop when both are active); and rollout across the ~100 existing production surfaces (the loop designs new pages; nothing sequences the retrofit backlog).

5. **Verified verdict: REVISE the audit — diagnosis ACCEPTED, prescription REBUILT.** All factual claims verified against origin/main (ledger writer w/ zero consumers; no taste.profile.json; no visual-director runtime; real Forge; compliance-heavy module census). The upgraded, panel-hardened blueprint is at [`DESIGN-BRAIN-UPGRADE-BLUEPRINT-2026-08-21.md`](./DESIGN-BRAIN-UPGRADE-BLUEPRINT-2026-08-21.md) — that document, not the audit, is the build plan.
