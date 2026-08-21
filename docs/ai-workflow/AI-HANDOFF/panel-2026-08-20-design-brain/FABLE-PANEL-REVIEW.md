# FABLE 5 — Hostile Review of the Swan Design Brain Audit (2026-08-20)

> Seat: Fable 5 (final arbiter — this is my independent seat review, written BEFORE reading the other four seats, from claims verified against origin/main).
>
> Verification receipts: `readTasteLedger` appears only in two AI-HANDOFF docs on origin/main, zero code files `[VERIFIED]`. `taste.profile.json` appears only in five handoff docs, no live artifact `[VERIFIED]`. The only `rejection` reference in `scripts/design-brain/` is the writer `log-atelier-session.mjs` `[VERIFIED]`. `scripts/design-brain/src/` is ~25 modules of external-reference compliance machinery (attest, probe, egress-policy, adjudicate, corroborate) vs ~3 creation-side modules `[VERIFIED]`. No visual-director runtime exists anywhere on main `[VERIFIED]`. The Forge is real (`scripts/forge.mjs` + ab-sheet/i2i/seed satellites) `[VERIFIED]`. `docs/ai-workflow/design-brain/forge-compiler-contract.md` exists but governs the image-Forge seam only, status PROPOSED `[VERIFIED]`.

The audit's facts survive verification. Its judgment does not survive intact. Ranked findings, most severe first.

---

## F1 — The audit prescribes the disease it diagnoses: three parallel P0 builds instead of one closed loop

**CLAIM:** The audit's "build three things first" (taste reader, Visual Director, Plate Forge) recreates the exact failure it documents — artifacts built in parallel that nothing consumes end-to-end.

**EVIDENCE/REASONING:** The repo's own history proves this failure mode twice: the taste-slice plan got a REVISE verdict *for proposing an artifact without a proven consumer*, and the canonical design doc admits earlier enforcement claims were fictional. Three P0s built by (realistically) one builder across weeks = three more partially-consumed subsystems. The loop has value only when CLOSED; a 90%-built loop is worth roughly zero, which is the current state.

**CONCRETE FIX:** Replace the three P0s with ONE P0: a **walking skeleton** — the thinnest possible end-to-end pass of the whole loop on ONE real page (e.g., the storefront hero). One brief → 3 skeleton-forced directions → one shared plate set (even 2 plates) → rendered → captured at 3 viewports → critiqued → one revision round → Sean picks/rejects with reasons → ledger event → profile row → *prove the next run's brief text changes because of that row*. Every stage may be crude. Only after the skeleton closes do you deepen stages (more viewports, better Forge integration, richer critique). Acceptance test for the skeleton: a single command produces a round-trip artifact trail, and a fixture-modified profile provably alters run 2's direction briefs.

---

## F2 — The Visual Director as specified will hallucinate; the audit never confronts multimodal-LLM critique reliability

**CLAIM:** "LLM looks at screenshots and critiques them" fails silently: multimodal models are weak at fine-grained visual judgment (spacing deltas, contrast values, alignment), biased toward finding whatever the prompt implies, and produce confident prose findings that don't reproduce.

**EVIDENCE/REASONING:** This is the known failure class of VLM-as-judge. The audit's own lanes (Fix now: "weak contrast, inconsistent spacing") ask the model to eyeball things that are *deterministically computable*. An unreliable Director is worse than none — it launders slop through official-looking receipts, and the whole upgraded system inherits its false confidence.

**CONCRETE FIX (four mechanisms, all required):**
1. **Compute, don't eyeball.** Contrast ratios, tap-target sizes, type-scale ratios, spacing-rhythm variance, density-per-viewport, overflow — extracted from DOM + computed styles by deterministic script (`inspect-dom.mjs` / `analyze-layout.mjs` doing real math). The LLM critiques ONLY what cannot be computed: hierarchy, composition, memorability, brand fit, slop-pattern recognition.
2. **Pairwise, not absolute.** LLMs rank two variants far more reliably than they score one. The Director's aesthetic lane always judges directions against each other and against the CURRENT production page, never in isolation.
3. **Self-consistency gate.** Run the aesthetic critique 3× (or via 3 personas); only findings that persist across runs survive. Every finding must cite a selector or pixel region that a validator confirms exists — dangling citations auto-drop the finding.
4. **Calibration harness before trust.** Seed pages with planted defects (known-bad contrast, deliberate card sprawl, a timid hero) and measure precision/recall of the Director. Publish the score in the receipt. If the Director can't find planted slop, its clean bill means nothing. Re-run calibration whenever the critique prompt or model changes.

---

## F3 — The content/copy layer is missing from BOTH the system and the audit — and it is a co-equal root cause of AI slop

**CLAIM:** The audit's slop theory (no material pack, no critique loop, open taste loop) omits the layer users notice first: generic words. "Empower your fitness journey," fake stats, placeholder testimonials, meaningless feature triads. A page with premium plates and slop copy still reads as AI.

**EVIDENCE/REASONING:** Slop detection in humans is heavily verbal-structural: template headline rhythms, symmetric card triads with icon+title+two-lines, CTA verbs from the same ten words. Nothing in the current doctrine, the Forge, or the audit's kernel loop owns copy truth or information architecture. SwanStudios uniquely HAS real material — real progress data, real credentials (26+ years, NASM-protocol), real package prices, real client outcomes — and the loop never demands it.

**CONCRETE FIX:** Add a **Content Pack stage** beside the Plate Forge in the kernel: real copy voice (the existing copy-tournament skill is the generator — it's already built and unused in this loop), real proof points pulled from the product's own data models, a no-fabrication rule (every stat/testimonial traces to a source or is explicitly marked placeholder-to-replace), and a slop-lexicon linter (banned phrase/structure list, checkable deterministically). Direction generation receives the content pack the same way it receives plates. Acceptance: a direction rendered with lorem or banned-lexicon copy fails the round automatically.

---

## F4 — Motion and scroll are unjudgeable by a screenshot Director, yet they are the top of Swan's own taste hierarchy

**CLAIM:** The doctrine's highest tier is the C13 scroll-bound cinematic journey; the audit's Director inspects static screenshots. The system being built cannot see the thing the brand values most.

**EVIDENCE/REASONING:** Scroll narrative, parallax depth, entrance choreography, 60fps scrub — none exist in a still. The repo already learned the adjacent lesson the hard way ("a hidden window stops rAF and everything looks dead" — learning corpus 2026-08-21). A stills-only Director will grade cinematic pages as "empty" or miss dead motion entirely.

**CONCRETE FIX:** Capture lane #2: scripted scroll-through capture (screenshot sequence at scroll positions, or video via Playwright), fps sampling during scroll, `prefers-reduced-motion` dual-run, and a motion-specific critique rubric (does motion serve comprehension or decorate; is there one beat or noise). Cheap version first: 6 stills at 0/20/40/60/80/100% scroll depth composited into one contact sheet — the Forge's contact-sheet primitive already does exactly this pattern for images; reuse it.

---

## F5 — "Three structurally distinct directions" has no forcing function; the generator will regress to hero-cards-CTA thrice

**CLAIM:** The audit demands structural diversity but specifies no mechanism that produces it. Asking an LLM for "distinct" variants yields recolored siblings — the precise thing Atelier's fingerprint check exists to catch *after the fact*.

**EVIDENCE/REASONING:** Rejection-side filtering (fingerprints) without generation-side forcing means paying for N generations to keep 1.5 distinct ones. The existing `atelier/fingerprint.mjs` is a detector, not a generator.

**CONCRETE FIX:** Skeleton-first generation: maintain a curated **skeleton library** (wireframe-level structural archetypes: single-column editorial, asymmetric 70/30, type-only hero, full-bleed media with overlay ribbon, Z-path narrative…), sample N *different* skeletons per round, and give each direction **hard constraint cards** ("no cards anywhere," "no three-up grids," "hero contains zero buttons"). The fingerprint check then verifies the constraint was honored — a violated constraint kills the variant before it reaches Sean. This converts diversity from a hope into an invariant.

---

## F6 — The taste profile will overfit one person's sparse signals; and it has no cold start

**CLAIM:** Distilling durable preferences from a handful of rejection events overfits (one tired-Sean evening becomes doctrine), and a purely-learned profile delivers zero value for weeks.

**EVIDENCE/REASONING:** N=1 judge, sparse sessions, mood variance. The audit's provenance requirement is right but insufficient — provenance tells you where a bad rule came from, not that it's bad.

**CONCRETE FIX:** (a) **Seed the profile by hand on day one** — Sean's known standing tastes are already documented (no card sprawl, first-screen usefulness, NatGeo-grade nature, dual-button glow…); distill THOSE into taste.profile v1 and let the ledger update it, so value is immediate and learned rows are marginal diffs, not the foundation. (b) Confidence tiers by independent-event count (1 event = hypothesis, never injected; 3+ consistent = active). (c) Recency decay + explicit contradiction handling (new consistent signal supersedes, with both rows kept). (d) **The profile is a git-tracked, human-readable, Sean-editable file reviewed like code** — a wrong preference is deleted in a PR, not archaeologically excavated from a ledger. The audit says provenance-aware; it never says *editable*.

---

## F7 — The audit ends the loop at "revise"; the direction→production handoff is unowned, and that is where fidelity dies

**CLAIM:** Winning a round as a mockup/artboard says nothing about what ships. The compile step — winning direction → production React + styled-components under the 300-line rule, tokens, reduced-motion, a11y — is unspecified in both system and audit, and it is precisely where premium mockups historically degrade into template code.

**EVIDENCE/REASONING:** `forge-compiler-contract.md` governs only the image-Forge seam (verified). Nothing owns "the built page matches the chosen direction." Without a fidelity gate, the Studio picks a beautiful direction and production quietly ships its slop cousin.

**CONCRETE FIX:** Define the **direction artifact format** (what a direction IS: skeleton id + plate refs + content-pack refs + token map + motion spec — not a loose image), and add a **fidelity check** as the loop's final verify: production page captured and pairwise-compared against the winning direction render by the same Director; structural fingerprint must match the chosen skeleton. A shipped page that loses the pairwise against its own mockup is a failed slice.

---

## F8 — Engineering budget is inverted: ~25 compliance modules guard references nobody can use

**CLAIM:** The verified module census (25 attest/probe/egress modules vs 3 creation modules) shows the system spent its budget defending against reference material instead of learning from it. The audit notices probe-only defaults but soft-pedals the imbalance.

**CONCRETE FIX:** Specify ONE concrete "safe inspection mode" and ship it: for a Sean-supplied URL — screenshot capture + computed-metric extraction (type scale, spacing rhythm, palette, layout fingerprint) + a principles brief; no DOM text retention, no asset copying, output quarantined to a reference brief file. That single mode unblocks the reference lane; the existing egress machinery already provides the guardrails. Freeze further compliance work until the creation side catches up.

---

## F9 — Cost, latency, and stop conditions are absent from the kernel design

**CLAIM:** 5 directions × plates × N-up renders × 5 viewports × state matrix × 3× self-consistent critique × revision rounds is real money and real hours, and the audit never budgets it.

**CONCRETE FIX:** Per-round budget object in the kernel contract (max image-gen calls, max critique tokens, max rounds, wall-clock cap) with a cost receipt per artifact (the Forge already tracks lineage+spend — extend the pattern loop-wide). Explicit stop policy: null-winner → one re-diverge, then STOP and ask, never infinite rounds. Default round shape should be cheap (3 viewports not 5; 3 directions not 5; escalate only for "awe" surfaces).

---

## F10 — The 12-brief benchmark is miscalibrated and conflates two questions

**CLAIM:** 25% of benchmark weight on classroom briefs (non-revenue), N=1 blind judge at ≥70%, and program-level success conflated with per-artifact shippability.

**CONCRETE FIX:** Rebalance to 9 Swan-revenue briefs + 3 domain-pack briefs scored separately. Split the gates: per-artifact ship gate (objective computed checks pass + wins pairwise vs current production page) every round; program gate (blind preference across briefs) at milestones. Add slop-catch rate: the Director's planted-defect precision/recall from F2's calibration harness is itself a launch metric.

---

## F11 — Teacher/classroom pack: right architecture, missing priority stance and missing contract

**CLAIM:** Kernel+domain-pack split is correct; the audit fails to say WHEN (it competes with revenue work) and never defines the pack interface.

**CONCRETE FIX:** Sequence it explicitly AFTER the kernel closes on Swan surfaces (SwanStudios production is the default priority — house rule). Define the pack contract now, cheaply, as a schema: a domain pack exports {rubric, lexicon+banned-lexicon, skeleton subset, exemplar set, asset archetypes, content-truth rules, taste-profile namespace}. The Swan pack is the first implementation and proves the interface; the Learning pack is the second and proves the separation. Profile namespacing (user→domain→project→artifact-type) goes into the ledger schema NOW even though the Learning pack ships later — retrofitting scope onto already-recorded events is not possible.

---

## F12 — Process traps the audit leaves unhandled

- **Branch reality:** the wip tree where this review ran is 2158 commits behind origin/main. All implementation branches from origin/main, never from here.
- **Doctrine regression:** the audit's own blueprint will become prose. Every proposed doc must ship WITH its executable consumer in the same slice, or not ship (the repo's stated law, applied to the audit's own output).
- **Two skill surfaces:** any new visual-director/atelier skill must be advertised in the router table in the same commit that creates it — the validator exists; wire it into CI as the audit says, but as part of slice 1, not P1-later.
- **Privacy:** reference-lane screenshots of third-party sites and Sean-supplied moodboards go to external critique models only under the existing egress policy; client data never appears in plates or content packs beyond IDs/roles (Rule 8).

## Agreements (one line each)

Open taste loop = top defect: agree, verified. Plate-Forge-before-layout: agree — build on `forge.mjs`, not new. Keep/Fix/Elevate/Wildcard lanes: agree, with F2's reliability mechanisms underneath. No single beauty score: agree. Bounded creative autonomy contract for the builder: agree — write it as an explicit may/must/escalate table in the router. Kernel/domain-pack split incl. Learning Experience Studio: agree with F11's sequencing. Admin-dashboard-as-gold-standard critique: agree; replace with pairwise-vs-current + exemplar library per F10.

## Fable seat verdict

**REVISE.** The audit's diagnosis is accurate and verified; its prescription repeats the repo's characteristic failure (parallel artifact-building without a closed consumer chain) and omits four load-bearing layers: content truth (F3), motion capture (F4), diversity forcing (F5), and the production handoff (F7). Rebuilt around a walking-skeleton P0 with the F2 reliability mechanisms, it becomes the right plan.
