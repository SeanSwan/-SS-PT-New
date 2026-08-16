---
title: Mutation testing is the procedural fix for "my test was the defect"
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 and Kimi K3 are Fable-tier
reviewed_by: self, hostile rounds to dry (3 rounds — 4 defects, 1 defect, 0 defects)
date: 2026-08-16
decision: A pass count is a claim; a pass count plus a mutation that kills it is evidence. Break the implementation on purpose before believing the suite.
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer + final decider
    did: built the video provider registry, ComfyUI adapter and generate handler; ran three hostile rounds finding 5 defects in own work; ran the mutation pass
    cost: subscription
skills_touched:
  - name: rule-73 (proof-before-done)
    change: extended with a concrete instrument
    why: "58/58 pass" satisfied rule 73 while proving nothing about whether the tests could fail. Mutation supplies the missing half.
  - name: hermes-learning-packet (this corpus)
    change: exercised against its own top ledger row
    why: the previous packet named "my test was the defect" as ~12 occurrences documented twice and still recurring, because the write-ups were resolutional. This is the procedural replacement.
  - name: cross-env-verify
    change: reinforced
    why: two verification-masking bugs recurred this session despite being written up — `| tail` and `&&` short-circuit
---

# Mutation testing is the procedural fix for "my test was the defect"

## The finding

My previous packet recorded the highest-signal row in this project's error ledger: **"my test
or harness was the defect, not the code" — ~12 occurrences, documented twice, still
recurring.** It noted that the write-ups failed because they were *resolutional* ("be more
careful") rather than *procedural*, and left the fix open.

This is the procedural fix, and it is cheap enough to be routine.

After building the video provider registry I had 49 passing tests. Under rule 73 that reads as
proof. It is not: a passing suite is consistent with tests that cannot fail. So before
believing it, I broke the implementation on purpose, one behaviour at a time:

| Mutation | Tests killed |
|---|---|
| licence gate disabled (`if (false && …)`) | 4 |
| image-first law disabled (`billsPerRun = false`) | 2 |
| retry classification neutered (permanence never marked) | 5 |

Each mutation killed tests, so each behaviour is genuinely covered. Total cost: about ninety
seconds. Had any mutation left the suite green, I would have learned — before shipping — that
the tests were decorative for that behaviour.

**The rule: a pass count is a claim. A pass count plus a mutation that kills it is evidence.**
Apply it to the load-bearing behaviours, not every line — the security gate, the money gate,
the classifier, the refusal path. Three mutations is usually enough.

This also generalises the framing that worked five times this workstream — *when a new test
fails against new code, suspect the test first*. Mutation is that instinct made mechanical, and
it runs in the far more dangerous case: when nothing fails at all.

## Who did what

Opus 5 built everything and ran three hostile rounds solo. No external model was consulted;
none was needed, and the rule that I run the hostile loops rather than paying a vendor held.

Round 1 found four defects, round 2 found one, round 3 found none — the dry round. The five:

1. **A fail-closed gate with no key.** The provider catalogue is frozen with `enabled: false`
   on every row and there was no override, so the feature could never have run for anybody. I
   built a lock, no key, and called it security.
2. **Decorative dependency injection.** The handler accepted an injected `env`; the registry
   below it read `process.env` regardless. A test could pass against one environment while
   production read another.
3. **A graph injector that created inputs a node does not declare.** ComfyUI ignores undeclared
   inputs, so the job would have run at full GPU cost, rendered the template's placeholder
   prompt, and reported success.
4. **A 5xx submit classed permanent**, discarding jobs for a service blip.
5. **Artifact bytes written under a `.mp4` name regardless of real container**, plus a timeout
   reported as "no output".

Defects 1 and 2 were surfaced by the tests themselves on their first run — which is the whole
argument for writing them before believing the code, and for suspecting the test only *after*
checking whether the code is wrong.

## Skills created or changed

- **Mutation-before-belief**, described above. The instrument rule 73 was missing: rule 73
  demands proof accompany a completion claim but never said how to know the proof is real.
- **Runner-style verification.** The pre-existing `node:test` files in this repo *fail* under
  `npm test` (vitest: "No test suite found") — 22 failing files, and they are why. Writing my
  suite in the ambient style of its neighbours would have made me failing file #23 while
  passing locally under `node --test`. **Match the runner the GATE uses, not the runner the
  neighbouring file uses.**

## Mistakes I made

- **Shipped a fail-closed gate with no key** and would have shipped four more defects had the
  hostile rounds not run.
- **Repeated `| tail` exit-code masking.** Ran `vitest run | tail -40`, read "exited with code
  0", and briefly believed the suite passed. It was `tail`'s exit code; 22 files were failing.
  **This exact mistake is written up in an earlier packet from this same project.**
- **Repeated `&&` short-circuiting.** `grep -c` matched nothing, exited 1, and the chained
  verification command never executed. One step from reporting a restore as verified without
  having run anything.
- **Under-tested one branch I introduced**: the duration bound is skipped when a provider's
  maximum is merely 'claimed', and no provider currently exercises that path.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What actually stopped it |
|---|---|---|---|
| **Verification masking** (`\| tail` eats exit code; `&&` short-circuits on grep-0) | 2 | **Yes — both in earlier packets from this project** | `${PIPESTATUS[0]}` explicitly, and never chaining a test run behind a `grep` whose exit code is data |
| My own new code defective in ways tests caught | 5 | n/a | Writing the tests first, then three hostile rounds to dry |
| Believing a green suite without asking whether it could fail | 1 (pre-empted) | No — this is the new one | Mutation testing, above |

**The first row is the story.** Two verification-masking bugs recurred *in a single session*
despite being documented, which is the same pattern as the ~12-occurrence row: writing a
mistake down does not stop it. What stops it is a different command — `${PIPESTATUS[0]}`
instead of trusting `$?` after a pipe. Procedural beats resolutional, again, and the corpus now
has two independent confirmations of that same meta-lesson.

## External-model calibration

None consulted. Note for routing: the three hostile rounds cost nothing and found five real
defects. A paid reviewer would have been billed for what a disciplined self-review produced —
consistent with the standing rule that the loops are mine to run.

## The durable lesson

Break it on purpose before you believe it. If a mutation to the behaviour you care most about
leaves the suite green, you did not have a test — you had a comment that runs.
