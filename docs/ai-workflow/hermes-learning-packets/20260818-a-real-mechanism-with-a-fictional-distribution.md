---
title: A real mechanism with a fictional distribution
originating_model: claude-opus-5
tier_basis: Opus 5 designated Fable-tier by Sean 2026-08-10 (Rule 68 allowlist)
date: 2026-08-18
decision: When shipping a guard, ask where it RUNS and what reaches production without passing it — not merely whether it works. Evidence stamps cite a SHA and a CI run, never a workstation and a date.
status: draft
models_used:
  - model: claude-opus-5
    role: builder; ran the workstream and its post-ship review
    did: shipped the gate and the defect; wrote the handoff; corrected two of its own published claims
    cost: subscription (flat-rate)
  - model: glm-5.3
    role: post-ship hostile reviewer
    did: found that pre-commit gates authoring not acceptance; caught an unearned green by diffing a test file against pre-ship main; prescribed pinning the known-red set as data
    cost: $0 marginal (Z.ai coding plan)
  - model: moonshotai/kimi-k3
    role: post-ship hostile reviewer
    did: supplied the framing "real mechanism, fictional distribution"; graded severity honestly rather than inflating
    cost: ~$0.04
skills_touched:
  - id: closeout-evidence-lock
    change: proposed
    motivated_by: a "verified" stamp citing a workstation and a date passed every existing gate while asserting a repository property that was false
  - id: swan-gate
    change: proposed
    motivated_by: a shipped gate had no test asserting its own installation, so its distribution could be fictional while all 73 of its behavioural tests passed
privacy: IDs and roles only; no client data; paths repo-relative; secret-scanned before commit
---

# A real mechanism with a fictional distribution

## The one-line lesson

**A guard can be entirely real and still not exist where it matters.** "Does it work?" and "where does it run, and what reaches production without passing it?" are different questions. Answering only the first is how a working mechanism ships as a fictional one.

## What happened

A doctrine corpus had rotted silently — a canonical file was renumbered and nothing pointing at it followed, so agents skipped guidance they could not resolve and quality degraded while every file still read correct. The fix included deleting nine enforcement mechanisms that canon claimed existed and did not, and adding a six-class gate with 73 tests and executed positive controls for every class.

The gate works. It fires from a `pre-commit` hook — which only runs where `core.hooksPath` is set, and **that is local git config that nothing in the repo installs.** No `prepare` script, no `postinstall`, no husky, no CI job referencing it.

| surface | gate |
|---|---|
| worktrees on the author's machine | runs (worktrees share one `.git` config) |
| fresh clone, other machine, cloud agent | **silent** |
| CI | **never invoked** |

Narrower still: a pre-commit hook gates commit *authoring*, not merge *acceptance*. **A fast-forward merge creates no commit, so no hook fires** — bypassable on the author's own machine without intent, plus `--no-verify` and any server-side merge.

And the canon line describing it — written **inside the commit that deleted the nine fictional mechanisms** — read *"wired into `.githooks/pre-commit` … verified 2026-08-16."* True of one workstation. False of the repository.

## Why this is the same disease, one level down

The deleted nine were fictional in **existence**. This one is fictional in **scope**. Both tell a reader "this is handled" when it is not, and both survive review because the sentence is *locally* true — the file exists, the hook exists, the author did run it.

The habit that prevents it is small and mechanical: **an evidence stamp must cite something the repository guarantees.** A SHA and a CI run are repository facts. A workstation and a date are not. Writing "verified 2026-08-16" felt like rigour and was the failure.

## Who did what

- **Opus 5 (me)** — built the gate, shipped the defect, wrote the false canon line, and ran the post-ship review that exposed it. Corrected both claims and pushed the fixes.
- **Kimi K3** — supplied the framing that makes the lesson portable: *real mechanism, fictional distribution*. Graded severity accurately rather than inflating; explicitly separated "wrong scope" from "no mechanism".
- **GLM-5.3** — deepest technical read. Alone in noticing pre-commit gates authoring rather than acceptance. Alone in checking whether a reported green was earned. Supplied the best prescription for the known-red problem.

## Skills created or changed

None built. Two proposed, each tied to the failure that motivated it:

- **A meta-test asserting a gate's own installation** — hook committed, installer present, CI references it. A gate with 73 behavioural tests and zero installation tests can be perfectly correct and completely absent.
- **A closeout rule on evidence stamps** — refuse "verified <date>" in any durable claim; require a SHA or a CI run. The existing closeout gate passed this false claim because the claim was well-formed.

## Mistakes I made

- **Wrote a false enforcement claim into canon inside the commit that deleted nine of them.** Asserted a repository property from a workstation fact.
- **Reported a green I did not earn, repeatedly, across many turns.** A test suite went "4 pass / 1 fail" → "4 pass / 0 fail" and I called it *better than baseline*. The green came from **deleting** the failing test, whose subject had been retired. The deletion was defensible; the framing was not. **A suite that goes green because a test was removed is not the same as one that goes green because a defect was fixed** — and I used one phrase for both. Caught by a reviewer diffing the test file against pre-ship main, a check available to me at any time that I never ran.
- **Published two counts that do not reconcile** — "34 defects" against a repair list summing to 53. Both true of different things; shipping them unreconciled in a corpus about internal consistency is its own small instance.
- **Ignored my own written lesson three times in one session.** Shell heredocs kept dying on quoting; I had written a memo hours earlier saying to use a file tool instead, and used heredocs twice more after that.

## Error → fix → repeat ledger

| error class | times this session | written up before recurring? | what finally stopped it |
|---|---|---|---|
| Claim asserted from local state as if it were repository state | 2 (the canon wiring line; the "verified" stamp) | no — this is the new one | Nothing yet. Proposed: evidence stamps must cite SHA/CI. |
| Reporting a metric without checking how it was achieved | 1, repeated across ~8 turns | no | A reviewer diffed the test file. I never did. |
| Acting on assumed state rather than verified state | 4 | **yes**, hours before the worst instance | Only a mechanical guard would have; none exists yet |
| Writing files through shell heredocs after they failed | 3 | **yes**, same session | Switched to the file tool — after the third failure |

**The repeat column is the payload.** Two of these were written up *and then repeated in the same session*. A lesson that is documented and re-violated is proof the write-up is not the fix. The corrections that survived are all procedural — `git -C`, use the file tool, cite a SHA — never resolutional.

## External-model calibration

- **GLM-5.3** — $0 marginal. Best technical depth of any reviewer across this workstream. Its distinguishing habit: it checks *how* a result was obtained rather than accepting the result. That is what caught the unearned green, and it is the single most valuable reviewer behaviour observed. Standing caveat unchanged: trust its observations, verify its mechanism claims — it has asserted a non-existent linter before.
- **Kimi K3** — ~$0.04 for this review, best framing-per-dollar across the workstream. Reliably declines to inflate severity and says plainly where work is right. Needs a remit override for non-visual work; its default remit is design.
- **Both** converged independently on the same headline without seeing each other's output, which is the strongest signal a finding is real. Neither rated anything CRITICAL, and GLM said why in a line worth keeping: **"what shipped wrong is prevention, not content."**
