---
title: A documented lesson is not a fix, and a model's rating does not travel across task classes
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 is Fable-tier and may write the durable corpus
reviewed_by: 4 local hostile rounds (one found a genuine self-correction, three found instrument artifacts) + Kimi K3 external review which inverted three of my conclusions
date: 2026-08-14
decision: Corrections that are only written down recur; only procedural corrections hold. And a model rated useless on one task class can be the best input available on another — never generalise the rating.
status: shipped
supersedes: none
privacy: IDs/roles only; no PII, no secrets, no credential values, no absolute paths
models_used:
  - model: claude-opus-5
    role: auditor, hostile reviewer, final synthesis
    did: audited origin/main for built-but-unwired code; verified the speed-to-lead chain end to end; found the systemic activation-debt pattern; ran 4 self-hostile rounds; re-verified every delegated claim by hand; adjudicated the external review
    cost: subscription
  - model: claude-haiku-4-5 (×3, delegated sweeps)
    role: mechanical inventory — backend orphans, frontend dark surfaces, flag census
    did: produced three structured inventories; combined accuracy ~77% (10 of 13 load-bearing claims survived hand-verification). The flag census MISSED the very flag the audit was about (SPEED_TO_LEAD_REPLY_ENABLED) plus 7 others in the same family
    cost: subscription
  - model: moonshotai/kimi-k3
    role: external process/sequencing lens (NOT code review — the code truth was already proven)
    did: inverted my sequencing, my risk-tiering axis, and my systemic fix; found a whole omitted acquisition lever; caught that I had quoted-and-then-contradicted myself
    cost: $0.2543 (612s, effort medium, finish_reason stop, not truncated)
skills_touched:
  - name: feedback_validate_probe_before_absence_claim
    change: proven insufficient as written — needs a procedural form
    why: this memory already names exactly the error I then made THREE times in one session. Knowing the lesson did not prevent it. The failure mode is a shell line that prints its conclusion unconditionally after a command that can fail, so a broken command still "confirms" an answer. The fix that will hold is mechanical (never emit a verdict line in the same statement as the command that produces it), not motivational.
  - name: rule-30 / subagent skepticism
    change: exercised, and quantified
    why: 3 of 13 delegated headline claims were false, including one asserting a live product surface was unrendered when a parent renders it. 77% is a useful working prior for delegated sweep accuracy — high enough to be worth running, far too low to relay unverified.
  - name: hermes-learning-packet / external-model calibration
    change: amended — calibration must record TASK CLASS, not just cost and verdict
    why: the prior handoff recorded "Kimi truncated, least useful here" from a code-validator review, and advised buying a different lens. Read as a general rating it would have led me to skip the single best input of this session.
  - name: rule-34 / forbidden categorical language
    change: exercised, caught by the external reviewer rather than by me
    why: I wrote "zero product risk" about a merge into a production readiness service. My own four hostile rounds did not flag it.
---

# A documented lesson is not a fix

## The situation

Sean asked why the repo keeps accumulating things that are built and not wired up. Auditing
`origin/main` found the pattern is real and systemic — but the durable lessons are about
**how the audit itself failed**, not about the flags.

## Who did what

**Opus 5 (me)** did the code truth and got it right: traced the speed-to-lead chain end to
end (3 call sites, 3 mounts, one flag), found the systemic pattern via commit archaeology,
and ran four self-hostile rounds. One of those rounds produced a genuine correction — I had
called a deliberately disarmed nurture engine "neglected debt" when a build prompt states it
is disarmed on purpose pending CAN-SPAM/GDPR unsubscribe. Good round, real find.

**Opus 5 also got the plan wrong**, and could not see it. I proved the flag was the only
constraint, wrote "more code does not move it," and then scheduled two code slices ahead of
flipping it. Four hostile rounds did not catch this because they were all attacking the
*inventory*, and the error was in the *sequence*.

**Haiku ×3** were the right tool for mechanical breadth and wrong to trust unverified. ~77%
accurate. Most instructive failure: the flag census omitted `SPEED_TO_LEAD_REPLY_ENABLED` —
the single flag the entire audit existed to examine. A delegated census that misses the
subject of the investigation is a reminder that breadth tools have no idea what matters.

**Kimi K3** attacked the plan, which is what no amount of my own effort was going to do. It
quoted my own sentence back at me, found an acquisition lever I had omitted entirely, and
showed that my systemic recommendation was refuted by a table I had built myself.

## Skills created or changed

No new skill. Four existing ones were exercised, and one of them —
`feedback_validate_probe_before_absence_claim` — was proven **insufficient in its current
form**, which is the most useful thing in this packet. See the ledger.

## Mistakes I made

- Scheduled two code slices ahead of the one action I had just proved was the only blocker.
- Omitted PRISM (one-click revertible, 26 days dark, acquisition lever) from my sequence
  entirely, on a product whose weakest link is acquisition.
- Sorted flags by external visibility when the axis that matters for a solo operator is
  reversibility — which made my "safest tier" contain the one genuinely irreversible flip.
- Wrote a systemic recommendation (grow governance) that my own data refuted (3/3 governed
  flags sat dark 26–27 days anyway).
- `rg -rn "X"` — `-r` is `--replace`. Every match rendered as `n`, which read as a component
  literally named `n` rendered as `<n />`. Nearly reported a catastrophic phantom bug.
- A regex parse error printed my "(no hit = dark)" conclusion **anyway**, because the echo was
  in the same statement. The failure would have confirmed the wrong answer.
- A naive mount check produced 25 false orphans; a second aggregator serves them all.
- Counted `it(` lines and reported "13 tests." Running them said 27.
- Said "zero product risk" about a merge into a production readiness service.

## Error → fix → repeat ledger

| Error class | Times this session | Documented before? | What actually stopped it |
|---|---|---|---|
| **Trusting output over exit status** | **4** | **YES — twice over. A memory names it, AND it is codified as MANDATORY Rule 80 "Second-Vantage Verification": _"one tool's failure is NEVER proof something is broken."_** | **Nothing.** Four times, including once *inside the hostile review convened to catch it* — an `rg -c \|\| echo` whose "not found" branch fired on ripgrep's zero-matches exit. The write-up was resolutional; the fix is procedural: never put a verdict line in the same shell statement as the command that produces it. |
| Delegated claim accepted unverified | 0 shipped, 3 caught | Yes (Rule 30) | Hand-verified every load-bearing claim before use |
| Counting instead of executing | 1 | No | Ran the suite; 27 ≠ 13 |
| Categorical risk language | 1 | Yes (Rule 34) | External reviewer, not me |
| Plan-level error invisible to author | 1 | Yes, in the inherited handoff | External lens. Four self-rounds did not touch it. |

**The headline number in this table is the 3.** A lesson that was already written down, in a
memory I had loaded, was violated three times in a single session. That is proof that writing
a lesson down does not fix it. Corrections survive only when they change a *procedure* —
something mechanical that fails loudly — not when they change an *intention*.

## External-model calibration

| Model | Cost | Findings | Real on verification | Verdict |
|---|---|---|---|---|
| Kimi K3 (process/sequencing) | **$0.2543** | ~10 | 6 fully valid, 3 partly, 1 rejected | **Best input of the session.** Inverted three conclusions. |
| Haiku ×3 (mechanical sweeps) | subscription | 13 load-bearing | 10 | Worth running for breadth; never relay unverified |

**The correction that must propagate:** the prior handoff recorded *"Kimi — truncated, least
useful here"* after a **code-validator** review, and advised buying a different lens instead.
On a **plan**, Kimi was the highest-value input available, for a quarter of a dollar, with no
truncation. **A model's rating is task-class-specific.** Record the task class alongside every
calibration figure, or the note becomes a trap for the next agent.

Operational note: the safe `consult-kimi.mjs` (233-line standalone — dry-run default,
`--cap-usd` enforced, preflight correctly reported `model_calls=0`) is the copy in the main
tree. A dangerous 26-line gateway wrapper with the same name exists elsewhere. **Read the copy
you will actually invoke, from the tree you will invoke it in.**

## The transferable lessons

1. **A documented lesson is not a fix — and neither is a MANDATORY rule, if it lives in a file
   the agent does not load.** This is the sharpened form, found late and worth more than the
   original. The "validate the instrument" lesson was not merely a memory: it is codified as
   **Rule 80, Second-Vantage Verification, a HARD GATE** — *"one tool's failure is NEVER proof
   something is broken."* I broke it **four times in one session anyway**, once inside the
   hostile review convened to catch it.
   **Why it did not bind: Rule 80 is in `AGENTS.md` and returns ZERO matches in `CLAUDE.md`.**
   Claude loads CLAUDE.md. The rule was real, mandatory, and invisible.
   Scale, verified on `origin/main` @ `c4a5a396e`: **AGENTS.md carries 74 numbered rules,
   CLAUDE.md carries 66.** Missing from Claude: 75 Trailhead-Truth, 76 Create-With-Context,
   77 Dead-File Quarantine, 78 Workflow Mode Router, 79 Tests Can Encode The Bug,
   80 Second-Vantage Verification, 81 Test-Delta Disclosure, plus the Kimi Hostile-Review Gate.
   They also disagree on the commit gate — CLAUDE.md says Fable, AGENTS.md Rule 46 (amended
   2026-07-26) says Kimi K3. And the repair the session-start hook recommends,
   `sync-agents-mirror.mjs`, writes CLAUDE.md **over** AGENTS.md — it would delete every rule
   in that list.
   So the governing question is not "is this written down?" but **"is it written down in the
   file this agent actually reads?"** A rule in the wrong file is indistinguishable from no
   rule at all — and worse, it makes the corpus *look* complete. See
   `ACTIVATION-DEBT-AUDIT-2026-08-14.md` §0.
2. **A hostile loop run by the author converges on the author's blind spots — and the blind
   spot moves.** Four rounds thoroughly attacked my inventory and never once looked at my
   sequence. When your loop runs dry, buy a different lens; do not run another round.
3. **Governance is not activation.** Making something visible and revertible does not make
   anyone decide. Three fully-governed flags rotted for a month. What is missing is always a
   forcing function, not a dashboard.
4. **Sort risk by reversibility, not visibility.** For a single operator, a user-visible
   one-click-revertible change is safer than an invisible irreversible one.
