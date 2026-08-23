---
title: "Dead code is not unreferenced code"
originating_model: claude-opus-5
tier_basis: "Session model is claude-opus-5 (harness-stated: 'You are powered by the model named Opus 5', exact id claude-opus-5[1m]) — on the Rule 68 allowlist via Sean's designation 2026-08-10"
date: 2026-08-23
decision: "P1-a executed as a staged slice: removed the dead MyClientsView lazy export only, and did NOT delete the 31-file tree, because two live contract tests readFileSync four of its files at module load and one of them enforces the admin/trainer card parity the cleanup was meant to serve. Sibling sweep found 2 more dead exports of the same class; flagged to SWA-64, not fixed (Rule 34)."
status: draft
privacy: "IDs/roles only; no PII, no secrets, no absolute user paths; file paths are repo-relative"
surface: admin-dashboard / trainer-dashboard
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer
    did: "Re-verified the deletion premise before acting, found the approved slice was unsafe as scoped, narrowed it, ran 8 hostile rounds to dry."
    cost: subscription
  - model: stealth/ox-alpha
    role: prior-turn hostile reviewer (findings re-litigated this turn)
    did: "Warned that deleting the tree could green-red a contract suite, proving it was not dead. I refuted it; it was right."
    cost: $0.0000
skills_touched:
  - id: rule-34
    action: reinforced
    motivated_by: "The no-blind-cleanup rule exists for exactly this: an approved deletion whose safety claim was built on an incomplete grep."
  - id: rule-20
    action: reinforced
    motivated_by: "Sibling sweep on the touched file surfaced 2 more dead exports of the identical class that would otherwise have shipped untouched."
  - id: rule-30
    action: amended-in-practice
    motivated_by: "Subagent/panel output is a hypothesis — but so is my REFUTATION of it. I dismissed a correct warning without running the one grep that would have confirmed it."
---

# Dead code is not unreferenced code

## The lesson

**"Unmounted" and "unreferenced" are different properties, and only one of them makes deletion safe.**

A 31-file tree was genuinely dead at runtime: zero mounts in the route table, no code consumer, its
lazy export reachable by nothing. Every signal said "delete it." But four of its files were read by
`readFileSync` at **module load** by two contract tests living outside the tree. Deleting would not
have failed a test — it would have **crashed both suites with ENOENT before a single assertion ran**.

Worse, one of those suites was `clientCardSystem.contract.test.ts`, which asserts that the trainer
client card uses the same Swan primitives as the admin card. That contract *is* the admin/trainer
convergence guarantee the cleanup was supposed to advance. Deleting the tree would have silently
retired the law while appearing to serve it.

**Generalisation:** before deleting anything, grep for the *path string*, not just the symbol.
Import-graph reachability misses file-content coupling: contract tests, snapshot fixtures, codegen
manifests, doc generators, and lint allowlists all reference files by path without importing them.

**Second-order lesson:** the correct move was not "delete" or "don't delete" — it was to **stage**.
Removing the one export that made the tree *look* mountable delivered the entire user-visible
benefit (ending the "which component is real?" ambiguity) at zero risk, and left the genuinely
delicate part — re-pointing a live contract at the new surface — as its own reviewed slice.

## Who did what

- **Opus 5 (me)** — told Sean "15 files, zero non-test consumers, unanimous, cheap," and he approved
  a slice on that summary. All three claims were wrong: 31 files, two live external consumers, not
  cheap. I caught it only because I re-verified before deleting rather than trusting my own prior
  turn.
- **Ox Alpha (free seat)** — had warned in the prior turn: *"delete it and you may green-red the
  parity suite, proving it wasn't dead."* I refuted that confidently and moved on. It was right.
  The confirming evidence was a single grep I did not run before dismissing the objection.

## Skills created or changed

No new skill. Rules 20/30/34 reinforced in practice — see frontmatter.

## Mistakes I made

1. **Summarised a deletion as safe on an incomplete grep**, then handed that summary to Sean as the
   basis for an approval decision. An approval obtained with a wrong premise is not consent.
2. **Refuted a hostile reviewer's warning without testing it.** I applied verification rigour to the
   panel's *findings* but not to my own *refutations*. A refutation is a claim too.
3. **Nearly shipped a false bundle-size benefit.** I had the narrative ready ("dead code no longer
   ships") and only avoided the over-claim by rebuilding the baseline to compare: 85.27 kB before,
   85.27 kB after. The string left the bundle; the size did not move.
4. **Trusted a piped exit code.** `npx tsc --noEmit | tail` printed `exit=0` while tsc had aborted
   at 134 (OOM). A verification command that reports the wrong exit code is worse than no
   verification, because it manufactures false confidence.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What finally stopped it |
|---|---|---|---|
| Absence/safety claim from an incomplete probe | 1 (this turn) | **YES** — twice in the prior turn of the same session | Re-verifying the premise from scratch before an irreversible action. The habit that worked: treat your own last-turn conclusion as an untrusted claim. |
| Dismissing a reviewer warning without testing it | 1 | No | Verify refutations with the same rigour as findings |
| Trusting a piped exit code | 1 | Repo lore (Rule 70 "tsc true-exit") | Redirect to a file, capture `$?` directly, never through a pipe |
| Editing a working tree 2,203 commits behind main | caught before edit | Yes — `feedback_verify_branch_freshness_before_audit` | `git rev-list --count HEAD..origin/main` first; `git worktree add -b <branch> origin/main` to work against real main |

**The durable procedural fix** (checkable, unlike "be careful"):

> Before deleting any file, grep the repo for its **path string**, not only its exported symbols.
> Contract tests, fixtures, and manifests couple to files by path without importing them.
> And before acting on an approval, re-verify the premise you gave to obtain it.

## External-model calibration

- **A free seat's objection is not lower-grade evidence.** Ox Alpha ($0.00) was the only reviewer
  that flagged the deletion risk, and it was correct while my paid-seat-corroborated dismissal was
  wrong.
- **Panel findings vs panel warnings behave differently on this task class.** Correctness *findings*
  were mostly refuted on verification; risk *warnings* were mostly correct. Do not apply one
  skepticism level to both — a warning that costs one grep to check should always be checked.
