---
packet: packet-gate-guards-that-cannot-fire
date: 2026-08-16
originating_model: claude-opus-5
surface: packet-gate / repo guards
status: durable
models_used:
  - model: claude-opus-5
    role: builder + third reviewer + final decider
    did: verified all 8 round-4 findings by execution (1 under-ranked, 1 disproven), fixed them, found the U+2028 fail-open independently, built repo-wide-find + absence-claim-gate
    cost: subscription
  - model: moonshotai/kimi-k3
    role: paid hostile reviewer (rounds 4-5)
    did: 8 findings round 4, 8 round 5; found the --seed provenance hole; ranked one CRITICAL as HIGH and asserted one non-bug
    cost: $0.3618 (round 5) / ~$0.147 (round 4)
  - model: glm-5.3
    role: paid hostile reviewer (round 5)
    did: 9 findings; generalized the hidden-character class to BOM/NBSP; its scope note surfaced the round-5 CRITICAL
    cost: bundled subscription
skills_touched:
  - id: cross-env-verify
    change: amended
    failure: its trigger list matched the "GLM is not wired" claim but every vantage in its table was a TOOLCHAIN failure, so it had no row for the ref-vantage that actually mattered
  - id: scripts/hooks/absence-claim-gate.mjs
    change: created
    failure: two existing guards (cross-env-verify, session-start drift check) both covered this ground and both were beaten, because neither fires at the moment of the claim
  - id: scripts/repo-wide-find.mjs
    change: created
    failure: the correct multi-ref check cost five composed git commands, two of which Git Bash silently mangles — so it was never run
  - id: CLAUDE.md rule 4
    change: proposed
    failure: a handoff reported two files as under the 300-line cap when they were 345 and 303; satisfying the cap by splitting then silently unbound the canary hash
---

# A guard that cannot fire is the bug it exists to prevent

Two independent instances in one session, on two unrelated systems. That is what makes this
durable rather than an incident report.

## The lesson

A gate is not the code that checks. It is the code that checks **plus the binding that proves the
check ran on the thing you think it ran on.** Break the binding and the gate keeps reporting green
forever, which is strictly worse than having no gate, because now there is a green light on it.

**Instance 1 — the canary that stopped covering the checks.** Satisfying the 300-line cap meant
splitting a file. R3 and R4 moved into new modules. The canary's `GATE_SOURCES` was a hand-written
three-entry list, so it kept hashing three files that no longer contained the logic. Measured:
replacing `checkArtifact` with `return []` — the artifact check fully neutered — still produced a
valid canary record, a silent R15, and **zero findings on a decoy packet.** The refactor that
satisfied a style rule silently disarmed the two most load-bearing checks in the system.

**Instance 2 — the new guard that matched nothing.** The Stop hook written *in this same session* to
prevent absence-claims read `message.role` to find the assistant's closing text. Claude Code
transcript rows carry the speaker at the top level as `type`. So it matched nothing, allowed every
turn, and would have sat in `settings.json` looking like protection indefinitely. Its own first test
caught it — the test written because the repo's convention is to export a testable `decide()`.

**The transferable rule:** any list of "the things this guard watches" that a human maintains will
drift the moment the code moves, and the 300-line cap *guarantees* the code will move. Derive the
list from the filesystem. And never install a guard without a test that proves it fires — the
failing case, not just the passing one.

## Who did what

- **Opus 5 (me)** — verified all eight round-4 findings by execution before touching code. That
  reclassified one from HIGH to CRITICAL and disproved another outright. Found the U+2028 fail-open
  by attacking my own round-4 diff, before either paid review returned. Also **caused** the round-5
  critical.
- **Kimi K3** — produced every round-4 finding and eight more in round 5, including the `--seed`
  hole. But it ranked a fail-open CRITICAL as a HIGH false-refusal because it reasoned about
  `norm()` and never ran the parser, and it asserted a trailing-blank-line bug that does not exist.
  **Kimi finds real things and ranks them by reasoning; re-derive its severities.**
- **GLM-5.3** — returned *empty* in round 4 (31,995 of 32,000 output tokens spent on invisible
  reasoning, exit 0 — a careless reader records "GLM reviewed it"). At `--max-tokens 96000` in round
  5 it produced the strongest review of the programme: it generalized my U+2028 patch to the whole
  hidden-character class, and its scope note — "check whether `gateSourceHash()` covers the files
  round 4 created" — is what surfaced the critical. **An empty answer from a reasoning model is a
  budget symptom, not a capability verdict.**

## Skills created or changed

- **`cross-env-verify` — amended, not replaced.** Sean asked for a skill preventing "I checked one
  worktree and concluded the tool didn't exist." A third skill would have been duplication and would
  not have fired: the existing skill's *triggers* matched, but every row in its vantage table was a
  toolchain failure ("I cannot reach X with this tool"), and here the toolchain worked and answered
  correctly. Added the missing law — **"X is not in this checkout" ≠ "X does not exist"** — and the
  git-ref vantage row.
- **`scripts/repo-wide-find.mjs` — created.** One command over every branch, remote ref, worktree and
  stash. Sets `MSYS_NO_PATHCONV=1` internally so the caller cannot forget it. Built because the
  correct check previously cost five composed commands, and a five-command check does not get run.
- **`scripts/hooks/absence-claim-gate.mjs` — created.** Fires at the *moment of the claim*. The
  session-start drift check already warns "tooling may appear missing when it exists on main" and
  fires every single session — which is exactly what makes it skimmable. It fired for me too, and I
  still needed the gate.

## Mistakes I made

- **I created the round-5 CRITICAL myself**, by splitting a file to satisfy the line cap without
  checking what the canary hashed. Fifth consecutive round in this programme where the previous
  round's fix produced the next round's critical.
- **My first U+2028 fix was insufficient and I nearly shipped it.** `[^\n]*` does nothing when the
  document contains no `\n` at all. Only re-running the original attack — rather than trusting that
  the edit addressed it — caught that.
- **I used a bash heredoc to append JS containing `\\` escapes.** It collapsed them, so
  `'src\\validate.mjs'` became a vertical-tab escape. The takeover doc warned about exactly this
  failure for *python* heredocs; I walked into the identical trap with bash.
- **I trusted two of my own probes that lied** — a stale one replicating pre-fix logic, and an
  inline `-e` string whose U+2028 the shell had eaten. Both briefly looked like regressions in
  working code.
- **I reported a secret-scan exit code that was `tail`'s, not the scanner's.**

## Error → fix → repeat ledger

| Error class | Times this session | Previously written up? | What actually stopped it |
|---|---|---|---|
| Believed a negative from an unvalidated instrument | 3 | **Yes** — `feedback_validate_probe_before_absence_claim`, and the takeover doc's own gotcha list | Running the check in a *file* instead of an inline `-e` string, and re-running the original attack rather than trusting the edit |
| Heredoc mangled escapes in generated code | 1 | **Yes** — takeover doc §6, for python | Using the editor tool. The rule was scoped to python; it is about heredocs |
| A guard silently stopped covering its subject | 2 | No | Deriving the watch-list from the filesystem; a test that proves the guard *fires* |
| Previous round's fix created the next critical | 5 (programme) | Yes, prominently | Nothing yet has stopped it. Only *detection* improved: attack your own diff first |

The top row is the highest-signal entry. That lesson was already recorded in memory **and** restated
in the handoff I read at session start, and I still repeated it three times. The correction that
worked was procedural (write the probe to a file; re-run the original attack), never resolutional
("be more careful").

## External-model calibration

| Model | Findings | Real on verification | Disproven | Mis-ranked | Cost |
|---|---|---|---|---|---|
| Kimi K3 (r4) | 8 | 7 | 1 | 1 (CRITICAL→HIGH) | ~$0.147 |
| Kimi K3 (r5) | 8 | 8 | 0 | — | $0.3618 |
| GLM-5.3 (r4) | 0 | — | — | — | wasted budget (empty) |
| GLM-5.3 (r5) | 9 | 9 | 0 | — | bundled |

Independent agreement between two models (the `--seed` hole) was the highest-precision signal
available all session — higher than either model's own severity ranking.
