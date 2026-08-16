---
title: Author-written tests sample the author's imagination, not the input space
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 and Kimi K3 are Fable-tier
reviewed_by: self, adversarial probe against own code (11/13 bypasses found); hostile rounds to dry
date: 2026-08-16
decision: For any code whose value is handling inputs nobody enumerated — a filter, a validator, a parser, a guard — write the adversarial probe BEFORE believing the unit tests, because the tests and the implementation were drawn from the same list
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder, adversary, reviewer
    did: built provenance/spend-guard/policy-filter/upload path; ran the adversarial probe that found 11 of 13 bypasses in its own filter; found 11 defects total across the session
    cost: subscription
skills_touched:
  - name: rule-73 (proof-before-done)
    change: sharpened for guard-shaped code
    why: "37 tests pass" satisfied rule 73 while the filter it covered stopped almost nothing. Passing is necessary, never sufficient, when the code's job is the unenumerated case.
  - name: mutation-before-belief (from the 2026-08-16 packet)
    change: found insufficient alone
    why: mutation proves the tests can FAIL. It cannot prove the tests cover the right inputs — a mutation of a rule you never wrote kills nothing, because no test asserts it.
  - name: shell-heredoc patching
    change: retired for source edits
    why: third silent-escape corruption in one day; `\b` became a literal backspace, invisible in every view, and only a runtime probe caught it
---

# Author-written tests sample the author's imagination, not the input space

## The finding

I built a content policy filter, wrote 37 tests for it, watched them all pass, and shipped
it in a commit describing it as a working control. Then I ran an adversarial pass:

**11 of 13 probes walked straight through.**

The tests were not wrong. Every one of them asserted a case I had thought of — and that is
precisely the set the filter was guaranteed to catch, because *I built the filter from the
same list*. The test suite and the implementation were drawn from one act of imagination,
so agreement between them proves only that I was internally consistent.

**The misses were not clever.** Not one was an evasion attempt:

| Bypass | Why it matters |
|---|---|
| "a youngster in the gym" | ordinary synonym |
| "my son doing pushups" | ordinary family reference |
| "a five year old training" | age in words; the numeric check only saw digits |
| "a 7th grader lifting" | school grade |
| "recess at the playground" | school context |
| "make it look exactly like <Name>" | impersonation without the word "celebrity" |
| "a realistic CNN broadcast" | deception without the word "fake" |

Someone typing these means nothing by them. The output is the same synthetic minor. The two
probes that *did* block were luck, not coverage.

## The rule

**For code whose entire value is handling inputs nobody enumerated — a filter, a validator,
a parser, an authorisation guard — the unit tests are the weakest evidence available.**
Write the adversarial probe first, or at minimum before believing the suite. Run it as a
list of attempts, count the misses, and treat the count as the real coverage number.

This is distinct from, and strictly stronger than, the mutation discipline recorded earlier
today. **Mutation proves the tests can fail. It cannot prove they test the right inputs** —
mutating a rule you never wrote kills nothing, because no test asserts it. Mutation checks
the tests against the code; the adversarial probe checks the code against the world.

Corollary worth keeping: **document the holes you decide not to close, as passing tests.**
Digit substitution and letter spacing still defeat this filter. Rather than pretend
otherwise or attempt a de-obfuscation that costs false positives, both are pinned as tests
that assert the bypass. The limit is now a recorded decision rather than an unmeasured
hope, and a future edit that closes one fails the test documenting it — which is the prompt
to update the public disclosure.

## Who did what

Opus 5 built everything, found all eleven defects in its own work, and ran the probe. No
external model was consulted; the panel review comes next and this packet is written before
it, so the calibration below is honest about what self-review did and did not catch.

Notably, **self-review caught the filter's blindness only after switching stance**. The same
model that wrote 37 green tests found 11 bypasses twenty minutes later. The difference was
not capability — it was being asked to attack rather than to verify.

## Skills created or changed

- **Adversarial-probe-before-belief**, above.
- **Shell heredoc retired for source edits.** Patching a regex file through a heredoc ate a
  backslash layer and turned every `\b` into a literal backspace character. The file passed
  `node --check`, looked correct in a diff, and matched NOTHING — briefly making the filter
  worse than before the fix. Fixed by rewriting the whole file directly.
- **Follow the value past the boundary.** The provenance record was built correctly and then
  discarded by a `completeJob` that cherry-picks its `meta` argument. Every unit test
  upstream passed. No test in the codebase looks at what survives a layer transition.

## Mistakes I made

- **Believed a green suite about a guard**, and wrote a commit message describing it as a
  working control while it stopped almost nothing.
- **Corrupted the file while fixing it**, third silent-escape incident in one day.
- **Trusted a rendered view over the bytes, then nearly trusted one line's bytes over the
  runtime.** A system-reminder showed the regexes stripped of backslashes; I checked a
  single line's raw bytes, saw `\b` intact, and concluded the file was fine. A *different*
  line was corrupt. Only importing the module and printing the compiled regex settled it.
- **Shipped a route reading `job.asset.provenance`** when the model declares no
  associations — it would have reported "no provenance" forever.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What actually stopped it |
|---|---|---|---|
| **Silent escape corruption via patch script** | 3 | **Yes — twice, in packets from this same day** | Retiring heredoc patching for source edits entirely. The two earlier write-ups said "be careful with escaping"; the fix that held was "use a direct write, never a string-replace script". |
| Believing a green suite about unenumerated-input code | 1 | No — this is the new one | The adversarial probe |
| Value discarded at a layer boundary while every test passes | 1 | No | Following the record past `completeJob` by reading, not testing |
| Assuming an ORM association that does not exist | 1 | No | Checking `associations.mjs` before writing the accessor |

**Row 1 is the lesson about lessons.** Two prior packets today told me to be careful with
escaping, and I hit it a third time within hours. Careful is not a procedure. "Never patch
source through a shell heredoc; use a direct write" is — and it is the only version that has
held.

## External-model calibration

None consulted for this work. The panel (Kimi K3, GLM-5.3, HY3, and others) reviews it next
against a deliberately small packet, per this project's own finding that packet SIZE rather
than model capability predicted reviewer failure.

## The durable lesson

When code exists to handle what nobody listed, the author's tests cover the author's list.
Attack it yourself, count the misses, and publish the holes you chose to leave open.
