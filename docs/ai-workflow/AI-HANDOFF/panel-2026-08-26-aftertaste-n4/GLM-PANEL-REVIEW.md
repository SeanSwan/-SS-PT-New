# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/aftertaste-n4-grammar-slice-packet-2026-08-26.md
**Tokens:** 2016 in / 17436 out (reasoning: 15131) | total 19452
**Wall:** 300.8s

---

**Verdict up front:** conclusions are probably right — OFF, 6/18, the two defect classes — but three things are load-bearing and softer than the packet presents them: the "equivalence proof" is a single-point proof, `resolve_mirror_break` consults an oracle the same document proves is 33% wrong, and the liveness test is a string-level proxy for a parse-level fact. Details keyed to your five targets.

## 1. The equivalence proof is not a proof

One hand-counted creature proves that **two strings** denote one cell set. It cannot prove two dialects equivalent, and its blind spots are exactly the shapes a fixture author doesn't think to include:

- **Axis order.** If the fixture's box is symmetric (2×2×2 is the natural 8-cell choice), a BOX parser that reads extents as (dz,dy,dx) yields the same 8 cells and passes. Every *asymmetric* creature authored under the wrong convention then passes both parsers and means different things. **Ask: state the fixture's dims.** If any axis pair repeats, the check cannot pin axis order. Same argument for position: the fixture must sit at a nonzero, distinct, ideally negative coordinate to pin coordinate order and sign.
- **Overlap semantics.** Your own re-author note ("Σ(dx·dy·dz) **minus overlaps**") says overlaps exist in practice. If PROSE unions, errors, or counts with multiplicity where BOX unions — or vice versa — only an overlapping fixture can see it. Does the fixture overlap? Does it contain an `N` whose copies overlap each other? If not, N-boundary dedup is unanchored.
- **Rejection symmetry.** Equivalence includes what each dialect *refuses*. `0x2x1` in PROSE vs `C(0,0,0,0,2,1)` in BOX — does one reject what the other silently accepts as a plane? A zero-dim box has no PROSE rendering; that's a hole in the equivalence claim nobody's fixture will trip over until one does.
- **Circularity risk.** If the selftest's `N` fixture was written before `resolve_mirror_break` and asserts raw-parse cells, it *encodes* the OFF resolution rather than testing it — the exact §3 failure mode, relocated. **Ask: does any check assert cells that would differ under ON? If not, the suite cannot detect a wrong resolution.** §3's lesson should be applied to the other 25 checks too, not just the tie fixture: for each, name the requirement sentence it encodes.

Hardening path: lower both dialects to a shared IR and test each parser against the IR; keep the hand-counted creature as canary; add fixtures for overlap, N-with-overlapping-copies, asymmetric dims/position, negatives, and a cell-level (not count-level) discriminating case.

## 2. `resolve_mirror_break`: right verdict, borrowed confidence

The structural flaw: **the procedure assumes declared `voxelCount` was produced under the semantics being determined.** Defect B is direct evidence the oracle misfires 1 time in 3. Two hypotheses predict identical observations — (H1) semantics is OFF and the author counted the written recipe; (H2) semantics is ON, the author wrote pre-shift coordinates, but their counting pass didn't implement MIRROR-BREAK either. The measurement cannot separate them. "ON breaks two creatures" helps — if "broken" means *disconnected under ON*, that's oracle-independent evidence — but the packet leaves it implicit. Make connectivity a first-class tiebreak (prefer the reading under which fewer creatures shatter), because it doesn't depend on the miscounting author.

When it gives a confident wrong answer: **one discriminating creature whose declared count is wrong in the right direction.** An author who double-counts an overlap declares a count that ON happens to hit when the +1 shift un-overlaps two cells; verdict flips corpus-wide; most recipes are non-discriminating so nothing else flags it. Cheapest hardening, in order:

1. **Name the two discriminating creatures in the report** so a human can hand-verify their counts. (They must be outside Defect B's six — OFF matched for them — but say so.)
2. **The signal is coarser than the ambiguity.** You compare counts; the readings can differ in *cells* with equal counts (an odd-copy wing floats at z=2, ON floats it at z=3 — same count, different creature). Those recipes are scored "agree with both" while the verdict silently picks their geometry. After resolving, emit per-creature cell-diff between readings so silent placement divergence is at least visible.
3. **Untested third reading.** "Odd-indexed" is base-0 or base-1 — the two select different copies. If the grammar text doesn't pin the base, you tested two readings of a three-reading ambiguity. One line in the packet quoting the grammar's index rule closes this.
4. **State the verdict's scope.** Per-file or per-corpus? If one file's single buggy recipe binds 18 creatures, say so and set a minimum-k before deciding (or refuse below it).

## 3. Liveness: stop re-deriving parse facts from the raw string

`any("N(" in recipe)` has failures in both directions:

- **False-live:** `N` with one copy (no odd index under base-0 — vacuous, but marked live, diluting or deadlocking the score); an `N(` inside an identifier or comment if the grammar has either.
- **False-dead:** lowercase `n(` or `N (` if the parser tolerates them (parsers forgive whitespace; substring tests don't).

The correct liveness test is not "N appears" and not even "N with ≥2 copies appears" — it's **"the two readings diverge on this input,"** which you already compute: you parse twice for the resolver. Compare cell sets; identical ⇒ vacuous. Vacuity stops being a special case with a proxy and becomes just "no divergence anywhere." This also subsumes the §3 regression class entirely.

## 4. `components()` and designed multi-piece creatures

The refusal is correct *for this roster* (you say connectivity is the roster's own law) but the tool is generic and the gate cannot distinguish accident from design without declared intent. You already have the pattern: `voxelCount` is declared intent the gate verifies — extend it. A `components:` field, default 1: gate asserts computed == declared. A designed swarm reads as "3 components (10/9/8) — matches declared"; Defect A still refuses. Report components descending by size with cell ranges, not just "orphans" — for a tethered pair of near-equal halves, "orphaned cells" naming half the creature is technically true and unhelpfully framed. And put the adjacency law in the refusal text: state that edge/corner contact does not count, so authors stop being surprised.

Minor but real: your re-author instruction says "so every box shares a full face." The gate enforces cell-level 6-connectivity, which a single bridge cell satisfies; "every box shares a full face" is a stronger, different law and will buy over-built bridges. State the law as enforced.

## 5. §4: what could be your parser's fault

- **Defect A is provably not resolution-dependent, but prove it in the report.** MIRROR-BREAK shifts +z only. Every listed floater sits *above* its body (or displaced in y, seaspider) — a +z shift increases clearance, never bridges. One caveat: if any floater sat one layer *below* a body and came from an odd copy, ON could rescue it. None appear to; say so explicitly, and note whether any Defect-A cells came from `N` copies at all.
- **Defect B's "miscounting, not systematic misread" is asserted, not earned.** Mixed signs rule out *one* systematic cause (double-counted overlaps ⇒ deltas ≥ 0), not all. A counting pass that implemented ON, or base-1 indexing, produces deltas of **either sign per creature**. Cheap forensics: recompute each of the six under {OFF, ON₀, ON₁, no-dedup Σ, intended-with-bridges} and fit the deltas. Two predictions worth checking: the **negative** deltas may literally be the missing bridge cells (flea: 2 floaters + phantom bridge(s) ≈ −3 — the author counted the design they pictured, not the recipe they wrote); the **positive** deltas on N-creatures could be a partially-offset inner-C leak (the exact-offset variant is count-silent, but an offset leak isn't). Hand-expand one +delta creature and this door closes. If one ON-variant fits 5 of 6, that's a semantics discovery feeding back into §2, not author sloppiness.
- **The rerun trap should be structurally impossible, not procedurally avoided.** "Verified to have actually written files" — verified how? Run in a fresh empty dir, assert non-empty output, compare bytes. Better: the gate fails loudly if it writes zero files.

## Cross-checks on your arithmetic (all consistent — worth stating)

- 8 + 6 − 2 = 12 refused; **flea and mantisshrimp carry both defects** — the re-author must fix both in one block, and the packet never says so.
- Your resolve numbers are internally exact: non-discriminating = 16; the six Defect-B creatures must all be non-discriminating (discriminators matched OFF), and "matched neither reading" must equal exactly 6 — which it does. The six count-broken creatures are precisely the six non-informative ones. Nice; put it in the report, it shows the two sections corroborate.

## Asks before this merges

1. Fixture dims + whether it contains `N` and overlaps (§1 hinges on these).
2. Whether any selftest check discriminates ON from OFF at cell level.
3. The two discriminator names; the index-base rule from the grammar text; verdict scope (file vs corpus).
4. Re-run the four PROSE assets post-tie-fix and state they still build — implied, never asserted.
5. Per-check requirement mapping for the surviving 25 checks.

## Scope notes

Per instruction I'm not touching LIGHT/HARDCORE — deferred to the owner's follow-up. Re-authoring the 12 is the roster author's seat, not mine, so I'll leave it with one thing the packet didn't give them: for the negative-delta creatures, check whether the delta equals the missing bridge cells before "correcting" the declared count downward — the intended design may already be counted, just not written.
