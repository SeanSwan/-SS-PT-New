# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/panel-2026-08-20-design-brain/DESIGN-BRAIN-AUDIT-PACKET.md
**Tokens:** 4726 in / 21594 out (reasoning: 16316) | total 26320
**Wall:** 667.9s

---

**Through-line of my dissent:** the audit's causal model of AI slop is incomplete in a load-bearing way. It diagnoses a *feedback* problem (no materials, no rendered critique, no memory) and is silent on the *generation* problem (the model's structural, semantic, and sameness priors). A closed loop bolted onto an unconstrained generator converges to **polished mode** — better-lit template. You cannot critique your way out of a degenerate candidate set.

Agreed, briefly, and I won't spend tokens there: admin-dashboard-as-gold-standard optimizes for parity (audit is right); no-single-beauty-score (right — but see F2 for what to use instead); kernel + domain packs including Learning Experience Studio (right split, wrong contract — F7); same material pack across all directions in a round (right, kills the best-random-image confound); rejection-reason requirement (right); reader-before-more-doctrine (right in principle, misprioritized in practice — F5).

---

### F1 — CRITICAL: The audit enforces critique but not divergence; the loop will converge to competent slop, and its own launch gate ("genuinely different structures") is unmeasurable as written

**CLAIM:** The audit's slop theory covers 3 of 8 mechanisms. The five it misses are the *cheap* half, and without them the Visual Director + Plate Forge + taste loop produce the best-executed template on the internet.

**EVIDENCE/REASONING:** Mechanism-specific taxonomy, mapped to fixes:

| # | Mechanism | Why it produces slop | Audit covers? |
|---|---|---|---|
| 1 | **Modal-IA prior** — "landing page" → hero + 3 cards + testimonial + CTA; highest-frequency training skeleton wins at any temperature | Template structure is detected pre-attentively by humans (repeated equal modules, symmetric rhythm) | No |
| 2 | **Prose-style under-specification** — "crystalline atmosphere" resolves to each model's modal cliché (blue glow, bokeh, rim light) | Correct tokens, soulless result | Partial (materials, not steering) |
| 3 | **Component-library gravity** — if generation starts from the kit, card/panel grammar is the ceiling | Everything becomes panels with brand colors | No |
| 4 | **Sameness prior** — uniform quality floor; no in-page contrast, asymmetry, or density variance | Cinematic pages need one dominant element and deliberate starvation elsewhere; LLMs decorate everywhere equally | No |
| 5 | **Semantic genericity** — fluent, specific-about-nothing copy; lorem-mode content enables template layouts to "fit" | Human slop-detector fires on copy and IA before imagery | No — the audit never mentions content once |
| 6 | No perception of own output | Compounding silent errors | **Yes** (Visual Director) |
| 7 | No coherent material world | Stock-ish imagery, scrim-hero tell | **Yes** (Plate Forge) |
| 8 | No per-user memory | Same defaults re-served | **Yes** (taste loop) |

A critique loop judges *the candidates presented*. If all three directions are mode variants, the loop selects the best mode variant. Mechanism 4 is why: the audit's benchmark can even be passed by polished-generic, because blind raters reward polish and novelty (see F3).

**FIX — build the Structural Fingerprint Engine as P0, before or parallel to the Visual Director.**
- *Inputs:* rendered DOM + computed styles per direction. *Extraction:* section count/order/types, per-section column spans and module cardinalities, block aspect-ratio distribution, density map (elements per viewport band), type-scale ratio set, symmetry measures.
- Pairwise distance across candidate directions; any direction below threshold τ triggers automatic second-wave resampling with an explicit lever change (Atelier already tracks levers — reuse that vocabulary).
- **Layout-first protocol:** generate the abstract composition (plate placement + type relationships + block topology) *before* component selection; components instantiate the composition. This kills mechanism 3.
- *Acceptance tests (behavioral):* (a) run the current generator 3× on one brief → spread below τ → engine flags it (the detector must reproduce today's disease); (b) adversarial set of recolored/hue-swapped clones of one layout → flagged non-distinct (this is literally Sean's complaint; the test must fail it); (c) 20 human-labeled triples, engine's "structurally distinct" agrees ≥80%; (d) naive baseline (same prompt ×3) fails the gate the engine enforces.
- *Fails if built naively:* fingerprint on tag names only (div/section counts) — trivially gamed; must include geometry and module cardinality. τ untuned → alien layouts; tune per archetype against the anchor corpus (F6).

---

### F2 — CRITICAL: The Visual Director as specced is a prose generator with a camera — no grounding, no verification, no calibration, no abstention. It replicates "doctrine without enforcement" one level up

**CLAIM:** LLM screenshot critique has known failure modes the audit ignores: it is ungrounded (findings not tied to verifiable regions), flattered (models rate absolute quality unreliably and self-agree when critic shares the generator's context), input-degenerate (a full-page 3840px screenshot downscaled into a VLM makes body text illegible → hallucinated findings), and unmeasured (the audit demands receipts from the pipeline but defines zero precision/recall metric for the critic itself).

**EVIDENCE/REASONING:** The audit's own named death pattern is "another artifact nobody consumes." A Director whose findings are 60% plausible-sounding noise gets ignored within two weeks — humans stop reading confident prose, which is exactly why the doctrine corpus failed. Also: "objective fixes auto-apply" without a whitelist + deterministic post-check + auto-revert lets an LLM edit CSS, self-approve, and ship regressions.

**FIX — reliability mechanics as part of the Director's v1 spec:**
1. **Deterministic-first tiering.** L0 (free, provable): Playwright/computed-style assertions for overflow, contrast ratios, tap targets, line length, landmarks, failed image requests, LCP/CLS. Never spend LLM tokens on anything L0 can answer. LLM critique handles only composition, hierarchy, genericity, and copy-effect.
2. **Grounded + verified findings.** Every LLM finding cites a selector + region crop. A second, *stateless* critic instance (fresh context, no generation rationale, ideally a different model family) sees only the crop and confirms/refutes. Unconfirmed findings are dropped. Inter-pass agreement is logged as a running reliability metric.
3. **Abstention is a lane.** False-positive rate on a 20-page known-clean corpus is a gate (≤5%). The Director's real acceptance test is a **defect-injection harness**: mechanically inject defects into clean pages (clipped text, 3:1 contrast, overlapping absolutes, card-grid cloning, broken images) and require ≥90% detection at ≤5% FP. Not "report exists" — detection deltas.
4. **Pairwise-only quality judgments.** Prohibit absolute "is this good"; require "which of A/B has stronger first-viewport hierarchy and why." The recommender is a pairwise tournament, and recommender-vs-human-pick agreement is a tracked calibration metric that must rise over time.
5. **Auto-apply whitelist** (contrast token swap, spacing-scale snap, overflow fix), each fix with a deterministic post-check and auto-revert on failure or visual-regression delta. Everything else renders as an alternative for selection.
6. Wildcard lane: **once per round, not per route** (per-route wildcards are noise), and wildcards still must pass L0 gates — "bold" is not an a11y exemption.

*Fails if built naively:* one model, full-page screenshots, no verification → receipts theater, humans ignore it, program dead.

---

### F3 — CRITICAL: The ≥70% blind-preference gate is statistically underpowered and measures the wrong construct — it can be cleared by bolting cinematic imagery onto the current system

**CLAIM:** n=12 with a 70% threshold is a coin-flip lottery (P(≥9/12 wins | p=0.5) ≈ 7%, worse with correlated raters), and blind pairwise preference rewards novelty, dark cinematic treatment, and imagery density — not task success, not Sean's bar, not non-template structure.

**EVIDENCE/REASONING:** Who are the raters? If it's Sean, he's the taste oracle — then say so and weight him; if it's a crowd, their taste is not the target distribution. Either way the gate optimizes whatever the raters can see in 10 seconds (polish, imagery) and is blind to what Sean actually complains about (structure, genericity) — see F1 mechanism 1. The gate as written incentivizes the wrong local maximum.

**FIX — replace with a battery:**
- **Primary gate:** Sean's own 2AFC picks, ≥30 trials (12 briefs × direction pairs + repeated pairs). Report his intra-rater consistency; if repeat-agreement <75%, the taste target itself is underspecified — that's a finding, not a bug to average away.
- **Statistics:** report Wilson 95% CI; gate = CI lower bound > 50% with sequential testing. Delete "≥70% on 12."
- **Construct diversity:** (a) task-success — timed find-primary-action / complete-signup on generated pages vs. current, no regression allowed; (b) slop-judge — human panel or cheap classifier sorts a mixed AI/human deck; track classification error over time as a movement metric; (c) structural diversity gate from F1 (top-3 pairwise ≥ τ); (d) regression gates: a11y, overflow = 0, LCP/CLS budgets, all viewports; (e) the learning gate from F5 (within-user win-rate lift); (f) null-winner drill — a seeded-impossible brief must yield null winner + re-divergence, not least-bad pick; (g) split criteria by archetype (dashboard briefs judged on task metrics, marketing briefs on blind preference) or cinematic-default wins everything including dashboards.

---

### F4 — HIGH: Semantic slop — copy, real-data binding, and IA-from-content. The audit's entire causal model is visual; a large fraction of the "AI look" is not

**CLAIM:** Humans' slop-detector fires on "Empower your fitness journey" + three equal cards long before evaluating imagery. Generic copy and genre-template IA produce the AI look *underneath* perfect visuals, and lorem-mode content is what permits template layouts to fit at all.

**EVIDENCE/REASONING:** Mechanistically, LLMs emit (a) modal marketing register (highest-probability phrasing) and (b) IA derived from the brief's genre noun rather than from content. Real content constrains design the way it does for human designers — real program names, real trainer photos, real price tables force specific densities, rhythms, and section inventories. A design system that never touches real data never encounters the constraints that break templates.

**FIX — content pipeline as a prerequisite stage, not a post-render garnish:**
- **Content-model-first:** derive a content schema (primary claim, proof inventory, objections, CTA set) from brief + production fixtures; every direction must declare which slot fills which section; IA is generated from the content model, not the genre.
- **Real-data binding:** renders consume production-shaped fixtures (real lengths, real prices). Lorem permitted only in disposable sketch tier.
- **Specificity linter (deterministic):** banned-register phrase list + abstract-superlative density cap + ≥1 quantified concrete claim per section; failure blocks Director sign-off.
- **Editorial lane in the Director:** "can a stranger state the offer and audience in one sentence from the first viewport" — VLM answers from screenshot + DOM text; failure flags copy, not layout.
- *Acceptance:* (a) two different real-data fixtures on the same brief produce fingerprint-divergent IAs (proves content drives structure); (b) seeded generic copy is blocked with named violations; (c) 5-human read-test: ≥4/5 correctly state offer+audience from first viewport — run it on the current system first to establish the failing baseline.
- *Fails if built naively:* string-blacklist only → the model thesaurizes ("supercharge" for "elevate"). Ban the *register* (superlatives + vague benefit clauses via POS/abstractness scoring), not just strings.

---

### F5 — HIGH: Taste-loop-first P0 builds a consumer for data that doesn't exist, and the audit silently dropped the founder's "compact visual questionnaire" — the one mechanism designed to create taste data *before* rejections

**CLAIM:** With one founder and one classroom user, the rejection ledger accumulates n≈3 events/month for months. P0#1 as ordered yields another inert artifact — the audit's own named failure mode. And the transcripts' questionnaire (founder's explicit intent) appears nowhere in the upgrade plan.

**EVIDENCE/REASONING:** Cold start is the binding constraint on the learning loop, not the reader. The audit's critical test ("changing a profile fixture changes direction briefs") is also under-operationalized — "measurably different" is a fake-beauty-score of a different unit. Different *how*?

**FIX:**
- **Calibration interview at init:** 10–12 forced-choice pairwise exemplar plates (from F6's anchor library); each pick logs a preference event in the *same schema as rejections*, provenance "calibration." Profile exists on day one.
- **Profile semantics:** ranked levers with confidence + provenance + decay (supersede + half-life — a 2025 kill shouldn't veto 2027's brand direction); quarantine low-confidence/unknown-reason events (audit's point, keep); scoping user→domain→project→artifact-type (keep).
- **Hardened acceptance:** (a) flipping one high-confidence lever changes ≥2 of 3 direction briefs *and* flips the recommended winner to a direction carrying that lever; (b) robustness negatives — empty profile → briefs byte-identical to no-profile run; single low-confidence event → no change; (c) **the money test:** seed profile from a user's first 6 picks, generate directions for 6 held-out briefs, blind within-user win-rate vs. unprofiled must beat chance with CI. That is the learning loop's actual product claim.
- *Fails if built naively:* profile as free-text "preferences.md" concatenated into prompts → bloat, contradictions, cherry-picking. It must be structured levers injected into the generator's lever space (Atelier's existing vocabulary), not prose.

---

### F6 — HIGH: No anchor/exemplar corpus, and no proof the image toolchain can hit the bar. Prose style-steering has a fundamentally lower ceiling than exemplar-steering, and the reference lane (P1) arrives after generation already matters

**CLAIM:** "Crystalline atmosphere" is prose; every model resolves it to its own cliché. A world-class design team has a swipe file; this plan has a bibliography. And the audit assumes the Forge's image model can produce cinematic plates — never verified.

**EVIDENCE/REASONING:** Mechanism 2 (F1). Style transfer via exemplar conditioning + extracted-principles cards beats adjective lists because it constrains the model's sampling to a demonstrated region instead of a described one. Exemplars also anchor critique (rubric calibration needs known-good/known-weak crops — F2 depends on this).

**FIX — anchor library as P0 alongside Plate Forge v2:**
- 3–6 licensed/in-house exemplar plates per archetype and per style axis, each with a short extracted-principles card. Consumed in three places: Forge generation prompts (image-conditioned), direction briefs (visual north), critique rubric anchors (calibration crops).
- **Image-model bake-off first:** 3–5 candidate models, 10 briefs, blind internal ranking, cost/quality/latency recorded. Verify the foundation before building on it.
- Plate Forge v2: anchor-conditioned, pack-coherent (shared lighting/palette/texture world across plates), per-plate quality check (VLM pairwise vs. anchor) *before* layouts consume the pack; keep the audit's pack-kill gate.
- *Acceptance:* (a) anchor-family transfer test — 20 plates generated under anchor set A vs. B; blind humans sort plates into families ≥80%; (b) pack coherence: VLM pairwise "same shoot?" above threshold across plates; (c) downstream ordering proof: layouts never render from a killed pack (receipt).
- *Fails if built naively:* anchors as pasted links for "inspiration" → no measurable transfer; the sort test is what proves steering works.

---

### F7 — HIGH: Kernel/pack contract is unspecified, so doctrine-drift recurs *inside packs*; reference ingestion is an unattended prompt-injection surface; "zero PII" is a wish, not a mechanism

**CLAIM:** The split is right; the contract is absent. Packs will accrete prose rules and control flow until "Swan canon too specific" recurs as "each pack too specific." And the P1 reference lane feeds untrusted external content (competitor pages, uploaded mood boards) into critique/generation contexts — classic injection vector the audit never mentions.

**FIX:**
- **Contract:** kernel = state machine + receipts + ledger/profile + fingerprint engine (F1) + inspection plumbing + benchmark harness. Pack = *declarative data only*: tokens, archetypes, anchor set, material prompt modules, content schemas, rubric extensions, decision-rights overrides, auto-apply whitelist. Pack CI validates schema and version; every pack rule must reference an enforceable check or it doesn't ship (otherwise it's doctrine with a new folder name).
- **Derive-pack primitive:** the reference lane should distill a *temporary pack* (scoped, expiring, diffable) rather than an ephemeral "reference brief" — makes reference consumption testable.
- **Isolation:** asset/anchor namespaces per pack (a classroom exemplar physically cannot enter the Swan anchor set). Contamination test: apply classroom profile + derived classroom pack, run a Swan brief under pinned seed → direction briefs byte-identical to the uncontaminated run.
- **Decision-rights matrix** replaces "builder makes zero decisions" as the runtime contract: {auto-apply (objective, whitelisted) / propose-and-render-alternative (directional) / ask (brand, tokens, archetype) / never (silent brand mutation)}.
- **Ingestion hardening:** references pass through an extractor that emits structured facts only (composition, type hierarchy, palette in LCH, motion notes); raw reference text never enters any prompt. PII: field-level brief schema, DOM-text redaction to placeholders before external critique, exfiltration allowlist, local-model fallback when client PII is present. *Acceptance:* a mood board containing adversarial instruction text produces zero behavioral diff in critique output vs. a clean board; synthetic client name/email appears in zero outbound payloads (proxy-log assertion).

---

### F8 — MEDIUM-HIGH: The inspection surface is combinatorial budget death (5 viewports × ~5 states × full-page ≈ 50–60 captures/route; full-page 3840 tiles to ~6–10 legible crops → hundreds of VLM images/route), and loop latency is unmodeled — the Studio dies on wait time

**FIX:**
- Tiered ladder (F2's L0–L3) with a **budget contract per run**: hard $ ceiling, explicit degrade ladder (drop wildcards → reduce states → reduce breakpoints → L0 only), and degradation *recorded in the receipt* — never silently scoped down (silent scope-cut is receipts theater).
- Capture cache keyed by route+commit+viewport+state; unify Forge's existing spend tracking with Director spend in one per-run cost receipt.
- **Progressive fidelity in the Studio:** cheap structural sketches (no image gen) for the direction pick → full material + render only for the chosen 1–2 → annotation rounds on the picked one. Sketch tier should cost <5% of full tier — measure and gate on it.
- *Acceptance:* benchmark run completes under a stated ceiling with degradation events visible; median direction-pick latency under an explicit target.
- *Fails if built naively:* uniform full inspection → the team quietly stops running the Director between rounds because it's too slow, and it degenerates into a release-gate artifact nobody iterates with — the audit's own consumption death, again.

---

### F9 — MEDIUM: Motion is doctrine-only *after* this upgrade — screenshots are time-slices; the founder's "useful animation" requirement has no generator, capture, or critique mechanism anywhere in the plan

**FIX:** choreography spec as a required artifact per animated surface (trigger, property, duration, easing, reduced-motion fallback); Playwright video capture of interactions; deterministic motion lint (prefers-reduced-motion honored, no layout-property animation, duration/stagger budgets, no infinite ambient loops above the fold); VLM pairwise useful-vs-decorative on clip pairs; every animation must map to a spec'd purpose (draw attention / spatial continuity / state change) or be flagged. *Acceptance:* seeded violations (infinite loop, missing reduced-motion, animating top/left) all fail lint. *Naive failure:* "add framer-motion" → decorative fades everywhere; the duration budget catches sprawl.

---

### F10 — MEDIUM: The Director is route-scoped; independent page optimization yields locally-great, globally-incoherent sites (every page gets a signature moment → no signature), and mobile is treated as a viewport list, not a rubric

**FIX:** site-level coherence pass (shared section inventory, rhythm continuity, nav/footer/state constants) with a per-site **one-signature-moment budget** enforced across routes; mobile rubric lane (tap-target map, 375px density, LCP on throttled 4G) for a mobile-heavy fitness audience; add a 5-page site brief to the benchmark. *Acceptance:* two pages with conflicting hero grammars are flagged by the site pass; a 44px-violating CTA cluster on 375 is caught by the mobile lane.

---

### F11 — MEDIUM severity, cheapest insurance in this list: nothing in the plan mechanically prevents the *original* disaster — docs claiming enforcement that never existed — from recurring inside the new architecture docs

**EVIDENCE/REASONING:** The repo's core historical failure was prose outrunning code, and the audit's cure is… more architecture prose (lanes, contracts, stages) with human discipline as the enforcement. That's the disease.

**FIX:**
- **Claims-coverage CI:** lint all doctrine/architecture docs for enforcement-claim patterns (must / always / enforces / requires / never); each claim links a test ID or carries `ASPIRATIONAL(expiry)`. Untagged → build fails. Calibration: run it against today's corpus — it must fail loudly on the already-admitted fictional mechanisms.
- Runtime-generated capability dashboard (what's enforced, with test links); docs may only state what the dashboard shows.
- **Reproducibility:** pinned critic model at temperature 0 with schema-constrained outputs; seeds recorded for image generation; input-hash → output ledger; replay harness re-runs any logged round and diffs (this is also what makes F5's learning claim *provable* rather than anecdotal).
- *Naive failure:* lint gamed by rewording around trigger verbs — add a quarterly cheap-LLM semantic claims-audit and publish the lint dictionary in the PR template.

---

**Revised P0 stack** (replacing the audit's three-way tie): (1) Structural fingerprint/divergence engine + layout-first protocol (F1); (2) Director L0 tier + defect-injection harness + grounded-verified critique (F2); (3) image-model bake-off → anchor library → Plate Forge v2 (F6); (4) content pipeline: real-data binding + specificity linter (F4); (5) taste consumer + calibration interview (F5). Reference lane becomes derive-pack (F7) at P1; Studio at P1 behind progressive fidelity (F8); benchmark battery (F3) gates the whole stack with Sean as oracle and Wilson intervals, not a lucky 70%.
