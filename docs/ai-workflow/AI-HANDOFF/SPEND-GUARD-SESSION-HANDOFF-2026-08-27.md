# Spend Guard (SWA-218) — session handoff

**Read this first, then `git log` on the branch. Everything below is verifiable; nothing here is a status claim you have to take on trust.**

- **Branch:** `feat/spend-guard-tests` — PR #87, cut from `origin/main`, all work pushed.
- **Also open:** PR #86 (Rule 85 / `seat-relay` skill — the Fable gate). Independent, unreviewed, unmerged.
- **Board:** SWA-218 carries a comment per round with the full narrative. The commit messages are the primary record; Linear mirrors them.
- **Worktree:** `c:/tmp/swan-fable-gate`. The main checkout is 2,298 commits behind `origin/main` — **do not audit this work from the main checkout.**

---

## What the thing is

A `PreToolUse(Bash)` hook that refuses paid-AI calls which would breach a spend cap. Sean's directive 2026-08-22, after one workstream cost ~$4.87: *"shouldn't cost me no more than two or three bucks for that whole thing max… I would be asked twice before approving."*

Caps: **$1.00 per call · $3.00 per topic · $5.00 per day.** The per-topic cap is the primary control — the incident was four *reasonable* calls in a row, none of which a per-call ceiling would have stopped.

Four moving parts:

| File | Job |
|---|---|
| `scripts/lib/shell-parse.mjs` | Parses the Bash command into commands + argv. Decides **what will execute**. |
| `scripts/lib/paid-seats.mjs` | The seat roster: which scripts spend money, which are free, which are frozen debt. |
| `scripts/lib/spend-ledger.mjs` | Ledger, caps, reservations (in-flight holds), the two-ask approval tokens. |
| `scripts/hooks/spend-guard-gate.mjs` | The hook itself: prices the line, places holds, decides, refuses. |

---

## State as of this handoff

**159 tests passing, 0 failing** across seven suites. Three pre-commit gates on staged `scripts/` changes: paid-seat coverage (~0.25s), seat parity (~0.15s), shape corpus (~3s).

**Six rounds of hostile review** by GLM 5.3 and GLM 5.3 Flash (both flat-rate — the reviews cost nothing but time). Round 7 was in flight when this was written; its output lands in `docs/ai-workflow/AI-HANDOFF/spend-gate-round7-2026-08-27/`.

Every round's packet and both reviews are committed under `docs/ai-workflow/AI-HANDOFF/`. **Read the reviews, not just my summaries of them.**

---

## The three things a fresh agent most needs to know

### 1. Most bugs in the last three rounds were introduced by the previous round's fix

This is the dominant failure mode of this workstream, not an aside:

- Round 4 found six bypasses — **five were created by my own fixes in rounds 2 and 3.** That's why the regex matcher was replaced with a parser.
- Round 5's fail-closed inversion introduced the backtick hole.
- Round 6's `INERT_HEADS` introduced `find -exec`.

**Practical consequence: after any fix here, re-run the whole corpus, not just the new test.** A fix that closes a money path by breaking an ordinary command has not helped — cry-wolf is the more corrosive failure, because a guard people learn to wave through protects nothing.

### 2. "Zero reds" from a mutation means four different things

Mutation-testing is the main quality instrument here. A mutation that produces no failures can mean:

1. the test is **vacuous** (fixture never reaches the code),
2. the mutation **never landed** (sed/perl silently matched nothing),
3. **genuine defence in depth** (another layer catches it),
4. the test asserts the **verdict** while a backstop does the mechanism's work.

All four occurred. **Always verify the mutation is present in the file before believing its count** — `grep -c MUTANT <file>`. That check alone caught three false readings.

### 3. Nine vacuous tests, one signature

*The fixture encodes the assumption the bug violates.* Examples: a settle test that reserved and recorded with the **same** model string, when production used two different ones; a crashed-holder test whose `|| 'none'` fallback wrote a junk file instead of the claim it named. Two were found by the reviewers, seven by mutation.

**When you write a test here, ask what fixture value would make it pass for the wrong reason.**

---

## What I got wrong, so you don't inherit it as truth

**Four false claims written into comments.** This is the one to internalise:

- a comment saying a table was "pinned against PRICES by a test" — **that test did not exist**;
- a test asserting `nodejs <seat>` should ALLOW as a false-positive guard — **`nodejs` is a real node binary**, so the test defended a genuine hole;
- a comment saying the panel reserves under real seat ids, with `model: 'panel'` **on the very next line**;
- the gate priced Sol at **half** what the seat's own provider record says — two price tables disagreed by 2× and nothing compared them.

The pattern: *I write the sentence I intend to implement, then implement something else, and the comment reads as evidence to every later reader — including me.*

**A claim in a comment is not a control.** The only defence that has ever worked is a test that reads the artefact the claim is about: reservation rows, the provider record, the actual file list. If you see a confident comment in these files, verify it against the code below it before relying on it.

---

## Verify the state yourself

```bash
cd c:/tmp/swan-fable-gate

# all seven suites
for f in scripts/hooks/spend-guard-gate.test.mjs scripts/hooks/spend-shapes.test.mjs \
         scripts/hooks/spend-coverage.test.mjs scripts/lib/spend-token-race.test.mjs \
         scripts/lib/cost-gate.test.mjs scripts/lib/spend-ledger.test.mjs \
         scripts/lib/spend-settle.test.mjs; do
  node --test "$f" 2>&1 | grep -E '^# (pass|fail)'
done

# the shape corpus alone — 49 must-block, 24 must-allow
node --test scripts/hooks/spend-shapes.test.mjs
```

**`scripts/hooks/spend-shapes.test.mjs` is the single most useful file to read.** It is every command shape any round has found, labelled by round, in two columns: lines that bill (must block) and lines that don't (must allow). It is both the regression suite and the history of what this guard has been wrong about.

---

## Open work, in priority order

**Nothing here is a live money path** — those are all closed and pinned by the corpus. These are the residue.

1. **Round 7's findings** — output in `spend-gate-round7-2026-08-27/`. Reproduce each before fixing; every finding from rounds 4–6 reproduced, so treat them as credible but still verify.
2. **A differential test against real bash** (both seats asked for it). Would have caught shapes I hand-wrote wrongly. Not built because executing these lines executes paid seats — it needs a harness that swaps the seat for a no-op. **This is the highest-value remaining piece of engineering.**
3. **`bash file.sh` / `curl … | sh`** — file contents are out of reach. Named in the corpus header as a gap rather than implied to be covered.
4. **Unbounded `ledger.jsonl` / `reservations.jsonl`** — parsed on the hot path, never compacted. Performance, monotonic, not a correctness hole.
5. **Token store is keyed per breach, not per token** — a replacement mint erases the record of its predecessor. Behaviour stays correct; the audit trail thins.
6. **"single call $X > cap" wording on a summed line** — the block is right, the label is wrong, and Sean is the one reading it.
7. **All-time, name-colliding topic keys** — `plan.md` pools every workstream that reuses the name. Errs cry-wolf, which is the tolerable direction.

---

## Judgement call for whoever picks this up

Rounds are shrinking (6 bypasses → 8 findings → 4 blockers). **If a round returns only LOW/MEDIUM findings and no live money path, stop and ship.** Do not loop for an APPROVE: past round 8 the marginal finding stops being worth the churn, and churn is what introduced three of the six rounds' bugs.

The corpus is what makes stopping safe. It fails loudly if a shape ever changes sides.
