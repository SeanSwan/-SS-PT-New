# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (medium)
**Document:** ./SWAN-BRAIN-V2-PACKET-REV2.md
**Seed:** (none)
**Tokens:** 4190 in / 2345 out | **Cost:** ~$0.0477 | **Wall:** 76.4s | **finish_reason:** stop

---

# KIMI K3 — REV 2 RE-REVIEW

## PART 1: Verification of my REV 1 findings

| My REV 1 finding | Applied? | Verdict |
|---|---|---|
| 150-ref floor will be gamed/stall small tasks | ✅ Coverage+justification gate | Correct fix |
| No cost model | ✅ cents/$1–2/hours model + Codex flat-rate routing | Applied, and the Codex economics point is genuinely good |
| SREF portability is cargo-cult | ✅ Dropped, honest framing | Correct |
| Masked inpainting unverified, blocking parallax plates | ✅ Now blocking verification | Correct |
| Typography/grid/spacing absent | ✅ B7 created | Correct but see Part 2 |
| No agent token-budget / context sequencing | ✅ B8 created | Correct |
| No rollback/kill criteria | ✅ B8 created | Correct |
| No measurement instrument for taste ceiling | ✅ B6 rubric + quality ladder | Correct |
| RC-6 overclaimed from scoped grep | ✅ Re-verified repo-wide | Correctly handled |
| No loop termination | ✅ Round cap 3, tournament shape | Correct |

All nine of my findings were applied correctly, not cosmetically. This is the first time in this thread I've been able to say that.

## PART 2: What remains — attacks

**1. B7 is still an orphan.** A module was created to satisfy me, but it has: no scope, no acceptance criteria, no owner, no deliverable shape ("needs: type scale + pairing doctrine…" is a wishlist, not a spec), and no relationship to B3's plates or B4's layout. Typography without a rendering contract is a PDF that dies in `docs/`. **REV 2 applied the finding, not the fix.**

**2. The cap question is the plan's single point of failure, and it's punted to a human.** B0.2 "ask Sean" has no deadline, no decision tree for either answer, and no plan-B. If Sean says "the cap was deliberate," what happens to the Six-Facet Sweep — the spine of B1? REV 2 doesn't say. A blocking `[UNKNOWN]` with no branch logic is not de-risked; it's deferred.

**3. Fable D4 does not cover the new intake surface as well as REV 2 claims.** D4 licensed "reference-only, no bytes/URLs/HTML." But B6's reference quality ladder explicitly stores **URLs** at tiers S and A. That is either (a) a direct conflict with D4, or (b) evidence REV 2 didn't read its own two sections against each other. Tier S even stores "repo + prompt + stack." Is that ledger content or working notes? Where's the firewall boundary? This needs a ruling, and REV 2 needs to notice the tension itself rather than have me find it.

**4. The Codex claim is unverified economics.** "`consult-codex.mjs:37` uses metered `openai/gpt-5.5`" — fine, that's a file reference. But "routing through the CLI makes it free-at-the-margin" assumes the CLI subscription's ToS permits programmatic/agentic invocation at review-loop volume. Many flat-rate plans explicitly prohibit automated high-volume use. If wrong, B2's affordability argument collapses and possibly creates an account-risk. Mark `[HYPOTHESIS]` until verified.

**5. The tournament (B2) still has no judge spec.** "Sean's taste is the judge function" — Sean is one person and the bottleneck of every gate in this plan (`seanTasteVerdict==='approve'` in Fable's S-series, Gate 0, Gate 3, escalation after round 3, P-mode question). REV 2 has quietly built a **Sean-serialized system**. What's the throughput? What happens when he's unavailable for a week? At minimum: a proxy rubric that lets rounds 1–2 proceed autonomously.

**6. "Two clean hostile rounds remain mandatory" (S10) — good, but who pays?** The panel tooling is uncommitted working-tree-only (honestly admitted in §6). So the mandatory review gates depend on scripts that could vanish with one `git clean`. That's not a gap to note in §6; it's a B0.0: commit the review tooling first, or your mandatory gates are optional.

## PART 3: Answers to the 7 questions

**1. B0.3 — finish S1–S10 as-is?**
Yes, with one exception. Locks beat re-litigation; Fable said no further round needed, and re-opening because "3 weeks passed" is churn, not rigor. **Exception:** the D4-vs-quality-ladder URL conflict (Part 2, #3) is a *new fact* — the locked spec says no URLs, B6 requires them. Resolve the boundary in one paragraph *before* build, not by re-opening the ruling. Build as-is otherwise.

**2. Sequencing B0 → B3 → B2 → B1 → B4 → B7 → B6 → B5?**
B3-before-B2 is correct (HY3's argument was right; converging on a 3-line string generator is converging on noise). **But B7 must move to position 2**, and B1 should move *after* B4. Reasoning: B1's sweep feeds convergence, but convergence can't run until typography exists (see #3), and motion (B4) depends on the Forge, not on reference depth. Revised: **B0 → B7 → B3 → B2 → B4 → B1 → B6 → B5**. Cut further: B1's competitor-facet is the weakest facet (competitor sites are the generic-output source you're trying to escape) — make it optional.

**3. Is B7 bigger than a module?**
Yes. Typography/grid is not a module; it's a **substrate**. Every other module renders onto it: B3's plates are judged against a grid, B2's variants are compared on typographic finish, B4's motion choreographs type. B7 in position 7 (as REV 2 has it) means the homepage proof in B6 gets built, then rebuilt when B7 lands — the exact anti-rework pattern Fable's Rule 52 exists to prevent. Move it to second, define it as a token contract (type scale, spacing rhythm, measure rules) that B3/B4 *consume*, and give it acceptance criteria.

**4. Prompt-preset + seed-lock as SREF substitute?**
It is a genuine substitute for **within-project** consistency: same preset + locked seed + same model version gives reproducible style families — that's most of what Swan needs for a single site. It is NOT a substitute for **cross-project style transfer** ("make this look like that reference"). Honest answer: keep presets for production, drop cross-project style-consistency ambitions until a provider supports it, and write that limitation into B3's contract so no agent overpromises. One addition: seed-locking only works if the provider actually honors seeds deterministically — that belongs on the same blocking-verification list as masked inpainting.

**5. Vaporware ranking (shipped-wrong-code risk):**
1. **Super-Tiling / parallax plates** — entire pipeline rests on unverified masked-inpainting support. Highest risk of building the wrong thing confidently.
2. **Codex CLI free-at-the-margin** — unverified ToS/economics; could restructure B2 on a false premise.
3. **B6 measurement rubric** — named but unspecified; "repeatable scoring rubric, named benchmark set" has zero content yet. Will ship as vibes-with-rubric-costume if built as-described.
4. **MagicPath side-by-side** — registered-tool gate exists, but no integration shape described; "must be viewable side-by-side" is a requirement, not a design.
5. **Canvas UI middle path** — name-dropped with one sentence; either spec it or cut it.

**6. Absence-first (value left on the table):**
1. **Sean's capacity model** — the whole plan serializes through one human judge/approver. Highest value, completely absent.
2. **The B1 decision tree for the P-mode answer** — both branches of Sean's answer should have pre-written consequences.
3. **Accessibility beyond reduced-motion** — LAW 5 R1 is cited, but contrast, focus management on pinned scroll regions, and screen-reader order through scroll-jacked content are absent. For a $100k site this is a lawsuit-shaped hole.
4. **Performance budget** — 8-second hero + interpolated 60fps + shader layers: no byte budget, no LCP target, no degradation ladder below "mobile degradation" (undefined). Awe that loads in 9 seconds is a bounce.
5. **A worked end-to-end example** — one surface (the homepage hero) walked through B0→B6 concretely. The plan is all modules, no narrative; the first agent to execute it will discover the seams the hard way.

**7. Homepage direction (design answer):**
Direction: **"The Flock as Instrument."** Keep `Swans.mp4` as the raw material, but the ONE impossible phenomenon: **the swans' motion is the page's scrollbar — literally.** The footage is scrubbed by scroll (C13), but the interpolation fix makes it liquid, and the signature moment is the handoff: at the hero's end, a swan's wingtip exits frame-right and *becomes* the first section divider — footage geometry transitioning into layout geometry with no cut. Visitors can't name what happened; that's the point. What a competitor can't copy in a week: the frame-interpolated 60fps scrub of bespoke footage (they'd need the footage, the pipeline, and the discipline). Motion grammar: one continuous 8s journey, no independent animations below the fold — everything downstream is *echoes* of the hero's motion curve (same easing, same duration ratios), so the whole page feels conducted rather than assembled. Typography (B7, moved up): one display face with extreme optical sizing range doing all the work; the type is the grid made visible. Atmospheric perspective on the occluder layers per LAW 4 — swans pass *through* depth, not over a flat parallax stack.

**Bottom line:** REV 2 is the first version I'd approve with conditions. Conditions: (a) resolve the D4/quality-ladder URL conflict in writing, (b) move B7 to position 2 with acceptance criteria, (c) write the P-mode decision tree, (d) commit the panel tooling as B0.0, (e) mark the Codex economics `[HYPOTHESIS]`. None require a third full round — they're amendments, not redesign.
