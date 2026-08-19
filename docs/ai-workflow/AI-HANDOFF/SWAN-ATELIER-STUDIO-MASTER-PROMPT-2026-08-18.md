# MASTER PROMPT — build SWAN ATELIER STUDIO

**For:** a worker-bot executing a Fable-tier plan (Rule 68). **Authored:** 2026-08-18 by Claude Opus 5 after a 3-model hostile panel.
**Execute with zero further questions.** If you find yourself needing to ask the plan's author something, the answer is in one of the source documents below — read it there.

---

## 0 · READ THESE FIRST (do not proceed without them)

| Path | What it gives you |
|---|---|
| `docs/ai-workflow/AI-HANDOFF/SWAN-ATELIER-STUDIO-FINAL-PLAN-2026-08-18.md` | **PRIMARY.** Verdict, convergent findings, adjudicated disputes, revised architecture (§5), N-number table (§5.1), blueprint + wireframe + flowchart (§6–8), sequencing (§9), open gaps (§10) |
| `docs/ai-workflow/AI-HANDOFF/SWAN-ATELIER-STUDIO-REVIEW-PACKET-2026-08-18.md` | Ground truth §2 — **what is already shipped. Read before building anything.** |
| `docs/ai-workflow/AI-HANDOFF/GLM-ATELIER-STUDIO-REVIEW-2026-08-18.md` | Strongest single catch (assets-first inversion); the "ONE TAKE" homepage design |
| `docs/ai-workflow/AI-HANDOFF/KIMI-ATELIER-STUDIO-REVIEW-2026-08-18.md` | Null-winner path; recall-as-placement-problem; absence ranking |
| `docs/ai-workflow/AI-HANDOFF/QWEN-ATELIER-STUDIO-REVIEW-2026-08-18.md` | Constraint-inversion argument. **Its module names are hallucinated — ignore its B-stage advice.** |
| `docs/ai-workflow/AI-HANDOFF/SWAN-BRAIN-ATELIER-UNIFIED-2026-08-11.md` | The spine this is a module on. Its §3 Fable ruling is binding and **must not be re-litigated.** |
| `docs/ai-workflow/design-brain/field-techniques.md` §T4, §T5 | Tournament + Claude Design doctrine, already captured |

---

## 1 · BRANCH LAW — non-negotiable

The working tree at `wip/comms-notifications-2026-07-05` is **2,094 commits behind `origin/main`**. The design brain here is a **stale fork** — files that exist on main are absent here.

**Cut a fresh branch from `origin/main`. No exceptions.** Building the brain on this branch forks the design system a third time. Verify with `git log --oneline origin/main -1` before your first edit.

---

## 2 · THE ONE-LINE THESIS

> Generate the material **once**, diverge on **structure** not style, judge **≤5 side-by-side** with live tweak levers, **graft — never "merge"**, and let the picking itself be the measurement instrument.

Claude Design converges on one artifact iteratively. **Swan diverges into a fleet, judges on one canvas, and grafts.** That difference is the product.

---

## 3 · SEQUENCING — build in this order

Do not reorder. Both paid reviewers independently put recall first.

1. **A7 Recall** — generated `archetypes/<id>.md` splits (21 × ~2.9KB from the shipped 61,393-byte `website-archetypes.md`) + generated `index.json` ≤2KB (id, one-line thesis, 3–5 trigger keywords) + **one line added to `create-with-context` and `design-dialogue` contracts**: *"before proposing layouts, read `design-brain/index.json`, load ≤3 matching archetype files."* + routing positive-controls added to the **shipped** 73-test suite (`scripts/design-brain/check-brain-links.mjs`).
   - The splits are a **generated build artifact**, not a hand edit — so they cannot rot against the source.
   - Test classes to add: *router entry count == archetype file count*; *every fixture trigger phrase resolves to exactly one archetype*.
2. **Construction/trades archetype** — currently uncovered, and it is the worked example in Sean's own ask.
3. **A0 Plate Forge** — 3–5 **shared** plates per brief, generated **before** divergence.
4. **5-up smoke test on a toy brief** — prove structural divergence actually diverges *before* building infrastructure on the assumption.
5. **A2 + A2b + A3** — the engine.
6. **A5 null-path + kill-order log.**
7. **A4 graft + A6 handover checkpoint.**

---

## 4 · THE FIVE CONTRACTS YOU MUST NOT VIOLATE

### 4.1 — Structural divergence (all three reviewers, independently)
Seeding archetype/style/motion constrains the **recipe, not the structure**. The model prior wins: "construction homepage" → hero + cards + footer regardless of seed.

**Therefore:** each variant gets a **distinct hand-specified structural skeleton** — chapter count, grid, nav model, hero mechanics — plus **anti-specifications** phrased as negatives (*"no top nav bar"*, *"hero is NOT full-bleed image + centered text"*), plus one **alien-archetype wildcard** (*"construction site as editorial magazine"*). Style is free. Subagents generate **blind** to each other.

**Acceptance test:** if two variants share a normalized DOM structure, they are the same variant and the build has failed.

### 4.2 — Assets first (the panel's highest-value catch)
The source transcript's step 2 is *"generate the brand asset pack before designing — the step most people miss."* An earlier draft inverted this to "creative: winner only." **That inversion is the cheapest explanation for output that doesn't feel like $100k.**

**Therefore:** A0 generates **one shared 3–5 plate pack pre-divergence**; every variant composes from the same material. This is also the **true divergence test** — same material, different composition isolates composition from material.
**Budget note:** the canvas caps at 16 MiB/document and 2 MiB/entry, images ~70 KB bare base64. Shared plates are stored once and referenced N times; per-variant private plates would blow the cap. The size limit and the assets-first fix point the same way.

### 4.3 — Never say "merge"
"Merge" decomposes into three operations with three different truths:
- **token/palette swap** — real, cheap, falls out of manifests
- **section graft** — real, fragile, needs self-scoped CSS + declared section interface
- **layout transfer** — **fantasy. It is regeneration wearing a merge costume.** Out of scope; name it as regeneration when asked for.

The module is called **A4 · Graft & Re-tokenize.** Mechanical grafting only works if **A2 imposes generation-time contracts**: identical custom-property names across all variants, and sections that are self-scoped with a declared interface (height, entry/exit). Impose them at generation, or A4 is impossible later.

### 4.4 — Dedupe once, never regenerate
The similarity-**regeneration** loop is cut. No metric was ever specified, visual similarity is the wrong metric, and regeneration oscillates.
**Replace with:** a **structural fingerprint** (normalized tag sequence + section order + grid column count), computed **once**. Near-duplicates are **dropped before Sean sees them**. Never regenerated.

### 4.5 — The null-winner path
At 30–50% per-generation satisfaction, **"all variants are bad" is the modal outcome**, and the earlier plan only branched from a winner. That routes to "ship the least-bad" — the exact failure the whole program exists to kill.

**Therefore:** A5 has an explicit reject-all branch that re-diverges carrying what was learned. Hard cap **3 rounds**, then escalate two finalists to Sean.

---

## 5 · WHAT IS ALREADY BUILT — DO NOT REBUILD

Verified on `origin/main` this session. Rebuilding any of it is a **Rule 52 anti-rework violation** — the exact mistake the prior author was caught making.

`website-archetypes.md` (21 archetypes, 61KB) · `style-taxonomy.md` · `typography-grid.md` · `field-techniques.md` (T1–T6) · `grill-me` · `design-dialogue` (**records rejected options + why — shipped and currently unused; consume it**) · `create-with-context` · `check-brain-links.mjs` + 73 tests + `npm run brain:links` · `contentStudioVideoGenerationService.mjs` (+5 test files, fail-closed).

**Two things were CUT from the proposal and must stay cut:**
- **The taste sieve** — Goodhart bait; it is the Taste Ledger with a rubric skin. **Mechanical gates only** (Rule 1 no-MUI, 300-line cap, taxonomy BANNED list). No taste is ever claimed by a machine.
- **A new measurement instrument** — the N-up canvas with a kill-order log **is** the instrument. Log what already happens; build nothing.

---

## 6 · THE CANVAS — verified capabilities, use them

The `design` skill was probed live. These are `[VERIFIED]`, not assumed:

- **Artboards are not count-capped** — limits are 16 MiB/doc, 2 MiB/entry. Every `.dc.html` is an artboard; `canvas.json` positions them.
- **Pages (≤40)** → **tournament rounds are pages** on one canvas. This is the persistence model.
- **Annotations (≤200 sticky notes)** → the per-variant **motivation + tradeoff** caption. The skill's own doctrine requires it: *"a set where only your favorite gets a case made for it is a rigged vote."*
- **Tweak chips** (`data-props` with editors) → **live levers, zero regeneration.** 4 artboards × 3 levers ≈ dozens of explorable states while Sean judges only 4 objects. **This is how Sean gets the "5–7 options" experience he asked for without the judging cost.** Levers are behavioral switches and cross-cutting values only — **never** a tweak for body copy.
- **Copy/paste between artboards is native**, and template holes re-resolve at the destination → section-graft has both a GUI path for Sean and a programmatic path for you.
- **NOT available:** design-system color tokens and the "request tweaks" agent loop (they need the claude.ai/design backend). Swan's `design.md` + per-project `brand.md` is the substitute.

**N-number (settled):** 8–12 text concepts (free, Rule 40) → Sean's 30-second cut → **render 4** (5 for awe) → tweak levers → **wave 2 of ≤3** only if needed. Effective breadth ≥8; judged width ≤5; regenerations to explore a variant: **0**. Two-pass judging: 3-second kill pass, then deep pass on survivors.

---

## 7 · HONEST GAPS — carry these, do not paper over them

- **Three spine mechanism gaps remain open:** no frame interpolation, reference depth capped (Mobbin P-mode one-query), no pixel-convergence. A0 partially closes the fourth (custom creative). **If these slip, this ships as a divergence engine over mediocre bases — five flavors of the same weakness.**
- **D4 vs. reference-ladder URL conflict** — inherited open from Atelier B0.4; the UI-sniping corpus (21st.dev / Aceternity / ReactBits, all confirmed absent) piles onto it. **This needs a Fable ruling, not an engineering decision.** Do not land the sniping corpus until it is ruled.
- **P-mode one-query cap rationale is `[UNKNOWN]`** — commit `9599539d8` has a bare message. Atelier B1.1 stays blocked pending Sean.
- **Cost per artboard is unmeasured.** Step 4's smoke test must meter it. Do not repeat the "cents" assertion without a number.
- **Voice-first autonomy has no owner module.** Predicted failure shape: *"a sycophantic 40-question interview Sean abandons by question 12."* **A1 must carry a hard question budget.**
- **Motion is judged with the motion removed** — a motion-seeded variant looks *emptier*, not livelier, on a static artboard. Unsolved; it may argue against motion as a seed axis entirely.

---

## 8 · DEFINITION OF DONE

Per **Rule 73 (Proof-Before-Done)** you may not write *done / fixed / complete / working* without, in the same message: current-session executed proof, **and** a hostile-review pass that came back clean.

Per stage: `npm run brain:links` clean (28 files · 0 defects) · new routing tests green · `npx tsc --noEmit` from `frontend/` · targeted vitest · Rule 42 backend audit (`git ls-files --others --exclude-standard backend/` **and** `git diff --name-only HEAD backend/`) · secret scan.
Per **Rule 70**: commit per slice locally with explicit paths, **push once at batch end** — no per-slice deploy waits.
Per **Rule 57**: close with a plain-English section **before** the technical one.

---

## 9 · SUGGESTED SKILLS

| Skill | When |
|---|---|
| `drift-check` | **First action.** Confirm branch freshness before trusting any file. |
| `swan-orchestrator` | Pre-task gate — Rules 15/17/26/32 before implementation. |
| `design-dialogue` | A1 Brief Engine. Propose alternatives; record rejections. |
| `grill-me` | A1 gap-fill only, after design-dialogue. Hard question budget. |
| `swan-design-router` | Any visual output. Loads the cinematic system + storyboarding. |
| `design` | A3 — seed and publish the N-up canvas. |
| `test-driven-development` | A7 routing tests; write the failing test first. |
| `blast-radius-guard` | Only if anything touches DB/migrations. Not expected here. |
| `closeout-evidence-lock` | Every substantial slice close. |
| `hermes-inbox` | Memo at close — **must** include `## Mistakes I made`. |
| `hermes-learning-packet` | If Fable-tier and the lesson is durable. Emit unprompted. |

---

## 10 · OPEN DECISIONS OWNED BY SEAN (do not decide these yourself)

1. **N-number** — he asked 5–7; the panel argued down to 4 and the tweak-lever finding gives the breadth back. Recommendation on the table: **4 (5 for awe) + levers + wave-2.**
2. **Sequencing** — recall-first (recommended, both paid reviewers) vs. engine-first.
3. **Scope of the three open spine gaps** — in this program, or does Atelier stay parked and Studio ships on what exists?
4. **The D4/URL conflict** — needs a Fable ruling before the sniping corpus lands.

**Panel cost for the review that produced this: $0.0708** (GLM $0 subscription · Kimi $0.0708 · Qwen $0 local).

---
---

# ROUND 2 AMENDMENTS — RULED BY FABLE 5, 2026-08-18 (these SUPERSEDE the sections they name)

Source: `docs/ai-workflow/AI-HANDOFF/SWAN-ATELIER-STUDIO-R2-RULINGS-2026-08-18.md` (read it in full; this is the delta summary).

**Supersedes §3 (sequencing):**
0. Cut branch from `origin/main` (unchanged, now explicit step 0)
1. **SMOKE TEST FIRST** — 4-up, toy brief, an EXISTING covered archetype, 3 hand-generated plates, dedupe by eye, one hand-written kill-log line. **HARD GATE: if any two rendered variants share a skeleton-contract fingerprint — HALT, report the collision, build nothing further.** Divergence must be observed, never assumed.
2. A7 recall (parallel with 1). Routing tests may trail one slice. Table carries a source-monolith hash.
3. Construction archetype → first production run (decoupled from validation).
4+. A0 → A2/A2b/A3 → A5+log schema → A4+A6.

**Supersedes §6's N-number:** 4 default · 5 awe rendered **2×3 with a ghost cell** showing the shared plate manifest · levers on ALL variants, **style/token-level only** (a structural lever is a regeneration in a chip costume), defaults = as-designed state, reset-before-compare convention, lever enums drawn from rejection-log-filtered space · kill pass judges THUMBNAILS by design · wave-2 = re-rolls of **execution-killed lineages only** + frozen survivors (never re-rendered; lever state at pick in caption). Idea-killed concepts stay dead.

**Supersedes §4.4's regeneration ban wording:** banned = post-Sean taste-driven regeneration. Pre-Sean fingerprint-driven re-rolls (dedupe replacement, wildcard-alienness re-roll) are legal.

**A2b fingerprint redefined:** = the skeleton-contract fields themselves (nav model, hero mechanics-as-interaction-model, chapter count, grid). Dedupe is contract-compliance, not a tag-sequence heuristic. Run it also wildcard-vs-skeletons; adjacent → re-roll pre-Sean.

**Motion:** NOT a v1 seed axis. "Hero mechanics" means interaction model (structural). Motion enters winner-only post-treatment. Frame interpolation = quarantined parallel slice **A0b**: spike first, acceptance includes text-legibility after interpolation, never blocks an A-module.

**The kill-order log is now DEFINED and MANDATORY (one JSON line per session):**
`{ts, brief_id, archetype_ids[], plate_pack_id, variants:[{id, skeleton_id, outcome: killed|survived|winner, kill_rank, pass, reason_code, lever_deltas}], null_winner, rounds, wave2_used, cost_usd, wall_s}` — reason codes `idea|execution|style|structure|unknown`. It is the **session-write API into the shipped `design-dialogue` rejection log** — ONE artifact, not two. Without this line the instrument silently ships empty.

**A0 additions:** brief-driven plate generation (archetype + `brand.md` → per-plate briefs with ROLE assignments: hero-bleed / texture / proof / negative-space, + aspect) · pack consistency check (shared palette/type) · **Sean thumbs-up on the pack BEFORE divergence** (5-second gate). **SAME-PACK LAW: all variants in a round compose from the same plate pack; a variant needing material the pack lacks LOGS the need and composes around the gap — never generates bespoke material mid-divergence.**

**A1:** draft-first — propose the brief, Sean edits the diff. HARD CAP 5 questions; grill-me fills gaps only.

**A4:** token-schema compatibility check runs BEFORE any graft attempt.

**A6:** drift budget — screenshot-diff at 2–3 breakpoints, threshold-gated, enumerated mismatches. Sean arbitrates only above-threshold.

**Supersedes §7's D4 gap (now RULED — the three-place model):**
1. Lifted component code = dependency hygiene: repo-durable `THIRD_PARTY_NOTICES` (license, copyright line, pinned version/commit, verification date, per component — 21st.dev licenses are heterogeneous, verify EACH). MIT attribution is mandatory; token-adaptation does not erase it.
2. Reference URLs: threads are archive-not-memory (no skill loads thread archives); URL redaction is a REGEX STEP in handoff-doc generation.
3. Ledger: judgments yes, transcriptions of third-party structure no. Provenance shape: `aceternity/shimmer-button · MIT · verified 2026-08-18`.
The UI-sniping corpus is usable from day one under this scheme.

**Supersedes §10:** Decisions 1–4 are RULED (see rulings doc). Remaining Sean items: go/no-go on the sequence; P-mode veto after `git show 9599539d8` archaeology (run the archaeology before escalating).

**v1 fence (do not build):** taste sieve (v2 runs the shadow STUDY on logs; v3 builds only if earned, ≥~30 sessions) · per-variant material budgets (shared pack is the control group) · motion-seeded variants · layout transfer · multi-judge.
