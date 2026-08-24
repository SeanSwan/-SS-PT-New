---
title: Every CI gate in the repo was silently dead — found only by hunting an acceptance artifact
date: 2026-08-24
originating_model: claude-fable-5
surface: CI / deploy safety / GitHub Actions
decision: A gate's existence is proven by its last successful run, never by its file being green locally
status: open
supersedes: none
rule: >
  Before trusting ANY CI workflow, check the repo's run history for a recent SUCCESS.
  Blanket startup_failure across all workflows and events — including schedule — is an
  account/billing condition, not a file bug; no amount of YAML fixing will revive it.
models_used:
  - model: claude-fable-5
    role: Final Decider, executor
    did: committed the rescued work in 4 slices, merged the two workflow surfaces, opened PR 71 to force the first CI run, diagnosed the blanket startup_failure as account-level
    cost: $0 (subscription)
  - model: claude-opus-5
    role: prior session builder (same conversation)
    did: 5-round dry loop on the seat-identity gate; the reconciliation and spend-ledger findings this session executed on
    cost: $0 (subscription)
skills_touched:
  - id: drift-check
    change: proposed
    motivating_failure: >
      drift-check verifies mirrors, branches, registries and hooks — but not whether the
      repo's CI workflows have EVER succeeded. Add a seventh check: newest successful
      Actions run per workflow, alert if none in 30 days or none ever.
---

# Every CI gate in the repo was silently dead

## The lesson

The session merged two competing copies of a migration-shadow workflow and opened PR #71
purely to force the workflow's **first real run** — the acceptance artifact a 15-round,
$5.43 panel debate never produced. The run came back `startup_failure` in 0 seconds.

Local validation had passed: YAML parsed, a workflow validator approved it, 12 steps in
order. So the file looked innocent, and the natural next move was to start bisecting it.

The correct move was one API call wider: **the repo's entire run history.** Result:

- last 12 runs, ALL workflows (`ai-eval-gate`, `docs-check`, `swan-lens-guards`,
  `bodymap-validation`, mine): **startup_failure**, 0s, empty workflow names
- including a **scheduled** run — which executes from the default branch and cannot be
  blamed on any pushed file
- **zero successful runs returned by a success-filtered query at all**
- repo is **private** → free-tier Actions minutes (2,000/month) apply

That signature — every workflow, every event type, 0-second startup failures, no logs —
is an account condition: exhausted Actions minutes or a billing/spending-limit block.
Only the account owner can see which.

**The general form:** a repo can be FULL of deploy-safety gates — this one has five
workflows, several built by panel debates specifically to guard production — and every
one of them can be dead for days with nothing anywhere saying so. A workflow file in the
tree is an intention. Only a green run is a gate. This is the corpus lesson "a correct
gate nobody runs is not a gate" operating at repo scale, and it hid because nobody ever
asks a workflow for its last success — they ask whether the file exists and parses.

## Who did what

- **Fable 5 (this session):** cleared the stale index lock on Sean's order, committed the
  rescued work in four slices (debate tooling; seeder verbatim-as-panel-left-it; merged
  workflow + findings docs; gitignore rule), pushed the wip branch (offsite backup, no
  deploy), cut `ci/shadow-check-first-run` from origin/main in a worktree, opened PR #71,
  and diagnosed the startup_failure as account-level rather than bisecting the file.
- **Opus 5 (same conversation, earlier):** produced the surface reconciliation that made
  the merge mechanical, and the five-round identity-gate loop whose tooling is now
  committed. Its one relevant miss carried forward: it validated the workflow with local
  parsers and never asked whether ANY workflow in the repo had ever run.
- **The 15-round panel (prior workstream):** debated the seeder to line-level precision
  without ever producing — or asking for — a CI run. Fifteen rounds of review of a gate
  that structurally could not have executed even if merged.

## Skills created or changed

Proposed only: a seventh drift-check probe — `gh run list --status success --limit 1`
per workflow; alert when a workflow has no success in 30 days or none ever. Cheap, and it
converts "the gates exist" from an assumption into a checked fact each session.

## Mistakes I made

- **I validated the artifact and not the venue.** Two local validators on the YAML,
  zero checks on whether the repo could run ANY workflow. The account-level cause was
  visible in one `gh run list` the whole time. Same class as validating a probe before
  believing an absence — I validated the probe (the file) and not the instrument (the
  Actions runner).
- **First run-history read was too narrow.** `--limit 3` on my own branch showed
  startup_failure and I nearly went file-bisecting; only widening to repo-wide,
  all-events exposed the schedule-run failure that exonerated the file.
- **Worktree removal left debris:** `git worktree remove --force` hit a Windows
  permission error on the directory; the branch is safe on origin but `C:/tmp/swan-ci-pr`
  needs manual deletion.
- Carried from the same conversation, for the ledger: the Opus session identified the
  uncommitted-work P0 hours before mitigating it, missed two standing every-session
  reminders (DMARC, Render key rotation), and let a failed Linear post drop without retry.

## Error → fix → repeat ledger

| Error class | Times this conversation | Written up before? | What actually stopped it |
|---|---|---|---|
| Trusting local validation to predict a remote system's acceptance | 1 (workflow YAML vs Actions) | Yes — "validate the instrument before reporting absence" (2026-08-21) | Widening the query to the venue's own history. Proposed as a mechanical drift-check probe, because prose did not prevent this recurrence. |
| Heredoc/escaping mangling multi-line writes | 1 this session (Python replace mangled `\n` in a test), 3 in the conversation | Yes — twice | Write/Edit tools for any content with escapes. Held after the switch. |
| Priority inversion: polishing instruments while the subject is at risk | 1 (Opus session: 5 review rounds before backing up the unprotected work) | Corpus-adjacent | Sean's alarm triggered the rescue; the fix that holds is "mitigate the P0 in the same turn it is identified." |

## External-model calibration

No paid calls this session ($0). The five-round loop's calibration stands as recorded on
SWA-196: GLM 5.3 (free) found the decisive HIGH in round 3 and correctly returned
`findings: (none)` in round 4; Grok 4.6 (~$0.06/call) returned a clean no-findings pass in
round 5 with sound reasoning; Ox Alpha ($0) split CONFIRM/REJECT across separated calls on
the same packet — useful as a dissent generator, unstable as a verdict source, and its
call-2 slot failed EXIT_NONZERO in two consecutive runs, still undiagnosed.

## Applies to

Any repo where CI is treated as a safety layer: check the last successful run per
workflow before citing a gate as protection. Any debate/review process about CI: the
first demand is a run link, not a fix list. Any account on free-tier Actions minutes
doing agent-scale pushing: the minutes are a shared resource that fails closed, silently,
for every gate at once.
