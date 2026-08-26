# PANEL PACKET — DID THE DOCTRINE ACTUALLY REACH THE CONSTITUTION FILES?

## READ THIS FIRST — operating conditions

**You CANNOT read files. No repo access, no tools, no fetching.** Everything you need is
here. Do not plan to inspect anything. If a claim here is unverifiable from the packet
alone, say so and reason from what is given.

**Answer the COMPLETE brief.** Every question, every angle. Do not narrow to your
specialty. Do not assume another seat covers something you were also asked.

**Dissent is the highest-value output.** This packet was written by the agent whose work is
under review. Attack it.

**Context:** SwanStudios is a production personal-training SaaS. One human owner (Sean)
directs a fleet of AI agents. The agent operating system is three governance files plus
deterministic hooks:
- `CLAUDE.md` — the constitution, 84 numbered rules (Claude's copy)
- `AGENTS.md` — a near-byte-identical mirror (Codex's copy)
- `SOUL.md` — Hermes's identity file, lives on a separate machine (WSL), **has NO hooks at
  all**, so prose is its entire enforcement surface

---

## PART 1 — WHAT WAS ESTABLISHED (two days of work, all of it verified)

### 1.1 A six-seat panel reached unanimous verdicts on three rules

- **Rule 68** — *"Fable writes a plan so complete a worker-bot executes it verbatim with
  ZERO further questions"* — **FALLS, 6/6.** A plan complete enough to need zero questions
  must be written by someone who already wrote the code in their head; its completeness is
  **asserted, never achieved.** "ZERO further questions" forbids the only correction
  mechanism that exists.
- **Rule 15** — *"NO code without a plan"* — **FALLS AS WRITTEN, 6/6.** The universal
  quantifier prices a typo fix and a billing migration identically. One seat: *"proportionality
  cannot be checked by a drift probe; it is a value wearing a rule number. Renaming is not
  resolution."* Proposed replacement: an explicit **allowlist** (money, auth, data
  migration, PII, outward-facing), which is mechanically checkable.
- **Rule 64** — `grill-me`, a structured interview — **SURVIVES**, because it is an
  **elicitation protocol**: waterfall fails by committing early to a *solution*, the
  interview commits to the *problem definition*. But "exhaustive" and "durable brainstorm
  doc" both fall.

### 1.2 The panel destroyed the author's proposed fix

The author proposed *"keep the interview, kill the blueprint, keep the checks"* — with the
expensive model producing **the acceptance check instead of the plan**. Seats converged:

1. **A wrong check is worse than a wrong plan.** A wrong plan gets *deviated from*, visibly.
   A wrong check gets *satisfied*. Goodhart, mechanically enforced.
2. **Whole classes of work have no check writable in advance** — taste, exploratory
   debugging, integration. There it degrades to a vacuous check, worse than none.
3. *"Who reviews the check? The waterfall didn't die; it changed file extension."*

A better alternative emerged: **plans are RUNTIME artifacts, not repo artifacts.** TTL = one
pipeline run, handed to the worker in-context, never committed. The error was never "an
expensive model writes a plan" — it is *"the plan is persisted and worshipped."*

### 1.3 Then it was MEASURED, and the reasoning held

793 persisted docs × 350,030 transcript lines × 187 sessions. A doc counts as re-read only
if opened >24h after creation (excludes authoring churn). Write-classification is
conservative, so these are **floors**.

| | |
|---|---|
| Re-read >24h after creation | 143 (18.0%) |
| **NEVER touched again** | **405 (51.1%)** |
| Mean post-creation reads | 0.65/doc |

**Split by document class — the decisive cut:**

| class | n | re-read rate | mean/doc |
|---|---|---|---|
| **direction** (vision/decision/ruling/charter) | 21 | **38.1%** | 1.48 |
| handoff/closeout | 50 | 34.0% | 0.64 |
| **blueprint** (plan/spec/slice/phase/roadmap) | 167 | **14.4%** | 0.51 |
| review artifact (audit/panel/debate) | 186 | 14.0% | 0.25 |

**Direction is re-read 2.6× more than blueprints**, effect stable under two independent
classification methods. So: rot is **confirmed for blueprints** (~86% never re-read),
**refuted for direction.** What rots is the *solution* commitment, not the *problem*
definition. Six seats reached that boundary by argument; the transcripts reach it by data.

*(Small-sample caveat: `direction` is n=21. Effect direction is consistent; magnitude is not
precise. Claude transcripts only — other agents' reads are invisible, so all rates are floors.)*

### 1.4 One gate shipped, and the reason matters more than the gate

`npx tsc` fetched a stranger's npm package mid-verification and returned "This is not the
tsc command you are looking for" — exit 1, zero errors, on money-path code about to be
reported verified. Minutes later the real `tsc` OOM'd at exit 134 with zero error lines,
which reads as **clean** if you count only error lines.

A skill named `instrument-check` — *"validate the instrument before believing a negative"* —
already existed, was in context, and **did not fire.** Three instrument-trust near-misses in
one session: **all three caught by reflex, zero by mechanism.** Meanwhile the one class that
HAS a gate (`$?` read after a pipeline) was caught **twice, in seconds** — including once
inside the test harness for the new gate.

---

## PART 2 — THE GAP SEAN FOUND (this is why you are being convened)

Sean asked: *"my goal was to take this ideology and adapt it to my AGENTS.md and my SOUL.md
and my CLAUDE.md. I'm wondering if that even happened here."*

**It did not. Verified by blob hash, not by memory:**

> `CLAUDE.md` and `AGENTS.md` are **byte-identical to `origin/main`.** Untouched by this
> entire workstream. `SOUL.md` lives on another machine and was never opened.

Two days produced: a panel, a synthesis, a measurement, a gate, two learning packets, a
values corpus, five Linear comments — **and zero changes to the three files that actually
govern agent behavior.** The work order's own final instruction was "ship the surviving work
to CLAUDE.md / AGENTS.md / SOUL.md."

### 2.1 Corrected numbers — the previous doctrine doc got its own headline wrong

The handoff that argued "the rulebook is too big" stated `CLAUDE.md` was **988 lines /
164,499 bytes** after a **6.04%** prune. Git disagrees:

| | claimed | actual (git blob) |
|---|---|---|
| size | 164,499 B | **212,236 B** |
| lines | 988 | **1,176** |
| prune | −6.04% | **−4.1%** (221,253 → 212,236) |

**The document arguing the rulebook is oversized understated it by 23%.** The real situation
is worse than the argument for fixing it claimed.

### 2.2 Current true state

| | |
|---|---|
| `CLAUDE.md` | 212,236 B · 1,176 lines · **84 numbered rules** |
| `AGENTS.md` | near-identical mirror (Codex adapter header differs) |
| `SOUL.md` | separate machine, **no hooks — prose is its ONLY enforcement** |
| Skills | **78** (47 `.claude/skills` + 31 `.agents/skills`) |
| Hermes inbox pending | **510** (was 491 two days ago — the backlog GREW while we wrote about draining it) |
| Deterministic hooks | 9 PreToolUse(Bash), 5 Stop, 3 SessionStart, 1 UserPromptSubmit |

One prior seat's ranking, unactioned: *"Do not build CRAP/mutants/dep-checkers next. Drain,
cull skills, stop emission requirements, gate PII/money/auth/payload. Everything else is the
OS generating OS."*

---

# THE QUESTIONS — answer ALL

## Q1 — Should this doctrine go into `CLAUDE.md` / `AGENTS.md` AT ALL?

The doctrine says the rulebook is too long and that prose degrades (48% of documented rules
recurred as errors anyway). **Adding doctrine ABOUT that problem to that file is
self-contradictory on its face.**

- Does any of this belong in those files? If yes, **what exactly, in how many words?**
- If no — where does it live so it actually governs behavior?
- Is there a version of "front-load the constitution" that survives the fact that nobody has
  successfully shortened this file (best attempt: −4.1%)?

## Q2 — Concretely: what edit would you make to `CLAUDE.md`?

Not principles. **The actual diff.** Which rules get deleted, merged, demoted to a gate, or
rewritten — and what replaces Rules 15 and 68 given the panel's verdicts? If your answer is
"delete rule N," say N and say why the deletion is safe.

## Q3 — `SOUL.md` has NO hooks. What follows?

Hermes's identity file cannot be gated; prose is its entire enforcement surface. The
measurement says direction/values content IS re-read (38.1%) while blueprint content is not
(14.4%).

- Does that mean `SOUL.md` should be **only** values/direction, with every procedural
  instruction stripped out and moved to the hooked repo?
- Or does an unhookable agent need MORE procedural prose, not less, because it has nothing
  else?
- These are opposite conclusions from the same data. Which is right, and why?

## Q4 — SKILLS: does Sean need any new ones? (he is skeptical, deliberately)

Sean's own words: *"It says to wait on putting skills [until] you really need them. So I'm
thinking, are there any skills I would need... even though I know we're supposed to hold out
on skills and just make sure to give straightforward values, human values."*

The governing ladder is: **eliminate the failure class architecturally > catch it with a
check > (hesitantly) add a rule or skill > human in the loop.** Skills are the *fallback*
tier. There are already **78**.

- **Name any skill that genuinely clears that bar** — or state plainly that none do.
- Which of the 78 existing skills should be **deleted or merged**? Be specific about
  criteria, since nobody can evaluate 78 by feel.
- `instrument-check` existed, was loaded, and did not fire. **What does that prove about the
  entire skill tier?** Is a skill that does not fire worse than no skill, because it reads as
  coverage?

## Q5 — The inbox grew from 491 to 510 while we wrote about draining it

Writes are hook-guaranteed; reads are guaranteed by nothing. What is the actual fix —
- a drain mechanism,
- deleting the emission requirement,
- or something else?

If the answer is "stop requiring emission," say what is lost and whether that loss matters.

## Q6 — ADVERSARIAL: is this whole workstream net-negative?

Two days produced no change to the governing files, no product code, one gate, and a large
volume of documents — in a repo whose measured pathology is **producing documents nobody
reads** (51.1% never re-read; review artifacts worst at 14.0%).

**Steelman the case that this workstream made things worse**, then say whether you believe
it. If the honest answer is "yes, mostly," say so.

## Q7 — DISSENT (mandatory)

Where is this packet's framing wrong? Name at least one thing. The author has been wrong
twice in two days about work he was confident in — assume there is a third.
