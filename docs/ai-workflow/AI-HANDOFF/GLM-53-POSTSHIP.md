# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/POST-SHIP-HOSTILE-PACKET.md
**Tokens:** 1749 in / 18362 out (reasoning: 15584) | total 20111
**Wall:** 260.4s

---

# SWAN BRAIN — post-ship hostile review

Severity rubric so the grades are legible: **CRITICAL** = live production wrongness or active harm. **HIGH** = defects in the enforcement/claim layer that recreate the preconditions of the original rot. **MEDIUM** = demonstrated drift-risk or successor-traps. **LOW** = affirmations, gaps, polish. Nothing here is CRITICAL — the corpus was verified clean at ship and remains so; what shipped wrong is *prevention*, not content. That is not mercy; it is calibration.

## Findings

| ID | severity | claim | evidence | fix |
|---|---|---|---|---|
| F1 | HIGH | Gate enforcement is workstation-local. `core.hooksPath` is set nowhere in-repo (no `prepare`/`postinstall`, no husky, no CI reference), and pre-commit gates commit-*authoring*, not merge-*acceptance*: fast-forward merges create no commit → no hook; `--no-verify`, server-side merges, and every non-owner machine bypass silently. The 73-test suite has the same exposure. | §2 measurements; git semantics | CI job (push + PR) as the authoritative layer + `prepare` script for local ergonomics + fold `brain:links` into `npm test`. Verify by fresh-clone repro, never by local green. |
| F2 | HIGH | The canon line "wired into `.githooks/pre-commit` … verified 2026-08-16" is an enforcement claim true only where `core.hooksPath` is set. Read-correct-but-false — the exact idiom the commit deleted, one level down. | §2 quote; corpus precedent: "Enforcement files" line deleted for naming nonexistent mechanisms; R1–R4 already fixed "line number written into canon as proof" | Rewrite in the same commit as F1's fix so claim and mechanism land together. Evidence stamps must cite SHA + CI run, not workstation + date. Add a meta-test asserting the wiring (hook committed, `prepare` present, CI references the gate). |
| F3 | MEDIUM | Header-derivation regex + constant hand-duplicated across three consult scripts; one demonstrated miss already. Mirror-drift disease at code scale. | §3.2; "found by grep not memory" is the duplication signature | Extract one shared module; add a gate class: the derivation may appear exactly once in the repo. |
| F4 | MEDIUM | Known-red baseline (2 × `verify-world-engine`) is unpinned. The suite cannot distinguish baseline-red from new-red without tribal memory — structural normalisation for successors even though *you* didn't normalise (diffed, unmasked, ticketed). | §3.3, §5 | Pin the set as data: `test.failing` (or an expected-failure-set assertion) with ticket IDs. Red may only shrink deliberately; unexpectedly turning green should also flag. |
| F5 | LOW | Arithmetic doesn't reconcile: "34 structural defects accumulated" vs 25+4+4+20 = 53 repairs. **HYPOTHESIS**: explicable as defect-sites vs repair-actions — but if both numbers appear in shipped text unreconciled, that is an internal inconsistency in a corpus whose business is internal consistency. | §1 | Reconcile or annotate the counting basis wherever both numbers live in-repo. |
| F6 | LOW | `receipt-prune` went 4/1 → 4/0 while this workstream touched test files. **HYPOTHESIS**: green may be earned (fix) or manufactured (deleted/weakened test). Unverified either way. | §5 delta | Diff the receipt-prune test file against pre-ship main. Confirm green is a fix. |
| F7 | LOW | Hardcoded palette anchors are **correct strictness**, not a trap. A verifier reading expectations from the artifact it checks is a tautology — the anchors are the independent second witness, and a rebrand *should* force a visible verifier edit. The only defect is if the failure message is cryptic. | §3.4 | Keep strictness. Name the anchor block; failure copy should say "intentional rebrand? edit ANCHORS here and re-run." |
| F8 | LOW | Verbatim retired-tier sentinel: worth keeping. The threat model is careless resurrection-by-paste, and paste reuses literals. Paraphrase evasion is a documented, priced, near-zero-cost acceptance — not a hole. | §3.5 | Keep. No change. |
| F9 | LOW | `design.html` retirement was right — a wrong visual gets copied, not argued with — and consistent with the mirror doctrine that also retired `AGENTS.md`. But the corpus now has no human-visual surface. Real, small, correctly priced hole. | §3.1 | Optional and deferred: a *generated* token/type sheet compiled from canon and gate-wired. Never hand-authored. |
| F10 | LOW | No deferred-work register: open items (consult dedup, known-red, visual gap) live in review prose, not in a queue the next agent inherits. | §3.6 | "Known open items" block in the brain index or tracker. |

## Next agent — priority order

| # | when | action | do NOT |
|---|---|---|---|
| 1 | now, 5 min | Run `npm run brain:links` + design-brain suite + constitution guard **on current `main` HEAD**. The 13 commits since ship were authored with no gate assurance outside one workstation; "gate present" ≠ "gate clean." | Start no edits before current-HEAD truth is known. |
| 2 | P0 | Wire the gate: CI workflow (push + PR) running the full §5 table — gate, suite, constitution guard, refs — plus `"prepare": "git config core.hooksPath .githooks"` in `package.json`. | Add husky/deps for a one-line config. Accept a local green run as wiring evidence — fresh clone in /tmp, plant a dangling ref, watch it block. |
| 3 | P0, same PR as #2 | Rewrite the canon enforcement line (F2). | Re-stamp "verified \<date\>". Cite SHA + CI run. |
| 4 | P1 | Pin the known-red set with ticket IDs (F4). | Delete or `skip` tests to reach green. |
| 5 | P2 | Dedupe the consult header derivation + single-copy tripwire (F3). | Fix two of the three copies. |
| 6 | P2 | Audit the `receipt-prune` delta (F6). | — |
| 7 | P3 | Reconcile 34/53 if in shipped text (F5); anchor naming + rebrand failure copy (F7); open-items register (F10). | — |
| 8 | deferred | Generated visual sheet (F9), only if compiled from canon and gate-checked. | Hand-author `design.html` v2. |

Global do-NOTs: don't loosen gate strictness to clear a failure (fix the corpus or, on documented rebrand, the anchor — never the check); don't resync retired mirrors; don't re-open §4 items without new evidence; don't drift into the world-engine receipt contract — it's ticketed, it's not yours.

## Prose

**Grading the self-found defect.** Your self-accusation is half-right, and the half that's wrong matters. The nine deleted mechanisms existed *nowhere* — names in canon pointing at void. This gate exists everywhere the repo exists: script, hook block, npm script, 73 tests, all committed and functional. What is fictional is only its **universality**. So: not fabrication, but overclaim of scope — a lesser included offense in the same family. The *epistemic move*, though, is identical, and that's the damning part: you performed a verification in a privileged environment and wrote the result into canon as repo truth. That is precisely the "line number written into canon as proof" class your own pre-ship rounds fixed. HIGH, not CRITICAL — nothing live is wrong — but it sits at the top of the table because it recreates the original rot's precondition: a false assurance that checking exists, waiting quietly for the first regression it won't catch.

Note the sharpest evidence is in your own §4: *"core.hooksPath IS set on this machine"* is listed under **disproven by execution**. That disproof was the bug report, filed as a defense. Pre-ship rounds could not have caught this — every round ran on the privileged machine, so the counterfactual environment (a fresh clone) never existed to test against. Shipping is the first moment the repo meets a machine that isn't yours. Generalise and burn it in: **verification that depends on the verifier's environment cannot falsify itself; only fresh-clone and CI evidence transfers.**

**"He's the one merging, so his gate covers it."** Weaker than it looks. Pre-commit hooks gate authoring, not acceptance. A fast-forward merge creates no commit, so no hook runs — and ff is git's default when main hasn't moved. Server-side merges never see local hooks. `--no-verify` is one flag of muscle memory. And the third precondition — single author — is not a fact about this repository but a fact about 2026-08-16: the corpus is explicitly built for multi-agent authorship (CLAUDE, AGENTS, GLM, Kimi, HY3, Fable). So: most of the value *today*, under three unenforced invariants, one of which contradicts the repo's own operating premise. That is a decaying asset, not a guarantee.

**The correct fix is both layers, with CI authoritative.** `prepare` gives ergonomics wherever `npm install` runs; CI gives enforcement that cannot be bypassed by local state. One honest caveat: Render auto-deploys from `main`, so CI-on-main is an *alarm after deploy*, not a gate — if a PR flow exists, required-CI-on-PR is the actual gate for main; if everything is direct push, the alarm is still the best available. Framing worth adopting: **CI's job is to re-run your §5 table on every push, forever.** And add the meta-test — the gate guards the corpus; something should guard the gate.

**False or incomplete?** False as an enforcement claim; literally true as an artifact inventory. In a corpus whose founding observation is that every file "still read correct" while quality degraded, read-correct is the failure mode, not a defense. The canonical reader of that canon line is a fresh-clone agent — the one context where the claim is false. Rewrite, don't annotate.

**The other questions, compressed.** *design.html*: Kimi's asymmetry (claims get argued with; visuals get copied) is sound and now doctrine — two mirrors retired by one principle is consistency, not accident. The hole a human feels is real but small, and the only safe refill is generated-from-canon; a hand-authored v2 is the next rot seed. *Consult trio*: the tell is "found by grep not memory" — duplication defeats the memory of the person who wrote all three copies. Extract, and tripwire the single-copy invariant. *Known-red*: shipping with baseline-red was acceptable *because* you met the three conditions — baseline-diffed, unmasked, ticketed. Unpinned, it normalises structurally for everyone after you; pin the set as data. *Palette anchors*: strictness is the value; independence from the checked artifact is what makes it a check. Make the trap self-explaining rather than removing it. *Sentinel*: keep — resurrection arrives by paste, and paste reuses literals. *Scope*: entanglement, not sprawl. Constitutions point *into* the brain; the verifier collision was forced by the crash-masking incident; the mirror contradiction had to be sequenced. Stopping at the brain's border while its pointers live in higher-authority docs would have been the real scope error. Your one scope miss is F10 — the deferred work lives in review prose instead of a queue.

**What shipping revealed that pre-ship could not:** environment-dependence of enforcement (above); the authoring-vs-acceptance distinction, which only surfaces when "who else commits" becomes real; that a known-red baseline changes *owner* at ship — from your context to an inherited oracle others must interpret without your memory; and the 13 commits since ship — the first cohort whose authoring environment you cannot vouch for. Which is why next-agent action #1 is five minutes long.

**What held.** Zero merge conflicts across five SHAs, post-push remote verification, secret scans on every commit, SWA-171 sequenced so main never carried the contradiction. The work layer survived contact. The defect is entirely in the claim layer — which, for this workstream, is the layer that matters.
