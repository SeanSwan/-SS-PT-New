---
packet_id: 20260821-a-clean-tree-makes-stash-pop-a-loaded-gun
title: A clean tree makes stash-pop a loaded gun
date: 2026-08-21
originating_model: claude-opus-5
tier_basis: "Sean's explicit designation 2026-08-10 - Opus 5 is Fable-tier; claude-opus-5 is on the Rule 68 tier_allowlist. Provenance is first-hand: authored by the running session model, not relayed."
surface: user-dashboard, social-feed, frontend design guards, git hygiene
decision: A command whose safety depends on a precondition must re-check that precondition every time, because the technique that was safe three times in a row is the one you stop checking.
status: shipped
supersedes: none
privacy: IDs, roles and code identifiers only; no PII, no credentials, no client data
models_used:
  - model: claude-opus-5
    role: sole builder and hostile reviewer; continued a written handoff from a prior session
    did: implemented Waves 2-3 of the User Dashboard trust repair (shared before/after slider hook, removed an unreachable upload affordance, role-aware workout routing, removed a pre-filter truncation, flipped the profile rail to opt-in), converted a source-text contract test to behavioural, ran nine hostile rounds, and recovered a git-stash accident
    cost: subscription
  - model: x-ai/grok-4.6
    role: hostile review seat (panel)
    did: caught that onPointerLeave was undoing pointer capture (a mid-drag freeze no test covered) and that the sidebar policy contradicted its own rationale; 4 of 7 findings real
    cost: ~$0.09
  - model: moonshotai/kimi-k3
    role: hostile review seat (panel)
    did: independently caught the sidebar policy/rationale inversion; 2 of 4 findings real
    cost: ~$0.04 (of a $0.148 panel)
  - model: glm-5.3
    role: hostile review seat (panel)
    did: caught copy asserting a count the code cannot know, and missing pointercancel/dragstart guards; 3 of 8 findings real
    cost: $0 (Z.ai subscription)
skills_touched:
  - id: review-packet-is-a-test-fixture
    change: proposed
    motivating_failure: labelled a trimmed excerpt "full source", omitted a defined function, and showed before-CSS while asserting after-CSS - manufacturing three P1 false positives across three paid seats
  - id: feedback_validate_probe_before_absence_claim
    change: reinforced - violated six more times in one session, in six different disguises
    motivating_failure: read a wrapper exit code as the command's (x3), trusted grep output from a nonexistent path, matched a pattern against a comment just written, and published a viewport model that was never validated
  - id: git-baseline-without-stash
    change: proposed
    motivating_failure: git stash -u on a clean tree stashed nothing, so git stash pop restored an unrelated stash belonging to another workstream and produced merge conflicts in four untouched files
  - id: token-conversion-surface-check
    change: proposed
    motivating_failure: mechanically converting raw hexes to semantic tokens put theme-dependent text on fixed black scrims, which would have rendered dark-on-dark under the one light theme
---

## The lesson - a precondition you stop checking is not a precondition

The pattern `git stash -u` then measure then `git stash pop` is a decent way to
compare against HEAD, and it worked three times in this session. Each time the
working tree was dirty. The fourth time it was clean.

`git stash` on a clean tree **stashes nothing and does not fail.** It reports that
there are no local changes and exits 0. The following `pop` then reaches for
`stash@{0}` - whatever that happens to be. In a repo where several parallel
workstreams have parked WIP, `stash@{0}` was a stranger's trial merge. It landed
as `UU` conflicts across four files with no relationship to the task.

Nothing was lost, for a reason worth knowing: **a conflicted `git stash pop` does
not drop the stash.** Recovery was `git checkout HEAD --` on the four paths, and
the stash list came back identical. But that recovery was a property of the
mechanism, not of the plan. Had the pop applied cleanly, it would have silently
mixed a stranger's changes into my slice and I might have committed them.

The durable form is not "be careful with stash." It is:

> To read a file as it was at another commit, use `git show <ref>:<path>`.
> To run a whole suite against another commit, use a scratch worktree.
> Never use stash/pop to time-travel - its behaviour depends on state you did not
> assert.

That rule is executable. "Check whether the tree is dirty first" is not, because
the entire failure mode is that you stop checking.

## The second lesson - a lint rule can be satisfied and still make the product worse

CLAUDE.md Rule 6 requires `var(--token, #fallback)` instead of raw hex, and a
pre-commit guard enforces it mechanically across every **whole staged file**.
Touching three styled-components in an 877-line file therefore required converting
31 pre-existing literals I had no other reason to touch.

That conversion is mechanical right up to the point where it is not. Four of those
literals were white text sitting on a **fixed** surface - an `rgba(0, 0, 0, 0.6)`
photo scrim and two accent gradients. Mapping them to `--text-primary` is
semantically wrong: that token means "text on the page background". It resolves
near-white in fifteen themes and to `#0B1726` under `crystalline-light`. Dark text
on a black scrim. A WCAG failure, invisible in the default theme, and no test
catches it because no test renders that theme.

The check that catches this is one question per converted line: **what is this
text sitting on, and does that surface change with the theme?**

- Page or card background: semantic token (`--text-primary`, `--text-muted`).
- Accent-coloured surface: `--text-on-accent`, which themeUtils computes for
  readability against the accent.
- A fixed scrim or overlay that never themes: keep the literal, and justify it
  with the guard's own `swan-guard-allow-hex` escape.

The escape hatch exists precisely for the third case. Reaching for a semantic token
*because the guard demanded a token* is how a compliance pass ships a defect.

## Who did what

`claude-opus-5` built all of it, ran nine self-hostile rounds, and recovered the
stash accident. After Sean approved the spend, a **GLM 5.3 + Kimi K3 + Grok 4.6**
panel reviewed the shipped result and all three returned REVISE; four of their
findings were real and were fixed in a follow-up commit. Scoring and the lesson
about my own packet are in the calibration section below.

The prior session's **handoff document** deserves attribution as a participant, and
as a cautionary one. It was genuinely excellent - it named three environment traps
that would each have cost an hour, and it was right about all three. It was also
**wrong in two checkable places**:

1. It stated that no global role resolver exists, and that it had searched. One
   does: `getLogWorkoutDashboardPath` in `swanCoachDashboardRoute.ts`, already
   handling admin, trainer and client. Acting on the handoff would have meant
   hand-rolling a duplicate resolver beside the real one.
2. It predicted which test the layout change would break
   (`UserDashboardDailyLoop.contract.test.ts:661`). A different test broke, because
   I removed the outer rail rather than editing Home's inner grid - a solution the
   handoff had not considered.

Neither error was careless. Both are the ordinary decay of a hypothesis written
before the work. The lesson for Hermes is about *how to consume a handoff*: treat
its traps as gifts and its **load-bearing claims as hypotheses**. A claim of the
form "X does not exist, I searched" is the single highest-value thing to re-verify,
because it is the one that licenses you to build a duplicate.

## Skills created or changed

- **`git-baseline-without-stash` (proposed).** Encode the executable form above.
  Motivated by the stash-pop accident: three safe uses trained the habit, and the
  fourth call had a different precondition.
- **`token-conversion-surface-check` (proposed).** The three-way surface question
  before mapping any colour literal to a semantic token. Motivated by the
  `crystalline-light` contrast bug, which passed lint, tests, typecheck, build and
  the design guard.
- **`feedback_validate_probe_before_absence_claim` (reinforced, not amended).** The
  memory already exists and is correct. It was violated six more times here. See
  the ledger - the repeat count is the point, not the restatement.

## Mistakes I made

- Popped an unrelated stash by running `git stash -u` on a clean tree, detailed above.
- Read a wrapper's exit status as the command's, **three times**. Writing
  `cmd > out 2>&1; echo "EXIT=$?"` in a backgrounded shell reports the echo's
  status, not the command's. Once I announced a clean `vite build` that had actually
  failed with `UNRESOLVED_ENTRY`, because `npx` had fetched vite 8.2.2 from cache
  instead of the repo's local 6.4.3.
- Trusted a residual-reference grep that printed "NONE" because a `cd` had drifted
  to the repo root and the file did not exist at that path.
- Grepped for a `slice(0, 6)` cap and matched the comment I had just written
  explaining its removal, then reported "STILL CAPPED" on correct code.
- Published a viewport width table computed from a model I had not validated. It
  applied a 300px rail at 320px, where the CSS collapses it at 1024px and below. I
  caught it because the output was absurd (a 0px content column), not because I
  checked the model against the stylesheet first.
- Miscounted the test delta and briefly chased a phantom two-test regression that
  turned out to be a stale figure captured before I appended two tests.
- Introduced the contrast bug described above while satisfying a lint rule.
- Nearly duplicated an existing role resolver on the handoff's say-so.

## Error to fix to repeat ledger

| Error class | Times this session | Previously written up? | What actually stopped it |
|---|---|---|---|
| Believed a probe instead of validating it: wrapper exit codes, missing-path grep, self-matching grep, unvalidated width model, stale test count | **6** | **Yes** - `feedback_validate_probe_before_absence_claim` exists and was in context the whole time | Nothing yet. It recurred in six distinct disguises *after* the general lesson was already recorded. The general form appears unlearnable; only per-shape executable steps work - write the real status into the output file and grep for it, `test -f` before believing a no-matches result, exclude comments when grepping for code. |
| Command safe-by-precondition, reused after the precondition changed (stash/pop) | 1 | No | `git show <ref>:<path>` or a scratch worktree; never stash to time-travel |
| A compliance pass introducing a defect (hex to token on a fixed surface) | 1 | No | The three-way surface question before each conversion |
| Repeated an upstream claim without verifying it (the handoff's missing role resolver) | 1 | Partially - STALE-CHECK covers re-verifying *blockers*, not *absence claims that license new code* | Extend STALE-CHECK: an "X does not exist" claim gets verified before the replacement is built |

The first row is the one Hermes should weight most heavily. That lesson **was
already written down, was in context, and was violated six times in a single
session.** That is proof the write-up was not a fix. A caution phrased as an
attitude - "validate your instrument" - cannot be executed at any particular
moment; the correction that survives contact is always a specific command run at a
specific point. This packet's own second lesson is at risk of exactly the same fate
unless it stays in its executable form.

## External-model calibration

The GLM 5.3 + Kimi K3 + Grok 4.6 panel ran after this work shipped, at an actual
**$0.148** (I had quoted "~$0.10" from the previous wave - the estimate scales with
packet size, so quote it from a `--dry-run`, never from memory). All three returned
REVISE. Scored against verification:

| Seat | Real findings | False positives | Notable |
|---|---|---|---|
| Grok 4.6 | 4 of 7 | 3 | Only seat to catch that `pointerleave` was undoing pointer capture - a genuine mid-drag freeze no test covered |
| Kimi K3 | 2 of 4 | 2 | Caught the policy/rationale inversion independently of Grok |
| GLM 5.3 | 3 of 8 | 5 | Broadest sweep; most speculative; caught the copy asserting a count it could not know |

**The finding worth the whole fee:** two seats independently noticed that
`shouldShowProfileSidebar` did the **opposite of the rationale written directly above
it**. An exclusion Set hands the rail to every tab nobody has considered yet; the prose
beside it claimed the reverse. I wrote both the prose and the code in the same sitting
and did not notice, across nine hostile rounds, because I kept re-reading the *comment*
as if it were the *behaviour*. That is a specific and durable blind spot: **prose you
authored yourself reads as verified.** An outside reader has no such prior.

**The cost of a sloppy packet.** Three of the P1s across the panel were false positives
I manufactured. I labelled a trimmed excerpt "full source of the new file"; it omitted
`setPosition`, so two seats concluded the shipped file could not compile and discounted
everything else in that section. I showed the *before* CSS for a container and asserted
the *after*, so a seat correctly refused to believe the layout was overlaid. I showed one
line of a guard without the two declarations that give its variables meaning, so a seat
proved it unsatisfiable. Every one of those was my evidence failing, not their reasoning.

The rule that follows: **a review packet is a test fixture, and trimming it is mutating
the fixture.** Paste whole files or say plainly "excerpt - full file at `<path>@<sha>`".
A packet that misrepresents the code buys confident answers about code that does not
exist, and the reviewer spends its budget there instead of on the real defects.

**Self-review is not a substitute, and neither is the panel.** My nine rounds found six
defects; the panel found four more that all nine had missed, and every one of those four
was in reasoning I could not see from inside - my own rationale, my own assumption that
capture "just works", my own copy. Conversely the panel could not see the destination
pages, the sibling declarations, or the real hook. The two are complementary, and the
panel is cheap enough that skipping it is never the economical choice.
