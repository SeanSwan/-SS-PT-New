---
originating_model: claude-opus-5
date: 2026-08-27
surface: swan-taste-brain / favourites
board: SWA-186
decision: "When a property must hold, remove the dependence on remembering it. Prefer structural absence to a filter; prefer a different tool to more care. A correction that asks a human or a model to remember harder is not a correction — the evidence is that the same documented mistake recurred five times in one session."
status: shipped
supersedes: none
privacy: IDs and roles only. No PII, no keys, no client names.
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer + final decider
    did: "Designed and built the favourites store (one list, two states), chose absence over a filter for the safety invariant, extracted shared validation, found three unrelated clipboard bugs via a button-pressing sweep, and repeated a documented mistake five times."
    cost: $0.00 (subscription)
skills_touched:
  - id: "rule 4 (300-line cap)"
    action: reinforced
    motivating_failure: "Two files crossed the cap and it was noticed on a hostile pass, not while writing. The cap has no gate; it depends on the author remembering — which is the exact failure class this packet is about."
  - id: "hermes-inbox / working notes"
    action: amended
    motivating_failure: "The heredoc hazard was in the working notes and recurred five times anyway. The note was rewritten from a warning ('heredocs mangle backslashes') into an instruction ('use Write/Edit for anything containing a backslash or template literal')."
  - id: "rule 73 (proof-before-done)"
    action: reinforced
    motivating_failure: "A README sentence claimed a feature that did not exist yet. Written before it was built, and caught only because the claim was checked against the page."
---

# A rule you must remember is a rule that will be forgotten

## The lesson

Two unrelated things happened in one slice, and they are the same thing.

**One — a design choice.** A saved-but-inert list had to be provably unable to influence generation.
Two options: a state field on each item with the generator filtering out the inert ones, or a
separate file so an inert item is *not in the list the generator reads at all*.

The filter is easier and reads fine. It is also a rule that every future code path must remember.
It can be forgotten, inverted, or skipped by someone who never learns it exists — and when it fails
it fails **silently, permanently, and in the direction of harm**. Absence has none of those
properties. There is nothing to forget, because there is nothing to remember.

**Two — a process failure.** A hazard already written up in my own working notes ("heredocs mangle
backslashes in this environment") recurred **five times in one session**, and on the fifth landed a
real syntax error in a committed test file. Five. Already documented. By me.

The note said *be careful*. Care is a rule you must remember. The correction that finally worked was
not more care — it was **a different tool**: use the file-writing tool for anything containing a
backslash or a template literal, so the hazard cannot arise.

**The unifying rule: when something must hold, remove the dependence on remembering it.** A
structural arrangement, a tool that cannot express the mistake, a check that fails loudly. Not a
warning, not a comment, not resolve.

## The corollary that makes this actionable

**A forgotten check and a passing check look identical from the outside.** That is why "we have a
rule for that" is weak evidence. Ask instead: *what would it look like if this rule had been skipped
six months from now?* If the answer is "exactly like this", the rule is not doing the work.

## Who did what

`claude-opus-5` was builder and reviewer, with no external seat consulted — correct routing for a
slice with a clear spec and a testable invariant. Everything of value came from **iterating the
hostile pass**, not from a second opinion:

- **Round 1** found three unrelated clipboard bugs (below) and two files over the line cap.
- **Round 2** found a comment I had written that was factually wrong about a neighbouring subsystem.
- **Round 3** found that the primary user's own path had no test at all.
- **Round 4** was dry.

**The model is the unreliable component here, and the record should say so plainly.** In the same
slice I: wrote "extract this so it is shared" and then duplicated it instead; asserted a fact about
a neighbouring module rather than reading it; documented a feature in a README before building it;
and repeated a five-times-documented tool hazard. None of those were caught by knowing better. They
were caught by pressing buttons, grepping originals, and reading the neighbouring file.

## Skills created or changed

- **`lib/favourites.mjs`** — the store, split out when the host file crossed the line cap.
  *Motivating failure:* the cap was breached unnoticed while writing; it has no gate.
- **Shared `validateSavedPrompt` / `parseBullets`** — one contract for two lists.
  *Motivating failure:* this codebase has twice shipped "two channels with two validation
  contracts", and one guard within it twice shipped **unable to fire**. Re-typing rules for the
  second list would have re-opened every one of them.
- **Dead-control sweep** in the browser suite — presses every control and asserts the status line
  responds. *Motivating failure:* two buttons were dead for three slices while their stylesheet and
  their handler both verified clean. **A control is not proven by existing in the markup, or by its
  handler reading correctly. It is proven by being pressed.** It immediately earned its keep by
  finding three of four clipboard calls wrong — two threw unguarded inside a click handler (button
  does nothing, says nothing), and one swallowed the failure and reported *"copied"* anyway, which
  is worse: a claim the user acts on and discovers is false only when they paste.
- **Positive control beside every byte-identical assertion** — an "output is unchanged" test would
  also pass against a broken generator, so it is paired with a proof that the change *does* move the
  output.

## Mistakes I made

1. **Repeated a five-times-documented tool hazard five times**, landing a syntax error in a committed
   file on the fifth. The write-up existed. The write-up was not the fix.
2. **Wrote "extracted so it is shared" and duplicated instead** — created the shared validator and
   left the originals in place, one paragraph after naming that exact sin in a comment.
3. **Asserted a fact about a neighbouring subsystem in a code comment** ("the brief prints the
   shelf") without reading it. It was false. The rule the comment justified was still correct, which
   makes it worse: a wrong reason misleads the next reader more than no reason does.
4. **Documented a feature before building it** — a README sentence described behaviour that did not
   exist. Built it rather than softening the sentence, but the order was backwards.
5. **Breached the line cap in two files and noticed only on a hostile pass.**
6. **Left the primary user's own path untested** until round 3 — every test used a secondary memory.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Documented before recurring? | What finally stopped it |
|---|---|---|---|
| **Heredoc/backslash mangling** | **5** | **Yes — my own working notes, and it recurred anyway** | **Changing tools.** Not care. The note was rewritten from a warning into an instruction. |
| Claiming an extraction while leaving the duplicate | 1 | No | Grep the original for what you claim to have moved |
| Asserting a fact about a neighbouring module | 1 | Yes (verify-before-relaying) | Reading the file instead of reasoning about it |
| Breaching the line cap unnoticed | 1 | Yes (rule 4) | A hostile pass; **there is no gate, so it will recur** |
| Documenting before building | 1 | Yes (rule 73) | Checking the claim against the running page |

**Row one is the highest-signal line in this packet.** A hazard documented in my own notes recurred
five times in a single session. That is the strongest available evidence that *writing a lesson down
does not install it*. The distinguishing feature of the correction that worked is that it is
**mechanical** — a different tool, which cannot produce the failure — rather than **resolutional**.

Row four is the honest companion: the line cap has no gate, was breached, and the correction was "a
human noticed". By this packet's own rule, **it will happen again**.

## External-model calibration

No external model consulted; **$0.00** across this slice and the one before it. Recorded because the
absence is the datum: two slices, nine real defects found, zero paid reviews. The findings came from
pressing controls, grepping originals, and reading neighbouring files — none of which needs a
smarter model, and none of which a smarter model reliably does unprompted.

## Transferable rules

1. **When a property must hold, make it structural.** Absence beats a filter; a tool that cannot
   express the mistake beats a warning about it.
2. **A forgotten check looks exactly like a passing one.** Ask what a skipped rule would look like
   six months on; if the answer is "like this", the rule is not doing the work.
3. **A correction that asks for more care is not a correction.** If a lesson recurs after being
   written down, the fix is mechanical, not attitudinal.
4. **A control is proven by being pressed** — not by existing, and not by its handler reading right.
5. **After extracting, grep the original** for what you claimed to move.
6. **Never state a fact about a neighbouring module you have not opened**, especially in a comment
   justifying a rule — a wrong reason is worse than none.
7. **Test the primary user's own path first.** It is the one most likely to be skipped, because the
   convenient fixture is usually a secondary case.
