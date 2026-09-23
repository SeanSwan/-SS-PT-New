# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/HERMES-AI-FAILURE-FORENSICS-REPORT-2026-08-23.md
**Seed:** (none)
**Tokens:** 17594 in / 6130 out · **Cost:** ~$0.0000 · **Wall:** 218.6s · **finish:** stop

---

# Direction Review — Premise Audit First, Then Answers

## Step 0: Audit of the premises (mine included)

Before reasoning, I checked every load-bearing claim in your prompt against the document. Several do not come from the evidence at all:

1. **"Coverage is verified complete"** — asserted by you, contradicted in spirit by the report itself: the corpus grew 99→106 *during* the audit, counts moved between snapshots, and Stage 1 initially read ~30 of 1,109 memos (17% of the bullets). Nothing here supports treating any specific number as stable. Fortunately, none of the directional conclusions depend on exact counts — the robust findings survive snapshot noise. Do not let the rewrite chase precision the corpus cannot supply.

2. **"28/106 packets fail schema," "a validator whose gate mode works but which NO hook invokes," "a self-improvement queue nothing drains," "15 rules consume 60% of the rules block"** — **none of these figures appear anywhere in the document.** They exist only in your prompt. The report explicitly tags the validator-invocation question `[UNVERIFIED]`. Given this corpus contains an incident where 7 of 7 seats echoed a false premise because it was stated in the prompt, the correct posture is: treat these as *hypotheses to verify in an hour*, not as inputs to the rewrite. If they're true they strengthen case (4) below; if false, building around them wastes the cycle.

3. **"'Caught by remembering a rule' = 0"** — this is an n-gram absence, and n-gram absence is exactly the "false-absence from an unvalidated instrument" error that is this corpus's *dominant failure class*. The exact phrase wouldn't catch "the written rule actually fired (once)" — which the report records as having happened. The defensible claim is weaker and still decisive: **executed actions outnumber rule-recall as catchers by roughly two orders of magnitude.** That's enough to act on; don't overclaim it.

4. **"416 memos pending unread"** — note the numeric collision: 416 is *also* the mistake-bullet count at the 2026-08-22 snapshot. Probably coincidence, but this corpus's own law is that a number which survives by being repeated is the one to distrust. Verify both independently before either appears in the new rulebook.

5. **The entire corpus is self-authored.** Every "caught by," every cost, every recurrence count is the agent grading its own homework. The report is admirably honest about this. It means the rewrite should weight *mechanism shapes* (which replicate across hundreds of independent incidents) far above *specific numbers*.

Now the answers.

---

## (1) What the rule system should actually be

The evidence converges on one design principle, stated three independent ways by three different measurements:

- Catch verbs: ran/checked (84), reading (26), hostile rounds (~65) — all *executed actions*; rule-recall ≈ 0.
- Fix survival: procedural-with-trigger, mechanical, structural hold; resolutional prose fails; **procedural-without-emitter fails too** (panel deferred 6× under two MANDATORY rules).
- Failure mechanism: not ignorance — "violated while understanding." Rules are read and then not attached to anything that fires.

**Therefore: the rulebook is not a list of rules. It is a list of CONTROLS.** Each entry must have four fields or it doesn't get a number:

> **TRIGGER** (the moment it fires: pre-commit, pre-verdict, pre-outbound, session-start, closeout) → **COMMAND** (the literal thing run) → **EXPECTED OBSERVABLE** → **FAIL ACTION** (halt, not warn).

Rules with no buildable trigger are not rules; they are folklore, and they go to an appendix loaded on demand — or die. Concretely, the controls the recorded failures demand:

1. **Exit-status discipline** (44 memo hits; the validator itself prints `FAILING: 28` and exits 0): never read a command's success through a pipe or from printed output. Wrapper script or `PIPESTATUS` check, mechanically enforced.
2. **Verdict separation**: no conclusion string emitted in the same statement as the producing command. Already identified in-corpus as the thing that worked; promote it from a packet lesson to a shell-level lint.
3. **Absence-claim protocol**: any "X is missing" requires a control-grep on a known-present string first, plus cwd/config printout. (Six false absences in one session; nearly produced a strategic call.)
4. **Measure-before-write**: any number entering a doc, commit message, or cost quote must be the output of a command run in that statement. (Stale counts recurred *in the file open in front of the agent*.)
5. **Red-before-green**: new tests run against pre-fix source, every time; mutation testing *run*, not defined, whenever a suite certifies a guard.
6. **Gate canary**: every gate ships with a known-bad input that must make it FAIL, and its marker traced to a named emitter. This one control retires Rules 79/80/81-class prose and the whole "gate is the failure" meta-gap.
7. **Closeout obligation gate**: closeout enumerates dispatched-or-explicitly-waived reviews, Linear sync, and wired-vs-dark flags. Halts on open obligations.
8. **Session-start branch-freshness check** (49 origin-main hits; the report itself ran 2,181 commits stale).
9. **Scanner positive control** before any outbound packet.
10. **Cost preflight**: `--dry-run` before quoting any per-seat figure.

And shrink the boot: ~54k tokens of mostly-unfired prose is itself a failure surface — the agent violated rules *while reading them*, and the header lied about its own count. A control list of the shape above fits in a fraction of the space and is the only part that deserves boot tokens.

## (2) Dispositions for the existing 83

Honesty constraint: neither the report nor your prompt gives me the full text of all 83 rules, so I can only dispose of the ones the evidence names. For the rest, the **deletion criterion** is mechanical: a rule keeps its number only if (a) a recorded failure names it, or (b) it has a trigger. Everything else moves to an on-demand appendix. Do not delete rules for "being ignored" — the report found no clean example of that category, and deleting on the wrong theory reproduces the corpus's own chosen-answer-first failure.

Named dispositions:

- **CONVERT to mechanism (keep, but change form):** Rule 54 (sibling-sweep grep — the corpus's one proven success: it held *as a command*, not as prose; make it the template), Rule 79 (→ red-before-green hook), Rule 80 (→ verdict-separation + exit-status check), Rule 74 (→ closeout gate extended with the outstanding-review check), Rule 75 (→ doc-number-diff hook; and fix its own "66 MANDATORY" violation the same day — a truth rule whose enforcer lies is the corpus's best joke), Rule 16 (extend spend gate from runs to quotes), Rules 46/82 (→ dispatch-or-waive gate; also script Rule 82's lensed-remit override so omission is impossible, not discouraged).
- **MERGE:** the caution cluster the report identifies (15, 27, 30, 57, 81) collapses into one short evidence-standards statement — or is deleted wherever a control above supersedes it. Rule 30 survives in reduced form for *delegated* claims; the new self-authored-prose control covers the author case.
- **DELETE:** any rule with zero ledger/memo citations and no trigger. Identify by running the minable mapping Q8 found (`rule prevents repeat`, 10 hits) against the full text — that mapping is sitting in the corpus waiting to be used.

## (3) New rules/mechanisms that don't exist yet

Beyond the ten controls above, the evidence demands:

- **Self-authored prose is a defect class**: a comment contradicting code is a bug, and the author is never the sole verifier of their own prose (nine hostile rounds missed it; both model families share the blind spot).
- **Shipped-but-dark deadline**: activation debt gets an owner and a flip-or-delete date (flags dark 26–27 days).
- **Receipt-is-not-evidence**: work claims require re-execution, not presentation of internal proof.
- **Recurrence escalation**: before writing a new lesson, grep the corpus; if the class already has ≥2 write-ups, creating another packet is *forbidden* — the only permitted output is a mechanism. This attacks the meta-recurrence ("written up three times without stopping") at its source.
- **Machine-readable spend ledger** (393 scattered dollar figures, no source of truth).

## (4) The learning loop — and yes, this outranks the rulebook

Your instinct in the question is correct, and the evidence agrees: lessons are produced at industrial scale and consumed at approximately zero. The fixes, in order:

1. **Fix the validator's exit code first** (an hour of work), then wire it into pre-commit/CI. A quality gate that exits 0 on failure is the corpus's #1 unnamed mechanism instantiated in the corpus's own tooling — poetic, and trivially fixable.
2. **Invert intake**: one living **class ledger** (one row per error class: recurrence count, current control, control-tested?, last-fired) instead of N growing documents. New incidents increment a class row; they don't spawn artifacts. This simultaneously creates the missing recurrence detector.
3. **Drain the inbox once, mechanically**: batch-triage the pending memos into the ledger, then change the policy so memos are consumed at intake. An inbox that grows forever is a Class E deferral wearing a directory hat.
4. **Force targeted reading at the moment of risk**, not general reading at session start: "caught reading" (26) shows reading works when it happens — so the pre-verdict/pre-absence-claim hooks should print the relevant ledger row *at the point of action*. That is the only form of "remembering a rule" the data shows functioning.

## (5) Hermes specifically

- **Stop spending self-hostile rounds on self-authored prose.** They measurably miss author-framing errors (4–9 rounds, repeatedly). Reallocate that budget to *running* checks; route authorship verification to a different-model seat by default, not by aspiration.
- **Convert Hermes's memory entries from facts to macros.** The smoking gun: the lesson was *loaded in memory* (`feedback_validate_probe_before_absence_claim`) and violated anyway. Memory items that matter become commands Hermes is required to execute, not knowledge it is hoped to recall.
- **Insert mandatory pre-verdict steps into its decision loop**: instrument validation before any existence claim; measure-before-quote; scope statement before any search ("I chose the scope, then forgot it was a choice"); verdict only in a separate statement after the producing command.
- **Separate the roles mechanically**: Hermes currently writes the packets, runs the validator, and grades itself. At minimum the validator and closeout gates must be non-Hermes-owned artifacts.

## (6) Sean's single highest-value next move

Ranked by evidence strength:

1. **(Do today, ~1 hour)** Fix the validator exit-code bug and wire it into CI. Directly observed defect; instant integrity gain for everything downstream.
2. **(The strategic move)** **Tether the top five recurring classes**: ship a firing mechanism each for exit-status, absence-claims, stale-numbers, red-before-green, and panel-deferral — and let the resulting control list *be* the core of the rewritten CLAUDE.md. This is supported by the strongest signal in either corpus (84 ran/checked catches vs ~0 rule-recall; 38–47% already-written-up recurrence; the tethered-vs-untethered split in Q4). The rewrite falls out of the tethering; don't schedule it as a separate writing project, or you'll produce 83 new prose rules and rejoin the recurrence statistics.
3. Then drain the inbox into the class ledger, and only then iterate on remaining rules.

**One process warning for Stage 2:** send the panel seats the raw extracts (`memo-mistakes.json`, the packets), not your summary of them. Half the premises in your prompt aren't in the evidence, and this corpus has already demonstrated, once, what happens when seven seats are handed a premise instead of a dataset.
