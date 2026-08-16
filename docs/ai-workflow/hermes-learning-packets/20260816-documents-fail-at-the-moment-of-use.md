---
title: Documents fail at the moment of use, not the moment of writing
originating_model: claude-opus-5
tier_basis: Sean's explicit designation 2026-08-10 — Opus 5 and Kimi K3 are Fable-tier
reviewed_by: self; both instances surfaced by Sean attempting to USE the document, not by review
date: 2026-08-16
decision: A document that asserts something must be re-checked at the moment it is used, and every instruction in a handoff must be executable as literally written — reading it again will not find either defect
status: shipped
supersedes: none
models_used:
  - model: claude-opus-5
    role: builder, reviewer, author of both defective documents
    did: wrote the licensing email and the session handoff; corrected both after Sean tried to use them; built the verify CLI and the permanent worktree
    cost: subscription
skills_touched:
  - name: rule-75 (trailhead truth — docs describe what the code does NOW)
    change: extended to outward-facing and handoff documents
    why: the rule was framed for in-app copy and docs; it did not cover a legal submission to a third party, nor an instruction handed to the next agent
  - name: rule-49 (no manual code inspection by Sean)
    change: extended from "do not ask a human to read code" to "do not write an instruction that requires the recipient to WRITE code"
    why: a handoff step naming a function is code-shaped work deferred to the reader, and it passes every review because it reads like a command
  - name: closeout-evidence-lock
    change: gap identified, not closed
    why: closeout proves the CODE. Nothing in the pipeline tries to USE the documents the turn produced, which is the only thing that finds these
---

# Documents fail at the moment of use, not the moment of writing

## The finding

Two documents failed in two consecutive turns. Both had been reviewed. Both read as finished.
Both broke the instant someone tried to use them, and in both cases the person trying to use
them was Sean, not a gate.

**Instance 1 — a compliance claim that had drifted.** The MiniMax H3 licensing email sat marked
READY TO SEND for five days, listing six compliance controls as *"built or in build."* Checked
against the code when Sean asked for it: three were not built, and the strongest control that
now existed — fail-closed territorial licence gating — was not claimed at all, because it
post-dated the draft. Sending it unchanged would have misrepresented our posture to a licensor.

It was accurate-ish when written. It drifted because the system moved and the document did not.

**Instance 2 — an instruction that was not executable.** My session handoff opened its next-slice
section with *"the next agent's first move: run `verify()` on the 5090 before anything else."*
`verify()` is an exported function with no CLI. Following that instruction required opening the
module, resolving the import path, and hand-writing JavaScript — in a repo whose constitution
explicitly forbids handing a human code-shaped work.

That one was never accurate. It only read as though it were, because I wrote it knowing what
`verify()` was. **I even wrote the corrected wording first** — the master handoff called it
*"the single command that reports which piece is missing"* while no such command existed. I
described a thing into being present and then did not build it.

## The rule

**Re-reading a document does not find either defect.** Instance 1 needs a comparison against the
code as it stands today. Instance 2 needs someone who does not already know the answer to try to
follow it. Neither is a review activity; both are *use* activities.

So:

1. **Any document asserting what the system does gets re-verified at the moment it is USED**, not
   when it is written. The window between "ready" and "used" is where drift accumulates unwatched,
   and the longer a document sits marked ready, the less true it is.
2. **Every instruction in a handoff must be executable as literally written.** The test: can the
   recipient type it? If the next actor has to write code to follow your instruction, the work is
   not finished — it is deferred, wearing the costume of a completed step.

The second one has a sharp corollary: **naming a function is not an instruction.** `run verify()`,
`call the exporter`, `use the helper` all read as specific and are all dead ends for anyone
without the author's context.

## Who did what

Opus 5 wrote both defective documents and both corrections. No external model was involved.

**Sean caught both**, and in both cases by the same mechanism — attempting to use the artifact.
For instance 2 he simply pasted my own sentence back at me with no comment; reading it as a
recipient rather than as its author was enough to expose it instantly.

That is the third time in this workstream that Sean, not a gate, found the real defect. The
earlier one was structural (a chain of correct slices delivering the wrong product). These two
are documentary. The common shape: **every gate validates the artifact against its own spec, and
nothing validates it against being used.**

## Skills created or changed

- **`backend/scripts/verify-video-provider.mjs`** — the missing command. No token, no server, no
  GPU, no `npm install`. Deliberately NOT a flag on the render agent: the agent exits 2 without a
  credential, which is right for a worker and wrong for a diagnostic, since the operator most
  likely to need it is the one who has not finished setting up. Requiring a token first would gate
  the diagnosis behind the setup it diagnoses.
- **Licensing doc restructured** — a "What was actually sent" section is now the record of the
  submission; the original email is marked SUPERSEDED so a future reader cannot mistake the draft
  for what went out, with an explicit instruction to update it if the committed controls get built.
- **Gap identified and NOT closed:** the closeout pipeline proves code and never tries to *use* the
  documents a turn produced. No gate would have caught either of these.

## Mistakes I made

- **Wrote a handoff whose first action could not be performed**, and repeated it in a closeout as
  a finished instruction.
- **Did not check the licensing email against the code until asked** — despite having spent the
  entire session inside the very modules that implement and fail to implement its controls. I
  described it as "drafted, needs 4 fields" in three closeouts, treating what was missing FROM it
  as the only open question about it.
- **Described a command that did not exist** in one document while instructing someone to call a
  function in another. The first was aspiration written in the present tense; the second was
  author's-context blindness. Same turn, same file family.
- **Nearly claimed the new worktree worked without proving it.** It has no `node_modules`; I had
  no evidence the agent could run there until I ran it. It did — zero install needed — but that
  was luck confirmed late, not something I knew when I created it.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before it recurred? | What actually stopped it |
|---|---|---|---|
| **A document asserted something that did not survive contact with use** | 2 (licensing email; handoff instruction) | The first was written up one turn before the second occurred — **and did not prevent it** | Nothing procedural yet. Both were caught by Sean using the artifact. The candidate fix is below. |
| Claiming a thing works before running it (worktree) | 1 (caught pre-claim) | Yes, repeatedly | Running it before writing the sentence |
| Verification masking (`\| tail`, `&&` short-circuit) | 0 this turn | Yes | `${PIPESTATUS[0]}`; not chaining a test behind a grep whose exit code is data |

**The first row is the finding.** I wrote up "compliance claim drifted from the code" and then,
in the very next turn, shipped a handoff instruction that failed the same way. The write-up did
not help because it was framed as being about *licensing documents* rather than about
*documents that assert things*. A lesson scoped to its instance does not generalise on its own.

**Candidate procedural fix, not yet a rule:** before a turn closes, take the top instruction of
anything the turn produced and ask *"can the recipient type this?"* — and for any document that
makes claims about the system, diff those claims against the code rather than re-reading them.
Both are cheap. Neither is currently in any gate.

## External-model calibration

None consulted this turn. Both defects were free to find and would have cost real money to miss —
one in a misrepresentation to a licensor, one in an agent burning a session on a dead-end first step.

## The durable lesson

Write the document, then try to **use** it. If it asserts something, check the assertion against
reality at the moment of use. If it instructs something, confirm the instruction can be typed by
someone who does not already know the answer. Review reads; only use tests.
