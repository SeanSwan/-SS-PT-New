# SwanStudios Kimi K3 Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** docs\ai-workflow\AI-HANDOFF\CONSTITUTION-HARDENING-ROUND4-PACKET-2026-08-15.md
**Seed:** (none)
**Tokens:** 2048 in / 1643 out · **Cost:** ~$0.0308 · **Wall:** 21.8s · **finish_reason:** stop

---

# HOSTILE REVIEW — ROUND 4

**(a) VERDICT: SHIP-WITH-CHANGES**

One real defect in the D1 fix's evidence base; everything else is either conceded, answered, or below the bar.

---

**(b) Defects in the round-3 fixes, most severe first**

**F1 — Polarity *deletion* is untested, and the spec as written may not catch it.** The check is described as "a content word governed by one polarity before and a **different** one after blocks the rename." The committed tests include *polarity inversion* (`never`→`always`) but nothing for polarity *removal*: "You must **never** commit secrets" → "You must commit secrets." Is absence a polarity value? If the implementation compares polarity-before against polarity-after only when both exist, the single most dangerous edit this guard exists to catch — silent negation drop — sails through, because there is no "different" polarity after, there is *none*. The D1 narrative shows this exact failure mode already happened once inside this fix (shared-`must` bug caught by its own test), so "the test suite doesn't enumerate it" is not paranoia, it's precedent. **Breaking scenario:** rename commit whose diff drops the negating token while keeping the governed content word; guard passes; a MANDATORY prohibition becomes a permission. Fix is one test and, if it fails, treating `∅` as a polarity class. Cheap. Blocking.

**F2 — Nothing else rises to defect.** I looked hard at the D3 fix for the usual defect-inside-the-fix and the construction is sound: the regression test asserting the aggregate blocks *while no individual rule trips* is exactly the right test — it proves attribution, not just behavior. D4 is a candor fix; verified against the quoted language, it says what it claims to say.

---

**(c) The six items**

1. **What the polarity check misses.** Synonym substitution ("must not" → "should avoid") matters and is *not* covered — but note it is partially caught by the strength class only if `should` vs `must` is compared per-governed-word, which the packet doesn't state; strength was split out precisely because comparing it *blocked the real rename*, so presumably it is not compared. That means strength-downgrade-on-rename is an accepted hole. Given MANDATORY-downgrade is already a separate committed test, I accept this as residual, not a defect. Scope narrowing ("before commit" → "before release") is real but is a semantic-diff problem no token check solves; building for it is invention. Clause deletion is covered by the 2% per-rule floor. **Only F1 above must be built.**
2. **Hand-partitioned classes.** Best attack: `only` is classified polarity, but "You may only X" → "You may X" is scope *widening* via polarity deletion — again F1, not a misclassification. `required` as strength: "X is required" → "X is recommended" is a downgrade with no modal token at all; if the STRENGTH list is modal-only, this passes everything except the 2% floor, and a one-word swap won't trip 2%. Real but narrow; a `required`/`must` equivalence entry is a one-line fix, worth doing, not blocking.
3. **0.5% calibrated on a corpus that only grew.** The objection is fair and unresolvable: there is no legitimate-shrink sample to fit against, by construction. But the budget is a tripwire, not a classifier — its false-positive cost is a declared-removal commit, which is the intended workflow. Accept as stated; no better calibration source exists.
4. **Removal-plus-trim hiding in the exclusion.** Attack: declare removal of rule R (excluded from aggregate), then reintroduce R's body, trimmed, as a "new" rule — new rules aren't in the both-versions set, so the trim never enters the aggregate. This is the laundered-rename pattern, and the packet already has a committed `laundered rename` BLOCK test. Whether that test covers removal-*plus*-reintroduction (rather than rename) is not stated. Worth one test; I judge it likely covered and do not count it as a defect.
5. **Re-attack of FIXED dispositions.** D1: see F1. D3: sound (above). D4: verified against quoted text. No other FIXED item shows a defect.
6. **Dry?** Nearly. See (d).

**(c-continued) D2 refutation: CONCEDED.** The round-3 scenario assumed a tree file; the evidence (two `process.env` reads, early-exit probe with output quoted) eliminates the commit/amend blast radius entirely. The residual — exported variable blocking constitution commits until `unset` — is the self-announcing standing-credential cost I asked for in round 2. Consumption semantics on an env-only, command-scoped hatch would be invention. Conceded in full.

---

**(d) Highest-impact remaining change**

Add the polarity-deletion test (F1) and, if it fails, treat absent polarity as a polarity class. One test, possibly one branch. After that lands: **the work is dry.** The open items (external enforcement, Q1 trailer, Q4 ledger) are honestly stated as unbuilt-with-reasons, and with check 3 covering shrink, downgrade, marker loss, inversion, and aggregate bleed, the Q1 trailer's marginal value no longer justifies building it. Further rounds beyond F1 would be invention, and I decline to invent.
