---
title: "A known-red test is a diagnosis nobody performed — and a gate is only safe if you query the world first"
originating_model: "claude-fable-5"
tier_basis: "claude-fable-5 is the Final Decider and a Rule-68 learning source by definition; this session ran as Fable 5 and authored every fix, probe and verification in this packet."
privacy: "IDs and roles only. No client names, no PII, no credentials, no absolute paths, no key values. Secret-scanned clean before commit."
date: 2026-08-23
surface: "SwanGuard connector runtime, civic route clock injection, web build reachability"
decision: "A failure carried under a label is an unread failure; read it before quarantining it. And before adding a refusal gate, query the live world it will refuse — the same correct gate is either a no-op or an outage depending on data you can check in one command."
status: shipped
supersedes: none
models_used:
  - model: "claude-fable-5"
    role: "builder + hostile reviewer + final decider"
    did: "diagnosed a 9-day-old 'pre-existing red' as a real clock-injection defect; closed the disable-path orphan; built the bundle-reachability control; landed the licence gate after querying the live registry; caught its own re-introduced perf defect on the hostile pass"
    cost: "subscription"
skills_touched:
  - id: "scripts/web-bundle-reachability.mjs + config/bundle-markers.json"
    change: "created"
    motivating_failure: "Two slices of owner-console work were built, tested, type-checked and reported as shipped while App.tsx was imported only by a test harness. A green build carried no information about whether a change reached a user."
  - id: "feedback_dry_loop_law"
    change: "reinforced"
    motivating_failure: "My own S0 orphan fix re-introduced, in a different file, the read-amplification I had removed from the kill-switch store the same session. Only the hostile pass over my own diff caught it."
---

# A known-red is a diagnosis nobody performed

## Context

Executing S0 (process repairs) and S2 (licence gate) from a panel-derived plan. Both the plan and
four independent review seats recommended **quarantining** a test the repo had carried as
`516 pass + 1 pre-existing red` for days.

## The transferable lessons

**1. A label is not a diagnosis.** "Pre-existing red" appeared in the handoff, in commit messages,
and in board comments — always as a property of the repo, never as a question. Reading it took
twenty minutes: the civic route asks "which items are still within retention?" using `new Date()`,
while the connector service uses an injected clock. The fixture's 720-hour window expired
**2026-08-13**. The test passed only while real time happened to fall inside a window pinned to a
fake clock, and had failed every run for nine days.

Two sub-lessons: **a test that straddles a fake clock and the real one has an expiry date and looks
nothing like a time-dependent test from outside**; and **the phrase "known red" is what stops people
looking**, converting an unread failure into an accepted cost. The structural repair is the durable
part — *a route that filters by time and cannot be given a time is untestable by construction.*

**2. Query the world before adding a gate.** The licence gate refuses any per-outlet connector with
no terms URL. Before writing it I asked the live registry: 39 of 39 carry one. So the gate blocks
nothing that works and blocks exactly the unreviewed feeds. **Had the answer been 30 of 39, the same
correct gate would have switched off nine working outlets on deploy.** One query decided whether the
change was safe or an outage. The same query surfaced that 0 of 39 have *acknowledged* terms — the
stronger gate — which I deliberately did not build, because it would block everything and is
therefore a decision rather than a fix.

**3. Make the wrong thing undeclarable, not just discouraged.** The new build control declares per
surface whether it ships and fails **both** ways: a declared surface that vanishes, and a surface
that appears undeclared. The second arm is the one that catches a console quietly going live. The
current, embarrassing truth is recorded in the ledger rather than papered over.

## Who did what

Claude Fable 5, throughout. An earlier 4-seat panel supplied the slice shapes; every one of its
findings was re-verified against code before being built on — and its two specific mechanisms were
both wrong (it named the wrong door on the orphan, and recommended quarantining a test that wanted
reading). **A panel is reliable about what to look at and unreliable about what is actually there.**

## Skills created or changed

See frontmatter. One control created, one law reinforced.

## Mistakes I made

- **Re-introduced, in a different file, the exact perf defect I had removed the same session.** The
  orphan check read the whole state table on every enable — 146 scans in a batch — which is the
  read-amplification I had taken out of the kill-switch store hours earlier. Caught by the hostile
  pass over my own diff, not by memory.
- **Planned to quarantine rather than read.** So did four review seats. It was a twenty-minute bug.
- **Shell mangled a heredoc containing backticks**, for the fifth time across four prior write-ups.
- **Wrote a test assertion wider than its own fixture** and briefly suspected working code.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What finally stopped it |
|---|---|---|---|
| Re-introduced a defect I had just fixed elsewhere | 1 | yes — same day, same repo | Hostile pass on my own diff |
| Heredoc/shell instead of the editor | 1 (fifth overall) | yes, four times | Switching tools after failing, never before |
| Accepted a labelled failure instead of reading it | 1 | no | Choosing to read it |

Row 2 is now conclusive and worth stating without softening: **five occurrences, four prior
write-ups, zero prevented.** Writing the lesson has never once changed the behaviour. Row 1 is the
sharper finding — the fix was hours old, in the same session, and still did not transfer to a
different file. **Recency does not transfer either.** What has a non-zero catch rate, every time, is
a mechanical re-read of my own diff from the attacker's side.

## External-model calibration

None fired this turn; the prior panel's output was the input. Calibration recorded above: shapes
good, mechanisms unreliable.

## Verification carried in this packet

- api **522 pass / 0 red** (was 516 + 1 red — first clean baseline since 2026-08-13); web 402;
  domain 242; database 90; scripts 143 (was 138); type-check 0 errors.
- Bundle control mutation-tested against the real artifact: declaring the console present makes
  `npm run build` exit 1 naming the marker; restored, exit 0.
- Real HTTP route probed: terms-less enable 409, terms-less disable 200, ghost 404 both directions,
  **no phantom rows written**.
- Live Postgres 4/4 including a new registry-wide licence assertion; live DB unchanged by the slice.
