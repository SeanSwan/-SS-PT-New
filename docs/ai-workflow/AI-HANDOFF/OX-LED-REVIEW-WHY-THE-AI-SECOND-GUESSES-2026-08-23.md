# Sean's question: why does my AI second-guess instead of just coding it right?

**Panel:** ox-alpha **LEADS**. GLM 5.3, Grok 4.6, DeepSeek V4 Pro advise. Two rounds —
round 2 gives ox every round-1 reply as context so it can revise its own ruling.
**Prepared by:** vs-claude (claude-opus-5), 2026-08-23. **Repo:** SwanStudios (SS-PT).

---

## 1. The complaint, in the owner's words

> *"I expect when I use my AI, it's supposed to just go ahead and code and get it right
> and not have so many errors. I've been having so many errors, and I'm like, wow — is
> it really just Opus 5? Because I know Opus 4.8 sucked. And now here we go, I'm seeing
> a lot of second-guessing and not being sure."*

He is not asking for a better rulebook. **He is asking why the work is slow, hedged, and
error-prone, and what to change so it stops.** He framed the review he wants as:
*"How am I gonna help this guy out? How are we gonna make this better? How are we gonna
make this more streamlined?"*

Answer that question. Do not optimise the governance system for its own sake.

## 2. THE EVIDENCE HE IS REACTING TO — this session, measured

One working session, one agent (claude-opus-5), roughly a full day:

```
11 commits
 0 files touched under frontend/ or backend/
```

Every commit was a guard, a test for a guard, a fix to a guard, a panel result, or a
learning packet **about** guards. Not one line of product code. The commit list:

| | |
|---|---|
| `d3d9e2ede` | drift-check 8 — hook provenance |
| `35a886bf5` | commit 3 hook registrations that existed in one tree |
| `928cde174` | wire lane-staged guard into pre-commit |
| `4d0971e74` | tests for that guard + a bug it exposed |
| `f78a88fdf` | drift-check 9 — rule-count drift |
| `28125d082` | fix: absent input read as clean (twice, same session) |
| `d650f4c2d` | fix: hung subprocess in the guard just wired |
| `0b99453ed` | learning packet |
| `3e0f5d786` | panel brief + 4 free seats |
| `32a6939f9` | learning packet |
| `947aeafd0` | panel — 6 paid seats |

**This is the artifact to review.** Sean pays for an agent to build a personal-training
SaaS. It spent a day building machinery to police itself, and produced a genuinely
useful compliance finding along the way — but shipped no product.

## 3. The apparatus, measured

| | |
|---|---|
| `CLAUDE.md` | 164,499 bytes ≈ 49k tokens, **73 numbered MANDATORY rules** |
| `AGENTS.md` | 169,319 bytes — 45-line Codex adapter + a near-copy of the same body (2 lines diverged) |
| Hooks registered on this branch | **14** — 7 of them undocumented |
| **Hooks that fire at the END of every substantial turn** | **5** |

Those five Stop-gates: `hermes-closeout-gate`, `dry-loop-gate`, `linear-sync-gate`,
`dual-tier-gate`, `backup-after-work`. Each can **block the agent from finishing** and
demand another artifact — a memo, a learning packet, a Linear update, a dual-tier
summary, a dry-loop ledger, a PROOF line.

In this session those gates fired repeatedly and each time produced more writing about
the work rather than more work.

## 4. THE HYPOTHESIS TO TEST — be ruthless

**The governance system may now be the primary cause of the behaviour it was built to
prevent.**

Consider, and reject if the evidence does not support it:
- An agent carrying 73 rules and 5 blocking end-of-turn gates has a large fraction of
  its attention on **not being caught** rather than on solving the problem.
- Hedging language, confidence tags, and constant self-correction are exactly what a
  system optimised for auditability produces. Sean reads this as *"not being sure."*
- Every incident spawns a new rule or gate; nothing is ever retired. The apparatus only
  grows. **Nothing measures whether a gate ever prevented a real defect**, and nothing
  at all counts wrongful blocks.
- The corpus that justifies all of it (2,546 self-reported issues) is **self-reported by
  the same agents the rules govern** — so the more the agent confesses, the more rules
  it earns, which is a feedback loop with no damping.

**The competing hypothesis, which you must also weigh:** the gates are load-bearing and
Sean's error rate would be far worse without them. This session's own gates caught a
dead PII rule, three uncommitted safety hooks, and a live compliance gap on `main`.
Removing them could be catastrophic. **Say which hypothesis the evidence supports, and
how you would tell the difference.**

## 5. Is it the model?

Sean asks directly whether this is an Opus 5 problem. Address it honestly. Relevant:
Opus 4.8 preceded it; the same governance apparatus was built up under both. Separate
**model capability** from **operating-environment design** — and say what evidence
would distinguish them, because Sean deserves a real answer rather than a diplomatic one.

## 6. DELIVERABLES

**A. `CLAUDE.md` — what changes.** Concrete. Which of the 73 rules survive as
always-loaded, which become on-trigger, which are retired to reference, which are
deleted outright. Name rule numbers. If the answer is "cut it to N KB and here is what
stays," say so with the list.

**B. `AGENTS.md` — what it is for.** It is a near-duplicate that has already drifted.
Keep, symlink, delete, or reduce to the 45-line adapter plus a pointer? Note: Claude
reads `CLAUDE.md`, Codex reads `AGENTS.md` — one reader per file, no double-loading.

**C. `SOUL.md` — DOES NOT EXIST.** Sean keeps naming it as a file to update. Nobody has
defined it. Decide: what is it *for*, what goes in it, or should it not exist at all
(one prior seat argued it invites unmeasurable lore and violates the small-boot goal)?
**Give Sean a straight answer, and if you recommend creating it, give him the actual
content.**

**D. THE SKILL.** Sean asked for a skill to be created, or to be told exactly what to
do. Specify one loadable skill that makes the agent *code well and hedge less* — its
trigger, what it loads, what it forbids, and how it differs from the rules already
present. If a skill is the wrong instrument here, say that instead and name the right one.

**E. THE GATE VERDICT.** For each of the 14 hooks, and especially the 5 Stop-gates:
**keep / merge / retire.** A gate that has never demonstrably prevented a real defect is
a tax. Say which ones you would remove **today**, and what breaks if you do.

**F. STREAMLINE.** What does a good turn look like end to end? What should the agent do
first, what should it stop doing entirely, and what would Sean *notice* being different
next week?

## 7. Where our evidence is weak — audit before you reason

A previous panel on this programme had **7 of 7 seats echo a false premise** stated
confidently in the brief. Two later panels avoided that only because a section like this
existed. Use it.

1. **"11 commits, 0 product files" is one session, one agent, and it was a session
   explicitly tasked with mechanism work.** It is suggestive, not proof of a systemic
   ratio. A fair test needs several sessions across different task types.
2. **The 2,546-issue corpus is self-reported and survivorship-biased.** It contains the
   mistakes agents *noticed and chose to write down*. Silent wrong output is
   structurally absent. Also: the machine extract covers **only the 528 memos**, not the
   84 learning packets, so every error-class ranking derives from 35.5% of the record.
3. **Zero false-positive telemetry exists.** Nothing counts wrongful blocks. Any claim
   that a gate is "worth it" — mine included — is unfalsifiable today.
4. **Rule count is 73 on this branch, 83 on the tracking issue.** This branch is 2,209
   commits behind `origin/main`. Anything measured here may differ there.
5. **The hedging Sean dislikes may be correct behaviour.** This session's self-doubt
   produced real catches: a dead phone-number rule in the PII gate, three safety hooks
   in no commit, a compliance gap on `main`. **Confidence and correctness are not the
   same axis, and Sean is asking for one while paying for the other.** Do not tell him
   what he wants to hear.
6. **I am the agent under review, and I wrote this brief.** Treat my framing as an
   interested party's account. If the framing itself is the problem, say so.

## 8. Round structure

- **ROUND 1** — all four seats answer independently. ox-alpha's is the lead ruling.
- **ROUND 2** — ox-alpha receives all four round-1 replies and revises: what it got
  wrong, what the advisors got wrong, and the final decision on A–F.

## 9. Output contract

Lead with **PREMISE AUDIT** — what in §1–§6 you reject. Then A–F, numbered. Then
**CONFIDENCE** — what you could not verify and what evidence settles it.

Concrete over comprehensive. Sean should be able to hand your answer to a worker-bot and
get a changed `CLAUDE.md` with no further questions. Name rule numbers, file paths,
token counts, and hook filenames.

**Binding constraints** (do not propose violating these): no Material-UI; Victory for
charts; dark-first `crystalline-dark`; `var(--token, #fallback)` colours; Dual-Button
Glow; WCAG 4.5:1; 44px touch targets; ≤300 lines per file; zero PII to LLMs;
"stretching"/"flexibility" never "yoga"/"meditation"; "26+ years experience,
NASM-protocol" and never "NASM-certified".
