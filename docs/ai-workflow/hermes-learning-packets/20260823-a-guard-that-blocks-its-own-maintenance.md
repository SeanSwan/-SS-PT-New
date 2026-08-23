---
title: "A guard that blocks its own maintenance gets deleted — and the test that picks your example proves nothing"
originating_model: "claude-fable-5"
tier_basis: "claude-fable-5 is the Final Decider and a Rule-68 learning source by definition; this session ran as Fable 5, verified the approved change, and found every defect recorded here by running it."
privacy: "IDs and roles only. No client names, no PII, no credentials, no absolute paths, no key values. Secret-scanned clean before commit."
date: 2026-08-23
surface: "SS-PT agent tooling — PreToolUse exit-status gate"
decision: "For a guard that sits in the path of every command, precision IS the safety property: the failure mode of a false block is not annoyance, it is deletion of the guard. And a unit test written by the same person who wrote the fix will exercise the shape they imagined, not the shape reality sends."
status: shipped
supersedes: none
models_used:
  - model: "claude-fable-5"
    role: "verifier + builder + hostile reviewer"
    did: "verified the approved gate registration; was caught by it on the first command; found and fixed a false-positive class, then a written-not-run class, then an ordering bug its own unit test had hidden; pinned known limits as tests"
    cost: "subscription"
skills_touched:
  - id: "scripts/hooks/exit-status-gate.mjs"
    change: "amended"
    motivating_failure: "The gate blocked correct commands within two of going live, and refused the very command that writes its own tests — twice."
  - id: "feedback_dry_loop_law"
    change: "reinforced"
    motivating_failure: "Three separate defect classes in one guard, each found only by attacking it after it looked finished; the third was invisible to a passing unit test and appeared only on a live run."
---

# A guard that blocks its own maintenance

## Context

An approved change registered a PreToolUse hook that blocks reading `$?` after a pipeline — the
single most-recurring mechanism in the failure corpus (44 hits), with no governing rule because the
prose version had been violated four times in one session after being written up.

## The lessons

**1. It caught its own reviewer, on his first command.** Verifying the gate, my next command was
`node script | head -2; echo "exit=$?"` — the exact defect. Every other error I caught this turn was
caught by luck or suspicion; this one was caught by a mechanism. That is the entire argument for
executing checks over written rules, demonstrated on the person auditing the check.

**2. For a guard in the path of every command, precision is the safety property.** My second command
was blocked falsely: the rule was "a pipe anywhere before a `$?` anywhere", but `$?` reads the
statement *immediately* before it, so a `$?` correctly following a plain command was refused because
an unrelated pipe sat earlier in the line. One true catch, one false, back to back.

This is not a cosmetic complaint. **The failure mode of a nagging guard is not annoyance — it is
deletion**, and a deleted guard leaves the original 44-hit defect completely unprotected. A gate that
is wrong 50% of the time on real work has a short life regardless of how correct its intent is.

**3. A guard must not obstruct its own maintenance.** The gate inspected raw command text, so a
heredoc *writing a file about* the pattern was indistinguishable from *running* it. It refused the
exact command that adds its own tests, twice, and would refuse any attempt to document it. Any tool
that inspects text has this class: distinguish text that is executed from text that is transported.

**4. The sharpest one — my test picked the shape I would have written.** After fixing the heredoc
case I wrote a unit test using `<<EOF` and it passed. The live command uses `<<'EOF'`, quoted, and
stayed blocked: I masked quotes *before* matching heredocs, destroying the delimiter. **A green test
proved my code handled my example.** Only the live run exercised the form the shell actually sends.
A second miss hid behind it — the regex covered bare and single-quoted delimiters but not
double-quoted.

The general form: *when the author of a fix also writes its test, the test inherits the author's
model of the input.* If that model were complete, the bug would not exist. The test must come from
the input's source — a real invocation, a captured payload, production data — not from imagination.

**5. Pin known limits as executable tests.** Brace groups are missed (quiet direction); backgrounded
pipelines and escaped pipes block falsely (loud, one re-issue). Written as assertions, a future
change that alters them fails there rather than surprising someone who assumed total coverage.

## Who did what

Claude Fable 5 throughout. **Concurrently, another agent** found the same underlying offset bug from
a different symptom and fixed it while I was mid-edit; their commit swept my in-flight files into it
(Rule 67 R6 — stage explicit paths while another lane is live). Nothing was lost, but afterwards I
could not separate my work from theirs without `git log -S`, and I had already written a duplicate
helper because I extended the file without re-reading it.

## Skills created or changed

See `skills_touched`. 17 tests at registration → 32.

## Mistakes I made

- **Read a piped `$?`** — the exact defect the gate exists to stop, while reviewing that gate.
- **My unit test chose the easy input shape** and passed while the real form stayed broken.
- **Extended a file another agent was actively editing** without re-reading it, producing a duplicate
  masking helper.
- **Four instrument misreads in one turn:** a piped exit code; a script run from the wrong repo whose
  MODULE_NOT_FOUND exit I read as the script's own; a grep whose pattern did not match my own wording,
  from which I concluded code was absent; and the test above.
- **Called a red I had just caused "a pre-existing failure"** — I had broken a pin seconds earlier by
  widening a glob.

## Error → fix → repeat ledger

| Error class | Times this turn | Written up before recurring? | What stopped it |
|---|---|---|---|
| Misread an instrument as the thing it measures | 4 | yes, repeatedly | An implausible number or message |
| Test exercised my example rather than reality's form | 1 | yes (only-a-live-run law) | The live run |
| Edited a file another lane was editing | 1 | yes (Rule 67) | Noticing the file change mid-edit |
| Read a piped `$?` | 1 | **the gate itself** | The gate blocked me |

Row 4 is the finding worth compounding. Every earlier row in this table across every packet was
caught by a human-ish act — suspicion, a second look, an implausible figure. Row 4 was caught by a
machine, immediately, on the author. **The written rule for this exact defect had been violated four
times in one session after being documented; the executing check caught it in one command.** When a
lesson keeps recurring, the answer is not a better-written lesson.

## External-model calibration

None fired this turn — verification and self-review only.

## Verification carried in this packet

- Gate suite 32/32 (17 at registration); all four original true positives still block.
- Every false positive reproduced failing first, then fixed: bare-command reads, heredoc bodies,
  comments, and the quoted-delimiter ordering bug.
- Live: the piped read is refused with the one-token fix named; the heredoc that was refused twice
  now runs; `settings.json` parses; my files clean in a tree another agent is actively changing.
