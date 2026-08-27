---
name: seat-relay
description: The human-relay desk for every seat Sean drives by hand — Fable, ChatGPT (GPT-5.6 Sol), Codex, and Claude/Opus. Two jobs. (1) FABLE-GATE - Fable is REVIEW-AND-BLUEPRINT ONLY. No agent may spend Fable on build/implementation work. When Fable is genuinely warranted, STOP, hand Sean a paste-ready packet, and wait for him to switch the model himself. (2) RELAY PROMPTS - emit a copy-pasteable hostile-review prompt for whichever seat Sean is about to drive in another window, plus the return format that makes the verdict usable. Triggers - "call Fable", "Fable review", "hostile review", "give me a prompt for ChatGPT", "prompt for Codex", "prompt for Claude", "relay", "/seat-relay", or any moment an agent is about to invoke consult-fable.mjs.
---

# seat-relay — Sean drives the expensive seats by hand

## Why this exists

Sean, 2026-08-26: *"I don't ever want to run Fable to have it do all the work. It comes in only
for the review. That's what I was doing before — letting it do all the work until its review
came — and I was burning so many tokens. Now I'm at 95% Fable maxed out and I haven't got no
hostile reviews and no blueprints. And that's all I want to use Fable for: hostile reviews,
blueprints, mermaids, flowcharts."*

The failure was not one expensive call. It was Fable being the **builder**, so by the time the
review was due there was no budget left to review with. The money went to the cheapest part of
the job (typing code) and starved the most expensive part (judgement).

**The correction is a purpose gate, not a price gate.** `spend-guard` already caps dollars per
call and per topic. It never asks *what the money is for*. This skill does.

---

## Job 1 — the FABLE GATE (hard stop)

### Fable MAY be spent on
- Hostile review of finished work, a plan, a packet, or another model's output
- Blueprints: the ultra-complete **plan document** a worker-bot executes verbatim (Rule 68)
- Mermaid diagrams, flowcharts, architecture drawings, state models
- Final arbitration when panel seats disagree

> **A blueprint is a PLAN, and the word is not a licence.** GPT-5.6 Sol killed the earlier
> wording of this list in hostile review (2026-08-26, blocker B4): "produce an ultra-complete
> blueprint a worker-bot executes verbatim" is a label an agent can attach to a request for
> code, and it satisfied every review-shaped filter. **The moment the ask includes "and write /
> fix / correct / iterate the implementation," it is build work** — no matter what the first
> half of the sentence called it. **Mixed remits are refused outright**, not split.

### Fable MUST NOT be spent on
- Writing implementation code, tests, migrations, styles, or config
- Exploration — file reading, grepping, "go look at X and tell me"
- Drafting docs a cheaper seat can draft (Opus drafts; Fable reviews the draft)
- Iterating a fix until it passes — that is worker-bot work at worker-bot prices
- Anything a hostile pass by Opus plus the free panel would have caught

### The stop procedure (MANDATORY — and now mechanically enforced)

An agent that concludes Fable is warranted does **not** run `consult-fable.mjs`. It stops,
prints the handoff block, and yields the turn. Sean switches the model himself.

**This is a hook, not an honour system.** `scripts/hooks/fable-remit-gate.mjs` (PreToolUse,
Bash) refuses the **first** invocation of `consult-fable.mjs` — and of `consult-panel.mjs` when
`fable` is a named seat — **whatever the `--remit` says**, then mints a random single-use token
bound to that exact command. Only a separate invocation carrying that token proceeds, which is
Sean's explicit override. The gate is **purpose-blind on purpose**: the remit is a string the
caller writes, so filtering it would test vocabulary rather than intent. Rewording does not get
you through, and neither does `--dry-run` (the Fable path does not implement it, so an ignored
flag would bill in full). It **fails closed on exceptions** — note the precision: a regex MISS is not an exception, and the
hook header lists the shapes known to miss. 35 tests in `fable-remit-gate.test.mjs`.

**Know what this gate is, or you will trust it too far.** It is **friction plus an audit trail
against an eager agent — not a wall against a hostile one.** Two hostile reviews on 2026-08-26
proved an earlier, prouder version of this paragraph false: the refusal used to print the approval
token, and a PreToolUse refusal is read by *you*, not by Sean — so the second ask was satisfiable
with no human in it at all. The token now goes to `.ai-workflow/gates/PENDING-FABLE-APPROVAL.txt`
for Sean to read back. You can open that file. **Don't.** Helping yourself to the key is the one
move this whole rule exists to make visible, and it leaves a record either way.

**Do not route around it.** If you find yourself reaching for a wording that might slip past,
that is the exact moment the rule is working — stop and print the block.

```
🛑 FABLE GATE — stopping for you to switch models.

  WHY FABLE:      <one line: the judgement only Fable should make>
  REMIT:          <review | blueprint | diagram | arbitration>
  PACKET:         <path to the file Fable reads>
  READ ALSO:      <0-3 supporting paths, or "nothing else">
  ASK FABLE FOR:  <the exact verdict shape wanted back>
  WHEN DONE:      switch back to Opus and say "Fable is back" — I fold the verdict
                  in with the Ox / GLM / Opus reviews.
```

Rules on the block:
- **The packet must already exist on disk.** Never ask Sean to switch models so Fable can go
  hunting through the repo — that is exploration, which Fable may not be spent on. Write the
  packet first, at Opus prices.
- **One switch, one remit.** Never batch "review this and also design that" — a mixed remit is
  exactly how a review call turns into a build call.
- If the answer is genuinely reachable by Opus plus the free panel (Ox, GLM, Qwen, Codex,
  Gemini), **do not raise the gate at all.** Say so and proceed.

### When Sean says "run Fable" anyway
That is his call and it overrides this skill (standing owner override). Still print the block
so the remit is on the record, then proceed. Never argue twice.

---

## Job 2 — RELAY PROMPTS for the hand-driven seats

Sean runs other models in other windows. ChatGPT (GPT-5.6 Sol) can see the filesystem. Codex
runs in this tree. Claude/Opus runs here. Each is worth a hostile pass, and each needs a prompt
that arrives self-contained — the receiving window has none of this context.

**Standing law (Sean, 2026-08-26):** whenever a review is due, the agent supplies the
paste-prompt *unasked*. Sean should never have to say "write me a prompt for ChatGPT."
Reciprocally: when Sean is working in ChatGPT or Codex, he needs a prompt to bring back *here*
for the Opus/Fable pass. The relay runs both directions.

### The relay-prompt template

Emit inside a fenced block so Sean copies it in one click. Fill every angle bracket.

```
You are running a HOSTILE REVIEW for SwanStudios. Assume the work below is wrong until
you can prove otherwise. Your job is to find what breaks it — not to praise it.

REPO:     C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT
BRANCH:   <branch>
READ:     <absolute path(s) — the packet first, then at most 3 supporting files>
CONTEXT:  <2-4 lines: what was built or decided, and what it must be true of>

ATTACK THESE SPECIFICALLY:
  1. <the weakest claim, named>
  2. <the assumption that was never verified>
  3. <where a house rule could be violated — name the rule>
  4. anything called "done" without current-session proof

HOUSE RULES YOU ARE JUDGING AGAINST (SwanStudios CLAUDE.md):
  - No Material-UI; styled-components only; tokens with fallbacks; no hardcoded colors
  - 44px minimum touch targets; dark-first; WCAG 4.5:1 contrast
  - Max 300 lines per file
  - Zero PII to LLMs — IDs and roles only
  - No "done / fixed / working" without current-session proof and a clean hostile pass
  - Docs and in-app copy describe what the code does NOW, not what is planned

RETURN IN THIS SHAPE — nothing else:
  VERDICT:   APPROVE | REVISE | REJECT
  BLOCKERS:  <numbered; each with file:line and why it fails>
  FINDINGS:  <numbered; severity + file:line + the concrete failure scenario>
  MISSED:    <what the author should have checked and did not>
  ONE THING: <the single highest-value change, if you could make only one>
```

### Per-seat adjustments

| Seat | How Sean drives it | Adjust the prompt by |
|---|---|---|
| **ChatGPT — GPT-5.6 Sol** | his ChatGPT window; **it can read the filesystem** | give absolute Windows paths and tell it to open them itself; ask for `MISSED` explicitly — it is the strongest seat at naming what was never looked at |
| **Codex** | this same tree | give repo-relative paths; tell it to read `CLAUDE.md` first (Rule 46) and to run the Rule 42 backend audit if backend files changed |
| **Claude / Opus** | this window | no relay needed — run the pass inline. The relay form is only for when Sean is *elsewhere* and wants a prompt to bring back here |
| **Fable** | Sean switches the model in this window | use the FABLE GATE block from Job 1, not this template |

### Bringing a verdict back
When Sean pastes a returned verdict, fold it in — never at face value (Rule 30: another model's
finding is a HYPOTHESIS). For each finding: verify against the file, mark it `real` or
`disproven`, and record the tally. That tally is what teaches the routing table which seat is
worth calling for which task class (Rule 69 `## External-model calibration`).

---

## Ordering with the free panel

The relay seats are the expensive end of a chain that starts free. Standing order:

```
Opus builds + runs its own hostile loop   (free, always)
  → free panel: Ox Alpha + GLM + Qwen     (about $0, always available)
    → relay: ChatGPT Sol / Codex          (Sean's subscriptions, hand-driven)
      → FABLE GATE: hostile review        (paid, stop-and-switch, last)
        → Opus folds every verdict, verifies each finding, arbitrates
```

Never invert it. A Fable review of work the free panel would have rejected is money spent
proving something cheap seats already knew.

---

## Anti-patterns
- Auto-invoking `consult-fable.mjs` because the work "feels important." Importance is not the
  gate; **remit** is.
- Handing Sean a switch request with no packet on disk — that makes Fable do discovery.
- A relay prompt that says "review the recent changes" without naming files. The receiving
  window has no history; a vague prompt returns vague findings.
- Relaying a returned verdict to Sean as fact before verifying it.
