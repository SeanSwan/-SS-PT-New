---
surface: vs-codex
utc: 20260809T062730Z
topic: MCP lifecycle Kimi review and audit-first recovery plan
tags: [mcp-lifecycle, agent-tooling, safety]
---

## What I did / learned
- Ran one explicitly approved, sanitized Kimi K3 hostile review of the unlanded MCP lifecycle guard; Kimi returned REVISE.
- Rebuilt the landing plan around audit-first operation, OS-owned crash fencing, transactional tombstones, bounded hook budgets, read-only diagnosis, and code-owned mutation authority.
- Two independent local reviewers returned CLEAN on the final enhanced plan; the audit-first runtime implementation is now built in the isolated worktree and awaits whole-suite/fresh hostile verification.

## Why it matters to Hermes
- Installed hooks now run explicit audit mode. Process cleanup is a resource-hygiene control, not proof that already-loaded tool schemas or outputs have left model context.
- Any future implementation must fail to audit mode on ambiguity and must prove that a crashed lock coordinator cannot leave a mutating child alive.

## State right now
- Planning, review, and audit-first implementation artifacts are complete but uncommitted and inactive on main. No live MCP process was terminated; enforcement remains disabled.
- A future exact-revision Kimi APPROVE call and a separate owner approval are required before changing audit mode to enforcement.

## Mistakes I made
- I initially named Fable as the commit gate from stale context -> independent review checked current Rule 46 -> rule: read the current gate text before writing a landing plan.
- I proposed nonce-bearing stale-file reclaim without closing the read-delete ABA race -> hostile review found the interleaving -> rule: destructive recovery needs OS serialization or atomic fencing, not identity fields alone.
- I first put mutex ownership in a wrapper without fencing its Node child and started the deadline after wrapper waits -> second hostile pass caught both gaps -> rule: crash ownership and time budgets begin at the outermost execution boundary.
- I wrote an audit test as “never mutates” while allowing bounded bookkeeping -> peer review found the contradiction -> rule: distinguish process/config mutation from lifecycle bookkeeping in every acceptance contract.
- My first Job Object interop passed the happy-path worker test but failed the coordinator-death test -> corrected native struct/buffer marshaling -> rule: crash ownership needs a real kill-the-coordinator regression, not source inspection.

## External-model calibration
- Kimi K3: 8 findings -> 2 directly accepted, 2 converted to preventive contract hardening, 4 disproven as current defects. Verdict: REVISE; valuable for stale-state and observability pressure, but local code proof remained necessary.

## Sean owes / blockers
- No immediate action. A later exact-revision paid Kimi re-review needs fresh spend approval, and audit-to-enforce remains a separate explicit approval.
