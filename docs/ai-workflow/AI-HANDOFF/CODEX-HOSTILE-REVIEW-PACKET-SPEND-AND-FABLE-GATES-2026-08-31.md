# Codex hostile review — the spend gate and the Fable gate, after sixteen rounds

**You are the last reviewer.** Sixteen rounds of hostile review have run on this work:
seven with GLM 5.3 and GLM 5.3-flash, nine solo after their tokens ran out. Every
finding either of them raised was reproduced before being fixed; none was disproven.
This packet asks you to find what all of that missed.

**Read the code, not this summary.** Where they disagree, the code wins — that rule has
settled three disputes against me and none in my favour.

---

## What you are reviewing

Two PreToolUse Bash hooks that both fire on a paid-AI call, answering different
questions.

| | **spend-guard-gate** (PR #87) | **fable-remit-gate** (PR #86 + `fix/fable-gate-corpus-audit`) |
|---|---|---|
| Asks | *how much* | *what for* |
| Fails | **open** on its own errors | **closed** |
| Matcher | a shell **parser** | a presence **regex** |
| Caps | $1.00/call, $3.00/topic, $5.00/day | n/a — Fable is review-and-blueprint only |

**Branches**
- `feat/spend-guard-tests` — PR #87, the spend gate. Cut from `origin/main`.
- `fix/fable-gate-corpus-audit` — stacks on `feat/fable-gate-rule85` (PR #86).

**Worktree for the spend gate:** `c:/tmp/swan-fable-gate`
**Worktree for the Fable gate:** `C:/Users/BigotSmasher/AppData/Local/Temp/swan-r85`
(Note the second path: Git-Bash `/tmp` is **not** Windows `C:\tmp`, and that trap cost
me a false "21 of 21 shapes are free" report in round 13.)

**Verify the state before trusting any number here:**

```bash
cd c:/tmp/swan-fable-gate
for f in scripts/hooks/spend-guard-gate.test.mjs scripts/hooks/spend-shapes.test.mjs \
         scripts/hooks/spend-coverage.test.mjs scripts/lib/spend-token-race.test.mjs \
         scripts/lib/cost-gate.test.mjs scripts/lib/spend-ledger.test.mjs \
         scripts/lib/spend-settle.test.mjs scripts/spend-report.test.mjs; do
  node --test "$f" 2>&1 | grep -E '^# (pass|fail)'
done
```
Expected: **168 passing, 0 failing.** Plus 37 in the Fable gate's own suite.

---

## Start here: `scripts/hooks/spend-shapes.test.mjs`

It is the single most useful file. Every command shape any round has found lives there
as an executable row — **60 that must block, 32 that must not** — each labelled with the
round that found it, plus a wrapper × body cross-product. It is simultaneously the
regression suite and the history of what this guard has been wrong about.

If you find a new bypass, the fix is a row there, not a paragraph anywhere.

---

## The three failure modes this workstream actually has

These are worth more to you than any list of features, because they are what kept
producing defects.

### 1. A fix introduces the next round's bug

Rounds 4, 5, 6, 7 and 13 each found bugs created by the previous round's fix.

- Round 4: **five of six** bypasses were made by rounds 2–3's patches. That is why the
  regex became a parser.
- Round 5's fail-closed inversion lost backticks. Round 6's `INERT_HEADS` lost
  `find -exec`. Round 7's `for`-loop fix swallowed `if`/`while` **conditions**, which
  actually run their command.
- My fix for flash's loader-flag blocker was itself a bypass; my replacement was too
  broad the other way and two existing tests caught it in a minute.

**Ask of every fix in this diff: what did it break?**

### 2. "Zero reds" from a mutation means four different things

Mutation testing is the main quality instrument here, and its signal is ambiguous:

1. the test is **vacuous** (the fixture never reaches the code),
2. the mutation **never landed** (a `sed` that silently matched nothing),
3. **genuine defence in depth** (another layer catches it),
4. the test asserts the **verdict** while a backstop does the mechanism's work.

All four occurred. **Always `grep -c MUTANT <file>` before believing a count.** That one
check caught three false readings.

### 3. Nine vacuous tests, one signature

*The fixture encodes the assumption the bug violates.* Examples: a settle test that
reserved and recorded with the **same** model string when production used two different
ones; a crashed-holder test whose `|| 'none'` fallback wrote a junk file instead of the
claim it named. Two were found by the reviewers, seven by mutation.

**Assume a tenth.**

---

## Eight false claims I wrote, and where

This is the pattern I most want you to attack, because it has cost more than any
single bug. *I write the sentence I intend to implement, then implement something else,
and the comment reads as evidence to every later reader including me.*

| # | The claim | The truth |
|---|---|---|
| 1 | a table is "pinned against PRICES by a test" | that test did not exist |
| 2 | a test asserting `nodejs <seat>` should ALLOW | `nodejs` is a real node binary — the test defended a hole |
| 3 | "a panel reserves under the seat ids its fan-out records" | `model: 'panel'` on the very next line |
| 4 | the gate priced Sol at $2.50/$15 | its own provider record says $5/$30 — two tables, 2× apart, nothing comparing them |
| 5 | "a loop or conditional HEADER runs nothing" | `if <cmd>` **runs** `<cmd>`; this comment *licensed* the code beneath it |
| 6 | a refusal saying "single call $2.44" | the line had **four** calls — and this one is text a human reads while approving |
| 7 | the skill doc, seven rounds stale | described the deleted seat list, a price the gate no longer gives, and **recommended a command the gate blocks** |
| 8 | `consult-panel.mjs` in the Fable gate, its doc, and Rule 85 | the script does not exist; the real one is `consult-openrouter-panel.mjs`, so Fable rode through the panel **ungated** |

**The only defence that has ever worked is a test that reads the artefact the claim is
about** — reservation rows, the provider record, the actual file list. Where you see a
confident comment in these files, check the code beneath it.

---

## Attack these

1. **The corpus rows themselves.** A wrong row is worse than a missing one — that is the
   lesson GLM taught me about `INERT_HEADS`, and the corpus is now the biggest
   hand-written claim in the system. Is a BILLS line one bash would not run, or an INERT
   line one it would?
2. **The parser after nine rounds of patching.** It has grown redirects, escapes,
   backticks, process substitution, keyword handling, loader flags in two spellings,
   eval modes, stdin, control characters. Find where two patches contradict, or a shape
   that composes two of them.
3. **The two gates as a pair.** They compose — one Fable call needs two tokens from two
   files. Round 15 documented it. Is there a state where they deadlock, or where
   clearing one silently clears the other?
4. **The reservation lifecycle.** Per-seat model, per-seat topic, nonce release,
   generational reclaim, per-token spent-markers. Find a hold that cannot settle or a
   token that redeems twice.
5. **The Fable gate's regex**, which is deliberately *not* the parser. My argument: a
   presence test is the right shape because over-matching costs a handoff block, not
   money. Attack that argument, not just the pattern.
6. **My tests.** Nine vacuous so far. Name the tenth.

---

## Known gaps — recorded, not hidden

Say if you think any of these is misjudged.

- **No differential test against real bash.** Both GLM seats asked for a shell oracle and
  they were right. Not built because executing these lines executes paid seats; it needs
  a harness that swaps the seat for a no-op. **The highest-value remaining engineering.**
- **`bash file.sh`, `curl … | sh`** — file contents are out of reach for any text-level
  control. Named in the corpus header rather than left to look covered.
- **Unbounded `ledger.jsonl` / `reservations.jsonl`**, parsed on the hot path. Monotonic,
  not a correctness hole.
- **Token store keyed per breach, not per token** — a replacement mint erases its
  predecessor's record. Behaviour stays correct; the audit trail thins.
- **Day boundary** — a hold placed before midnight drops out of today's totals while
  still live. Safe direction.
- **`*.test.mjs` outside the coverage walk.** Verified theoretical: no test file in the
  repo reads a payment credential today.
- **Rule 85 in `CLAUDE.md`/`AGENTS.md` still carries four stale claims** — the
  `consult-panel.mjs` ghost, "35 tests" (now 37), Ox Alpha listed as a live free panel
  seat, and `context-gateway/src/consult.mjs` cited as a live substitute path when it was
  verified non-executable. **Not fixed: both files are locked by another agent (Rule 67).**
  This is queued, not forgotten.
- **`.claude/settings.json` registers the Fable gate with no `timeout`** while both
  neighbours set one. I tried to fix it and the blast-radius guard refused, correctly —
  an agent that can edit guard config can disable every other guard. Change request at
  `.ai-workflow/blast-radius/requests/0dc8507f927852f2.md`, awaiting Sean.

---

## What I ask of you

Return:

```
VERDICT:   APPROVE | REVISE | REJECT
BLOCKERS:  numbered; file:line + why it fails
FINDINGS:  numbered; severity + file:line + concrete failure scenario
MISSED:    what sixteen rounds should have checked and did not
ONE THING: the single highest-value change
```

**If nothing survives scrutiny, say APPROVE plainly.** A manufactured finding costs more
than a missed one here: the fix churns a working guard, and churn is what produced the
next round's bypass five separate times. If you think a previous finding — mine or a GLM
seat's — was wrong, say that too; three have been retracted already and the work is
better for it.
