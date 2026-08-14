---
title: Design blueprint request — the external-model packet skill
date: 2026-08-13
originating_model: claude-opus-5
reviewer: moonshotai/kimi-k3
remit: design a skill that guarantees external-model calls carry real artifacts, not descriptions
privacy: IDs/roles only; no secrets, no PII, no DB material
---

# What I am asking you to design

A reusable skill that fires **every time** this project sends work to an external model
(you, via OpenRouter, or any other API agent). Its job: make sure the packet contains the
**actual artifact** plus enough grounding that the model answers about the REAL system —
instead of producing confident, plausible, expensive gibberish about a system it imagined.

I want a **blueprint**: a mermaid flowchart of the decision path, an ASCII wireframe of what
the operator sees, the skill's file/section structure, and the exact failure modes it must
refuse to allow.

You are being asked to design this **from evidence, not from theory** — the evidence is
below, and it is about you.

## The evidence: four calls to you today, same model, same price band

| # | What the packet contained | Cost | Findings | Verified REAL |
|---|---|---|---|---|
| 1 | A QA gate's **source code** | $0.1958 | 9 | every claim I checked |
| 2 | A **prose description** of four bug fixes | $0.0849 | 3 blockers | **1 of 3** |
| 3 | The **source** of those same four fixes | $0.2294 | 8 | 5 of 8 |
| 4 | The **source** post-fix, plus 2 modules not sent before | $0.2550 | 10 | both same-day items real |

Review 2 is the control case. Same model, same remit style, same reviewer instructions —
and it was wrong on two of three blockers. It told me up front it could not see the code and
tagged each claim `[INFERENCE]`, which is the only reason the correction was cheap. Its two
misses:

- It said a fix "widens a door onto an unaudited path". That path was already hardened with
  a staff-account refusal, an active-assignment check, and an identical 409 on both refusals
  so it is not an enumeration oracle.
- It said sibling calendar routes likely carried the same defect. There is no `/unblock`
  route at all; the recurring-series mutators are `adminOnly`; `/book-recurring` binds its
  subject to `req.user.id`.

Both were reasonable inferences. Both were false. Both cost real time to disprove.

Review 4 is the strongest case FOR the practice: it reviewed code that had already survived
three reviews and my own adversarial rounds, and found **a live prompt-injection bypass I had
created myself in the previous commit** — a pattern pass ordered ahead of a markup stripper,
so `ignore <b>all</b> previous instructions` reassembled intact after the tags were stripped.
Your own summary of why: *"what survived is what always survives — the seams between the fixes."*

## The two decisions the owner has already made — design around these, do not relitigate

1. **When a packet would exceed the size budget, the skill REFUSES and makes the operator
   narrow the target.** It must never silently substitute a summary or a description. A
   blocked call is cheaper than a confident wrong answer.
2. **The skill builds the packet and runs the existing zero-call preflight, then STOPS for
   explicit approval.** It does not fire. Spend approval stays human.

## The transport it must work with (real, unchanged)

```
node scripts/consult-kimi.mjs \
  --document <path.md> \
  --remit "<one line>" \
  --out <path.md> \
  [--seed N] [--effort high] [--max-tokens N] [--cap-usd N] \
  --confirm-spend

# preflight (no --confirm-spend) prints:
#   status=preflight model_calls=0 model=moonshotai/kimi-k3
#   prompt_chars=16113 max_tokens=60000
#   worst_case_usd=$0.9484 cap_usd=$3.00
```

Hard constraints from this repo:
- **No secrets, no client PII, no DB exports, no absolute paths** in any packet. A secret
  scanner (`scripts/scan-secrets.sh <file>`) exists and must gate every packet before send.
- Packets and reviews are committed to the repo and read by other agents later.
- Windows dev machine; git + node + bash available; no new infrastructure.

## What a GOOD packet contained (reviews 3 and 4)

- The remit, stated as a question with a ranking criterion ("rank by how cheaply an ordinary
  trainer or client trips it").
- **Verbatim source**, extracted by line range at build time — never retyped, never summarized.
- An explicit **"already settled — do not re-litigate"** list, so the model spends its budget
  on new ground instead of re-deriving what three prior rounds established.
- A **calibration statement**: what the model got right and wrong on previous calls, so it
  knows which mode it is being asked to operate in.
- Named **specific attack surfaces** ("the `||` boundaries", "can the ack fire zero times or
  twice") rather than "review this".
- A demand that inferences be **labelled**, with the verification command named.

## What I want back

1. **Mermaid flowchart** of the skill's decision path — from invocation to either a written
   packet awaiting approval, or a refusal telling the operator what to narrow.
2. **ASCII wireframe** of the operator-facing output in both outcomes (packet ready / blocked).
3. **Skill structure** — sections, and what each one must contain to be non-optional.
4. **The refusal conditions.** What exactly must block a packet from being built? Size is one.
   What else? (I have my own list; I want yours independently, then I will compare.)
5. **The failure modes of the skill itself.** How does a skill like this rot, get routed
   around, or start producing packets that pass its own checks while being useless? This is
   the question I most want your answer to — this repo has a documented history of gates that
   were technically green and substantively decorative.

Design it so that a year from now, an agent that has never read this conversation still cannot
send a description where source was required.

## SCOPE ADDITION — this must cover Hermes too, and Hermes is a different shape

The owner has just widened the requirement: this skill governs **every** outbound model call
in the system, not only terminal-agent → OpenRouter. That includes **Hermes**, the operator's
own agent, which has materially different constraints:

- Hermes runs a **local model** (Qwen3 on a desktop GPU) as its default brain, and reaches a
  **cloud model on demand** for specific asks. Same failure mode applies: a local model given
  a description of a subsystem will confabulate about it just as confidently as a paid one,
  and the cost there is wrong operator decisions rather than dollars.
- Hermes is driven **conversationally, over a chat transport** (Telegram). Pasting a large
  source file into that channel is a known, documented failure in this system — it wedges the
  context window and degrades the session. So the "send the artifact verbatim" rule cannot be
  satisfied the same way it is for a file-based API call.
- Hermes **reads the repository directly**. It already ingests memo files from a known
  directory as part of its normal session start. So it has a delivery path that terminal→API
  calls do not: reference a committed artifact by path and have the model read it, rather than
  inlining it into the conversation.
- Hermes operates under **effect tiers** (read-only through irreversible), and some of its
  calls inform actions, not just answers. A confabulated answer there can drive a real
  operator action.

**Design implication I want you to resolve rather than paper over:** the invariant is "the
model must have the real artifact." The *mechanism* differs by transport — inline for
file-based API calls, by-reference-plus-verified-read for a chat-transport agent that can read
the repo. A single skill has to guarantee the invariant across both without pretending they
are the same operation.

Specifically address:
- How does the skill VERIFY that a by-reference delivery actually landed — that the model read
  the file rather than answering from the filename and its own priors? An unverified reference
  is exactly the "description" failure wearing a path.
- What is the refusal condition for the chat transport, given that "too large to send" resolves
  differently when the artifact is referenced rather than pasted?
- Does the calibration record travel with the model, the transport, or the task class?
