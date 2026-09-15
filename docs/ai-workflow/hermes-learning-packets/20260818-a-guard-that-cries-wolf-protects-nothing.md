---
title: "A guard's dominant failure mode is crying wolf, not being too permissive"
originating_model: claude-opus-5
tier_basis: "Session model is claude-opus-5[1m] (harness-stamped) — Fable-tier by Sean's designation 2026-08-10, on the Rule 68 allowlist"
date: 2026-08-18
decision: "Blast-radius gate found repo-blind (validates every repo against SS-PT's schema snapshot) and trigger-DDL-blind; 3 change requests filed through the guard's own approval channel; guard NOT edited"
status: draft
privacy: "Repo-relative paths, table names, and function names only; no PII, no secrets, no credentials"
models_used:
  - model: claude-opus-5
    role: builder / investigator
    did: "Hit the guard writing a migration, proved both root causes against the snapshot and the live DB, reverse-engineered and verified the approval hash, filed 3 plain-English change requests instead of editing the guard"
    cost: subscription
skills_touched:
  - id: blast-radius-guard
    action: amended
    motivating_failure: "The gate blocked 100% of correct SwanGuard migrations by validating them against SwanStudios' schema snapshot — the class of false positive that gets safety guards switched off"
  - id: closeout-evidence-lock
    action: applied
    motivating_failure: "A guard misfire is exactly where an agent is most tempted to assert rather than prove; evidence had to come from both the snapshot and the live database"
---

# A guard's dominant failure mode is crying wolf, not being too permissive

A database safety guard blocked a correct migration with five findings. All five were
false. The guard was not too strict — it was reading the wrong book, and would have
blocked **every** migration in that repo forever.

## Who did what

- **claude-opus-5** hit the block, proved both root causes from two independent sources
  (the snapshot file and the live database), reverse-engineered the approval-hash scheme and
  *verified* it before relying on it, then filed change requests rather than editing the
  guard. Its worst move: forming the "the gate is wrong" conclusion before assembling the
  evidence — the right order was the reverse, and a guard misfire is precisely where that
  shortcut is most dangerous.

## Skills created or changed

`blast-radius-guard` — **amended** (pending owner approval): repo-aware snapshot resolution,
class-B abstention across repo boundaries, and trigger/grant DDL excluded from unbounded-DML
detection. No skill created. The guard's self-protection worked and was not circumvented.

## The lesson

**A safety guard dies of false positives, not of leniency.** The gate's own header already
knew this — it documents suppressing a noisy advisory because *"noise is what gets a guard
ignored — the failure mode that kills guards faster than any evasion."* Then it committed a
larger version of the same error: it validated files from *every* repository against *one*
repository's schema map, so 100% of correct work in a second repo read as dangerous.

A guard blocking everything gets disabled. A disabled guard protects nothing — including
the real incident it was built for. **Precision is not a nicety in a safety system; it is
the thing that keeps the system alive.**

**The general rule for any context-dependent check: scope it to the context it can actually
reason about, and make it ABSTAIN outside that context.** In this guard, one of four checks
(referential drift) is schema-relative and must decline across repo boundaries; the other
three (destructive verbs, unbounded mutation, reversibility) are context-free and must keep
firing everywhere. **Removing a check that has no information is not weakening the guard —
letting it guess with no information is.** That distinction is what separates a narrowing
fix from a hole, and it is the sentence to put in the change request.

## The second lesson: the guard correctly stopped me from fixing the guard

Both files were self-protected. I could not edit them. **That is right** — an agent able to
silently edit its own safety rails has none.

The temptations were real and all wrong: reword the change and retry, edit the snapshot
instead, adjust the settings, or rewrite the whole 403-line file so one approval covered
everything. The last is the subtle one — it looks *considerate* (fewer commands for the
owner) while actually handing him an unreviewable diff of a security file to spare me three
round-trips. **Three small reviewable changes beat one convenient unreviewable one.**

The designed path worked exactly as documented: file a plain-English request → attempt the
edit → the denial renders the request plus an approval id only the owner can mint. Worth
noting for any future guard: **the request channel is what makes a self-protecting guard
repairable instead of merely obstructive.** A guard that cannot be fixed by the agent that
found its defects becomes hand-work for the owner, and then it gets deleted.

## Mistakes I made

- Reached the "the gate is wrong" conclusion before assembling the evidence.
- Attempted a partial edit before the complete change was designed, burning a content-bound
  approval hash on something that was never the real fix.
- Briefly considered a whole-file rewrite to reduce approval friction — optimizing my
  convenience over the owner's ability to review a security change.

## Error → fix → repeat ledger

| Error class | Times | Written up before? | What actually stops it |
|---|---|---|---|
| Conclusion before evidence on a guard misfire | 1 | No — new class | Self-caught. **Gate: never assert a guard is wrong without querying BOTH the guard's data source and the real system it claims to describe.** Here: the snapshot said 152 tables without `creator`; the live DB said 54 tables *with* the SwanGuard tables. Two sources, one conclusion. |
| Partial edit before the design settled | 1 | No | Content-bound hashing made the waste immediately visible — a good property to copy into other approval systems. |
| Convenience-shaped rewrite of a security file | 1 (rejected) | No | Reviewability outranks round-trips. |

## External-model calibration

None this turn — no external consult. The two root causes were established by direct
evidence (snapshot inspection, live `information_schema` query, and reproducing the
approval hash locally to confirm the scheme). **Noting the absence deliberately:** a guard
misfire is a case where an outside opinion adds little, because the disagreement is settled
by data both sides can read, not by judgement.
