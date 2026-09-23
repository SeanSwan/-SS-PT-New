# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/GLM-SWAN-BRAIN-PACKET-A-DESIGN.md
**Tokens:** 75917 in / 26481 out (reasoning: 17730) | total 102398
**Wall:** 539.7s

---

# HOSTILE REVIEW — GLM-5.3 — SWAN BRAIN (DESIGN) — 2026-08-15

## VERDICT

The Swan Brain is the best compliance system I have read bolted to an unfinished taste system. Its floor is genuinely excellent — the contrast table recomputes correctly (I verified five pairs by hand), the dispersion law converts "no ugly rainbows" into physics a linter can enforce, and `psychology.md` is the most honest treatment of persuasion research I've seen in a design doc. But the ceiling is hollow for four reasons, two of which the brain *admits itself*: (1) the 2026-07-19 "Crystalline Canon" rewrite of `design.md` renumbered every section and **nobody updated the satellites** — `motion.md`, `components.md`, `anti-patterns.md`, `qa-gates.md`, and `website-archetypes.md` now contain ~25 cross-references of which at least 8 point at sections that no longer exist and the rest point at the wrong content; (2) `typography-grid.md` — the file specifically built to close Kimi's "weak substrate" finding — **crystallizes a second, incompatible token system** (spacing, radius, easing, duration, content-max all diverge from canon) *and is not listed in `index.md`*, violating the index's own law; (3) the $100k bar is still asserted everywhere and measured nowhere; (4) the brain's own CONVERGENCE note confesses the flagship aesthetic has no machinery behind it — the image generator is a 3-line stub, there is no video-gen step, no frame interpolation, no reference depth, no pixel-space convergence. Right now this brain reliably prevents the 20th percentile and occasionally permits the 80th. $100k-tier happens only when Sean personally injects taste. That is a museum with an excellent security guard, not a machine.

---

## 1. SEVERITY-RANKED DEFECTS

| # | Finding | File + section | Severity | Why it costs |
|---|---|---|---|---|
| 1 | **Cross-reference epidemic.** The canon rewrite renumbered design.md §1–28 → §1–17; every satellite still cites the old map. Dangling: `motion.md` header "Extends design.md §25", §4's §17/§18/§19; `components.md` §6 "design.md §20", §10 "§21", §13 "§22", §16/§17 "§§15,20"; `anti-patterns.md` header "§27", "§1.7", "§24". Wrong-target: `components.md` §1 "§10"/"§5" (now §11/§6), §2 "§9" (now §11), §7 "§15" (now §11), `qa-gates.md` Gate 2 "design.md §10" (focus matrix is §6), `website-archetypes.md` #18 "design.md §15". | motion.md, components.md, anti-patterns.md, qa-gates.md, website-archetypes.md vs design.md v2.0 | **CRITICAL** | This is *exactly* the router-contradiction class that historically produced minimum-effort output. An agent that follows a pointer into a nonexistent section resolves safely by **ignoring the doctrine it couldn't find**. The canon's supremacy is fictional: most task-time loads never touch it correctly. |
| 2 | **Two sovereigns.** README §1/§4 and index: `SWAN-CINEMATIC-DESIGN-SYSTEM.md` "wins all conflicts," changes flow through *that* doc's §G. design.md: "crystallized here in full — the brain knows, it does not point," frozen, thawable only via "measured failure (numbers)." A palette change now has two legitimate, mutually exclusive procedures, and design.md never restates the source-doc precedence at all. | README §1/§4, index.md, design.md header + §1/§16 | **CRITICAL** | Conflicting authority means whichever doc an agent loaded last wins. Token drift becomes *procedurally defensible*. Also: the "measured failure" thaw gate has no measurement instrument to feed it (see #6) — so the canon is frozen behind a lock that cannot be legally opened. |
| 3 | **Token schism.** design.md §9 spacing `4…32 48 72 108 160 240` vs B7 §3 `…48 64 96 128`. design.md radius `20/12/999/24` vs B7 §5 `6/10/16/24/9999` — **B7 has no 20px card radius and no 12px control radius**. design.md §8 easing `cubic-bezier(0.16,1,0.3,1)` vs B7 §6 `--ease-standard: cubic-bezier(.2,0,0,1)`. Three duration token families: `--speed-snap*` (design.md), `--motion-response*` (motion.md), `--dur-*` (B7). Content ceilings: 2240px (design.md §10) vs 1280/1600 (B7 §4) vs ~1920 dashboards (design.md §11/§17). | design.md §8/§9/§10 vs typography-grid.md §3/§4/§5/§6 vs motion.md §1 | **HIGH** | B7 is stamped "CANONICAL (contract)" and was built *specifically* to close Kimi's substrate gap. Instead it guarantees divergent UI: lint enforces design.md, so B7 is either dead letter or generates permanent exception noise. The substrate fix made the substrate worse — now there are two. |
| 4 | **index.md violates its own law.** "Every file in `docs/ai-workflow/design-brain/` is listed here… If you add a file, add its row in the same pass." `typography-grid.md`, `style-taxonomy.md`, `field-techniques.md` (all on origin/main, all quoted in this packet) have no rows. | index.md "Law of this file" vs the three files' presence | **HIGH** | The load path is index-driven. The brain's *newest* doctrine — including the entire substrate B7 and the highest-priority technique (T2) — is invisible to any agent that consumes the brain as designed. The folder's constitution is broken by its own newest citizens. |
| 5 | **320ms and the phantom third speed.** design.md §8: "SNAP {120,160,200} · DRIFT {600,720,900} · No third speed exists… raw time values are a lint error." motion.md §1: `--motion-response-slow: 320ms` (modal/drawer enter) and "Response motion never exceeds 320ms." B7 §6: `--dur-slow: 320ms`. Ambient loops: canon `{4000,6000,8000}ms` vs motion.md "6000–20000ms". | design.md §8 vs motion.md §1 vs B7 §6 | **HIGH** | 320ms is the exact "medium" the canon bans; a compliant-with-motion.md modal is a lint failure under design.md. Agents get contradictory answers to "how fast does a drawer open" — a question asked on literally every surface. |
| 6 | **Measurement gap still open (Kimi #5, unaddressed).** No rubric, scorer, cadence, or pass line for the $100k bar anywhere in 5,300 lines. The five taste tests run only at *canon crystallization*, not on shipped surfaces. Gate 3 is qualitative. psychology.md defines rigorous experiments but "no conversion claim is canonical" — i.e., **zero have run** (see Q2). | corpus-wide | **HIGH** | Every upgrade's ROI is unverifiable; the thaw gate in #2 starves; "Awwwards-tier" is a vibe, not a gate. |
| 7 | **Agent-consumption unaddressed (Kimi #7, unaddressed).** No token budgets, no load packs, no per-task retrieval plan. README load order demands CLAUDE.md + ACTIVE-INDEX + two external source docs + README + design.md + subfile + adapter ≈ 20–40k tokens of preamble before work begins — with "stop when you have what you need" as the only throttle, which *invites* under-loading. | README §2, index.md | **HIGH** | Under-loading is the direct mechanical cause of "well-organized average." See Q3. |
| 8 | **The taste ceiling has no engine.** By the brain's own CONVERGENCE note: `generate-image.mjs` is a 3-line style string, no video-gen in the loop, no 30→60fps interpolation for WFX-05 scrub, no reference-depth intake, convergence happens in React (~100× cost per iteration). Meanwhile ~15KB of spec is spent on a SHA-256 deterministic family-balanced world roulette and a 120-frame/1.5×-quantum/LoAF measurement ritual. | field-techniques.md CONVERGENCE vs worlds.md roulette, techniques.md §3, experience-mode.md §9 | **HIGH** | The brain has a provably fair dice for a casino with no games. Specification energy is inverted: maximal rigor on *selection* and *measurement* of effects, zero machinery for *producing* the creative that "is the heavy lifter" (T2's own words). |
| 9 | **QA matrix triple-booked.** design.md §17 crystallizes 6 classes (320/375/414 · 768 · 1440 · 2560×1440 · 3840×2160); qa-gates Gate 1 demands the full 11-row rule-24 matrix; B7 §1 binds to `breakpoints.ts` with 12 tiers including 430/576 that appear in *neither* matrix, and 3440 remains unresolved (B7's own admission). | design.md §17 vs qa-gates Gate 1 vs B7 §1 | MEDIUM-HIGH | The canon *silently narrowed* the house test matrix — the exact "skipping viewports" disease B7 was written to kill. Three matrices means agents test whichever they loaded. |
| 10 | **C11 vs the Cormorant budget.** design.md §7: one italic beat per *viewport*. design.md §11 + components.md §5: *every* chart sits in a C11 environment whose anatomy includes a Cormorant insight line (design.md hedges "if budget allows"; components.md states it unqualified). A three-chart trainer dashboard is either C11-incomplete or §7-violating. | design.md §7/§11 vs components.md §5 | MEDIUM | Guarantees inconsistent drama-font discipline on the product's core surfaces — calm data zones with three competing serif whispers. |
| 11 | **Dead doctrine still cited: the legendary gradient.** design.md §4: "The old cyan→purple→gold animated wash is BANNED"; §6: "legendary = §4 faceted edge." motion.md §1 lists "legendary-rarity gradient" as a *legal ambient example*; website-archetypes #9 and #16 both specify "Legendary=gradient." | design.md §4/§6 vs motion.md §1, website-archetypes #9/#16 | MEDIUM | A banned treatment is recommended in three satellites. Any agent building gamification (client portal) gets told to ship the thing the rainbow lint rejects. |
| 12 | **Duplicated law text.** The canonical frame-measurement law appears *verbatim twice* (techniques.md §3 and experience-mode.md §9). | techniques.md §3 ≡ experience-mode.md §9 | MEDIUM | Today identical; the first one-sided edit forks the brain's most precision-sensitive law. The canon's own §1 logic ("one source, one truth") is violated by its newest files. |
| 13 | **Write-only memory.** The obsidian/graphify bridges and a design-decision-log *policy* exist (per index), but the README load order never routes any task through the decision log. Decisions are recorded and never retrieved. | README §2 vs index obsidian/ rows | MEDIUM | Kimi's "write-only corpus" failure, recurring at system scale: rationale accumulates, drifts, and confers zero task-time immunity. |
| 14 | **B7 internal incoherence.** "Base is 16px and never smaller — 14px body is the most common 'looks cheap' tell" (§2) vs `--type-sm` 14.4px "Secondary body, table cells" (§2). Acceptance criterion #5 "breakpoints byte-identical to creator Claude's landed 414/768/1024" is unfalsifiable against §1's own 12-tier canonical binding. | typography-grid.md §2, §1, §8 | LOW-MEDIUM | The substrate's acceptance criteria can't all be true simultaneously; a contract that can't fail is decoration. |
| 15 | **Hygiene.** design.md header dates conflict (frozen 2026-07-04; adopted 2026-07-19 from a different doc); Galaxy-Swan ban hexes are uppercase in design.md §14 and lowercase in anti-patterns (a case-sensitive lint catches only one); field-techniques.md has two "T4" headings; the copy-lexicon bans the word "journey" while the doctrine's flagship concept, its rule name, and its technique (C13 "Scroll-Bound Macro Journey") all use it — a compliant agent cannot name what it is building. | design.md header/§14, anti-patterns.md, field-techniques.md | LOW | Each trivial; together they testify that "update the satellites in the same pass" is a policy with no mechanism — in the folder whose entire thesis is that policy-without-mechanism is hope. |

---

## 2. CONTRADICTIONS FOUND

| File A says | File B says | What an agent does when it hits this |
|---|---|---|
| README §1: source-of-truth doc wins conflicts; brain must be rewritten to match | design.md: canon crystallized in full, frozen, supreme; thaw needs "measured failure (numbers)" | Cites whichever it read last; palette changes proceed under two different procedures; thaw is impossible because no measurement exists (#2, #6) |
| design.md §8: durations are exactly {120,160,200}/{600,720,900}, "no third speed," raw values are lint errors | motion.md §1: 320ms response-slow, ambient 6000–20000ms; B7 §6: `--dur-slow: 320ms` | Ships a drawer at 320ms and fails `swan/two-speed`, or ships at 200ms and violates motion.md — then picks the doc that agrees with what it already built |
| design.md §9 spacing/radius scales | B7 §3/§5 entirely different scales, stamped CANONICAL (contract) | Uses B7 for new surfaces, canon for old; the two never visually match; lint noise teaches agents to ignore lint |
| design.md §10/§11/§17: content caps 2240px / ~1920 dashboards; QA matrix 6 classes | B7 §4: `--content-max` 1280/1600; qa-gates Gate 1: 11 rows; breakpoints.ts: 12 tiers incl. 430/576 | Tests whatever matrix it loaded; 3440 and 430 coverage is luck |
| design.md §4/§6: legendary = static faceted edge; gradient wash BANNED | motion.md §1 ambient examples include "legendary-rarity gradient"; website-archetypes #9/#16 "Legendary=gradient" | Builds the badge the lint will reject; or quietly downgrades legendary to nothing |
| components.md universal header: "every interactive element ≥44px" | design.md §10: cockpit density 32px floor under `pointer:fine` | Ops tables get 44px (unusable density) or 32px (technically violating the satellite) depending on load order |
| design.md §7: one Cormorant beat per viewport | design.md §11 + components.md §5: every chart's C11 anatomy includes a Cormorant insight line | Multi-chart dashboards either break the budget or break C11; agent picks "insight line in Sora" — inventing doctrine on the spot |
| index.md: "every file… is listed here" in the same pass | typography-grid.md, style-taxonomy.md, field-techniques.md exist, unlisted | Agent following the index never loads the substrate or the flagship technique; they functionally don't exist |
| design.md: design.html is GENERATED (`canon:build`), hand edits reverted by CI | README §3: "whoever notices updates both together in the same pass" (manual mirror contract) | A parallel agent hand-edits design.html per README; CI reverts it; two agents conclude the other is broken |
| design.md §14 copy CI bans "journey" | Rule 40 / C13 / T2 name the taste ceiling "Macro Journey," "Scroll-Bound Macro Journey" | Any user-facing string naming the concept fails the lexicon grep; agent avoids the word and muddles the concept |
| design.md §17 crystallizes a 6-class QA matrix | CLAUDE.md rule 24 (per packet Section 1) mandates the 11-row matrix | The canon narrowed the house rules without a recorded thaw — precedent: any file may silently shrink any gate |
| techniques.md §3: B1 qualification = "zero missed presentations… under 16.7ms" | experience-mode.md §9: identical text, duplicated | No behavioral conflict today — but the first edit to one creates one, and nothing detects it (no shared source, no CI over prose) |

---

## 3. ABSENCE-FIRST GAP RANKING

Caveat: adapters/, obsidian/, graphify/, `external-reference-mcp.md`, and the two source-of-truth docs were not quoted in this packet; where a gap might live there, I say so rather than claim absence.

| # | What is missing | Value left on the table | Smallest version that captures most of it |
|---|---|---|---|
| 1 | **Executable creative-asset pipeline.** Doctrine for cinematic heroes is abundant; machinery is nil (brain's own admission). | The single biggest lever on "$100k feel" — T2's own line: "the creative is the heavy lifter, and Swan isn't lifting it." Every awe surface ships with stock-grade or absent hero art; the taste ceiling is unreachable in principle. | The four CONVERGENCE mechanisms: (a) image-first generation loop (batch stills → Sean picks → video spend on winner), (b) 30→60fps interpolation as a mandatory WFX-05 step, (c) reference-intake ladder (T6's S–D tiers as a Gate-0 declaration), (d) single-file-HTML convergence sandbox with the 3-round tournament cap. One script + one adapter section. |
| 2 | **Component/pattern registry bound to real code + visual gallery of shipped surfaces.** `components.md` names GlowButton/SheenCard/C11 but never says *where they live* (file path, export, last-verified commit). The brain has no visual memory of its own product — no screenshot of any shipped Swan surface exists inside it. | Reuse is the brain's own #1 anti-generic law and it is unnavigable; every agent re-derives or re-finds components, which is precisely how near-duplicate forks happen. | Add a `registry.md` table: pattern → file path → export → screenshot path → verified date. Storybook-lite: 20 static screenshots with routes. Half a day to seed, CI-checkable. |
| 3 | **Quality-scoring instrument** (Q2 below). | The $100k bar, the thaw gate, the upgrade ROI — all currently unfalsifiable. Kimi's largest finding, still open. | SQS-100 rubric + automated half + baseline scoring of 10 existing surfaces. |
| 4 | **Exemplar/deconstruction corpus.** "Awwwards-tier" is invoked with zero curated exemplars. `cinematic-pages.md` §1 defines a superb *format* (pacing principle · depth principle · transition · restraint · what-Swan-must-not-do) — but no filled-in entries. | Agents have no calibration set. Taste is comparative; a brain that never shows excellence can only ban mediocrity. That's the difference between constraint and taste. | 20 deconstructed exemplars (5 per archetype family) in the §1 format, Sean-curated once. |
| 5 | **Load architecture / token budgets** (Q3 below). | The museum-not-machine problem; the mechanical cause of shallow output. | `brain-manifest.json` + 5 load packs + hash citation in QA receipts. |
| 6 | **Analytics→doctrine feedback loop.** Nothing from shipped surfaces (drop-off per act, funnel, rage clicks) ever re-enters doctrine. psychology.md's experiments — the most rigorous loop in the brain — have demonstrably never executed. | Doctrine evolves by Sean's intuition + hostile reviews only; wrong arcs persist indefinitely; the PSY apparatus is expensive dead weight. | Quarterly ritual: 5 funnel metrics per live archetype appended to its entry; run ONE PSY experiment end-to-end to prove the pipe works. |
| 7 | **Copy/microcopy system.** copy-tournament covers conversion copy only. No voice/tone matrix per world (mkt/pro/ops), no canonical microcopy ledger (buttons, errors, empty states, toasts). | Copy is half of perceived quality; four agent-brains writing toast text produce four voices; banned-lexicon defines the floor of language, nothing defines its ceiling. | 50-string microcopy ledger + a 1-page tone matrix (vault-voice for mkt, instrument-voice for pro, telegraph-voice for ops). |
| 8 | **Font-loading and product-surface performance doctrine.** Four families (Jakarta, Cormorant, Fira, Sora), zero `font-display`/subset/self-host/FOUT law (one mention, WFX-06, variable fonts only). Perf budgets exist for cinematic/M4 only — the *product* surfaces that users touch daily have no LCP/image-budget doctrine. | Dark-first sites flash badly; FOUT on a luxury brand is a $100k tell happening on every cold load; product perf regressions are invisible to every gate in this packet. | One section in design.md §17: font strategy (self-host, subset, swap, size caps) + per-route image/JS budgets with the same p75 discipline the M4 lane already has. |
| 9 | **Workout/exercise-animation media contract** (see Q5). The product's core media type — form demonstrations — has no doctrine at all. | Instructional clarity is the anti-cinematic problem (the one place loops are *content*); uncontracted, agents will apply marketing-video doctrine to biomechanics demos. Wrong tool, confidently. | One page: clarity-first rules, loop discipline, slow-motion standard, poster/first-frame, compression budget, reduced-motion parity ruling (a loop that IS the content), ID scheme bound to the exercise DB. |
| 10 | **One worked golden example.** No end-to-end exemplar exists: a real task → the exact pack loaded → the output spec → the QA receipt → the score. | Agents imitate examples far better than they follow rules; every rule in this corpus is unexemplified. | Pick one shipped surface, retro-document it as the golden path, link it from README. |
| 11 | **Conflict law.** Nowhere does the brain say what an agent does when two canonical files disagree (the README's source-doc-wins rule covers only one axis, and design.md omits it entirely). | Every contradiction in Section 2 resolves to agent discretion today. That is the minimum-effort failure mode, codified. | Three lines in the enforcement contract: canon > satellite > adapter; on conflict, STOP and file a fix (one-revert); receipt must name the conflict. |
| 12 | **i18n / long-string resilience decision.** Zero mentions. Uppercase-Sora transforms, 45ch measures, Act-copy shapes — all English-shaped. | Unknown cost — which is the point. If Sean never ships non-English, fine; if he does, retrofitting is a re-layout. | A written decision ("US-only, revisit on X trigger") plus one rule now: no truncated strings, min-width tests with 140%-length dummy copy. |

---

## 4. ANSWERS

### Q1 — $100k-tier, or well-organized average?

As-read at task time, this brain produces **a very expensive, highly consistent 75th percentile.** The doctrine is genuinely strong where it *constrains*: token discipline, the dispersion law (converting taste into physics a linter can fail), the dual-glow surface matrix, the two-speed law, C11 chart environments, the scene ledger with static-frame-first authoring, and the world DNA recipes (Glacier Cathedral's material/light/weather/camera/topology genes are the most *generative* paragraphs in the corpus). Those raise the floor higher than most design systems' ceilings.

It is vocabulary where it *matters*: "editorial asymmetry," "one violent flourish per page," "restraint with a violent flourish" — none of these come with generative instructions, only bans on their absence. The five taste tests are post-hoc filters, not producers. And the three actual producers of exceptional output are all outside the brain: bespoke hero creative (machinery absent, per its own CONVERGENCE note), calibrated taste (no exemplar corpus), and Sean himself (the 8–12-concept taste-cut, every LIQUID proposal, every thaw, every M4 license). **The brain's honest current job is preventing embarrassment; Sean is the taste.** That can be the right architecture — but then the brain's job is to make Sean's taste cheap to apply and impossible to dilute, and today it does neither (no machinery to cheaply generate the 12 concepts he cuts; no calibration so agents inherit his cut).

### Q2 — The measurement gap: still open. Here is the instrument.

**Nothing in the corpus operationalizes the bar.** The five taste tests gate canon changes, not surfaces. Gate 3 verdicts are binary and evidence-free. psychology.md — the only measurable loop — states "no conversion claim is canonical," i.e., zero runs. Build **SQS-100**:

**Structure: 60 points human rubric + 40 points automated = 100.**

*Human (6 dimensions × 10, anchored 0/2/4/6/8/10 with one-line descriptors each):*
1. Composition & hierarchy (screenshot test: stranger names the one big idea in 3s; weighted grid; z-depth)
2. Typography execution (scale discipline, tabular numerals, leading/tracking optics, drama budget held)
3. Color & light discipline (token purity by eye, glow placement, temperature arc where applicable)
4. Craft detail (jeweler's test: edges, spacing rhythm, alignment, grain — crisp, deliberate, placed)
5. Motion quality (tier discipline, signature singularity, dual-gate truth, calm zones clean)
6. Story/arc (logline exists; acts/phases honest; empty states are onboarding)

Required evidence per score: scroll=0 capture, 375px capture, reduced-motion capture, brightest frame (media surfaces). No evidence = dimension auto-zero.

*Automated (CI):* contrast CI pass (10) · zero lint violations incl. `swan/two-speed`, `swan/dispersion-order` (10) · axe zero critical/serious (5) · LCP ≤2.5s / INP ≤200ms / CLS ≤0.1 at p75 (10) · QA receipt complete + brain-hash cited (5).

**Who scores:** two independent scorers — one hostile-reviewer model (different vendor than the builder; this is what `adapters/reviewers.md` is for) per surface, plus Sean on a monthly sample of 3. Inter-rater divergence >10 points on Sean's sample forces rubric recalibration that quarter — Sean is the ground truth, the model is the cheap frequent scorer.

**Cadence:** every surface at closeout (blocks ship on fail); one random live route re-scored weekly (drift watch); full calibration monthly.

**Pass line:** ≥80 overall, no human dimension <6, automated 40/40 mandatory. Set empirically: score the 10 best existing surfaces first; pass line = that baseline's median +5, ratcheted quarterly.

**The loop:** every dimension scoring <6 generates either an `anti-patterns.md` row or a LIQUID proposal within the week. Scores trend on a single dashboard Sean can read in 30 seconds. This also finally feeds the thaw gate (#2) with the "numbers" it legally requires.

### Q3 — Loadability: no. Architecture: manifest → packs → machine tokens.

The corpus is ~5,300 lines ≈ **70–90k tokens** (worlds.md alone is 105KB ≈ 26k). Full load is impossible; full load would also be *wrong* (attention dilution). The current "stop when you have what you need" is an invitation to under-load — the direct cause of Q1's average. Build three layers:

1. **`brain-manifest.json`** (generated, CI-checked): every file, token count, section inventory with valid anchors, standing, last-verified commit. Generation *mechanically exposes every broken cross-reference in Section 1* — this one artifact both fixes defect #1 and prevents its recurrence.
2. **Five load packs**, compiled by `canon:build` from the monolith (agents never load raw design.md prose): `pack:pro` (~6k tokens: worlds/lenses, tokens, components-law, states, gates), `pack:mkt` (~9k: + arcs, C-family, first-frame rules), `pack:cinematic` (~14k: + scene ledger, WFX subset, budgets — justified by risk), `pack:ops` (~4k), `pack:asset` (~3k: storyboarding pointer, style axes, generation economics). Hard budgets, stated in the manifest. Adapter files declare the pack per task type; the QA receipt must cite pack + brain hash — unattributable output becomes detectable.
3. **Machine tokens for lookup:** `canon/tokens.json` already exists per design.md — agents grep JSON for "pill radius," never loading prose for value lookups.

Kill the README's six-document preamble: CLAUDE.md rules and the two external source docs get *compiled into the packs* (the packs become the derived source-of-truth surface; see Q6/kill list on sovereignty).

### Q4 — Contradictions

Section 2 table. The load-bearing pattern: **the canon rewrite didn't propagate**, and the brain has no mechanism that would notice — no CI over prose references, no index law enforcement, no version stamping on satellite citations. Twenty-plus contradictory or dangling pointers, concentrated exactly where agents resolve conflicts by doing the minimum.

### Q5 — Coverage: one genuine contract needed, three covered, two creep

| Domain | Verdict |
|---|---|
| **Workout animation / exercise-form media** | **Genuinely missing, highest product value.** It's the PT product's core media type and the one place where loop-is-content inverts every reduced-motion rule. Contract contents listed in gap #9 above. |
| Audio-reactive visualizers | Covered adequately by WFX-09 (consent, no autoplay, degrade-to-silent). A standalone visualizer *feature* is creep unless Sean names one. |
| Motion graphics / video | Covered by storyboarding + Seedance skills + T1/T2. Gap is machinery, not doctrine. |
| 3D / WebGL / Three.js | Over-covered relative to zero usage — everything is DEPENDENCY-GATED and no spike has happened. Either run the spike once or stop maintaining doctrine for a capability you've declined three times. |
| Scroll-driven / parallax | Covered three times over (cinematic-pages, WFX-05, T2). The only true gap is the 30→60 interpolation step — mechanism, not contract. |
| Generative / abstract art | Doctrine exists (WFX-01/03, style-taxonomy two-axis model). Again: the forge is missing, not the words. |
| Native mobile | **Creep today** (Victory-native is roadmap). Write a one-page bridge stub (tokens export, 44pt parity, back-gesture vs left-rail conflict, native motion mapping) and defer the rest until the app is real. |

### Q6 — The one thing

**Convert the brain from prose to a machine: generate `brain-manifest.json` + the five load packs, and as the generation's first act, repair or surface every broken reference, unindexed file, and token schism.**

Why this beats the runner-up (the SQS instrument): the manifest/pack work is achievable inside a week; it mechanically *exposes and kills* defects #1, #3, #4, #5, and #15 (generation fails on dangling anchors and duplicate token definitions); it closes Kimi's museum-vs-machine finding; and it is the *prerequisite* for measurement — you cannot score consistently when two agents loaded different, mutually contradictory doctrine subsets. The SQS instrument pointed at inconsistently-loaded agents measures noise. Sequence matters: plumbing, then instrument, then machinery. Expected delta in output quality: the historical shallow-output failure mode (under/conflicted loading → safe minimum) is removed at its mechanical root, which is the cheapest large lever available; second-order, every future upgrade becomes attributable (pack hash + score).

### Q7 — Absence-first

Section 3 table. Ranked: asset machinery > code-bound component registry + visual memory > scoring instrument > exemplar corpus > load architecture > analytics loop > microcopy system > font-loading/product perf > workout-media contract > golden example > conflict law > i18n decision. Note what is *not* absent, so nobody rebuilds it: empty/loading/error doctrine (§12, components 13–14), onboarding (§12 + archetype #11), reduced-motion dual-gating (motion.md §3 — genuinely best-in-class), theming/personalization via worlds/lenses (adequate for the vision).

### Q8 — Anything else

- **Sean is a six-gate synchronous bottleneck** (taste-cut, LIQUID approvals, thaw, M4 per-page, cinematic deploy, exemplar curation). The brain's speed limit is Sean's attention. The breadth-pass machinery (gap #1) and the SQS model-scorer (Q2) are the two delegations that matter; everything else can keep requiring him.
- **Attention-budget inversion, stated as policy:** the most specified subsystems (world roulette determinism, 120-frame measurement law — duplicated verbatim) govern things that have never run; the least specified (hero creative production) governs the thing every visitor sees first. Spec follows risk; here it follows fun.
- **The packet's own header is evidence:** the assembling agent worked 1,947 commits stale and was missing 8 brain files. The drift disease this review spends most of its length on is not hypothetical — it infected the review pipeline itself. Root fix is the same: generated manifest, CI-enforced.
- **Unexercised law decays.** The most rigorous loops in this brain (PSY experiments, thaw-by-measured-failure, five taste tests) have zero recorded executions. Run each once, on anything, or they will be cargo cult within two quarters — written by agents who never saw them fire.

---

## 5. THE 90-DAY BUILD ORDER

1. **Weeks 1–2 — Repave.** Decide the sovereign (recommendation: design.md canon is supreme; the two external source docs are demoted to derivation history; one paragraph in README, mirrored in canon). Write `brain-manifest.json` generation; let it fail loudly on every dangling reference, unindexed file, and divergent token; fix all of Section 1/2 in the same pass. Reconcile B7 to canon (canon's scales win; B7 keeps the substrate prose and the type scale, which is its real contribution). Fold the duplicated measurement law into techniques.md with a pointer. *Reasoning: nothing downstream is trustworthy until references resolve and one token set exists.*
2. **Weeks 2–4 — The machine.** Compile the five load packs with hard token budgets; pack-hash citation becomes a QA-receipt field. *Reasoning: makes correct consumption the default before quality is measured.*
3. **Weeks 4–6 — The instrument.** SQS-100 live; baseline-score 10 existing surfaces; set the empirical pass line; wire failures into anti-patterns/LIQUID. *Reasoning: with loading fixed, scores now mean something; every later spend gets an ROI read.*
4. **Weeks 5–9 — The engine.** Ship the four CONVERGENCE mechanisms (image-first loop, interpolation step, reference ladder, HTML convergence sandbox with 3-round cap); wire into `cinematic-site-generator` and the asset pack. Seed the component registry + 20-screenshot visual memory. *Reasoning: this is the direct attack on the $100k bar — the biggest quality delta in the plan, sequenced after measurement so its effect is provable.*
5. **Weeks 8–12 — The loops.** First PSY experiment executed end-to-end; analytics→doctrine quarterly ritual v1; microcopy ledger v1; workout-media contract v1; golden example retro-documented. *Reasoning: feedback loops need stable, measured artifacts to feed on — they go last because they only work post-2/3/4.*

## 6. WHAT I WOULD KILL

| Kill | Why keeping it costs more |
|---|---|
| `design.md.pre-redo` | It's in git history. A live backup invites diff-confusion and stale loads; zero value. |
| B7's §3/§5/§6 token tables (spacing/radius/easing/duration) | A second canonical token set is not a substrate, it's a fork. Keep B7's type scale + prose laws; delete the duplicated value tables after reconciliation. |
| design.md §17's reduced 6-class QA matrix | The canon silently narrowed the house test matrix without a thaw. The 11-row Gate-1 matrix is the law; the reduction is a regression wearing a canon badge. |
| style-taxonomy's captured counts (51 facet counts, 15 category counts) | The file itself says they drift. Captured third-party data with a known expiry is debt; keep the two-axis model + Swan mapping (~1/3 the file), link out for counts. |
| One of the two verbatim copies of the frame-measurement law | Duplication of the most precision-sensitive law in the brain. Keep techniques.md §3; experience-mode gets a one-line pointer. |
| field-techniques T1 (dither hero) — *move*, not delete | It's OFF-LAW for Swan by its own ruling. It belongs in the universal/client toolkit the law-split defines, not in the Swan brain where agents must check its ruling every load. |
| The README six-document preamble (as a *load path*) | Replaced by compiled packs. Prose load order remains for humans only. Keeping it as the agent path guarantees under-loading forever. |
| "Legendary=gradient" in website-archetypes #9/#16; "legendary-rarity gradient" in motion.md §1 | Already banned by canon §4. Dead doctrine cited by three satellites is how banned treatments resurrect. |

One line of credit where due, then done: `psychology.md` is the most intellectually honest document in the corpus — evidence-graded, falsifiable, stop-conditioned — and the §6 dispersion law is the single best idea in it: it turned a taste rule into physics. The brain knows how to make laws. It now needs to make machines, and it needs to notice when its own laws have rotted loose.
