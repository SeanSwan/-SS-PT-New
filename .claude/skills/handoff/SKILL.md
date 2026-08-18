---
name: handoff
description: The session-transfer gate. Fires on ANY phrasing about handing work to another agent or session — "handoff", "hand this off", "we're gonna need to hand this off", "pass this to the next agent", "this chat is getting long", "continue in a new chat", "write it up for the next one". Captures every critical fact from the ENTIRE conversation (beginning to end, not just the recent turns) into one self-contained document the next agent can start from cold. Then does the part Sean should never have to ask for — analyzes his vision for GAPS, proposes features, options, and logic he did not think of, and grills him on those proposals so his answers land in the handoff too. When unsure whether a handoff was meant, ASK in one line rather than guessing.
---

# Handoff

**Role:** session-transfer gate. A long chat holds context that dies with it. This skill moves that context — *all* of it, not the tail — into a document the next agent starts from, and uses the transfer moment as the one natural checkpoint to look at Sean's vision as a whole and say what is missing.

> Sean, 2026-08-17: *"I'm tired of saying this. I tell this to every agent."* — Everything he used to say after the words "we're gonna need to hand this off" is now this skill's job. He says the trigger; the skill does the rest without being told.

---

## 1. Triggers — deliberately wide

Fire on **any** of these, and on anything that means the same thing:

- "handoff", "hand off", "hand this off", "handoff report", `/handoff`
- "we're gonna need to hand this off", "hand this to the next agent"
- "this chat is getting long", "this chat is too long", "we're running out of context"
- "continue in a new chat / fresh session", "start a new agent on this"
- "write this up for the next one", "so they can pick up where we left off"
- "make sure the next agent knows everything"

**When unsure, ask — one line, then stop.** Do not guess a handoff into existence, and do not silently skip one:

> "Did you want a full handoff for the next agent on this?"

A one-line question costs nothing. A missed handoff costs the whole session's context; an unwanted one costs a long document nobody reads.

**Not a trigger:** "hand me that file", "off-hand", or handing off between *people* rather than agents/sessions. Read the sentence, not the substring.

---

## 2. The law: the WHOLE conversation, not the tail

The failure this skill exists to prevent is a handoff that summarizes the last twenty minutes and loses the first two hours.

Before writing, walk the conversation **from its first message forward** and harvest:

- **The original ask**, in Sean's own framing — including what he corrected mid-session. A correction is higher-signal than the initial request; it says what he actually meant.
- **Every decision and the reason for it.** A decision without its reason gets re-litigated by the next agent. The *why* is the load-bearing half.
- **Every rejected option and why it was rejected** — otherwise the next agent proposes it again, confidently.
- **Verified state, with the command that verified it**, and a timestamp. State decays.
- **Claims that were disproved this session** — including your own. These are the highest-value lines in the document.
- **Traps hit live.** Anything that cost time once will cost the next agent time too.
- **Sean-owed items** — questions he has not answered, actions only he can take.
- **Anything deliberately NOT done, and why.** Absent this, the next agent "helpfully" does the thing you deliberately avoided.

**Numbers get re-derived, never inherited.** Every count, SHA, row total, and test result must come from a command run *in this pass* — never copied from a previous handoff. Inheriting a number is the most common way a handoff ships a lie.

> Observed live 2026-08-17: an agent wrote *"assume this file has decayed — re-verify"* and then, four paragraphs later in the same document, copied an unverified row count from the file it was superseding. The number was wrong. Knowing the rule did not prevent breaking it; a mechanical pass that re-derived every number did.

---

## 3. Then the part Sean should not have to ask for: gap analysis

A handoff that only records what happened is a transcript. The transfer moment is the one time in a session when the whole shape of the work is visible at once — use it.

Analyze everything gathered **against Sean's vision** (Product Core Loop, the four dashboards, the Best-in-Class strategy, and whatever this specific workstream is for), and produce:

1. **Gaps** — what the plan needs but does not have. The strongest gaps are *structural asymmetries*: a rigor, a gate, or a test applied to one part of the system but not to a comparable part. Look specifically for **the thing we believed in getting less scrutiny than the thing we doubted** — that pattern recurs, and the belief is exactly what should have been tested.
2. **Features, options, and logic Sean has not mentioned** — things he did not think of, or did not know were possible. This is the point of the skill. Do not restrict yourself to his stated scope here; that restriction belongs in *building*, not in *advising*.
3. **Cheaper paths to the same goal.** Frequently the best suggestion is "you can get 80% of this for 5% of the effort, and here is the measurement that would prove it." Say so even when it shrinks work already in progress.
4. **Minimal-click / minimal-time enhancements** with concrete before→after counts — his standing mandate.
5. **What to kill or defer.** Scope that does not improve coaching, adherence, progress proof, community, revenue, or trust.

Rank by value. Say which one you would do first and why. **A recommendation without a recommended order is a menu, not advice.**

---

## 4. Then grill him on it

Suggestions Sean never answers are wasted. Turn the gap analysis into decisions **before** the handoff is finalized, so his verdicts travel with it.

- Use `AskUserQuestion` for discrete choices (max 4 per call; add `preview` for anything visual or structural).
- **Always lead with a recommended option and a one-line reason** — he confirms or corrects in one click. Never present a flat menu.
- One topic at a time for open-ended things; do not batch-interrogate.
- **Record his answers in the handoff document itself**, in his framing, so the next agent inherits decisions rather than open questions.
- Anything he defers goes into an explicit **"open, non-blocking"** list — never silently dropped.

**Skip the grill when it would be noise:** the gaps are trivial, he already answered them this session, or he is clearly mid-flow and just wants the document. State that you skipped it and why; do not force ceremony. If he is short on time, ask the ONE question whose answer most changes the next agent's first move.

---

## 5. The document

Write to `docs/ai-workflow/AI-HANDOFF/<TOPIC>-HANDOFF-<YYYY-MM-DD>.md` (Rule 35 — never repo root). If a handoff for this topic already exists, write a **new** file, add frontmatter `supersedes:`, and put a pointer at the top of the old one saying what is stale and what in it is still worth reading. **Never delete the old one** (Rule 34).

Frontmatter: `decision:`, `status:`, `supersedes:`, `sanitized: true` (catalog-ready, Rule 72).

Required sections:

1. **Read-order + stale-check warning** — what to read first, and an explicit instruction to re-verify every live-state claim because parallel agents share the tree.
2. **What this work is** — the 30-second version, for someone with zero context.
3. **Verified state**, each claim with the command that proved it and when.
4. **What this session did**, including what was *disproved*.
5. **Traps** — hard-won, specific, reproducible.
6. **Decisions + reasons + rejected options.**
7. **Gap analysis / recommendations** (§3), ranked, with Sean's verdicts from §4 recorded inline.
8. **Next slices, in order.**
9. **A paste-ready agent prompt** (§6).
10. **Sean's standing queue** — what only he can do.
11. **Loose ends deliberately untouched.**

**Privacy (Rules 8/44/59):** handoffs are committed. IDs and roles only — no client names, no PII, no secrets, no absolute user-home paths. Run `bash scripts/scan-secrets.sh <file>` before committing and report the result.

---

## 6. The paste-ready agent prompt

End the document with a block Sean can paste into a fresh session with no editing. It must:

- Name the handoff file and the exact read order.
- **Instruct the next agent to load THIS skill first** if their session will also end in a handoff — the chain must not break at the first link.
- Carry the standing laws that apply (proof-before-done, dry-loop, the three-reviewer panel, Kimi-ask-first, batch-push, Render-deploys-from-`main`-only).
- State the work in numbered order with acceptance criteria per item.
- State the hard guardrails — what must never happen.
- Tell it to close with the house gates (dual-tier summary, dry-loop ledger, Linear sync, Hermes memo).

Write it addressed to the next agent in the second person. Assume it has read nothing.

---

## 7. Closing duties

- **Linear:** sync the issue this work belongs to; the handoff file path goes in the comment (board sync is unprompted).
- **Hermes memo:** emit per `hermes-inbox` — a handoff is substantial by definition.
- **Learning packet:** if you are Fable-tier and the session produced a permanent transferable lesson, emit one (Rule 68).
- **Lane ledger:** release your claims and point the lane at the handoff file (Rule 67).
- **Push** unless a parallel agent is mid-slice on the shared branch — then say so and leave it.
- Report the handoff path, the scan result, and the next slice.

---

## 8. Order of operations

```
trigger (or one-line confirm)
  -> harvest the WHOLE conversation, re-deriving every number
  -> gap analysis against Sean's vision (section 3)
  -> grill him on the gaps (section 4), record verdicts
  -> write the document (section 5) + the agent prompt (section 6)
  -> secret-scan -> commit -> Linear + Hermes + lane (section 7)
```

**Failure modes to refuse:** a handoff that only covers recent turns; inherited numbers; recommendations with no ranking; suggestions Sean was never asked about; a document that assumes the reader was present for the conversation.
