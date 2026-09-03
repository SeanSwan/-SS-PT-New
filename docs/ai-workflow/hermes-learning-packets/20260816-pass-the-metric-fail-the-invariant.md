---
title: "Pass the metric, fail the invariant — average scores cannot clear safety gates"
originating_model: claude-fable-5
tier_basis: "Session model is claude-fable-5 (harness-stamped in system context) — on the Rule 68 allowlist"
date: 2026-08-16
decision: "Classroom-copilot coach port killed by its own empirical gate: 14B beat the recall baseline while violating a hard child-link invariant; no retry permitted on the now-seen held-out corpus"
status: draft
privacy: "IDs/roles only (T, O, C-ids, synthetic roster names); no PII, no secrets, no absolute user paths; leak-gated against the private pattern file"
models_used:
  - model: claude-fable-5
    role: Final Decider / handoff executor
    did: "Ran the port-decision test, fixed the Village plan-mode spend gate, verified Rule 82 already applied on main, audited the AI chat pipeline for minor gating"
    cost: subscription
  - model: qwen3:14b
    role: test subject (local, $0)
    did: "Sorted the 20-case held-out corpus under a compressed 30-line contract: 66.7% recall, 0 parse failures, 1 child-link violation, 5 false positives"
    cost: "$0 (local)"
skills_touched:
  - id: stale-check
    action: applied
    motivating_failure: "Handoff step 5(a) was already done on main by another session; only re-verification before execution prevented a redundant constitution push"
  - id: agent-lane
    action: applied
    motivating_failure: "A crashed git process left a loaded index; scoped git add inherited 19 of another session's staged files into my commit — inspect the index after clearing any stale lock"
---

# Pass the metric, fail the invariant — average scores cannot clear safety gates

A local 14B under a compressed contract BEAT the rules baseline on the headline metric
(66.7% vs 53.3% recall, zero parse failures) and still lost the port decision, because it
committed one forbidden child-link and invented five items. The gate was correctly designed
as invariants-first: recall is a preference, the child-link rule is a law, and no volume of
the former buys back one violation of the latter.

## Who did what

- **claude-fable-5** executed the handoff: stale-check caught step 5(a) already applied on
  main (in a newer revision than the local draft — the draft would have REGRESSED the rule
  if force-applied); fixed the Village plan-mode spend gate (`debatePanels` never passed →
  flat runs priced at worst-case recursive rates, $151.59 vs $10.49 proven on identical
  inputs → every capped plan-mode run aborted before start); wrote the model-backed held-out
  harness with byte-identical scoring to the rules baseline.
- **qwen3:14b** was format-reliable and invariant-unreliable: perfect JSON compliance across
  20 adversarial prompts, but linked a child to a supply item ("the blocks Kai likes") and
  fabricated a self-care task from purely emotional input. Small local models follow the
  contract they are given with high fidelity — including into the holes the contract author
  left.

## The durable lessons

1. **Score invariants separately from averages, and let invariants alone decide.** A test
   whose pass condition is a blended score will eventually ship a safety violation wrapped
   in a good average. The harness printed recall AND violations; only violations had veto.
2. **Compression is a safety decision made by the compressor.** Reducing a ~90-line contract
   to ~30 lines, I kept output-format rules and dropped a link-suppression privacy rule —
   and the model faithfully executed the omission. What survives compression is the
   compressor's implicit priority ranking; review the DELETIONS, not the residue.
3. **A held-out corpus dies the moment you tune against it.** The failed run's output names
   every trap; any contract revision informed by it turns "held-out" into "training." Retry
   price: a fresh blind corpus. This converts "iterate until green" from virtue to fraud.
4. **After clearing a stale `index.lock`, read the index before staging.** A crashed git
   process can leave staged files that your next scoped commit silently inherits — 19 of
   another agent's files rode into a commit despite explicit-path `git add`.

## Skills created or changed

- `sorter/model-heldout-run.mjs` + `contract-14b.md` (classroom-copilot): reusable pattern —
  model-backed twin of a deterministic baseline harness with byte-identical scoring, so the
  model-vs-rules comparison is honest. Motivating failure: the port "fit" had been asserted
  by reading a contract instead of measured.

## Mistakes I made

- Compressed away the exact privacy nuance the held-out trap tested (see lesson 2) — the
  violation is partly my authorship, which is precisely why the test measures the whole
  system (contract + model), not the model alone.
- Committed another session's staged work by not inspecting an inherited index after
  clearing a stale lock (see lesson 4). Documented in the coordination log; content intact.
- Started building toward applying Rule 82 before verifying it wasn't already applied;
  the stale-check re-verify was the only thing between me and a redundant — and
  regressive — constitution edit.

## External-model calibration

- **qwen3:14b (local, $0):** on a strict-JSON structured task: 100% format compliance,
  recall above the deterministic baseline, but 1 hard-invariant violation + 5 fabrications
  in 20 adversarial prompts. Routing implication: local 14B-class models are fit for
  format-heavy drafting behind a deterministic approval layer, and UNFIT to enforce
  negative constraints ("never link X") that live only in the prompt.

## Error → fix → repeat ledger

- **Assert-without-checking class (session count: 1st occurrence this session, well-documented
  in prior packets):** nearly executed an already-done handoff step. Stopped by procedure
  (stale-check), not by memory — the packet-documented lesson held because it is now a
  command habit, not a resolution.
- **Shared-tree index contamination (1st occurrence):** new error class; fix is procedural
  (post-lock-clear `git status` before staging) and is recorded in the agent-lane
  coordination log where the next agent will hit it.
