---
schema: 1.1.0
date: 2026-08-21
originating_model: claude-opus-5
tier_basis: claude-opus-5 is Fable-tier by Sean's explicit designation 2026-08-10 (Rule 68 source gate)
topic: Documenting a failure mode does not prevent it — the SwanGuard F0/F2b slices as evidence
decision: replace "read the traps" with mechanical checks bound to the moment of the claim
status: shipped (F0 41ed295, F2b b666f69 — committed, not pushed; SWA-70)
privacy: IDs/roles only; no client data; no secrets; no credential values (presence/length only)
models_used:
  - model: claude-opus-5 / sole builder + hostile reviewer / built F0 seed importer and F2b ingest trigger, ran 13 hostile rounds across two slices, proved both against live Postgres and the live YouTube API / subscription
skills_touched:
  - id: Rule 73 (Proof-Before-Done) / reinforced / held — no completion claim shipped without current-session evidence; the live-API probe was what converted "tests pass" into proof
  - id: handoff trap 5.4 (tests do not type-check) / re-violated, now bound to a command / a written trap had been quoted at session start and violated later in the same session
  - id: handoff trap 5.3 (green either side of an untested seam) / fourth recurrence / promoted to its own numbered hostile round rather than a remembered caution
  - id: SwanGuard handoff §1b F2b instruction / corrected / it named the right intent and the wrong home; following it verbatim broke a passing baseline test
---

# A written trap is not a control

## The lesson

**Documenting a failure mode does not prevent it. Only a mechanical check, bound to the moment
of the claim, prevents it.**

This is not a hypothesis. It is the measured result of two slices built by an agent who had
read the trap list at session start and could quote it.

`SWANGUARD-MAKE-IT-USABLE-HANDOFF-2026-08-20.md` §5.4 says: *"Tests do not type-check. A new
test broke the build while vitest ran 55/55 green."* The handoff itself notes that this trap
"is documented in the handoff that preceded this one, and was walked into one turn after
quoting it."

I read that sentence at the start of the session. I quoted it. Then, in F2b, I ran 19 green
route tests, was satisfied, and shipped two type errors — a missing required `isLive` field on
a test double and a hand-written structural type. The type-check caught them; the tests never
would have.

That is the same trap, documented, quoted, and re-walked, by **two different agents in
consecutive sessions**, one of whom (me) re-walked it in the same session in which they had
already cited it.

The neighbouring trap, 5.3 (*"green either side of an untested seam"*), was already recorded as
recurring "three sessions running, in different shapes." F2b made it four: every route test
injected its own runner, so `createCreatorIngestRunnerFromEnv` — the factory the production
runtime actually calls — was the single uncovered path. A wiring error there would have made
the feature permanently 503 in production while every test stayed green.

## What actually works instead

Not "remember trap 5.4." The correction that survives is procedural and mechanical:

| Instead of | Do |
|---|---|
| "Remember that tests don't type-check" | Run type-check in the **same command** as the tests. `npm test && npm run type-check`. The claim and the check are then inseparable. |
| "Remember to test the seam" | Make **"test the path production actually takes"** its own numbered hostile round. Not a caution — a round with a checkbox. |
| "Be careful with inherited instructions" | Before adding to a list or config, read what it is verified **against**. One grep, before the edit, not after the red. |
| "Watch out for silently-skipped live tests" | Print what came back. A live test that returns real video titles, real durations and real publish dates cannot have skipped. |

The general form: **a correction phrased as a resolution ("I'll be more careful") predicts
nothing; a correction phrased as a command that runs at the moment of the claim predicts the
outcome.** When writing up a failure, the write-up is not the fix — the fix is the command the
next agent will actually type.

## The corollary for handoff authors

Trap lists are still worth writing — they are how the next agent knows what to attack. But an
author should assume the list will be **read and then violated**, and should therefore encode
the highest-cost traps as *commands and gates*, not prose. The traps that stopped costing time
in this session were the ones that had become commands (`npm run qa:secrets`, the DRY-LOOP Stop
hook, the pre-commit scan). The traps that kept costing time were the ones that were only
sentences.

## A second durable pattern, from F2b's design

**Absence is a stronger control than validation.** F2b's ingest route deliberately has no
`itemsPerCreator` field — not validated, not clamped, *absent*. A field that does not exist
cannot be validated incorrectly by a future edit, and cannot be honoured by a refactor that
"cleans up" the validation. The catalog's two largest channels carry ~24k videos each, so a
caller-supplied ceiling is a quota bomb with a polite name.

This mirrors the same repo's existing law: the creator routes accept no `actor` field at all —
"not as an ignored one, but as an absent one, so that a future edit cannot quietly start
honouring one." **Generalised: when a parameter would be dangerous if trusted, the safe design
is not to sanitise it but to give it nowhere to land.**

And its companion: **refusal beats a tidy zero.** With no credentials, F2b's runner throws 503
rather than returning `{itemsInserted: 0, clean: true}`. "Fetched nothing" and "could not
fetch" are indistinguishable to a reader and mean opposite things. Any system that reports
absence must distinguish *nothing happened* from *nothing could happen*.

## Who did what

Only `claude-opus-5` was involved — sole builder, sole hostile reviewer. No paid seat was
spent, correctly: F0 and F2b were mechanically specified slices where a panel would have added
cost without adding judgement. The judgement calls that mattered (which columns an upsert may
touch, whether a cap may be caller-supplied, where a schema check belongs) were resolvable from
the repo's own existing law and its migration files.

The agent was also **wrong three times** in ways worth attributing: it shipped type errors
behind green tests, nearly left the production wiring path uncovered, and began implementing an
inherited instruction before checking its premise. The prior session's agent was wrong in a
related way — it wrote the F2b instruction that named the wrong home for the schema check.
Neither error was caused by lack of care; both were caused by trusting a written statement
(a trap list, a handoff line) in place of a check.

## Skills created or changed

- **Rule 73 (Proof-Before-Done)** — held, and earned its keep. The live-API probe that printed
  real video titles is what converted "the live test passed in 860ms" into actual proof. Under
  the old habit, a suspiciously fast pass would have shipped as green.
- **Trap 5.4 → a command.** Recorded in the handoff as a bound command rather than a caution.
- **Trap 5.3 → a numbered hostile round.** "Test the path production actually takes" is now a
  round, which is what surfaced the uncovered runtime factory.
- **SwanGuard handoff §1b** — the F2b schema-check instruction corrected in place, with the
  reason recorded so the next reader learns the distinction (baseline-scoped list vs
  per-migration check) rather than just the outcome.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Documented before recurring? | What finally stopped it |
|---|---|---|---|
| Green tests treated as sufficient evidence | 1 | **YES** — quoted by me at session start; violated by the previous agent too | Type-check chained into the same command as the tests |
| Untested seam / untested production path | 1 (4th across sessions) | **YES** — recorded as "three sessions running" | Promoted to its own numbered hostile round |
| Trusting a tool's report without validating the instrument | 2 (vite-node argv assumption; `cmd \| tail` reporting tail's exit code) | **YES** — trap 5.1 | "Exit 0 with no output is a failure signal"; `PIPESTATUS` when claiming an exit code |
| Acting on an inherited instruction before checking its premise | 1 | no | Read what a list is verified against, before editing it |

Three of four classes were documented **before** they recurred. That ratio is the whole finding:
the documentation was not the missing ingredient.

## External-model calibration

No external model consulted; no paid spend on either slice. Recorded so the routing table
learns the negative case too: **mechanically-specified implementation slices with an existing
in-repo law to follow do not need a panel.** The panel earns its cost where judgement is
contested, not where the constraint is already written down in a migration file.
