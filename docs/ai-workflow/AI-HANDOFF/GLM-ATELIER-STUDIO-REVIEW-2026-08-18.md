# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-ATELIER-STUDIO-REVIEW-PACKET-2026-08-18.md
**Tokens:** 4325 in / 20793 out (reasoning: 17433) | total 25118
**Wall:** 291.4s

---

**Discipline note first.** I cannot read the repo. "Verified" below = attested in §2/§4.1 as git-checked this session; I take those attestations as given. Everything about code behavior, file contents, the canvas API, and what individual B-stages do is **ASSUMED** — and note the packet asks me to re-judge a 10-stage sequence while only defining about half the stages anywhere in the document. That is itself a defect: restate the stages or cut them.

---

**1) Prior program order — still right? Dead weight?**
No. R4 inverts the dependency graph: A1's archetype lookup and A2's seeding both *read the corpus*, so recall is upstream of everything — yet it appears as A7, second-to-last in the new module list and nowhere in the old sequencing. New first moves: corpus recall extraction → canvas probe → one 5-up smoke test on a toy brief. Dead weight:
- **B6 as a standalone measurement instrument.** §2 ships `design-dialogue`, which "records rejected options + why." A new instrument duplicates it — the exact Taste-Ledger/Rule 52 violation this packet exists to prevent, re-entering one level up. Cut (final verdict below).
- **MagicPath wiring, if any prior stage contained it** (assumed): §4.1's own finding — N artboards on one canvas — supersedes T5's side-by-side recommendation.
- **Whatever stages made React-stage convergence tolerable.** Gap #4 is half-solved by cheap artboards; those stages shrink. I can't name them because the packet doesn't say what B2/B4/B5/B7/B9 are.
- Ten sequential stages, zero shipped after a week: the spine is review-optimized, not ship-optimized. Collapse B0.0/B0 into one gate.

**2) B11-as-module?**
Half-true framing. A1–A6 is a module. **A7 is not — it's spine surgery**, and it should run first *even if B11 never ships* (R4 has value with zero N-up engine). B11 also doesn't sit "at position 11": divergence-then-convergence must precede all React work, so it absorbs the front of the old funnel. Slot: recall → probe → B11 smoke test → interpolation fix → creative wiring → remainder. Governance note: re-sequencing the program while labeling it "a module, not a new program" is label-management; this is a program amendment and deserves review as one. Also: §4.1 verifies the `design` skill is *available*. "Swan can drive the canvas programmatically" — repeatable, N artboards, regen-in-place — is **assumed**. Availability is not an API.

**3) A2 — attack.**
As written, it produces 7 skins of one skeleton in most runs, for two structural reasons:
- **It seeds the wrong variables.** Archetype shifts content emphasis, style-axis shifts decoration, motion budget shifts feel — none constrain *layout skeleton, interaction model, or narrative sequence*, which is what Sean actually chooses between. The model prior dominates: asked for "construction homepage," the modal output is hero + cards + footer regardless of seed.
- **The medium can't carry half the diversity.** Motion-budget differences don't render on a static artboard (assumed; §6 admits the API is unprobed). A high-motion variant looks *emptier*, not livelier, at judgment time — the seeding biases the judge against its own seeds.

Cheapest reliable divergence, by leverage per token:
1. **Distinct structural skeletons per variant** — hand-write 5–7 blocky wireframe specs (chapter count, grid, nav model, hero mechanics), assign one each. Constrain structure, free the style. The single most reliable mechanism.
2. **Anti-specifications** — negative constraints aimed at the modal layout: "no top nav bar," "hero is not full-bleed image + centered text." Negative constraints break priors better than positive ones because they forbid exactly what the prior wants to emit.
3. **One reference image per variant** — flips the P-mode one-query-one-result cap from liability to feature: each blind subagent gets a *different* single reference.
4. **1–2 alien-archetype seeds** — deliberate transplantation ("construction site as editorial magazine"); memorable picks live here.
5. Keep blind parallel generation — prevents anchoring; necessary, not sufficient.

Kill the post-hoc similarity *regeneration* loop: no metric exists (vaporware), regeneration oscillates, and visual similarity is the wrong metric anyway. Replace with a crude **structural fingerprint** (normalized tag sequence, section order, grid columns), run once: near-duplicate pairs get deduplicated *before Sean sees them* — legitimate non-taste filtering — never regenerated.

**4) A4 merge — manifest sufficient?**
Split the claim. **Mechanical merge is real if and only if A2 imposes generation-time contracts**: a shared token schema (identical custom-property names across variants) and sandboxed sections (self-scoped CSS, declared interface: height, entry/exit events). Then "3's layout + 5's palette + 1's hero" = variant-3 `sections.json` + variant-5 `tokens.css` + variant-1 hero subtree. **Semantic merge** ("3's energy with 5's restraint") is regeneration wearing a merge costume; it will always be regeneration — call it a constrained re-brief (that's A5, and it's fine *as* A5). The manifest is necessary, not sufficient; the discipline lives at generation time. Two warnings: transplanted palettes break (contrast, density, and rhythm were tuned together — expect one convergence round post-merge), and merged candidates usually rank below pure winners because merging destroys internal coherence. Build the narrow version — R1 explicitly asks — but bias the protocol so pick-or-branch is always cheaper than merge.

**5) N-number.**
The rationales given are fake rigor. "Odd avoids tie-votes": Sean doesn't vote, there is no tally, and ties resolve by merging. "5 legible at zoom": unprobed, API-dependent. "7 matches Rule 40": **double-counting** — Rule 40's 8–12 is *concept* breadth, and §4.2's own ladder puts Sean's taste cut between concepts and renders, so render survivors should already number ~3–5. Rendering 7 re-litigates concepts Sean already cut. The real constraint is comparative discrimination: past ~4–5 multidimensional artifacts, human judgment collapses into satisficing. Proposal: **cap judgment width at 5; achieve breadth in waves, not width.** Awe tier = wave of 5, then a second wave of ≤3 seeded from shortlisted-but-unpicked concepts, conditioned on wave-1 reactions. Effective breadth 8 (Rule 40's floor), never more than 5 judged at once — and wave 2 *is* iteration, which the source transcript says is the entire game. Add two-pass judging regardless (3-second kill pass; deep pass on survivors). And meter the render loop: "cents" is asserted, never measured; the only costed line in the ladder is video.

**6) R4 recall, concretely.**
Three moves, all extending shipped patterns:
- **Split the monolith.** 61,393 bytes / 21 archetypes ≈ 2.9KB each. Emit generated `archetypes/<id>.md` split files — a build artifact, so it cannot rot against the source.
- **Generate a routing index.** Sibling to the shipped `check-brain-links.mjs`, same script family and test doctrine: `build-brain-index.mjs` emits `index.json`, ≤2KB — per archetype: id, one-line thesis, 3–5 trigger keywords derived from the file's own content. §2 says the shipped file *already contains* a comparison matrix and a "how to pick an archetype" section; the index is extraction of an existing in-file decision aid, not curation. Worst-case agent load: 2KB index + 3 archetype files ≈ 11KB instead of 61KB — and, more important, *addressable*: the agent knows what it didn't load.
- **Wire the hop into the skills.** One line in `create-with-context` / `design-dialogue`: "before proposing layouts, read `design-brain/index.json`, load ≤3 matching archetype files." Skills are the router — no new agent, no 400KB index (HY3's warning honored by construction). Add routing positive-controls to the existing 73-test suite: "brief keyword X routes to archetype Y."

**7) The Sean bottleneck.**
A proxy rubric is the wrong answer. Taste-proxy scoring is Goodhart bait, and pre-filtering to "the 3 Sean will like" requires a model of Sean *more accurate than the generator's hit rate* — the Taste Ledger again with a rubric skin. Automate **mechanical gates only**: Rule 1, 300-line cap, taxonomy BANNED list — shipped doctrine, no taste claimed. The real answer: N-up changes the *economics* of Sean's attention rather than multiplying it. Seven sequential reviews is 7× load; five side-by-side with captions is **one comparative judgment plus a kill-list**, and comparison is cognitively cheaper than scoring. Conditions: (a) concept cut pre-render (30 seconds on text lines saves rendering duds), (b) structural dedup pre-judgment (Q3), (c) two-pass protocol (Q5). Bonus: every N-up session emits preference data — winner, kill order, reasons — for free. Logged, that *is* Kimi's missing measurement instrument. Zero new machinery.

**8) Absence-first, ranked by money on the table.**
1. **The asset-first stage is missing — and the ladder silently inverts it.** §1 step 2 (asset pack *before* design, "the step most people miss") became §4.2's "creative: winner only," and no A-module owns creative at all. Per §2, *video* generation ships; nothing shows image plates shipping. Variants composed from no real material is the cheapest explanation for outputs that don't feel like $100k. Generate one shared 3–5-plate pack pre-divergence; every variant composes from it — which also doubles as the true divergence test: same material, different composition.
2. **No canvas probe stage.** §6 lists the API UNKNOWN; the *plan* contains no step to resolve it. One day, binary outcome, A2/A3's render tier hangs on it.
3. **No handover fidelity checkpoint.** A6 is one line; the $100k bar dies at artboard→React lossiness. Needs an acceptance compare — winning artboard vs. build, side-by-side — before anything ships.
4. **Motion representation at judgment** (see Q3): motion-seeded variants are currently judged with the motion removed.
5. **Trades/construction archetype.** R3's own worked example is uncovered; the first real demo seeds from 21 archetypes, none right. Content addition to a shipped file — cheap, high demo value.
6. **Cost metering** on the render/creative loop.
Also missing: an escalation path for the D4-vs-reference-ladder URL conflict — inherited open, with §4.4 piling the sniping corpus on top. That's a Fable ruling, not an engineering task; queue it before B1.1 unblocks.

**9) Vaporware ranking (most → least likely to ship broken).**
1. **A4 merge** — sandboxing across independently generated variants works in demos, breaks on the second real site; semantic merge ships *labeled* as merge while being regeneration.
2. **A2's similarity-regeneration loop** — no metric, oscillation risk; lands as a string-similarity hack that blesses near-identical skeletons.
3. **Voice-first autonomy inside A1** — no module owns it; failure shape is a sycophantic 40-question interview Sean abandons by question 12.
4. **A6 handover fidelity** — ships "working," visibly downgraded.
5. **A7 as speced** ("router-level index," vague) — medium risk as written; near-zero if built as the generated artifact in Q6.
6. **A3** — probe-dependent binary: works day one or doesn't exist.
Caveat: one day of canvas probing reorders this entire list.

**10) SwanStudios homepage — direction: "ONE TAKE."**
The homepage is a single continuous shot. `Swans.mp4` (KEPT) is not a hero background; it is the *spine* — scroll scrubs an extended, frame-interpolated ~25s cut (shipped video service + the interpolation fix; ~25s matches the transcript's own clip guidance), with C13 Scroll-Bound Macro Journey as structural seed and editorial restraint as execution.
- **The ONE impossible phenomenon: wet type.** DOM headlines rendered *into* the water — displaced in real time by the footage's own luminance via a WebGL displacement map. The video is the physics engine for everything else on screen. The site's single lie: typography with fluid mechanics. The interpolation fix is load-bearing — it's what makes the scrub feel like water rather than a flipbook.
- **Signature moment: the wing-beat wipe.** Chapter transitions ride the swan's beat — one wing sweep, sampled at the beat (~200ms), wipes to the next chapter. The user realizes their scroll is riding the bird's rhythm. Scroll velocity maps to playback rate, clamped 0.25–2×.
- **Motion grammar: one timing source.** Nothing moves independently of the footage except the cursor, which trails a small ripple (200ms decay). UI enters only at chapter boundaries with a "settle" ease — 600ms, 4% overshoot, no bounce. The wing-beat is the *only* fast gesture on the site; one fast move in a slow site is what makes both legible. Enchantment-ratio discipline: dense type where the footage is calm, near-silence where motion peaks.
- **Palette:** near-black water, bone type, one accent **sampled live from the current video frame** — the brand accent is literally the water's color at this scroll position. (Assumed: serif display honors the taxonomy PREFER list — verify against BANNED before build; I cannot read it.)
- **Fallback:** reduced-motion = film-strip chapters, static frames, undistorted type. If DOM displacement is too heavy on target hardware, pre-bake type-into-water into the extended cut for hero moments, keeping an accessible DOM layer beneath.

---

**Highest-value catch:** §4.2 inverts the source transcript's #1 finding. Assets-first — "the step most people miss" — became winner-only creative, and no A-module owns creative at all, while §2 shows image generation unshipped (only video). Every downstream sophistication (seeding contracts, merge manifests) is being built to judge variants composed from *no real material*. That is the cheapest possible explanation for the gap to $100k outputs. One shared 3–5-plate pack, generated pre-divergence, composed differently by every variant.

**Cut entirely:** B6 as a standalone measurement instrument. Unbuilt for a week; half-duplicates the shipped `design-dialogue` rejection log (the Rule 52 violation this packet was written to prevent, re-entering one level up); Goodhart bait; and the N-up canvas with kill-order logging *is* the instrument — Sean's comparative pick, recorded, at the only gate that matters.
