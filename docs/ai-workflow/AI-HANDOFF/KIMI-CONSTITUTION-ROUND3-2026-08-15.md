# SwanStudios Kimi K3 Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** docs\ai-workflow\AI-HANDOFF\CONSTITUTION-HARDENING-ROUND3-PACKET-2026-08-15.md
**Seed:** (none)
**Tokens:** 2413 in / 2601 out · **Cost:** ~$0.0463 · **Wall:** 62.6s · **finish_reason:** stop

---

# HOSTILE REVIEW — ROUND 3

**(a) VERDICT: SHIP-WITH-CHANGES**

The round-2 fixes are mostly real. One of them contains a hole of exactly the class it was built to close, and it is the one you are proudest of.

---

**(b) DEFECTS IN THE FIXES, most severe first**

**D1 — The F1 continuity check is blind to inversion, and the stopword list is what blinds it.** This is the worst defect in the packet and it lives inside the fix you led with.

Breaking scenario: rule 46 body is a prohibition — "never commit generated files; always run the linter first." Attacker declares a rename and replaces it with "always commit generated files; never run the linter first." Content-word overlap after scaffolding-stripping is near-total: same vocabulary, same rule slot, same structure. But `never` and `always` are **stripped as stopwords** (your own §5.2 admits this). The check therefore scores an exact semantic inversion — the single most damaging laundering payload there is — as *high continuity*, and the MANDATORY-parity check doesn't fire because the replacement keeps the MANDATORY marker. You built a continuity check that cannot see negation, then removed the only tokens that carry negation. A token-overlap metric with modals stripped will pass every payload of the form "same words, flipped modality," which is precisely how you'd launder a rule while keeping its vocabulary. The 25% floor is irrelevant; the metric underneath it is the defect.

**D2 — F6 block-on-stale-hatch is a denial-of-service on legitimate multi-commit work, unless hatch entries are consumed.**

Breaking scenario: a refactor spans commits A and B. Commit A carries the hatch entry `SWAN_RULE_RENAME: 46→46` and performs half the rename (destination added, source not yet removed — an intermediate state your own test list implies is representable). Commit B completes it. The hatch entry in commit B's tree now "authorises nothing in the current commit" → **block**, with an instruction to unset a variable that isn't set — the hatch is in the *tree*, not the shell. The user must now make a contentless commit editing the hatch, or amend history. Worse variant: hatch committed, authorized change later reverted in the normal course of work → every subsequent commit blocks until someone edits the hatch file, which is itself a constitution-adjacent edit. The fix converted a cosmetic banner into a trap that fires on the *absence* of an event. Correct semantics: a hatch entry should be **consumed** by the commit that uses it (removed from the tree in the same commit), and stale entries should block only after N commits or on hatch-file *add*, not on every commit forever.

**D3 — The 2% shrink floor is per-rule; the aggregate is unguarded.**

Breaking scenario: attacker trims 20 rules by 1.9% each — tightening wording, dropping examples, "editorial cleanup." Every rule passes the 2% floor; MANDATORY counts unchanged; ~38% of one rule's worth of constitution removed in one commit, undetected. F4's derivation measured per-rule deltas and produced a per-rule floor, but the incident signature you adopted ("shrink is the incident") is a property of the *diff*, not of any single rule. Add an aggregate shrink budget across the file.

**D4 — F2's SessionStart wiring check has the same bootstrap hole you accepted for F3, one layer over, and the packet doesn't say so.** You argue SessionStart is "the one place that executes regardless." It executes regardless of `core.hooksPath`, yes — but it is itself a hook, configured in settings. Delete or break the SessionStart configuration and the wiring check dies silently, exactly the F3 failure mode you (correctly) declared unfixable client-side. This doesn't make F2 wrong — it makes the asymmetry in the document wrong: F3 gets an honest "cannot be fixed" header; F2 gets a claim of executing "regardless." Same hole, different candor. State it in the header like you did for F3.

---

**(c) SECTION 5 ANSWERS + MEASURED DISAGREEMENTS**

1. **Laundering payload above 25%:** the inversion payload in D1. Copy the victim's full vocabulary, flip `never`→`always` or insert `not`. Scores near-maximal overlap; meaning inverted. Also viable: keep the rule's content words but change the *condition* ("run tests before commit" → "run tests before release") — high overlap, gutted scope.
2. **Stopword list: too long, not too short.** Stripping `must`/`never`/`always` removes the operative content of a prohibition — those words *are* the rule. Structural boilerplate (`MANDATORY`, `Established`, `AMENDED`, years) is the right strip; modality is not. Fix: retain modal/negation tokens in scoring, or add a separate parity check on the modal profile of old vs. new body.
3. **Yes — DoS, see D2.** Block-on-stale needs consumption semantics or a grace window.
4. **A zero-shrink sample is evidence the sample is unfit to calibrate a shrink floor.** You cannot derive a noise floor from a distribution with zero observations on one side; 2% is a guess wearing a derivation. It's a *reasonable* guess and I would not block on it — but label it a guess, and note the real gap is aggregate (D3), which no per-rule floor derived from any sample would catch.
5. **Re-attacked:** F1 is marked FIXED and is not — D1. F3's NOT-FIXED disposition is honest and correct; no client-side fix exists. F2, F4, F5, F6 fixes are real; F5's 27-way manual classification is genuinely thorough. F6's *direction* is right; its semantics are wrong (D2).
6. **Over-built:** nothing rises to "remove it." The F5 classification is one-off manual labor that will rot as citations change, but it's cheap to redo. The nearest candidate is block-on-stale-hatch, which as currently specified costs more in false blocks than a consumed-hatch design would — but the fix is redesign, not removal.

**Measured disagreements:**

- **2a — I concede, plainly.** The measurement refutes my 60% floor: the one known-good rename scores 33.1%, and 60% would have rejected it. 25% is well-placed against the observed unrelated band (8.8–14.9%). My prescription was wrong *as a number*. But the measurement defends a floor on a metric that D1 shows cannot see the attack that matters — so the concession is on the threshold, not on the check's adequacy.
- **2b — I concede the specific point.** If check 4 enforces byte-equality at commit time with a passing regression test, the banner is signage on enforcement, not a substitute, and my "half-measure worse than either extreme" argument was premised on the banner being the only defense. It wasn't. Your gitignore counterargument is also correct: a fresh clone or non-hook-executing reader seeing *no* constitution is worse than drift. Refuted, plainly. The residual point — two writable copies is the root defect, commit-time is late — stands but is a known, accepted tradeoff, not a finding.

---

**(d) HIGHEST-IMPACT REMAINING CHANGE**

**Make the continuity check modality-aware before shipping the rename path.** Retain negation and modal tokens (`never`, `always`, `must`, `not`, `only`, `except`) in the scored token set — or, minimally, add a modal-parity check alongside content-overlap and MANDATORY-parity, so a rename whose operative modality flips blocks regardless of vocabulary overlap. Cost: a small token class and one more committed regression test (the inversion payload). Without it, the flagship round-2 fix passes the most realistic laundering attack in its threat model, and the 25% floor you carefully measured is guarding the wrong quantity.

Everything else — D2's consumption semantics, D3's aggregate budget, D4's candor fix — is a follow-up commit, not a gate.
