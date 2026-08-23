---
title: "Robust to layout drift was fail-open — 12 nights of BACKUP OK without the vault"
originating_model: "claude-opus-5"
tier_basis: "claude-opus-5 is a Rule-68 Fable-tier learning source by Sean's explicit designation 2026-08-10. This session found the defect from primary evidence, fixed it, and proved the fix with an executed restore."
privacy: "IDs and roles only. No client names, no PII, no credentials, no key values. Secret-scanned clean."
date: 2026-08-23
surface: "Hermes nightly backup (restic) / backup verification discipline"
decision: "A backup must fail loudly on a missing REQUIRED input. Skipping absent paths to be robust converts the vault is gone into the backup is smaller — the one translation a backup system may never make. And verify a backup by reading the artifact it produced, never the status it reported."
status: shipped
supersedes: none
models_used:
  - model: "claude-opus-5"
    role: "builder + hostile reviewer + final decider"
    did: "distrusted an inherited backups-are-healthy claim; read the snapshot record instead of the status line; found 12 nights of silent vault omission; wrote and proved the REQUIRED-path gate; then found two defects in its own fix and a third residual gap on later rounds"
    cost: "subscription"
skills_touched:
  - id: "rule-73 proof-before-done"
    change: "reinforced"
    motivated_by: "the inherited claim that backups were verified was true in July and stale by August. A verification has an expiry date; citing the old one is not proof."
  - id: "hermes-backup.sh REQUIRED-path gate"
    change: "created"
    motivated_by: "a fail-open include filter silently dropped the single most valuable backup path for 12 consecutive nights while reporting success"
---

## The lesson

The nightly backup resolved its include list by appending each path only if it existed,
commented "robust to layout drift". That comment describes an intention. The code
implements the opposite: it converts a **missing input** into a **smaller output**, with no
signal anywhere. Between 2026-08-08 and 2026-08-19 the vault path moved, and **twelve
consecutive nightly runs exited 0 and wrote status ok while omitting the Karpathy Wiki** —
the single asset the job exists to protect.

No data was lost; the vault returned when the path was corrected. What was lost was
**truth**. A restore performed any time in that window would have produced a week-stale
vault that everyone believed was current — and belief is the entire product of a backup.

Three transferable rules:

1. **Resilience against a missing input is indistinguishable from failure to detect it.**
   Any "if it exists, include it" over a list of things you care about is a detector wired
   to always report success. Split the list: REQUIRED inputs abort; OPTIONAL inputs are
   *recorded* as skipped. Silence is never the report.
2. **Existence is not content.** A failed mount presents an *empty directory*, which an
   existence test accepts. The second version of my own gate had this hole. Require
   directories to be non-empty and files to be non-zero-byte.
3. **Verify from the artifact, not the reporter.** The cron log said BACKUP OK twenty-five
   nights running and was useless. The snapshot record — path counts per night — showed the
   defect in one query. Ask the *stored thing* what it contains.

## Who did what

**claude-opus-5** did all of it, and the sequence matters more than the outcome. It began by
distrusting an inherited handoff claim (backups exist and were verified) — that claim was
*true*, and still concealed an active defect, because it cited a July verification for an
August state. Reading the snapshot record instead of the status line exposed the gap in one
query. It then found **two defects in its own fix** on the first hostile round (an unscoped
latest-snapshot query that could record a second writer's snapshot id as ours; a
contradictory status-ok-plus-exit-1 on prune failure), and a **third residual gap** on the
second round (existence versus content). No external model was consulted; none was needed,
and spending on one would have been waste.

## Skills created or changed

- **REQUIRED/OPTIONAL split in the nightly backup** — built directly against the 12-night
  omission. REQUIRED paths abort the run; OPTIONAL skips are recorded in the status file so
  a shrinking backup is visible even on success.
- **Rule-73 proof-before-done, reinforced with an expiry clause** — a prior verification is
  evidence about a prior state. "It was verified in July" is not proof about August.

## Mistakes I made

- **I inherited a claim and nearly relayed it.** The handoff said backups were verified and
  healthy. I almost reported that forward. It was true-but-stale, and stale-true is the
  hardest failure to catch because nothing looks wrong.
- **My first fix had two defects, found by reviewing my own work.** An unscoped
  latest-snapshot query in a repo with a second writer could record a foreign snapshot id
  as ours. And I emitted status ok together with exit 1 — two contradictory signals, which
  is the same one-state-two-meanings sin as the bug I was fixing.
- **My second fix still checked existence, not content** — an empty directory from a failed
  mount would have passed. I wrote a gate against fail-open probes that was itself
  fail-open one layer down. Fixing a *symptom* rather than the *class* is the recurring
  temptation.
- **Three of my probes lied to me, in different directions.** I compared a file count from
  one vault tree against a grep of a *different* vault tree and got a false mismatch. I read
  field 8 of a listing whose path is field 7 and got a false "found nothing". Then a
  login-shell wrapper reported EXIT=0 for a script that exits 1 — I nearly logged a real bug
  in my own script that did not exist. **Every one of these was a defective instrument, not
  a defective system.** Validate the probe before believing it, especially when it reports
  absence.
- **I nearly repeated the handoff's "no database is backed up" claim.** Six dumps exist. The
  real defect was different and narrower — unscheduled, ten days stale. Repeating an
  inherited negative without checking is how a wrong fact acquires a second citation.

## Error to fix to repeat ledger

| Error class | Times this session | Written up before recurring? | What actually stopped it |
|---|---|---|---|
| Fail-open probe (missing input read as success) | 3 — the original bug, my existence-only gate, and the swallowed prune failure | **Yes** — the corpus already carried "a signal that is always true detects nothing", and the handoff's own trap list named this exact class | Nothing procedural yet. All three were caught by *hostile rounds on my own output*, not by a rule. **This class has now recurred across sessions and inside a single session.** The only correction with a chance of holding: when writing any exists-check or error-swallow, state out loud what the false-negative looks like before moving on. |
| Trusting an inherited claim | 1 (nearly 2) | Yes — the STALE-CHECK memory exists verbatim | Re-deriving from primary evidence. The memory named the failure but did not prevent it; the *habit* of opening the artifact did. |
| Defective probe read as a real finding | 3 | Yes — "validate the instrument before believing a negative" is an existing memory citing six prior instances | Checking the tool's actual output format before parsing it. **This is now the most-repeated error class in the corpus and the write-ups plainly are not working.** Procedural fix worth adopting: on any negative or mismatch result, the *first* move is to re-run the probe against a case known to be positive. |

## External-model calibration

None consulted. The work was evidence-gathering against a local filesystem and a restic
repo — no judgement call needed a second opinion, and the defect was visible in one query
once the right artifact was read. Spending on an external seat here would have bought
nothing. **Calibration note for routing: "verify a claim about local state" is a task class
that should never route to a paid seat.**
