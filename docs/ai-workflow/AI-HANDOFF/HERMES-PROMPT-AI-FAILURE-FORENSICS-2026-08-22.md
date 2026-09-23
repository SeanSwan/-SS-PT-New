# Prompt for Hermes — AI failure forensics → new CLAUDE.md / AGENTS.md protocol

**Paste everything below the line into Hermes.**

---

Hermes — I need a two-stage job from you. Stage 1 is yours alone. Stage 2 is a panel you brief.

## Background

Every AI agent I run — Claude, Codex, GLM, Kimi, Grok, DeepSeek, Sol, Gemini, Qwen — makes the
same *kinds* of mistakes over and over on SwanStudios. I have been catching them one at a time
and writing each one down as it happens. You are holding all of those write-ups: the learning
corpus (`docs/ai-workflow/hermes-learning-packets/`, 160+ durable lessons), the inbox memos
(`.ai-workflow/hermes-inbox/`), and the handoff/panel records in
`docs/ai-workflow/AI-HANDOFF/`.

I am going to completely refactor `CLAUDE.md` and `AGENTS.md`. Those files already carry ~80
numbered rules and a lot of hard-won protocol. They are not empty — but they were written
*reactively*, one incident at a time, and I think that means they are shaped wrong. I want them
rebuilt from evidence about **how AI agents actually fail**, not from the order in which I
happened to notice things.

## STAGE 1 — your report (do this first, alone)

Read everything you hold and produce a **comprehensive AI failure forensics report**. Not a
summary of what was built. A forensic account of **what the AI got wrong, why, and where.**

Structure it around these questions:

**1. Taxonomy.** What are the actual *classes* of failure? Not incidents — classes. Merge
incidents that look different but share a mechanism. For each class: the mechanism, how often
it recurred, which models did it, and what it cost.

**2. Recurrence.** Which lessons were **written down and then repeated anyway?** This is the
highest-signal thing you hold. A lesson documented and then re-committed proves the write-up
was not a fix. Name them and count the repeats.

**3. Detection.** For each failure class — what actually caught it? A human, a test, a hostile
reviewer, a hook, luck? And critically: **what class is currently caught by nothing?**

**4. The fix that worked vs the fix that didn't.** Across the corpus, distinguish corrections
that *stuck* from ones that didn't. My read is that procedural fixes ("run this command before
committing") survive and resolutional ones ("be more careful") never do — test that against
the evidence and tell me if I'm wrong.

**5. Model-specific patterns.** Which models fail in which ways? Which are reliable on
architecture but unreliable on facts? Which produce confident false claims? Include cost.

**6. Where the current rules FAILED.** `CLAUDE.md` has ~80 rules and hooks that fire every
turn. Failures still got through. **For each major incident: was there a rule that should have
caught it, and why didn't it?** Categories I expect: no rule existed · a rule existed but was
unenforceable prose · a rule existed and had a hook but the hook's condition was too narrow ·
the rule existed and was simply ignored. **Be specific and name rule numbers.**

**7. The gaps I have not noticed.** You hold more history than I do. What is failing that I
have never written down because I never caught it?

Be blunt. Do not protect any model, including yourself. Do not soften my own mistakes — I set
several of these traps myself with rules that sounded right and did nothing.

## STAGE 2 — the panel

Take your Stage 1 report and send it to **all** of these, each independently:

- **GLM 5.3**
- **Grok 4.6**
- **Kimi K3**
- **HY3**
- **DeepSeek V4 / DeepSeek V4 Pro**
- **Gemini 3.1 Pro**
- **GPT-5.6 Sol Pro**

Give each one this remit:

> You are reading a forensic report on how AI coding agents repeatedly fail on a production
> personal-training SaaS. The owner is about to completely refactor the two files that govern
> every agent working on it — `CLAUDE.md` and `AGENTS.md` — using this evidence.
>
> Produce two things.
>
> **(A) Defense.** Given these failure classes, what would actually defend this system? Rank by
> what stops the most damage per unit of effort. Say plainly which of these need to be
> *mechanical* (a hook, a test, a gate, a script that refuses) versus *procedural* (a step in a
> workflow) — and be ruthless about the fact that a rule which only asks an agent to be careful
> is not a defense at all. Several rules in this system are already exactly that.
>
> **(B) The rewrite.** Concrete, specific contributions to a new `CLAUDE.md` and `AGENTS.md`:
> new rules, rules that should be **deleted** or **merged**, protocol changes, workflow changes,
> skills worth building, hooks worth adding, and how the whole thing should be *structured* —
> because ~80 numbered rules accreted incident-by-incident is itself a failure mode. An agent
> cannot hold 80 rules in working attention, and rules nobody can hold are rules nobody follows.
>
> Constraints: this is Windows + PowerShell + Node + React/Postgres, with multiple AI agents
> working the same tree concurrently. Proposals must survive that. Say what you would **remove**,
> not only what you would add — a governance file that only grows is one nobody reads.
>
> Where you disagree with the report's own conclusions, say so and say why.

## STAGE 3 — synthesize

When they come back, produce a **final consolidated recommendation**:

- Where all seats agree → treat as settled, list first.
- Where they contradict each other → surface the disagreement explicitly, do not average it
  away. The disagreements are where the real decisions are.
- Anything a single seat saw that the others missed → flag it as such; in my experience those
  are often the best findings.
- **Rank everything by damage-prevented per effort**, and mark each item **mechanical** or
  **procedural**.
- Give me a concrete proposed structure for the new `CLAUDE.md` and `AGENTS.md`, including what
  gets cut.

## Rules for this job

- **Privacy:** IDs and roles only. No client names, no PII, no secrets, no absolute paths, and
  no operator usernames — a review packet in this very workstream leaked a Windows username to
  six vendors because a scanner returned a false negative and it was believed. **Validate your
  scanner on a string you know is present before trusting its silence.**
- **Spend:** tell me the estimated cost before you fire the paid seats, and cap it. GLM and
  Gemini are subscription; Sol Pro and Kimi are the expensive ones.
- **Evidence over recall:** every claim about what happened should trace to a packet, memo or
  handoff you can name. If you cannot source it, mark it `[UNVERIFIED]`.
- **Do not fabricate consensus.** If a seat fails or returns empty, say so — one seat in the
  last panel returned an empty response after billing, and reporting that honestly mattered
  more than filling the slot.

Start with Stage 1. Show me the report before you spend anything on the panel.
