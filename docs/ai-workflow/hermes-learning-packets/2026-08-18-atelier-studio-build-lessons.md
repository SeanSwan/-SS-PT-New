---
date: 2026-08-18
originating_model: claude-fable-5
provenance: Fable-tier (Final Decider session; 2-round external panel + build + REVISE)
workstream: swan-atelier-studio v1 (feat/swan-atelier-studio)
models_used:
  - model: claude-fable-5 / builder+decider / plan synthesis, all 8 slices, REVISE fixes / subscription
  - model: glm-5.3 / hostile reviewer / 3 reviews, 1 BLOCKER + assets-first catch, 0 false findings / $0 subscription
  - model: moonshotai/kimi-k3 / hostile reviewer / 4 calls, both final blockers converged, 1 honest position flip / $0.2775 total
  - model: qwen3.8 local / third seat / 1 adopted catch, 1 recorded dissent; r1 identity error corrected by remit / $0
skills_touched:
  - swan-atelier-studio / created / sites never reached $100k bar because divergence, material, and recall had no engine
  - create-with-context + design-dialogue / amended (A7 contract line) / 61KB archetype file was unreachable mid-task
  - check-brain-links / amended (narrow D2 exemption) / generated artifacts predated the gate's classes
---

# Atelier Studio build — what actually taught us something

## Who did what
Fable 5 built; GLM-5.3 was the best reviewer three rounds running (assets-first
inversion catch in planning; the --check-verifies-nothing BLOCKER in build review);
Kimi K3 independently converged on both final blockers and flipped its own prior
licensing position when shown the git-tracked boundary argument; Qwen dissented on
N=5 (recorded) and needed an identity-discipline remit after mislabeling itself in
round 1. Routing lesson: GLM subscription = default hostile seat for design/code;
Kimi = paid absence-first second seat; Qwen = free third voice, never trust its
document-specific claims without verification.

## Skills created or changed
- `swan-atelier-studio`: N-up engine. Built against the failure "Claude Design
  converges on one artifact; Sean needs divergence-then-convergence."
- A7 contract lines: built against "a capability is reachable only if the skill
  that needs it loads it by contract" — placement, not indexing, was the disease.
- D2 exemption: built against "hand-listing generated files re-creates the rot
  class the gate kills" — proven narrow with a live rogue-file control.

## Mistakes I made
- Called a hash stamp "stronger freshness proof" while --check never opened the
  files it exempted. Both paid reviewers caught it; I did not.
- validate() recited "never an adjective" in its error text while accepting
  "cheap" — presence-checked, not type-checked.
- Wrong acceptance metric on the interpolation spike (naive frame-doubling);
  the instrument was wrong before the pipeline was measured.
- consult script silently no-oped from a worktree (exit 0, no output file) —
  worktrees don't carry .env.

## Error → fix → repeat ledger
- **Decorative verification** (a check that looks at a proxy, not the artifact):
  2 occurrences THIS SESSION (cost-adjective table; hash-only --check), the
  second AFTER writing up the first. Write-ups do not stop this class.
  **The fix that sticks: every rule lands WITH its positive control in the same
  commit.** All 15 defect classes fixed in the REVISE round now carry one.
- **Consult-from-wrong-cwd silent no-op**: 1 occurrence. Procedural: consult
  scripts run from the MAIN tree; check the output file exists before polling.
- **Heredoc >~80 lines truncates in this harness**: 2 occurrences before
  switching to the Write tool. Use Write for any file >60 lines.

## External-model calibration
- GLM-5.3: 3 rounds, ~10 substantive findings, 0 disproven on verification, $0.
- Kimi K3: 4 calls / $0.2775; every finding verified real; best at absence-first
  and licensing reasoning; concedes cleanly when out-argued.
- Qwen 3.8: free; reasoning convergent; 2 document-fact hallucinations in r1,
  0 after an identity-discipline remit — the remit line is now standard.

## The transferable core
A two-round external panel (free GLM + local Qwen + ~$0.07/call Kimi) plus
fix-with-control-in-same-commit produced a shipped system where every mechanical
promise has a falsifiability proof — total external spend $0.2775. That loop is
the repeatable unit, not any single reviewer's brilliance.
