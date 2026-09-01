# z-ai/glm-5.3-flash — Hostile Gate Review

**Reviewer:** OpenRouter `z-ai/glm-5.3-flash` (effort: high)
**Served:** `z-ai/glm-5.3-flash`
**Document:** docs/ai-workflow/brainstorms/aftertaste-n4-grammar-slice-packet-2026-08-26.md
**Seed:** (none)
**Tokens:** 2436 in / 5420 out · **Cost:** ~$0.0015 · **Wall:** 120.8s · **finish:** stop

---

# GATE REVIEW — N4 roster grammar packet (GLM 5.3, hostile seat)

## (a) VERDICT

**REVISE** — the gate mechanics are honest (§3's self-caught regression, §4's stale-rerun trap are real engineering), but the mirror-break verdict rests on **2 discriminating samples scored against a label set proven 33% corrupt**, the liveness test is substring-based, the equivalence "proof" is one fixture, and the packet ships a counting formula to the roster author that is wrong for partial overlaps.

## (b) Correctness attacks

**B1 — Count-voting cannot see same-count/different-shape ambiguity (§2).**
`resolve_mirror_break()` compares *counts* against `voxelCount`. OFF and ON can yield **equal counts and different geometry**: an N-copy disjoint at z and also disjoint at z+1 scores identically under both readings but produces different creatures. Your own §2 text warns about "recipes whose N copies never overlap" — but your measurement treats score-equality as information-free when it may be *shape*-divergent. The global OFF verdict is then stamped onto creatures where the readings genuinely diverge geometrically and your instrument recorded nothing. Silent distortion, by your own definition of the failure mode.

**B2 — The vote is 2 samples against corrupted ground truth (§2 vs §4).**
"Discriminating: OFF 2 / ON 0" is decisive only if both discriminator labels are true. §4 proves **6 of 18 declared counts are wrong** (−3 to +8). You corrected for *dilution* and ignored *label noise*. With n=2 and a demonstrated 33% mislabel rate, the probability that at least one discriminator is mislabeled is material. One flipped sample makes the verdict a coin flip you called decisive.

**B3 — Liveness test is wrong in the direction you suspected (§5, bullet 3).**
`any("N(" in recipe)` marks a recipe whose N-offsets guarantee disjointness (offset ≥ body z-extent) as a *live* tie when the readings are cell-set-identical — i.e., vacuous. Same lockout bug as §3, reborn at smaller scale. Liveness must be defined as **"the two readings yield different cell sets,"** never substring presence. Absent-N-but-live is impossible under the quoted rule (mirror-break binds only to N), so that half is safe.

**B4 — Equivalence proof under-covers (§5, bullet 1).**
One hand-counted 8-cell creature cannot cover: nesting depth ≥2 (`N(...,N(...))`), multiple top-level `C` statements, greedy consumption past a balanced inner `C` (the dual of your "fails to consume" guard), whitespace/comment variants, and zero/negative extents (`C(x,y,z,0,2,1)` — does the parser reject or emit nothing?). Shapes that plausibly pass both parsers and mean different things: any program where PROSE extent semantics (`3x2x1` = spans 3 cells) and BOX size semantics disagree on anchor point for even dimensions. Replace the single fixture with **differential fuzzing**: random programs in both dialects, assert identical cell sets. It's an afternoon and it's actually a proof.

**B5 — The formula you handed the roster author is wrong (§5, re-author instructions).**
"cells = Σ(dx·dy·dz) minus overlaps" is only correct for exact-duplicate cells deduped as a set. Partially overlapping boxes require set-union; naive subtraction mishandles triple overlap. This instruction manufactures the next round of Defect B. Say "distinct cells = |set of occupied coords|" or give them the checker script.

**B6 — Defect B deltas conflate miscounting with mirror-break choice.**
Are the recipe counts in the Defect B table computed under OFF? If any of the six uses `N()`, the +8/−3 deltas are reading-dependent, and "miscounting, not a systematic misread" (§4) is an inference you haven't shown — a delta that flips sign under ON would change the re-authoring instructions.

**B7 — Exit-code taxonomy unstated.**
Zero-blocks = exit 2. What does a Defect A/B refusal exit with? If CI can't distinguish parse failure from semantic refusal, the §1 incident recurs invisibly.

**B8 — Only `horsehair` is hand-verified (§4).**
The other five "built" assets are trusted because reruns are byte-identical. Determinism proves reproducibility, not correctness — from a gate that just rejected 12 of 18. Verify verts = 8×count for all six, not one.

## (c) Security attacks

Low-surface offline tooling, but not zero:

- **Parser DoS:** unbounded `N` nesting/expansion (`N(1000,…)`) and recursion depth in the BOX parser — no cell-budget or depth cap stated anywhere. A typo'd recipe becomes a memory event.
- **Path derivation:** `roster-to-obj.py` presumably derives output filenames from creature IDs (`parasite.bedbug`). No sanitization mentioned; an ID containing `/` or `..` traverses. Internal roster today, but the gate is exactly the kind of tool that later eats external input.
- **Replay/idempotency, SSRF, authn/z, secrets:** N/A — privacy header claim (IDs only) is credible for this artifact.
- **Multi-tenant scope:** N/A.

## (d) Data-truth / schema-drift (Rule 58)

- **The MIRROR-BREAK line is now known-drifted spec (§2).** The grammar text says the reader applies it; measurement says the author already did. Verdict OFF means that sentence is **dead/misleading documentation sitting in the live grammar file** — the next author reads it and double-applies, or applies reader-side, and every N-creature distorts. The packet resolves the semantics but leaves the drifted spec text in place. Fix the grammar string in the same commit.
- **Root-cause drift acknowledged but not institutionalized (§1):** the brief named fields, not container. Nothing in the packet adds "container" to the brief template. This exact class recurs next slice.
- **Undefined jargon:** "on-only" (§2) appears once, never defined. In a packet whose whole point is grammar precision, that's ironic drift.
- Positive note: 8 + 6 defect rows minus {flea, mantisshrimp} overlap = 12 refused, matching the header — arithmetic internally consistent, and `horsehair` 11×8=88 verts checks out.

## (e) House-rule violations

- Line budgets: 224 / 139 / 198 — compliant (≤300).
- Privacy: IDs only — compliant. No credentials language, no banned vocabulary, frontend rules N/A to this artifact.
- **Speculative-success findings:** "That was correct behaviour" (§1) — asserted, adequately evidenced by the exit-2 rationale; acceptable. "The confidence is higher than the raw score looks" (§2) — interpretation presented as finding, and per B2 the adjustment goes the wrong way on the noise dimension it ignores. "This is miscounting, not a systematic misread" (§4) — **unnamed verified path**; show the deltas are reading-invariant (B6) or strike the claim.

## (f) SINGLE highest-risk item

**The OFF verdict decides grammar semantics for all 12 re-authored specs on a 2-sample vote against partially-corrupt labels (B1+B2) — and the person who can settle it is sitting in this session.**

De-risk before the re-author round runs: **ask the roster author directly** which reading they applied while writing, and have them confirm against the two discriminating recipes by hand. That converts a fragile statistical inference into ground truth at zero cost. Then: (1) redefine liveness as differing-cell-sets, not `"N("` substring (B3); (2) correct the MIRROR-BREAK line in `roster_grammar.py` in the same commit so spec and behavior stop drifting; (3) replace the single equivalence fixture with differential fuzzing before the 12 corrected blocks are accepted. Only then unlock the re-author task — otherwise a wrong verdict propagates into all 12 replacements and the four built assets' successors.
