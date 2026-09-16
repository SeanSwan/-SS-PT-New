# HOSTILE REVIEW — ROUND 3 — Swan Brain Console v3 + 20-variant Three.js fleet — reviewed by GLM (glm-5.3)

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/HOSTILE-PACKET-ROUND3-SWAN-BRAIN-CONSOLE-V3-2026-09-13.md
**Tokens:** 2895 in / 26272 out (reasoning: 23487) | total 29167
**Wall:** 414.9s

---

## VERDICT: REVISE

The ten fixes are real, measured, and I believe all of them. REVISE rather than APPROVE for one reason with three faces: this round performed one-string honesty work (FIX J) while deferring *smaller* one-string honesty work (§4.1's label, §4.2's local guarantee, §4.3's Host check) and a cheap experiment (§4.4). Nothing here merits REJECT — nothing is deployed, no route imports the fleet, and every round-2 defect has a verified fix — but the finish line is not crossed while `durableWrites` reports a false-green behavioural verdict by design.

## FIX VERDICTS (FIX A..J)

- **A — CORRECT.** Both prior causes (sibling-scope inheritance; unmatchable descendant selector) are structurally eliminated by declaring on the ancestor that owns `Content`, and the measured geometry (rail 84 / headline 101 / overlap false, the original 17px collision gone) is consistent.
- **B — CORRECT.** Emitting tokens from the same table the resolver reads removes dual-source drift, and the fallback-count assertion is a test that demonstrably fails (it failed 20/20 on arrival) — it polices its own regression.
- **C — CORRECT as a mechanism** (scroll-to-band + real `Link`), but "real" is harness-real: with no route importing the fleet, link *targets* are unproven in-app — see F2 and [UNSURE] 3.
- **D — CORRECT.** "Restored since the most recent loss" is the right state machine and the loss→restore→loss and late-flap tests cover the subtle paths; unshown is the canvas-side wiring that makes restore reachable at all ([UNSURE] 1).
- **E — CORRECT.** `p = -top / max(1, height)` is exactly "fraction of the element scrolled past" — 0 at entry, 1 at exit, height-independent, and it also repairs the mid-scroll-reload case the old test never exercised.
- **F — CORRECT.** Cached-and-released probe plus `forceContextLoss()` on teardown closes the leak; the withdrawal is honest — but see §4.4 and [UNSURE] 7 (dispose ordering).
- **G — CORRECT.** Mounted-but-hidden is the right call (unmount forecloses restore); accepted trade: transient GPU resets now flash the poster, which is honest if slightly noisier UX.
- **H — CORRECT.** Requiring primitives *while the loop runs* closes both the empty-draw pass and the stale-count pass; summing triangles+lines+points is justified by the line/point-only families, not bar-lowering.
- **I — CORRECT for what it observes** (fallbacks, context-lost, primitives, palette); it observes nothing about *visual* distinctness — that gap is §4.5's.
- **J — CORRECT.** Names now match capability; `shell-lens` is the borderline one but asserts shells, not transmission physics.

## NEW FINDINGS (ranked by blast radius)

### F1 — No reduced-motion path is described anywhere [MISSING WORK]
Blast radius: every motion-sensitive user across all 20 *candidate front pages*, i.e., the artifact's entire purpose.
Evidence: the only static/fallback path described anywhere in §2–§4 is the context-loss poster (FIX G). No fix, no contract (13/13, 37/37, 10/10), no verifier (24/24, 17/17), and no §4 item mentions `prefers-reduced-motion`, a static-frame mode, or any motion-reduction consultation. Precisely what is absent: any reduced-motion handling in the described animation loop or its verification.
Why it is wrong: twenty variants of scroll-driven camera dolly with no described opt-out is a vestibular-safety gap (WCAG 2.3.3 territory) for pages whose destiny is to become the front page. The poster machinery proves the static-frame capability is half-built. Checkable: [UNSURE] 8.

### F2 — "Real router links" cannot be real in the app, because the app never mounts the fleet [UNSUPPORTED CLAIM]
Blast radius: every CTA on all 20 variants.
Evidence: FIX C ("CTAs are real router links with a linkPrefix") vs §1 ("No route imports the fleet; the canonical homepage is untouched").
Why it is wrong: "real" was verified under a gallery-provided router; the property that matters — where the link lands — is untested because no landing route exists. Either `linkPrefix` targets existing app routes (then CTAs navigate users *away* from the variant — possibly intended, but unstated), or it targets variant-local paths no router defines, which is the round-2 inertness with extra steps. This is not a re-raise of the inertness defect — it is a new structural fact: FIX C's claim is true only inside the harness.

### F3 — The honesty ledger omits `hero_mechanics` cardinality [UNSUPPORTED CLAIM]
Blast radius: the honesty artifact that §4.5 stands on.
Evidence: §1 discloses families=8, grids=20, nav models=18, and admits the fingerprint triple's uniqueness is by construction. The count of distinct `hero_mechanics` values appears nowhere in §1–§4.
Why it is wrong: selective disclosure in an honesty ledger invites the suspicion the omitted number is the ugly one. Two nav-model collisions were disclosed voluntarily; withholding the third axis's count is the exact pattern §4.5 is trying to end. If it is low, "structurally distinct" rests on grid alone — and grid is the axis most purely authored. Publishing it costs nothing ([UNSURE] 6).

## ATTACK ON §4

**The tell, before the items:** this round did one-string honesty work (FIX J renamed three labels) and skipped *smaller* one-string honesty work: `BLOCKED`→`DECLARED_BLOCKED` is one string; a `verify:all` script is one package.json line; a Host check is one line. FIX J proves the round's threshold for "worth doing now" includes exactly this class of change. The deferrals are therefore not threshold decisions; each is dressed in a different reason.

**4.1 — Rationalising, on three counts.** (a) *Relabel/probe conflation*: the builder's own proposed `DECLARED_BLOCKED` requires zero infrastructure — it is FIX-J-class work that was skipped while FIX J was done. (b) *"No probe exists" is half-true*: no *behavioural* probe exists or should (you do not want an operator console attempting engine writes to test a lock). But the console already reads repo files — README excerpt, structure, counts — off the same disk where the adapter's source/config presumably lives. A *static* probe is writable today: assert the gate construct wraps the adapter's write call site, not merely that a sentence exists. If the adapter genuinely isn't readable from the console's vantage, the honest sentence is "the gate lives outside what this console can read" — which is UNKNOWN-with-reason, never BLOCKED. (c) *The substring false-positive is not an edge case*: a README saying "must no longer remain fail-closed" — asserting the gate's removal — yields maximal confidence it is present. That is the field's one job, inverted. **Do:** relabel now; emit the matched sentence verbatim beside the status so operators see the evidence; write the static probe if the adapter is in-repo.

**4.2 — Half-defensible, mostly not.** Defensible: nothing is committed; there is no CI host to wire yet. Not defensible: the highest-leverage 90% needs no host — one aggregate script chaining the four suites plus a precommit/prepush hook guarantees they run again, and an authored-but-inert CI yaml makes intent checkable at first push. The decay argument is also self-proving: this project's own history shows the suites catch real regressions (B's palette assertion failed 20/20 on arrival; E's old test *pinned* the bug) — which is precisely why "ran once, manually" is not a guarantee. "Highest leverage, undone, while doing one-line work elsewhere" is a contradiction, not a triage.

**4.3 — Not acceptable.** "Writes are impossible by construction" answers a threat this attack does not make: DNS rebinding here is a *read* attack against repo structure, counts, and README text. The 127.0.0.1 bind does not stop it (rebinding works *because* the attacker's hostname resolves to 127.0.0.1), GET-only does not stop it (the read *is* a GET), the allowlist does not stop it (`/api/state` is allowlisted). Severity is honestly low — localhost metadata — but three consecutive rounds of disclosure plus a one-line fix (Host ∈ {`localhost`, `127.0.0.1`, `[::1]`} with port variants, else 403) is disclosure-as-absolution. Do the line; it also future-proofs the console the day it is exposed for team use, which is the natural next step for an "operator console."

**4.4 — Disclosure is necessary, not sufficient — and the precise sin is *reproducer removal*, not evidence removal.** Retaining unlit materials is now honest post-FIX-J; the renames did not hide anything. The problem: the fleet changed its render path in response to a crash whose cause is unestablished, so if the crash returns, there is no baseline — which is exactly how round 1 misattributed it in the first place. The controls are cheap and possibly half-run already: gallery-verify mounts all 20 real variants in *some* renderer, unstated. If SwiftShader, then 24/24 green is already "20 real scenes under software GL, no crash" — half the missing control, and it should be reported as evidence. If hardware, run (1) the same gallery forced to software GL, and (2) 20 trivial scenes under the old leaky probe to reproduce the original crash and confirm the leak theory by difference. A negative result is still a result; write it down either way.

**4.5 — The words are honest; the evidence structure isn't finished.** "20 unique layouts, 18 nav models, 8 scene families" is literally true and correctly retires "20 completely different front pages." Two residues. (a) `has no duplicate nav_model + hero_mechanics + grid tuple` sits inside a contract suite whose other members can fail for behavioural reasons; it can only fail for authoring duplication, so its green checkmark borrows credibility it did not earn — it verifies that 20 authored configs differ, not that 20 pages diverge. (The builder's "proves nothing" is one shade too harsh — it does catch copy-paste config — but the remedy is the same.) Rename it to what it is (`config-tuple uniqueness`), and if divergence is the claim, add a check that *can* fail: pairwise screenshot perceptual-hash distance with a floor, or DOM-shape diff. (b) Disclose the third axis's count (F3). "8 scene families, N hero mechanics, 18 nav models, 20 grids" is a more honest sentence than the current one and costs nothing.

## [UNSURE]

1. Does the `webglcontextlost` handler call `preventDefault()` (directly, or via three's own renderer listener)? Without it, `webglcontextrestored` never fires and FIX D/G's entire recovery path is dead in production while all 6 policy unit tests pass.
2. Does `console-verify` assert `durableWrites === 'BLOCKED'` for a README containing the sentence? If yes, the suite enshrines the prose-derived verdict, and fixing §4.1 later means editing a passing test.
3. What does `linkPrefix` resolve to per variant — existing app routes, or variant-local paths no router defines?
4. Does `durableWrites` read the full README, or the ≤600-char excerpt `/api/state` exposes? If the excerpt, the verdict is position-dependent (the sentence beyond char 600 yields a false UNKNOWN).
5. Under which renderer does gallery-verify run (hardware vs SwiftShader)? If SwiftShader, 24/24 green is half the §4.4 control and should be cited as such.
6. Distinct-value count of `hero_mechanics` (F3).
7. Is teardown ordered so listener removal precedes `renderer.forceContextLoss()`? Otherwise dispose fires a synthetic loss into a still-attached policy.
8. Does anything consult `matchMedia('(prefers-reduced-motion: reduce)')` (F1)?
9. Was non-overlap measured for right-rail nav models, or only the left-rail case shown in FIX A?

REVISE
