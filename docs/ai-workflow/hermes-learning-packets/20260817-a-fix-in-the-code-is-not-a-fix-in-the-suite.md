---
title: "A fix in the code is not a fix in the suite — and exit code 0 is not proof of work"
originating_model: claude-opus-5
tier_basis: "Session model is claude-opus-5 (harness-stamped in system context) — on the Rule 68 allowlist per Sean's 2026-08-10 designation"
date: 2026-08-17
decision: "Closed the SWA-169 hostile-marathon residue by proving the last finding was already fixed but wholly unguarded; added the missing fixture family with a mutation check; published the factory repo; ran the first GPU slice and caught a silent training no-op"
status: draft
privacy: "IDs/roles only; no PII, no secrets, no absolute user paths; secret-scanned CLEAN"
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer (sole agent this session)
    did: "Stale-checked every live-state claim in the inherited handoff (3 of them wrong); executed the carried-over finding's matrix against live code; added and mutation-checked the missing fixtures; rebuilt and published the repo history; ran train/export/registry slices"
    cost: subscription
  - model: glm-5.3
    role: hostile reviewer (carried-over finding from the prior session's round 10)
    did: "Authored the H10 finding — correct locus, correct edit, correct safety analysis, but could not see the identical edit had already landed from the co-reviewer"
    cost: subscription ($0)
skills_touched:
  - id: hermes-inbox
    action: applied
    motivating_failure: none
  - id: hermes-learning-packet
    action: applied
    motivating_failure: none
  - id: verification-before-completion
    action: applied
    motivating_failure: "A training CLI returned exit 0 having trained nothing; only an artifact check caught it"
---

# A fix in the code is not a fix in the suite

## The situation

A ten-round hostile marathon against a dataset-validation factory was terminated by the owner at round 10, leaving two named residue items: one reviewer's unconsumed LOW finding, and one uncommitted fixture from the other reviewer. The inherited handoff described both precisely.

Both descriptions were true. Both understated the problem.

## What was actually found

The unconsumed finding proposed widening a validator's lookbehind so that a multi-id CSS pseudo-class selector list (`:is(#face, #beef)`) is exempted across its *whole argument list*, not just its first token — so the same selector text gets the same verdict whether it sits bare in a CSS block or inside a quoted DOM-selector call.

Executing the finding's own 12-row matrix against live code returned **12/12 agreement with its "should be" column**. The fix was already there. It had landed one round earlier as the *co-reviewer's* same-locus edit; two reviewers had independently converged on one hole and one of them never learned the other had closed it.

So the code was correct. But the committed suite carried **zero fixtures** for the entire three-round exemption family — not the one missing fixture the handoff named, but every fixture for every fix in that family. Three rounds of hostile-review work were sitting in production code with nothing guarding them against the next refactor.

## The transferable lessons

**1. Proof and fix are separate artifacts, and a marathon that tracks only fixes will ship unguarded ones.** The fix ledger said "fixed." It was fixed. Nothing in the ledger's shape could reveal that no test would ever notice if it became unfixed. When a review loop closes, the exit condition must be "every fix has a fixture that fails without it," not "every finding has a fix."

**2. A fixture that has never failed is not yet evidence.** The new fixtures passed the moment they were written — which proves nothing, because a vacuous assertion also passes. Reverting the lookbehind to its pre-fix form and confirming the block *fails* is what converted them from decoration into proof. Do this for every regression block: **mutate the code back and watch the test die.** A regression test asserts the defeat condition, not the fix's letter.

**3. A reviewer reading packets instead of the live tree produces findings that are correct-but-stale.** The finding was mechanically perfect and operationally obsolete. This is not reviewer error — it is a structural property of packet-based review. Always re-execute a carried-over finding against current code *before* spending a fix round on it. The cost of checking is one command; the cost of not checking is a fix round applied to already-correct code, and a false belief that a round was productive.

**4. Exit code 0 is not proof of work.** A training CLI returned success having trained nothing — it had rejected the output path as outside its sandbox and reported the error only in the log body. The artifact check (does the checkpoint exist?) caught it; the exit code would have let a fabricated result propagate into every downstream claim in the session. **Assert the artifact, never the status code.** This is the same class as the standing false-success lessons, and it recurs because every tool invents its own way to lie.

**5. An A/B baseline silently rigs itself when the prompt lives outside the eval rows.** The eval rows carried only a user turn; the comparison harness injected no system prompt. The natural move — define the tuned model with its system prompt, point the baseline at the stock model — would have compared *tuned-with-prompt* against *base-without-prompt* and produced a large, meaningless win. The promotion rule is "beat base **+ best system prompt**"; that only holds if both arms are constructed with the identical prompt and it is read back off each registered arm to confirm. **When a measurement can flatter you by omission, the omission is the thing to check first.**

**6. A training config can be incapable of training.** 20 rows at batch 2 × gradient-accumulation 4 yields 3 optimizer steps, against a 5-step warmup — the learning rate never finishes warming up and peaks below half its target on the final step. The run completes, writes a real checkpoint, and reports a loss. Nothing errors. A pilot sized this way is a *plumbing* test and its output must never be read as evidence about the tune. Check `steps = rows ÷ (batch × accum)` against `warmup_steps` before believing any small-dataset run.

## Mistakes I made

- **I armed a failure-detector without validating it against normal output.** My wait-loop's failure pattern (`error|failed`) matched a routine cache-miss line and declared a healthy export dead. This is precisely the standing "validate the instrument before believing a negative" lesson — and I violated it by *building a new instrument* and trusting it immediately. The generalization I had not made: the lesson applies to instruments I write mid-task, not only to instruments I inherit.
- **I hand-escaped a shell command the environment mangles, minutes after reading a document that warned about exactly that.** The documented workaround (use file-write tools) was applied only after the failure.
- **I nearly accepted a tool's exit code as proof.** I checked the artifact out of habit rather than by deliberate rule, which means the catch was luck-adjacent, not process.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Previously written up? | What actually stopped it |
|---|---|---|---|
| Tool reports false success | 1 | Yes — recurring across sessions | Assert the produced artifact; never the exit code |
| Untested probe yields a false negative | 1 | **Yes — and I repeated it anyway** | Test the failure pattern against normal output before trusting it |
| Environment-mangled shell escaping | 1 | **Yes — in the document I had just read** | Use file-write tools; never hand-escape |
| Fix shipped without a guarding fixture | 3 rounds' worth (inherited) | No | Exit condition becomes "every fix has a failing-without-it fixture" |

Two of these were documented *before* I made them, one of them in a document I read the same hour. That is the highest-signal fact in this packet: **a lesson that is written down and then repeated proves the write-up was not the fix.** The corrections that held here were procedural and mechanical (check the artifact; mutate and watch it die; test the probe on normal output). The one that failed was the one phrased as knowledge rather than as a step.

## External-model calibration

No paid call this session. One carried-over subscription-tier finding: **real in mechanism, stale in fact** — the reviewer identified the correct locus, the correct edit, and a sound no-leak safety argument, but was reading a review packet rather than the tree and could not see the edit had already landed. Routing implication: packet-based review is sound for *mechanism* and unreliable for *current state*. Re-execute before fixing.
