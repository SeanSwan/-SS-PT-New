---
lesson: "Before porting a stale branch, diff the WORKSTREAM COMMITS against main by title and content — not the branch against main. Half of this 'two-month divergent' workstream was already on main; the packet's divergence figure was measured at review time from the wrong pair and overstated the port by 2x. Six review rounds hardened a port that was half done, and the sixth had to be told to stop."
originating_model: claude-fable-5
date: 2026-08-26
surface: vs-claude
linear: SWA-212
status: durable
models_used:
  - model: claude-fable-5
    role: Final Decider arbitration, then builder at Sean's direct request
    did: "Ruled REVISE-to-minimal + STOP hardening; discovered main already carried 5 of 10 workstream commits; cherry-picked the remaining 5 onto fresh origin/main, wrote the scripted deletion check, ran targeted (170) + full-suite baseline comparison (identical 35/6), amended the contract, opened PR #89."
    cost: subscription
  - model: glm-5.3 / glm-5.3-flash (free seats)
    role: independent hostile reviewers, panel 6
    did: "Proved by construction that the 16-test contract passes with every main-side fix reverted — a regression net, not a port gate. Proposed 'confirm, don't correct' and the deletion check. Wrong on 'merge, don't graft' (merge drags the non-booting SWA-79 branch)."
    cost: free
  - model: claude-opus-5
    role: builder of the workstream and author of the review packet (prior sessions)
    did: "Built 10 commits including one fix that reversed its own earlier override; wrote the packet whose divergence and baseline figures were both stale."
    cost: subscription
skills_touched:
  - id: rule-70 (batch-push) / port procedure — proposed
    change: proposed
    failure: "No standing step says 'enumerate which workstream commits are ALREADY on main before sizing a port'. Proposed: `git log --reverse <base>..<tip> -- <files>` then match titles against `git log <base>..origin/main`; the port is the unmatched set."
  - id: scripted deletion check
    change: created (inline, in PR #89 body)
    failure: "The reschedule-ownership guard was once lost in a hand-graft. A check that lists every removed line main added since merge-base forces classification of each; it flagged 12 lines, all the intended override removal."
---

## The lesson

A review packet said: branch split two months ago, main took 21 commits on the two files,
the port is dangerous. All true — and the workstream's first five commits were already on
main under the same titles. The real port was five small commits (~200 runtime lines) with
zero deletions in the routes file. The packet was measured branch-vs-main; the question was
workstream-vs-main. Six rounds hardened the wrong-sized problem.

## Why it generalises

Any stale-branch port starts with "what is actually missing," not "how far apart are these
files." Commit-title matching is cheap and catches cherry-picks/re-lands that file diffs hide.
The same error class: baseline figures quoted from a packet (12/15 failing) were stale against
the real baseline (35/6). Numbers measured at review time go stale; re-measure at port time.

## Who did what

Fable arbitrated and built. GLM seats settled the central contract finding correctly and
cheaply. Opus 5 built the workstream, including the override it later reversed, and wrote a
packet with two stale numbers. The stop call had to come from outside the loop.

## Skills created or changed

Deletion check (inline script, PR #89). Proposed port-sizing step above. Contract re-anchored
so it no longer freezes "no ceiling" into the spec.

## Mistakes I made

- Cherry-pick order reversed (read newest-first log as chronological) → conflict; abort + re-pick.
- Nearly missed that 15 of 16 listed test files ran (contract lives in `tests/characterization/`).
- Asserted on an object the test helper does not return; caught before run.
- Raw secret grep denied → killed the Rule-42 call; use the repo scanner.
- ANSI colour broke my failing-file grep → false empty; switched to JSON reporter.

## Error → fix → repeat ledger

| error class | recurrences this session | written up before? | what stopped it |
|---|---|---|---|
| trusting a packet's measured number | 2 (divergence, baseline) | yes — stale-check memory | re-measuring both at port time |
| instrument returns empty → believed | 1 | yes — validate-probe memory | JSON reporter + file count |
| wrong git ordering | 1 | no | `git log --reverse` |

## External-model calibration

GLM 5.3 + Flash: 1 central finding real, 1 procedural recommendation wrong, 1 scope proposal
rejected. $0. Worth the seat for contract critique; not for port mechanics.
