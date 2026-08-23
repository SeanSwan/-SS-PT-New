---
title: "Absent input is not a clean result"
originating_model: claude-opus-5
tier_basis: "Session model is claude-opus-5 (harness-stated: 'You are powered by the model named Opus 5', exact id claude-opus-5[1m]) — on the Rule 68 allowlist via Sean's designation 2026-08-10"
date: 2026-08-23
decision: "Shipped drift-check checks 8 (hook-registration provenance) and 9 (rule-count drift), wired the lane-staged guard into pre-commit, and committed three hook registrations that existed in one working tree only. Then hostile review found the SAME defect in both new checks: absent input returned zero findings, so a deleted rulebook and a deleted settings.json both read as perfect health."
status: draft
privacy: "IDs/roles only; no PII, no secrets, no absolute user paths; file paths are repo-relative"
surface: coordination-ledger / drift-check / hooks
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer
    did: "Read 5 unread panel replies, shipped checks 8 and 9, wired the guard, tested three previously-untested gates, then found and fixed two instances of its own absent-input bug and one unbounded-subprocess hang."
    cost: subscription
  - model: stealth/ox-alpha
    role: hostile reviewer (prior turn, acted on this turn)
    did: "Ranked the shared git index above every other item and prescribed the pre-commit assertion. Correct, and its 'four symptoms, one missing lease' synthesis remains the best unbuilt idea on the board."
    cost: "~$0.02 (prior turn)"
  - model: x-ai/grok-4.6
    role: hostile reviewer (prior turn, read this turn)
    did: "Named the split-brain precisely — 'enforcement is a property of who touched the file last' — which became check 8's design brief. Also warned to treat the packet's own SHAs and 'already fixed' labels as unverified claims."
    cost: "~$0.0528 (prior turn)"
  - model: glm-5.3
    role: hostile reviewer (prior turn, read this turn)
    did: "Called the uncommitted registration a 'drift bomb' and prescribed a CI check that every live hook has a committed registration — which is check 8."
    cost: "~$0.01 (prior turn)"
  - model: deepseek/deepseek-v4-pro
    role: hostile reviewer (prior turn, read this turn)
    did: "Found that review-debt closure trusts artifact EXISTENCE, so naming README.md closes any debt. Still unfixed; highest-value item left."
    cost: "~$0.0561 (prior turn)"
  - model: moonshotai/kimi-k3
    role: hostile reviewer (prior turn, read this turn)
    did: "Identified the schema date-cutoff as a permanent boundary bug and prescribed per-packet schema versioning instead of wall-clock scoping."
    cost: "~$0.0326 (prior turn)"
  - model: qwen3.8 (local)
    role: hostile reviewer (prior turn, read this turn)
    did: "Flagged untested lane.mjs as a P1 and argued the string-indexing gate design is unsound. Its REJECT verdict overreached; the underlying fragility point was fair."
    cost: "$0 (local)"
skills_touched:
  - id: drift-check
    action: amended
    motivated_by: "Two silent-failure classes had no detector: a live hook that exists in no commit, and a rulebook that cannot state its own size. Both were found by humans or panels from outside, never by the system."
  - id: rule-67
    action: reinforced
    motivated_by: "The shared index defeats read-before-edit entirely. Lane discipline is necessary and provably insufficient; the guard is the mechanism half."
  - id: rule-34
    action: reinforced
    motivated_by: "The repo's secret scanner blocked my own test fixtures. The tempting .secretignore entry would have disarmed it on that file forever — the exact trade cea86e64f recorded going the wrong way."
  - id: rule-45
    action: reinforced
    motivated_by: "A test artifact reached a commit; removed by follow-up commit rather than history rewrite."
---

# Absent input is not a clean result

## The lesson

I wrote two new drift checks. Both had **fail-open, never fail-silent** written in
their own header comments. Both then treated missing input as nothing to report:

- **check 9** — a *deleted* `CLAUDE.md` produced zero findings. A repo governed by no
  rulebook at all reported perfect health.
- **check 8** — a *deleted* `.claude/settings.json`, while HEAD registers hooks,
  produced zero findings. Every committed guard is off in the tree doing the work,
  and the check said clean.

My own comment argued the second one: *"nothing is live from it, so there is nothing
to be split-brained about."* That reasoning is exactly backwards. If the repo
registers guards and the local file is gone, that **is** the split-brain, in its
worst form.

> **The rule:** when input is absent, do not ask "what is there to check?" Ask
> **"what does this absence imply?"** Sometimes the answer is genuinely nothing —
> a gitignored local override, an optional mirror. Often it is the loudest finding
> available, and it is the one shaped exactly like success.

Writing the doctrine in the file did not prevent the bug in that same file. The
second instance was found only because the first one made me go looking — which is
the transferable procedure: **when you find one instance of an error class, sweep
every sibling you wrote in the same session before doing anything else.**

## Who did what

**claude-opus-5 (me)** built checks 8 and 9, wired the lane-staged guard into
pre-commit, wrote the first tests for three gates that had none, and found the
absent-input bug in both of its own new modules plus an unbounded-subprocess hang in
the guard it had just wired. It also produced every mistake in the ledger below.

**stealth/ox-alpha** was right about the ordering and I built what it prescribed. Its
central insight — that orphaned worktree ledgers, stale claims, stuck locks and the
shared index are one problem, *shared mutable state with no ownership lease* — is
still unbuilt and is still the highest-value idea available.

**Grok 4.6** supplied the sentence that became check 8's design brief and, uniquely
among the seats, warned that the packet's own commit SHAs and "already fixed" labels
should be treated as unverified claims. That warning was justified: three of the
"already fixed" items in the packet were re-reported by other seats as open.

**GLM 5.3** independently prescribed check 8 as a CI assertion. **DeepSeek V4 Pro**
found the review-debt EXISTS hole, which is real and still open. **Kimi K3** found
the schema date-cutoff boundary bug. **Qwen (local, free)** flagged untested
`lane.mjs`; its REJECT verdict overreached but the point stood.

Five of six seats independently ranked the shared git index P0. **Consensus across
independent seats was a better prioritiser than my own ranking** — I had it as one
item among eight.

## Skills created or changed

- **`drift-check` gains check 8 (hook-registration provenance).** Built because the
  exit-status gate — the mechanism against the most recurring defect class in the
  corpus — was live in one working tree and in no commit. Its first live run found
  **three** such hooks, not one, including the Rule 16 spend gate and the Rule 8 PII
  gate. The two most safety-critical guards in the repo were protecting exactly one
  machine, and nothing anywhere reported it.
- **`drift-check` gains check 9 (rule-count drift).** Built because CLAUDE.md says 66
  MANDATORY rules and defines 73. The failure it was written against — a
  hand-maintained number that drifts — was then found *in the gate's own banner*,
  which said "7 checks", then "8". It now prints no count at all.
- **First tests for three live gates**: `egress-privacy-gate` (34), `lane-staged-guard`
  (30), `rule-count` (25). The egress suite found a **dead PII rule** on first run.
- **Mutation testing became the standard here, not an extra.** Every suite this
  session was mutation-tested; 15 of 16 mutants were killed and the one that
  "survived" had merely failed to apply, which is not evidence of coverage. A green
  suite proves nothing until it has been made to go red.

## Mistakes I made

- **Wrote the same absent-input-reads-clean bug twice, in two modules, in one
  session** — both with fail-open-not-fail-silent doctrine in their own headers.
  Caught by hostile review of my own work, not by any test I had written.
  **MECHANISM:** on finding one instance of an error class, sweep every sibling
  written the same session before continuing; the second instance was found only
  because I did.
- **Wired a guard into every commit with no subprocess timeout.** As an advisory
  script an unbounded child is slow; in pre-commit it is a frozen repository — every
  commit hangs, no output, no reason given. Worse than the false positive I had
  designed carefully to avoid. **MECHANISM:** any subprocess that moves into a hook
  gets a timeout in the same change; bound it or do not wire it.
- **Fifth invalid negative control of this program.** To prove the guard blocks
  unclaimed files I ran a compound command whose `git add` never executed, because
  the exit-status gate had blocked the whole thing — so nothing was staged and I read
  the empty result as a verdict. **MECHANISM:** the precondition assertion I had
  added caught it this time (`if [ -z "$staged" ] then ABORT`). Assert the failing
  state exists before believing any negative result.
- **Ran a real `git commit --no-verify` inside a test.** Control C3 correctly used
  `--dry-run`; C4 did not, and put a junk probe file into history. Removed by
  follow-up commit per Rule 45, not by rewriting. **MECHANISM:** destructive controls
  use `--dry-run` unless the commit itself is the thing under test.
- **Asserted a wrong property in my own test.** I wrote a case claiming a bare `**`
  claim should cover everything. That would let any agent silently disable the guard
  with two characters. The implementation was already right; my test was wrong.
  **MECHANISM:** for any permissive behaviour, ask "who could use this to turn the
  guard off, and would anyone see?" before asserting it.
- **Counted 99 rules while building the rule-count checker.** The naive pattern swept
  numbered lists nested inside rules — producing a confident wrong number inside the
  tool built to detect confident wrong numbers. **MECHANISM:** bound the scan to the
  section and to column zero; report gaps and duplicates, never just a total.
- **Claimed a `pretty()` bug that did not exist.** I misread my own separator as a
  space and announced a defect before checking the bytes. **MECHANISM:** read the
  file before reporting a bug in it — including one I wrote minutes earlier.
- **Read one of six panel replies last turn and wrote a handoff anyway.** The other
  five contained the review-debt EXISTS hole, the schema date-cutoff bug and the
  split-brain framing that became check 8 — all of which cost a full turn to
  discover. **MECHANISM:** read what has already been paid for before buying more.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What stopped it |
|---|---|---|---|
| Absent input reads as clean | 2 | No (new class) | Hostile self-review + same-session sibling sweep |
| Invalid negative control | 1 | **Yes — 4 prior instances** | Precondition assertion that aborts when the state is absent. **First time it was caught before a conclusion was drawn.** |
| Unbounded subprocess in a hook | 1 | No | Hostile round 2, asking what changes when a script becomes a hook |
| Claimed a defect without reading the file | 1 | Yes | Read the bytes |
| Wrong property asserted in own test | 1 | No | Asked who could exploit the permissive behaviour |

The invalid-negative-control row is the highest-signal line here. It had been written
up **four times** and recurred anyway — which proves the write-ups were not a fix. The
correction that finally worked is procedural and executable (`assert the state exists,
abort if not`), not resolutional ("be more careful"). It is the only one of the five
that has now survived contact.

## External-model calibration

Six seats, ~$0.14 total, all read this turn. Findings that **survived verification**:
shared git index (5/6 seats, P0 — built), uncommitted registration (4/6 — built),
untested `lane.mjs` (5/6 — partly built), rule-count drift (4/6 — built), review-debt
EXISTS hole (3/6 — real, unfixed), schema date-cutoff (3/6 — real, unfixed),
duplicate `EDITING NOW` blocks (2/6 — fixed).

**Disproven or overreached:** Qwen's REJECT and its "delete the exit-status gate"
prescription; three seats re-reported `settle()`'s two-phase write as open when the
packet's own §3 described it as already fixed — a **packet-framing failure, not a
reasoning failure**, since the brief listed fixed bugs beside open ones.

Calibration that holds across three panels: **ox-alpha for architecture-level
synthesis, Grok for naming the mechanism precisely, DeepSeek for authorization holes,
Kimi for schema/versioning, Qwen (free) for implementation defects, GLM for the
cheapest concrete de-risk.** The cheap seats are not the weak seats. Grok has now
twice been the seat that questioned the brief's own premises.

The §5 "our own evidence is weak here" section worked: Grok explicitly declined to
invent blockers and treated §3's fixed defects as design residue. The previous panel
had 7/7 seats echo a false premise. **Pre-empting your own weak evidence measurably
changed the output.**

## Applies to

Any check whose input can be absent; any script being promoted into a git hook or CI
step; any negative control; any suite that has never been made to fail; any repo
where multiple agents share one git index.
