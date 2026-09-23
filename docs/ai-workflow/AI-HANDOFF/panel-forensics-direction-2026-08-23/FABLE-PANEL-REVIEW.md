# Fable 5 — Final-Decider Ruling

**Reviewer:** OpenRouter `anthropic/claude-fable-5` (Fable via OpenRouter credits; Claude-subscription Fable was capped)
**Document:** docs/ai-workflow/AI-HANDOFF/HERMES-AI-FAILURE-FORENSICS-REPORT-2026-08-23.md
**Seed:** (none)
**Tokens:** 25773 in / 10758 out · **Cost:** ~$0.7956 · **Wall:** 156.4s

---

# LOCKED RULING — Direction for the Rulebook, the Loop, and Hermes

## 0. Premise audit (mandatory, and it changes things)

Before reasoning from the prompt, four of its premises fail verification against the document itself:

**P1 — "Coverage is verified complete" is FALSE as stated.** No verification method is described anywhere. Q8 exists precisely because Stage 1 missed 83% of the evidence; the AI-HANDOFF corpus (764 files) was *read selectively but never mined for mistake bullets*; and Q8 itself notes near-misses "rarely earn a Fable-tier packet," meaning the recorded population under-samples exactly the events we most need. Coverage is *unaudited*, not complete. Direction below survives this because both corpora independently converge — but no count in this ruling should be treated as a census.

**P2 — "caught by remembering a rule: 0" is an instrument artifact, not a measurement of zero.** Nobody writes that phrase; an agent whose loaded rule fired would write "checked first" — which lands in the `caught because checked` bucket. And the corpus records at least one counterexample verbatim: *"The written rule actually fired (once)"* (`validate-the-instrument` packet). The defensible claim is **rule-recall catches are rare and mostly unmeasurable; executed-action catches dominate by an order of magnitude.** Build on that. Do not build on "zero" — that is the same shape as believing a probe negative without validating the probe, in the prompt of the report about that exact failure.

**P3 — "83 numbered rules, 15 consume 60%, 1177 lines / 215KB / ~54k boot tokens" appears nowhere in the document.** The report says *164 numbered definitions, max Rule 83* — which is not the same thing as 83 rules, and the "15 consume 60%" figure has no source at all. Per the corpus's own law, a number stated in a prompt is the number to distrust. **Step zero of any rewrite is measuring the file** (rule count, token count, per-rule token weight) with a script whose output is pasted, not typed.

**P4 — The five-class taxonomy is really three roots.** The report concedes this itself: A, B, and C are one mechanism (trust-the-instrument) wearing three hats. The rewrite should target three roots — **trusted instrument, drifted number, untriggered process** — not five classes.

With premises corrected, the ruling:

---

## 1. What the rule system should actually be

The measured catch profile — ~84 ran/checked, ~26 read-at-the-moment, ~65 adversarial rounds, ~41 "already written," rule-recall ≈ negligible — plus Q4's refinement (*tethered vs. untethered*, not procedural vs. resolutional) dictates the architecture:

**A rule that does not name its trigger and its command is not a rule. It is lore.**

Concretely, three tiers:

1. **Constitution (~10–15 prose invariants, boot-loaded).** Only things that genuinely require judgment and cannot fire mechanically: PII never leaves (R8/59 intent), spend caps, delivery-over-review, never reinterpret a gate to unblock yourself, disclose deferrals. Everything else leaves boot context.

2. **Triggered controls (the bulk).** Every retained rule is rewritten as `TRIGGER → COMMAND → BLOCKING?`. Organize the rulebook **by trigger point** (session-start, pre-claim, pre-commit, pre-spend, pre-outbound, closeout), not by number. The numbering scheme has already failed — the 66/83/164 confusion is the proof, and it is a Trailhead-Truth violation living inside the Trailhead-Truth rule's own file.

3. **Just-in-time injection instead of boot recall.** The one place written lessons demonstrably work is `caught reading` (26) — reading *at the moment of act*. ~54k boot tokens bought approximately zero recall catches (with P2's caveat: rare, not zero). Move lessons out of boot context into a trigger-indexed store; hooks inject the 1–3 relevant lessons when their trigger pattern matches (about to claim absence → inject the probe-validation lesson; about to type a numeral → inject measure-then-state). This converts the corpus's only working prose channel from accidental to systematic — and it is the lower-confidence recommendation in this ruling, flagged as such, because it rests partly on the P2-corrected inference.

The template already exists in the corpus: **Rule 54 is the only rule that held, and it held because a grep was attached to it.** Every survivor gets Rule 54's shape.

## 2. Existing rules: delete, merge, retire, convert

| Rule | Disposition | Evidence |
|---|---|---|
| **80** (Second-Vantage) | **CONVERT**: positive-control mechanism — no absence claim without a control-grep on a known-present string; verdict lines banned from the same statement as their command | violated 4× in one session *after* write-up |
| **79** (Tests Encode Bug) | **CONVERT**: red-before-green enforced — hook runs new tests against pre-fix source (stash/worktree) and requires the RED transcript | "cannot fail against its named defect" ×4; mutation testing "the only intervention with a high hit-rate — *and only when run*" |
| **74 + 46 + 82** | **MERGE** into one **review-debt ledger**: a requested review is a tracked debt; closeout gate blocks unless dispatched or explicitly waived | panel deferred 6×; all three rules were procedurally correct and had no emitter |
| **75** (Trailhead-Truth) | **CONVERT** (partial): numerals in docs/commits must be generated, not typed — lint flags counts lacking an adjacent measurement line. Also: **fix or delete the "66 MANDATORY" header claim** | stale counts ×3 in one session, ×6 in another; "54 checks" vs 52 |
| **30** | **EXTEND**: self-authored prose is a distinct evidence class — verification passes run against diffs *with comments stripped* | 9 hostile rounds missed the inversion because "prose you authored reads as verified" |
| **16** | **EXTEND**: spend gate covers *quotes*, not just runs — any dollar figure must be pasted from `--dry-run` output | cost-from-memory ×5+ |
| **68** | **EXTEND** to wiring: built-but-dark is a defect with a flip-or-delete deadline | 3/3 flags dark 26–27 days |
| **4** (line cap), **67 R6** (git add) | **CONVERT** to hooks immediately — both are trivially lintable and remain prose while being violated 19× and 23× | Q8 Finding 3 |
| **15, 27, 57, 81** (caution cluster) | **RETIRE** to lore appendix | zero measured catches attributable to prose caution; "a caution is not a control" |
| **54** | **KEEP** — the template | the one documented rule-that-held |

**Partial disagreement with Appendix C:** the report claims no rule was "simply ignored," only "violated under understanding." Q8's Rule 4 / Rule 67-R6 violation counts make that less clean — with 54k boot tokens, the assumption that every rule was *read* in the violating session is itself unverified. But the remedy is identical either way (triggers), so the dispute doesn't change direction; it just removes a rhetorical flourish.

## 3. New mechanisms the evidence demands (priority order, by evidence strength)

1. **Exit-code discipline** — 44 memo hits, the most-recurring *un-ruled* mechanism, and it is live in the toolchain right now (`hermes-learning-validate.mjs` prints FAILING: 28, exits 0). Ship a `run` wrapper / shell profile that always surfaces pipestatus; ban `cmd && echo <conclusion>`.
2. **Regression-test polarity check** — automated red-on-pre-fix, green-on-post-fix (retires the test-required-the-bug class mechanically).
3. **Review-debt ledger** wired into the closeout gate (above).
4. **Gate self-audit on commissioning** — any new gate ships with a demonstration that it *can go red*: inject the defect it guards, show the failure; any marker-keyed gate must link its emitter. This retires the "gate certifies the failure / marker nobody emits / guard doesn't stop the caller" family — the class currently generating a new rule per incident.
5. **Session-start freshness check** — 49 hits; print branch + commits-behind-main; block audits from stale checkouts (Stage 1 itself ran 2,181 commits behind).
6. **Scanner positive-control** on every outbound packet (the username leak; currently managed ad hoc).
7. **Receipt re-execution** — a work claim requires a re-run or artifact hash, not a receipt.
8. **Machine-readable spend ledger** — 393 scattered figures, no source of truth.

## 4. The learning loop — yes, it matters more than the rulebook

The loop is currently **push-to-archive**: write → file → nobody reads → recur (38–47%, corroborated independently by a 5×-larger corpus from different agents). The fix is to invert it to **gate-and-pull**:

1. **Fix and wire the validator first.** Its exit-code bug is the corpus's #1 unnamed mechanism instantiated in the loop's own enforcement point. Fix the exit code; invoke gate mode from pre-commit/closeout. Hours of work; the entire loop is ungated until this lands.
2. **Change the terminal state of a lesson.** Schema requires every mistake bullet to end in one of: (a) mechanism created/updated, (b) explicit "no mechanism buildable — lore," (c) merged into an existing mechanism. A prose-only packet is schema-invalid. This makes "write it down harder" — the meta-recurrence — structurally impossible.
3. **Three-strikes law, automated.** New mistake bullets fuzzy-match against the corpus (the extract JSON exists); a class recorded 3× without a mechanism blocks closeout with a required mechanism proposal. This gives the "lesson-recurrence itself has no detector" gap (Q3 meta-gap) its detector.
4. **Do NOT read the 416 pending memos.** Reading them one by one is the same failed loop. One batch distillation from `memo-mistakes.json`, cluster by mechanism, convert the top clusters, archive the rest — then **abolish the queue as a concept**. An unread queue is a gate keyed to a marker nobody emits; the marker is "someone will read this."
5. **Trigger-indexed retrieval** (per §1) replaces boot-loading as the read path.

## 5. Hermes specifically

- **Shell discipline as identity, not memory:** verdict never in the same statement as its command; exit status checked separately; scope stated before any "not found"; positive-control before any absence claim. These become the wrapper it runs *through*, since the loaded skill covering exactly this was violated 3× while loaded — loading is not intervention; interruption at act-time is.
- **Cap self-hostile rounds at 2.** Nine rounds missed an inverted comment; self-hostile passes share the author's priors and show steeply diminishing returns. Spend round 3+ on either a different-prior seat (GLM at $0 as default, paid as escalation — per the corpus's own routing fact, noting it is [SELF-AUTHORED]) or a mechanical check (run the code; review own diffs comments-stripped).
- **Never type a numeral it didn't measure in the same turn** — measurement output pasted, hard rule.
- **"Done" redefined mechanically:** artifact re-executed + review-debt ledger empty + validator green + Linear synced. Not prose.
- **Every self-report terminates in mechanism-or-lore** per §4.2 — Hermes produced most of this corpus by writing lessons as endpoints; that terminal state is now invalid for it before anyone else.

## 6. Sean's single highest-value next move — and a disagreement

**Fix the validator's exit code and wire it to the closeout hook, with the mechanism-or-lore terminal-state check added. This week. Before any rewrite.**

Why this over the CLAUDE.md rewrite: rewriting the rulebook first is *writing the lesson down harder at system scale* — the exact remedy the corpus proves doesn't hold. The wiring is a half-day, is itself the fix for the most-recurring unnamed mechanism (exit codes), and converts every future lesson into a forced mechanism decision. The rewrite (§1–2) is move two, and it will be *safe* to do only once move one exists, because the rewrite's outputs will then be forced through the gate it creates.

**Disagreement with the report's own next step:** do **not** fire the $6 eight-seat Stage 2 panel now. The evidence is already decisive on direction — both corpora, different agent populations, same conclusion. Spending eight seats to re-confirm "convert prose to mechanisms" is review-displacing-delivery, the corpus's own Class E, and the deferred-six-times panel pathology inverted into its mirror image. If a panel runs at all, run it *after* the rewrite draft exists, against the draft, with 2–3 seats (GLM free + one paid hostile), against the full 2,523-bullet extract.

**Evidence-strength ranking of this ruling's planks:** (1) tethered-vs-untethered / triggers — corroborated across both corpora, strongest; (2) exit-code mechanism — 44 hits plus a live bug; (3) red-before-green enforcement; (4) review-debt ledger; (5) seat routing — self-authored cost data, medium; (6) boot-token reduction / JIT injection — inferential, weakest, and explicitly flagged as resting on the corrected P2, not on the prompt's "zero."
