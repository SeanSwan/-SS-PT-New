---
title: "Validate the instrument before reporting an absence"
originating_model: "claude-opus-5"
tier_basis: "Sean designated claude-opus-5 Fable-tier 2026-08-10; this session ran as Opus 5 and authored every fix and verification in this packet."
privacy: "IDs and roles only. No client names, no PII, no credentials, no absolute paths, no key values. Secret-scanned clean before commit."
date: 2026-08-21
surface: "money-path / tooling / agent-behaviour"
decision: "A tool reporting something missing is a claim about the tool's environment, not about the world. Validate cwd and config before escalating an absence to the user."
status: shipped
supersedes: none
models_used:
  - model: "claude-opus-5"
    role: "builder + hostile reviewer + final decider"
    did: "made the false-absence claim; found the half-fixed comparison on a self-directed class sweep; verified every external finding against source before acting"
    cost: "subscription"
  - model: "moonshotai/kimi-k3"
    role: "external hostile review"
    did: "found F4 — a client-controlled value reaching a durable money column, introduced by my own pricing fix — by tracing an argument back to req.body across three files; 5 real + 1 corroboration"
    cost: "~$0.31"
  - model: "glm-5.3"
    role: "external hostile review (earlier round, same workstream)"
    did: "8 of 8 real; strongest at naming the sibling implementation that already handles a case correctly"
    cost: "subscription"
skills_touched:
  - id: "feedback_validate_probe_before_absence_claim"
    change: "reinforced"
    motivating_failure: "I reported an API key missing and asked the user to restore it. The key was present; I was running the script from a git worktree that has no .env. This memory already existed, verbatim, and I repeated the pattern anyway."
  - id: "rule-8 / rule-59 (no client-controlled or secret data where it does not belong)"
    change: "reinforced"
    motivating_failure: "I passed req.body.items[].productVariant into a price resolver whose precedence puts variant price first, writing a client-supplied number into a durable money column."
---

# Validate the instrument before reporting an absence

## The lesson

A consult script printed `OPENROUTER_API_KEY not found in env or .env files`. I
reported to the user that the key was missing and asked him to restore it.

The key was never missing. I was invoking the script with the working directory
set to a **git worktree**, and `.env` is gitignored, so worktrees never receive
it. The main repo had it the whole time.

**A tool reporting something missing is a claim about the tool's environment,
not about the world.** Before escalating an absence to a human, verify the
instrument: what directory is it running in, what config does it read, and does
a known-good control produce the same result?

The strongest signal was one I ignored. The user was successfully using other
agents against the same repo at that moment. That is direct evidence the
environment was fine and my invocation was not. External evidence that
contradicts my own tool output should *outrank* the tool output, because a tool
has one narrow view and the world has many.

He had to push back — visibly frustrated — before I checked. The check took one
command:

    grep -c '^OPENROUTER_API_KEY=' .env     # count only, never the value
    ls -a <worktree> | grep '^\.env'        # the worktree has none

This lesson was already in my memory index, written up after six false
"it's missing" claims in an earlier session. I repeated it anyway. That is the
point of recording it again: a documented lesson that recurs proves the write-up
was not the fix.

## The second lesson: trace every argument to its origin

Kimi's most valuable finding this round was a defect **I introduced in the
commit whose entire purpose was pricing truth**. I wrote:

    resolveUnitPrice(storefrontItem, item.productVariant ?? null)

`item` is an element of `requestItems`, which on both direct payment rails is
`req.body.items` — raw client input. `resolveUnitPrice` puts variant price
first. So a request carrying `productVariant: { price: 99999 }` wrote 99999 into
a durable money column that feeds refund proration, while the charge side priced
from the catalog only.

**Before passing an argument to a function that decides money, trace it to its
origin.** Not to the nearest variable — to where it entered the process. Two
call-frames of distance was enough for me to forget that `item` came off the
wire.

The commit's own comment states the invariant it broke: *"If the charge side and
this line ever disagree, that IS the bug."* It has now been the bug twice, in
opposite directions — first recording $0.00, then recording whatever the client
asked for.

## The third: fix both halves of a comparison

An earlier fix corrected the *payload* of a price-difference report to resolve
through the shared resolver, and left the *condition* selecting those rows
reading the old field. Half-fixed comparisons are how sibling states drift
apart, which is the recurring shape of this entire workstream.

I found this one myself, by sweeping the class after Kimi's F4 rather than by
following any reviewer's pointer. That is the habit worth keeping: **after a
fix that changes how one side of a comparison resolves, sweep for the other
side.**

## Who did what

**Kimi K3** found F4 by following `item` from a row builder, through two route
call-sites, to `req.body.items`, and knowing the resolver's argument precedence.
Cross-file composed defects are consistently where it earns its cost. 5 real
findings plus one corroboration of a defect already fixed.

**GLM-5.3**, in the preceding round, found two HIGHs and was strongest at
*precedent-finding* — for each defect it named an existing correct
implementation elsewhere in the codebase and framed the defect as drift from it.
Prompt for that explicitly; it makes fixes obvious and low-risk.

**I** made the false-absence claim, introduced F4, and found the half-fixed
comparison. Across three rounds neither paid model has fabricated a finding: 33
raised, 32 real, for ~$0.85.

## Skills created or changed

No new skill. Two existing rules reinforced against specific failures, recorded
in the frontmatter rather than restated — a rule kept without the failure that
motivated it becomes cargo-cult inside a month.

One procedural change: **design the mutation before writing the test.** A
mutation survived this round because the existing case set *both* fields to
undefined and therefore could not distinguish the old implementation from the
new. Deciding "what change must make this fail?" first produces a test that can
actually fail; writing the test first and mutating afterwards produced six
decorative assertions in this workstream.

## Mistakes I made

- Reported a missing API key that was present, and escalated it to the user,
  while he was successfully using other agents against the same repo.
- Introduced a client-controlled write to a durable money column, in a commit
  about pricing correctness.
- Fixed the payload half of a comparison and left the condition half.
- Wrote a test that could not distinguish the implementation it was guarding.
- Quoted a cost twice without running preflight: quoted ~$0.25–0.35, estimated
  $0.51, actual $0.31.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Documented before recurring? | What finally stopped it |
|---|---|---|---|
| False-absence from an un-validated instrument | 1 | **YES — indexed in memory, verbatim** | Check cwd/config before reporting a negative; let contradicting external evidence outrank tool output |
| Client-controlled value into a money column | 1 | No | Trace every argument to where it entered the process |
| Half a comparison fixed | 1 | No | Class-sweep after any change to how one side resolves |
| Test cannot distinguish the implementation | 1 | Related to 6 prior decorative assertions | Design the mutation first, then the case only it can fail |
| Cost quoted without preflight | 2 | After the first | Run preflight, then quote |

Row one is the highest-signal entry in this packet. It was written down, indexed
for recall, and repeated anyway. The correction that survives is never "remember
this" — it is a mechanical step performed before the claim leaves my mouth.

## External-model calibration

| Model | Raised | Real | Cost | Best at |
|---|---|---|---|---|
| Kimi K3 | 6 | 5 + 1 corroboration | ~$0.31 | tracing arguments across files; composed defects |
| GLM-5.3 | 8 | 8 | subscription | precedent-finding; control-flow consequence tracing |

Both consistently list the files they were not given and decline to rate
findings that depend on them. Across three rounds: 33 raised, 32 real, zero
fabricated. Packet construction is the lever — whole-family source, not a diff.
