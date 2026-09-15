---
title: A contract nothing calls is a document, and a test that injects its dependency proves nothing about the wiring
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 is Fable-tier and may write the durable corpus
date: 2026-08-17
decision: Every contract must be invoked by something that can fail the turn, and every producer must be validated against the contract rather than against a template copied from it — a template that drifts from its schema becomes the real contract, because producers follow the template
status: draft
supersedes: none
privacy: IDs/roles only; no PII, no secrets, no absolute paths
models_used:
  - model: claude-opus-5
    role: builder, hostile reviewer, migrator
    did: found that the corpus validator had never been called by anything, traced the drift to a skill template that contradicted the schema, wired the validator into the Stop gate, migrated 16 tracked packets, built the read-side surfacing hook, then found and fixed a cwd bug in its own gate that all 18 of its own tests had passed through
    cost: subscription (flat)
  - model: z-ai/glm-5.3
    role: hostile reviewer (requested)
    did: first invocation died with UND_ERR_CONNECT_TIMEOUT while the task wrapper reported exit code 0; second invocation launched — findings NOT incorporated into this packet
    cost: flat-rate Z.ai coding plan
skills_touched:
  - name: hermes-learning-packet (skill template)
    change: amended
    why: "the template omitted `title:` entirely, offered `topic:` which is not a schema key, and listed `status: open` which is not a legal value — producers followed it, so 27 of 38 packets failed the schema the template was supposed to satisfy"
  - name: hermes-closeout-gate (rule 68/69 Stop gate)
    change: amended
    why: the validator had been the written contract since 2026-08-13 and nothing invoked it; 14 packets written after it shipped still failed it
  - name: hermes-learning-surface (new)
    change: created
    why: Rule 68 is entirely a write trigger and defines no moment at which anything must consult the corpus; the ephemeral tier with an automated read hook reached 641 consumptions while the durable tier had one pointer
  - name: hermes-learning-migrate (new)
    change: created
    why: hand-editing 27 packets is where transcription errors come from, and a migration that cannot prove a rollback path exists must not write
---

# A contract nothing calls is a document

## The lesson

A validator was written, reviewed, committed, and documented as "the contract" on 2026-08-13.
Nothing ever called it. Three days later the corpus it governed had **27 of 38 packets failing it**,
and **14 of those failures were written after it shipped**. Every closeout in that window passed.

Two distinct failures produced that, and they compound:

1. **Nothing invoked the contract.** A `--check` flag that exits 2 is not enforcement; it is an
   opportunity for enforcement. Enforcement is something that can fail the turn.
2. **The template producers copied had drifted from the schema it was meant to satisfy.** It had no
   `title:` key at all, offered `topic:` (not in the schema), and listed `status: open` (not a legal
   value). Agents follow the template, not the schema — so **the template was the real contract**,
   and the schema was aspirational.

Fixing only the first would have produced a gate that blocks every agent on a template the project
itself ships. Fixing only the second leaves the drift free to resume. The pair is the fix.

## Reusable rule

- When you write a contract, wire it to something that can fail the turn **in the same slice**. If
  you cannot, say plainly that it is unenforced — do not call it a contract.
- When a schema and a template disagree, the template wins in practice. Make the template say out
  loud that the schema is authoritative, and make the producer run the validator before finishing.
- Migration is the symptom; the producer is the cause. Fix the producer first or you will migrate
  again next week.

## Who did what

Everything here was done by `claude-opus-5`. GLM-5.3 was commissioned as a hostile reviewer at
Sean's suggestion; its first run died in transport and its second had not returned when this packet
was written, so **no external review contributed to any conclusion in this packet.** Recording that
explicitly, because an unlabelled absence of review reads as review having happened — which is the
exact defect the previous session's handoff confessed to.

The defect that mattered most was found by my own hostile pass, not by review: the gate resolved its
schema script-relative but its packet cwd-relative, so it enforced nothing outside the repo root.

## Skills created or changed

See `skills_touched` above. The important one is not a skill but a shape: the migration script
carries a **held-back** state. Untracked packets belong to other agents' in-flight sessions and have
no `git checkout --` rollback path, so it refuses to rewrite them and says so per file. When it
cannot determine tracked state at all, it treats everything as untracked and refuses to write. A
migration that cannot prove a rollback path exists must not write.

## Mistakes I made

- **I reported a broken instrument's null result as a finding — four times, in the session whose
  own handoff documents that exact class nine times.** (a) An `awk` anchored on `^---$` silently
  matched nothing against CRLF files, and I published a table of "tier_basis=0" from it, including
  for a packet that was already clean. (b) I "proved" the hook did not block using a `mktemp -d`
  path that Node on Windows cannot resolve, so the hook was hitting its unreadable-transcript
  fail-open. (c) I piped `git add` through `2>/dev/null`, saw "staged: 0", and read it as a result
  rather than as a hidden error. (d) My own `cp` restore reverted the cwd fix I had already
  verified, so a true claim silently became false. **Caught by:** each time, by insisting on a
  control rather than accepting the null. **Procedural fix:** never accept a null result from an
  instrument you have not positively controlled in the same session; never suppress stderr on a
  command whose failure changes the conclusion.
- **My "safe to commit" guard passed vacuously on an empty set.** It checked "no foreign files in
  the index" and an empty index trivially satisfies that, so it printed "safe to commit" at the
  exact moment nothing was staged. **Fix:** a guard over a set must assert the set is non-empty
  before asserting anything about its contents.
- **I wrote "the closeout gate runs this and blocks the turn" into the skill before it was true.**
  It became true one slice later, but for that window the repo shipped a document describing
  behaviour that did not exist. **Fix:** write the claim in the same commit that makes it true.
- **All 18 of my tests passed while the gate enforced nothing outside the repo root.** They inject
  `validate`, so they proved the decision logic and nothing about the wiring that supplies it —
  structurally the same defect as the validator nothing called, one level down.
- **I concluded "my test is wrong" when my fix was also wrong.** Both were true; I stopped at the
  first. Only a two-cwd control against the same harness separated them.
- **I misread live lock contention as a stale lock.** Age rose monotonically for 331s, which the
  documented discriminator calls stale — and it cleared on its own, proving it was live. Age is not
  the instrument; the OS-handle probe is.
- **I ignored a documented trap twice before obeying it.** The handoff says inline `node -e` patch
  scripts get mangled and to write them to a file; I burned two attempts before doing that.

## Error → fix → repeat ledger

- **Class: a null result reported at a scope wider than the instrument that produced it.**
  Recurrences **this session: 4**. Already written up before recurring: **yes — nine instances, in
  the handoff I read at the start of this very session, whose §7 is entirely about this class.**
  What finally stopped it: not the write-up. What worked was a *procedure* — running a positive
  control (deliberately break it, confirm red, restore, confirm green) and a *two-cwd control*
  (vary one variable, hold the harness fixed). **This is direct evidence that documenting a lesson
  does not install it.** The corpus already contains a packet titled "A documented lesson is not a
  fix"; I read it, and then produced four more instances of the thing it warns about.
- **Class: enforcement that does not exist.** Recurrences: 2 (the validator nothing called; then my
  own tests that injected past the wiring). Written up before recurring: no. Stopped by: making the
  test spawn the real binary.

## External-model calibration

- **z-ai/glm-5.3** — commissioned for a hostile review of this work. Run 1: `UND_ERR_CONNECT_TIMEOUT`
  in transport, **and the background-task wrapper reported "completed (exit code 0)"** — a false
  success signal that would have read as "review passed" to anyone who did not open the output.
  Run 2 launched; had not returned at packet-write time. **Findings real vs disproven: n/a, zero
  findings received.** Calibration takeaway is about the harness, not the model: a review runner
  must surface transport failure as failure, because "no findings" and "no review" are
  indistinguishable downstream and the first reads as approval.
- **Cost:** flat-rate coding plan, no marginal spend.
