# Swan Design Brain — Upgrade Blueprint v2 (panel-hardened)

- **Date:** 2026-08-21 · **Author:** Fable 5 (Final Decider), synthesizing a six-seat hostile panel (GLM 5.3, Kimi K3, Grok 4.6, Tencent HY3, Qwen 3.8 local, Fable 5)
- **decision:** REVISE-and-replace — the 2026-08-20 audit's diagnosis is ACCEPTED (verified against origin/main); its prescription is REBUILT per panel consensus
- **status:** open — awaiting Sean's dispatch; no code has been built from this document yet
- **supersedes:** the "Concrete repository upgrade blueprint" section of the audit packet in this directory (the audit's diagnosis sections remain valid reference)
- **Implementation branch law:** all build work branches from **origin/main** — never from the wip tree this review ran on (2158 commits behind).

---

## 0. The one-sentence correction

The audit said: *build a taste reader, a Visual Director, and a Plate Forge.* The panel's unanimous correction: **build one enforced loop first — a code-level state machine where no stage can be skipped and no artifact goes unconsumed — and attack slop where it is produced (generation-time structure, content, and exemplars), not only where it is caught.**

Slop has two factories and the audit only closed one:
- **Caught-too-late factory** (audit covered): no rendered critique, no memory, no materials.
- **Produced-at-source factory** (audit missed): template-prior mode collapse, adjective→token substitution ("crystalline" → glow + blur), component-library gravity, lorem-grade copy, uniform sameness. A critique loop bolted onto an unconstrained generator converges to *polished template*.

## 1. Non-negotiables (every slice inherits these)

1. **No writer without a reader in the same PR.** Any new `scripts/design-brain/*` module must have a caller on the runtime path in the PR that introduces it. CI-greppable.
2. **Receipt or it didn't happen.** A UI/design task cannot close without a hashed run receipt (IRs, meters, patches, spend, pack id, taste namespace). Prose without a PNG/IR/receipt is a failing state, not a handoff.
3. **Adjectives are not code.** Runtime generator prompts may not contain the doctrine adjective list (cinematic, crystalline, awe, premium…). Enforceable intent lives as tests/meters/denylists/exemplars; prose lives in the human brand book. CI lint.
4. **Claims-coverage CI.** Every "must/always/enforces/requires" claim in design docs links a test ID or is tagged `ASPIRATIONAL(expiry)`. Calibrate by running it on today's corpus — it must flag the already-admitted fictional mechanisms.
5. **Privacy fail-closed.** Design runs use synthetic/production-shaped fixtures only; DOM-text redaction before any external model call; canary PII strings in populated states with a CI assertion that they never appear in outbound payloads. Client PII to external models = build failure, not a review note.
6. **Budget governor.** Hard per-round $ and token caps; degrade ladder drops LLM critique and extra viewports first, never mechanical meters or the denylist; every degradation is recorded in the receipt (silent scope-cut is receipts theater).
7. **Determinism.** Pinned model ids, recorded seeds, lineage-addressed image packs, `--replay` from a run manifest.

## 2. The corrected build sequence

> Replaces the audit's three-way P0 tie. Order chosen so each slice makes the next slice's data better. Each slice ships end-to-end (writer + consumer + test) or not at all.

### S1 — Orchestrator state machine + walking skeleton (the real P0)
One thin pass of the whole loop on ONE real Swan page:
`BRIEF → CONTENT → STRUCTURE(IR) → MATERIALS(policy) → RENDER → INSPECT → CRITIQUE → REVISE → VERIFY → LEARN`
- Transitions require typed, schema-validated artifacts (`Brief`, `ContentModel`, `LayoutIR`, `MaterialPack`, `CritiqueReport`, `TasteEvent`, `TasteProfile`). The entrypoint cannot emit final code from any state except VERIFY.
- Every stage may be crude — the loop being CLOSED is the deliverable.
- **Acceptance:** (a) integration test that deletes the profile, disables the Forge, and stubs the critic — the run must fail loudly at the correct state, not degrade to prose; (b) CI check that no path reaches RENDER without a `content_model_id` + `layout_ir_id`, or closes without a receipt.

### S2 — Layout IR + slop denylist + divergence gate (highest anti-slop leverage)
- `LayoutIR` schema: zones/grid coords, closed section-type enum, focal point, density map, card count, material slots, motion slots, `skeleton_id`. Compiler to existing components; round-trip check (compiled DOM's skeleton hash must match its IR — the model cannot emit IR-A and code-B).
- Curated **skeleton library** + per-direction **hard constraint cards** ("no cards anywhere", "type-only hero") force structural diversity at generation; `slop-skeletons/` denylist (hero-3card-CTA, glass-bento, icon-bullet rows, gradient pill CTAs…) rejects the mode.
- Pairwise IR distance gate across a round's directions (geometry + module cardinality, not tag counts); below-threshold → auto resample with an explicit lever change; killed-fingerprint memory so previously-rejected structures resurface with their kill record attached.
- **Acceptance:** current generator run 3× on one brief → the gate flags it (must reproduce today's disease); recolored clones → flagged non-distinct; classic 3-card hero fixture → always rejected; denylist add → regeneration.

### S3 — Mechanical Inspector + receipt-gated router (deterministic tier; no VLM yet)
Extend the EXISTING Playwright infra: overflow, contrast, tap targets, line length, type-scale ladder, card count, chrome-to-content ratio, CTA competition, first-viewport task-entry visibility at 375px, background-is-css-only, font count, image weight, LCP/CLS. Auto-apply lane = whitelisted mechanical fixes only, each with before/after meters and auto-revert.
- **Acceptance:** planted-defect fixtures caught at ~100% recall with zero LLM calls (assert in CI); 6-cards-in-fold fails `max_cards_fold`; deleting the receipt fails CI even with screenshots present.

### S4 — Content-truth stage (semantic anti-slop)
Content model derived from brief + production-shaped fixtures (real program names, prices, session data shapes) BEFORE structure; IA generated from content, not genre. Deterministic **specificity linter**: banned-register list + abstract-superlative density cap + ≥1 quantified concrete claim per section; lorem only in the disposable sketch tier. Reuse `copy-tournament` as the generator.
- **Acceptance:** two different real-data fixtures on one brief produce fingerprint-divergent IAs; seeded generic copy blocked with named violations; 5-stranger read-test — state the offer + audience from the first viewport (run on the current system first to establish the failing baseline).

### S5 — Exemplar vault + image-model bake-off + surface-typed materials on the EXISTING Forge
- **Vault first:** 15–30 pages/plates Sean has ranked (win/fail/borderline) with skeleton id + signature-moment note. This is the positive bar — "good" becomes a picture, not an adjective. Consumed by generation prompts, direction briefs, and critique calibration.
- **Bake-off before building:** 3–5 image models × 10 briefs, blind-ranked, cost/latency recorded. Verify the foundation can hit the bar before constructing on it.
- **Surface-typed material policy** (`awe_photo | type_data | print_none`), co-evolved with structure: gray-box IR first → plates fitted to the chosen direction's focal geometry. **Never one plate world skinned three ways** (reverses the audit's shared-pack rule). Pack-kill gate with bounded retries. Extend `forge.mjs` in place — no parallel `plate-forge/` tree.
- **Acceptance:** blind humans sort plates by anchor family ≥80% (proves steering transfers); operational brief containing a decorative cinematic plate fails pack policy; layouts can never render from a killed pack.

### S6 — Residual Art-Director critique (the LLM tier, last — gated on S3+S5)
Different model family from the generator; sees only what meters can't measure. **Pairwise-only** (vs other directions, vs the current production page, vs one vault win + one fail — randomized order); forced choice from a pack move-catalog, not free essay; every finding cites selector + crop or is schema-dropped; `metricAgreement` replaces self-reported confidence; stateless second-instance confirmation; planted-defect calibration (Fix-lane precision ≥90%, known-clean false-positive ≤5%) before any output drives anything; on calibration failure the system degrades to deterministic-only, never to uncalibrated critique. Wildcard lane: once per diverge round, rendered as an alternative, still passes mechanical gates.
- **Motion lane:** scroll-position still-sequences + video strips for animated surfaces; motion lint (reduced-motion honored, no layout-property animation, duration/stagger budgets, no infinite above-fold ambient loops); choreography spec required per animated surface. Stills never certify the cinematic bar.

### S7 — Taste loop, closed properly (schema early, distiller late)
- **Schema NOW (in S1):** every `TasteEvent` written at (user, domain, project, artifact-type) scope with reason enum or explicit skip; unknown reasons quarantined. Retrofitting scope onto old events is impossible — the schema cannot wait even though the distiller does.
- **Day-one profile:** hand-seeded from Sean's documented standing tastes + a 10–12-pair calibration interview (forced-choice exemplar pairs, logged in the same event schema). No cold start.
- **Minimal annotation capture BEFORE the distiller** (Kimi's resequencing, accepted): the cheap lane of S9 — N-up compare + numbered regions + structured region/element comments writing to the ledger — lands here, ugly is fine, because the distiller's value is bounded by event quality; distilling coarse winner/loser events just encodes noise faster.
- **Distiller (after that structured-annotation lane exists):** versioned, provenance-linked, confidence-tiered (1 event = hypothesis, never injected; 3+ consistent = active), recency-decayed, **git-tracked and Sean-editable** — a wrong preference dies in a PR, not an excavation. Injection into IR generation levers, not prompt prose. No automatic scope promotion: ≥3 same-direction projects → domain candidate; cross-domain → surfaced for explicit approval.
- **Acceptance (the money test):** flip one high-confidence lever → next IR set's hashes and first-viewport screenshots change (pixel/skeleton delta, NOT brief-text delta — the audit's own test was too weak); empty profile → byte-identical to no-profile baseline; 20 classroom rejections of dark backgrounds → Swan briefs byte-identical (poison test); profile seeded from 6 picks → blind within-user win-rate lift on held-out briefs with a confidence interval.

### S8 — Production fidelity gate + site coherence (the unowned seam)
- **Direction artifact = skeleton id + plate lineage ids + content refs + token map + motion spec.** A compiler contract turns it into production React/styled-components under house rules.
- **Fidelity check closes the loop:** the shipped page is captured and pairwise-judged against its own winning mockup by the same critique stack; structural fingerprint must match the chosen skeleton. A production page that loses to its own mockup is a failed slice.
- **Site-level coherence pass:** shared section inventory, nav/state constants, and a per-site one-signature-moment budget — every page getting a signature moment means no signature.

### S9 — Studio annotation surface (after the loop closes)
Cheapest viable first: N-up compare + numbered regions Sean answers in one line ("2 keep · 4 kill · 7 more-like-this"). Then: element selection, region locking, interaction-state timeline annotation, graft ("keep hero from A, rhythm from B") emitting JSON-Patch specs — a comment becomes a structured patch task, never chat. Full Studio polish is LAST, and reuses the existing design-canvas/artifact tooling before building anything new.

### S10 — Learning Experience Studio (deferred, schema-first)
Ships as a **pack schema + contamination test** during S1 (so isolation is proven from day one), and as a real pack only after Swan-awe + Swan-operational pass their gates. Kernel owns no aesthetic; the classroom pack brings its own rubric (age-appropriateness, legibility, printability, prep realism), its own exemplars, `print_none` material policy, and its own taste namespace. SwanStudios revenue surfaces outrank it by standing priority.

## 3. Decision-rights matrix (replaces "builder makes zero decisions")

| Class | Examples | Authority |
|---|---|---|
| Objective | overflow, contrast, tap target, missing state, a11y | auto-apply + meter-verified + auto-revert |
| Craft | one type step, spacing rhythm, density within budget | auto-apply with screenshot proof, capped diff count |
| Direction | skeleton, imagery, color world, motion, signature moment | render alternatives, human picks |
| Identity | brand tokens, voice, IA, pack grammar | never without Sean |

## 4. Evaluation battery (replaces the 12-brief ≥70% gate)

- **Swan awe/marketing (n≥8 briefs):** IR pairwise distance ≥ τ; zero denylist hits; material slots filled (no gradient-as-hero); non-card first-viewport signature present; designer-rater 3-second template test (≤2/8 "obviously AI"); **Sean pairwise vs current = 8/8 to replace a live page**; secondary held-out panel with Wilson CI if a percentage is ever quoted.
- **Swan operational (n≥6 briefs):** trainer task scripts — task success ≥ current, time-on-task not worse; synthetic data bound; zero decorative plates; a11y + overflow receipts green at 375/1440.
- **AI-detection test:** outputs mixed with human award-grade work; upgraded outputs must classify "human" at rates indistinguishable from the human corpus and separated from current-system outputs. This directly operationalizes "slop."
- **Learning gate:** within-user win-rate lift from a seeded profile, with CI.
- **Null-winner drill:** a seeded-impossible brief must produce null winner + re-divergence, never a least-bad pick.
- **System CI (every PR):** receipt present; taste cross-read poison test; canary PII absent; spend ≤ budget; adjective linter on generator prompts; claims-coverage lint.
- **Statistics:** Sean is the taste oracle (2AFC, ≥30 trials, intra-rater consistency reported — <75% repeat-agreement means the taste target itself is underspecified, which is a finding); Wilson CI lower bound > 50% wherever a preference rate is claimed; classroom briefs excluded from the v1 gate.

## 5. What was explicitly rejected from the audit

| Audit item | Verdict | Why |
|---|---|---|
| Three parallel P0s | REJECTED | Reproduces writer-without-reader; replaced by S1 walking skeleton + sequenced slices |
| One shared material pack before directions diverge | REVERSED | Forces every direction to be the same poster with different padding; co-evolve gray-box IR → per-direction plates (S5) |
| Taste reader as P0 #1 | RESEQUENCED | Cold-start starvation + negative-only profile risk; schema early, hand-seed day one, distill late (S7) |
| "Changing the profile changes the pre-brief" acceptance test | STRENGTHENED | Brief ≠ pixels; the test is IR-hash + screenshot delta (S7) |
| Universal kernel loop with mandatory CREATE MATERIALS | REJECTED | Cinematic-web loop pretending to be universal; stages are pack policy (S5, S10) |
| 12-brief ≥70% blind preference launch gate | REPLACED | Underpowered, gameable, certifies less-slop; battery in §4 |
| Visual Director with VLM-authored `safe-to-auto-apply` + 5 mandatory viewports | REBUILT | Deterministic tier owns auto-apply; VLM is pairwise-residual-only, calibrated (S3/S6); 2560/3840 sampled on awe packs, not every run |
| Studio + three domain packs near-term | DEFERRED | Scope suicide; Studio after loop closes (S9), classroom schema-first (S10) |
| Full audit ratings (4.5/2.5/1.5) | NOTED AS UNFALSIFIABLE | A rulebook that claimed unbuilt enforcement is contaminated, not 4.5/5 |

## 6. Panel calibration record (who earned what weight)

| Seat | Cost | Verdict on contribution |
|---|---|---|
| GLM 5.3 | plan credit, 668s | Deepest single review: 8-mechanism slop taxonomy, fingerprint engine, bake-off, claims-coverage CI, Wilson stats, injection hardening. Co-best with Kimi. |
| Kimi K3 | $0.079 | Sharpest architectural reasoning: state-machine acceptance tests, AI-detection gate, scope-promotion mechanism, doctrine-as-build-artifact. Co-best. |
| Grok 4.6 | $0.098 | Most decisive reversals: shared-pack refutation, adjective linter, autonomy matrix, exemplar vault as positive bar, Sean-gate 8/8. Highest density of accepted plan-changes. |
| Tencent HY3 | $0.005 | Solid specialist: metricAgreement, JSON-Patch annotations, template-signature scoring, PII scrubbing. Excellent for the price. |
| Qwen 3.8 (local) | $0 | Front-loaded value (taste polarity schema, layout-first argument), degraded into generic filler after finding 3. Confirms "never the lead voice." |
| Fable 5 | — | Unique catches: production fidelity gate (no other seat), compliance-vs-creation budget inversion, hand-seeded profile, branch discipline. |

**Blind spots no seat covered (logged for the next round):** exemplar-vault licensing economics; interaction with live pair-coding lanes (who runs the loop when two agents share the tree); retrofit sequencing across ~100 existing production surfaces.
