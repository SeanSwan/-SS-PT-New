---
originating_model: claude-opus-5
co_reviewers: none (solo hostile review — no paid or external model consulted)
captured: 2026-08-14
surface: backend social publishing (scheduler, retry, fan-out, immediate publish, Bluesky adapter)
boards: none (no LINEAR_API_KEY and no Linear MCP tool in this environment)
status: shipped (4a2438569, 9dc74a47c, f3e634f05, 0e45e660d — on origin/main and deployed)
models_used:
  - model: claude-opus-5
    role: hostile reviewer + builder + final decider
    did: reproduced 4 concurrency defects as failing tests, fixed all 4, mutation-checked every new test, re-measured the backend baseline against a pristine tree, wrote the 300-line gate
    cost: subscription (flat rate)
skills_touched:
  - id: rule-4 (300-line cap)
    change: gap-filled
    motivated_by: the backend had NO line-cap gate while the frontend did; two files crossed 300 unnoticed, one of them DURING the slice meant to be hardening it
  - id: rule-68 packet schema
    change: observed-stranded
    motivated_by: the amended schema (models_used / skills_touched / repeat ledger) exists only on a wip branch 1861 commits behind main and has never reached main
---

# An atomic claim protects only the moment it runs

Durable lessons from hostile-reviewing five shipped social-publishing slices. The previous
author left a ranked list of the five places he was least confident in his own work — the most
useful artifact he could have left. His top two were real. Reproducing them surfaced two more he
had not listed. Every claim below was confirmed by executing a test that failed first.
Privacy: IDs and roles only.

---

## 1. An atomic claim protects only the moment it runs

The scheduler took a job with a proper conditional UPDATE — `SET status='running' WHERE
id=? AND status='scheduled'` — and treated zero affected rows as "someone else got it". That is
the textbook single-statement claim, and it was correct.

Then, at the end of the job, it wrote the outcome with an **unguarded instance update**. So the
race the claim closed at the start was reopened at the end: a reaper that had already closed the
row would have its verdict silently overwritten.

Two more writers in the same module had the identical shape. Three writers, one of them added
during the very slice that introduced the claim.

**Rule: whoever moves a record out of a state must do it in ONE guarded statement — every time,
not just when taking the work. An atomic acquire with a non-atomic release is not atomic.**

The way to find the others is a single question, and it is worth asking mechanically after any
concurrency fix: *who else writes this field?* Three greps found the third writer in under a
minute, after two hours of reasoning had not.

---

## 2. A timeout measures liveness only if something proves liveness

A reaper closed jobs stranded in `running`, using `updatedAt <= now - 15min` as the staleness
test. `updatedAt` was bumped when the job was claimed and when it finished — **and at no point
in between.** So the field did not measure "is this alive", it measured "how long ago did this
start". A publish across several slow providers that legitimately exceeded 15 minutes was reaped
*while still running*, Sean saw `failed` for a post that was at that instant still going out, and
the retry button re-sent it. A duplicate post to a live account — the exact harm the atomic claim
existed to prevent, arriving through the other end of the job.

**Rule: any "is it dead yet" threshold requires a heartbeat. Without one you are not timing the
work, you are timing the clock, and every slow-but-healthy case is indistinguishable from a
crash.** The heartbeat interval must sit well under the threshold; the gap between them is the
margin by which healthy work survives.

---

## 3. A fix can open the hole it was built to close

Retry could fire at a job that was still publishing, because retry decides what to re-send from
the Attempt ledger and attempts are written *after* each provider call returns — so a running job
looks like "nothing was tried yet". The fix was to restrict retry to terminal statuses and claim
the job atomically.

Claiming it moved the job into `running` — **which made retries visible to the reaper**, the
hazard I had spent the previous hour eliminating. My own fix created a new instance of the bug I
was fixing, in the same session.

**Rule: after any change that puts a record INTO a state, grep for everything that READS that
state.** Writing is the visible half; the watchers are the half that bites.

---

## 4. When one sibling validates and the other does not, the bug is in the gap

`createBlueskySession` validated four required fields on the provider response and threw on any
missing one. `refreshBlueskySession` — same file, same response family, written to the same
purpose — validated **nothing**.

Consequence: a refresh response missing the rotated `refreshJwt` returned "successfully", the
caller merged only truthy fields, and the **consumed** token stayed in storage. The account was
then guaranteed to die at the next expiry, and **nothing failed at the moment the fault
occurred.** The symptom would appear hours later, identical to the symptom of the bug that had
just been fixed, with green tests throughout.

The identical shape appeared a second time the same day, in an unrelated file: the Hermes inbox
drain hook warns loudly when the standing-context block is truncated, and truncates oversized
memos to 8k **silently** before archiving them.

**Rule: when two sibling code paths handle the same class of input and only one validates, the
unvalidated one is where the silent bug lives. Asymmetry between siblings is a defect smell in
its own right — worth grepping for deliberately, not just noticing by luck.**

---

## 5. An inherited baseline is a claim, not a measurement

The previous handoff recorded "13 pre-existing backend failures" and honestly flagged the number
`[UNVERIFIED]`. Standing on it would have made every later statement about regressions wrong.

Measuring it cost one `git stash -u`, one full run, and one `git stash pop`: the real figure was
**37 failing files / 7 failing tests**. Having the true baseline is what made "zero regressions"
a verifiable claim rather than a hopeful one — and the byte-identical diff of the two failure
sets is what proved it. It also revealed, later, that three of those failures had been fixed by
another agent's commits, which I would otherwise have been tempted to credit to myself.

**Rule: re-measure an inherited baseline before standing on it. It costs one stash-and-run, and
without it every downstream regression claim is inherited hearsay.**

---

## 6. Prove a test can fail before believing it passes

Every new test in this session was mutation-checked: break the code deliberately, confirm the
test goes red, restore. This caught a reaper test whose mock `findAll` ignored the `updatedAt`
filter entirely — it would have passed with a completely broken heartbeat.

**A fake must honour the WHERE clause of the query it stands in for.** A mock that always reports
one affected row makes a lost claim indistinguishable from a won one, which is precisely the
distinction under test.

Related and sharper: after moving a write from an instance update to a model update, **the tests
that did NOT break are more informative than the ones that did.** One kept passing because it
read the instance mock behind an `if` and an optional chain — so it asserted nothing at all. A
vacuous green is worse than a red, because a red gets fixed.

---

## Who did what

- **claude-opus-5 (me)** — the entire review: reproduced all four defects as failing tests before
  writing any fix, implemented the fixes, mutation-checked every new test, re-measured the
  backend baseline against a pristine tree, and wrote the missing line-cap gate. I was also
  **wrong twice** in ways worth recording: I built a reaper test that could not fail, and I left
  a pre-existing test passing vacuously after moving a write. Both were mine, both were caught by
  procedure rather than by attention.
- **The previous Claude session (claude-opus-5, prior run)** — was RIGHT about its top two
  self-flagged risks and right to refuse to fix what it had not reproduced. It was **wrong** on
  the backend baseline number (13 vs the measured 37) and had correctly labelled that
  `[UNVERIFIED]`. Its attack list was the single highest-value thing it produced.
- **No external or paid model was consulted.** No Kimi, no HY3, no Village, no Fable call.

## Skills created or changed

- **Backend 300-line gate (new)** — `tests/unit/socialPublishingStructure.test.mjs`, mirroring the
  frontend's. Built because rule 4 had no backend enforcement and two files had already crossed
  the cap unnoticed — one of them written by the agent whose slice was explicitly about hardening
  that module. A rule nothing checks is a rule that gets broken by the person who wrote it.
  Scoped to the nine files this module owns so it fails on a regression rather than on a
  pre-existing baseline nobody agreed to fix. Verified capable of failing by lowering the cap.
- **Rule-68 packet schema (observation, no change made)** — the amended schema this packet is
  written to lives only on `wip/comms-notifications-2026-07-05`, a branch 1861 commits behind
  `main`. Neither the skill file nor the closeout gate on `main` knows about `models_used`,
  `skills_touched`, or the repeat ledger. The gate on main matches only the literal
  `## Mistakes I made`. Sean should decide whether to land that branch's rule-68 work.

## Mistakes I made

- Built a reaper test whose mock `findAll` ignored the `updatedAt` filter, so it would have
  passed with a broken heartbeat → caught by mutation-checking → rule: a fake must honour the
  WHERE clause of the query it replaces. **This is the same class the previous agent wrote up as
  his own mistake #3 one session earlier** ("I wrote a harness that could not fail"), and I
  walked into it anyway despite having read his write-up that morning.
- Moved a write from instance to model and left a test passing vacuously → caught by asking which
  tests the change *should* have broken → rule: after moving a mechanism, audit the tests that
  did not break.
- Made retries reapable while fixing retry, re-creating the hazard I had just eliminated →
  caught within the same round → rule: after writing a state, grep everything that reads it.
- Nearly inherited the "13 pre-existing failures" figure instead of measuring it → caught by
  choosing to stash and run pristine → rule: re-measure inherited baselines.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What finally stopped it |
|---|---|---|---|
| Harness that cannot fail (mock ignores the query's constraint) | 1 | **YES — by the previous agent, one session earlier, and I had read it** | Mutation-checking every new test as a mechanical step. Reading the prior write-up did NOT prevent it; running the mutation did. |
| Test left vacuous after a mechanism moved | 1 | No (new class) | Auditing which tests did not break after a refactor |
| Fix creates a new instance of the bug being fixed | 1 | No (new class) | "Grep what reads this state" as a post-fix step |
| Inheriting an unverified baseline | 0 (avoided) | Flagged `[UNVERIFIED]` by its author | Measuring it — one stash, one run |

The highest-signal row is the first. A permanent lesson had been correctly identified, correctly
written down, and repeated anyway by the next agent **who had read it the same morning.** The
conclusion is not "read harder": prose in a handoff does not change behaviour under time
pressure. What actually stopped it was an executable step — break the code, watch the test go
red — which either happens or does not, and leaves evidence either way.

**Rule: a lesson that recurs after being documented needs a procedural fix, not a better
write-up. If the correction cannot be expressed as a command you run, expect the repeat.**

## External-model calibration

None. No paid or external model was consulted this session, so there is no calibration data to
add. Recording the absence deliberately: an empty section here should mean "nothing was called",
not "nobody wrote it down".
