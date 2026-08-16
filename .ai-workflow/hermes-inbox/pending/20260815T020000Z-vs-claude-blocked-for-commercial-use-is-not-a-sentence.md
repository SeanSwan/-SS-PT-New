# "Blocked for commercial use" made Sean think he couldn't use his own videos

**Surface:** Creator / video studio handoff · **Agent:** vs-claude (Opus 5)
**On main:** `39593b27e` — master handoff at `docs/ai-workflow/AI-HANDOFF/CREATOR-VIDEO-STUDIO-MASTER-HANDOFF-2026-08-15.md`

## The communication defect

I reported the MiniMax H3 situation as *"license-blocked for the local path"* and
*"commercial use requires a grant."* Both accurate. Sean read it and asked:

> *"What do you mean by commercial use? I mean, by adding pictures on my site that I can't
> do that. I can't use what I create. Is that what you're saying?"*

He thought he had been told **the videos he generates are not his to use.** That is not what
the license says at all. What is restricted is **the right to RUN the weights** in an
excluded territory for commercial purposes — not ownership of, or rights to, the output.

The phrase "commercial use is blocked" is technically correct and practically misleading,
because "use" silently swaps referent: I meant *use of the model*, he heard *use of the
videos*. A restriction on an input read as a restriction on an output.

**Rule: when reporting a legal, licensing, or policy constraint, state in the same sentence
what is restricted AND what is not. "X is blocked" is not a finding — "you may not run the
weights commercially here; the output you generate is yours" is. Constraint reports fail by
under-specifying the SUBJECT of the restriction, and the reader fills the gap with the
worst reading available to them.**

Cost of the ambiguity: Sean spent days believing a capability he had paid hardware for might
be legally unusable, when the actual blocker was a free email that had been drafted and never
sent.

## The second-order failure

I had this precise information in the licensing doc the whole time — it distinguishes
*running the weights* from *the output* clearly, and even drafts an email describing his
exact deployment. **I summarised the doc into a blocker instead of into a decision.** A
summary that removes the actionable distinction is worse than a pointer to the source.

**Rule: when compressing a document into a status line, keep the part that changes what the
reader DOES. "License-blocked" changes nothing; "send this drafted email, it needs four
fields" is the whole content.**

## Mistakes I made

- **Reported a constraint without its boundary**, and let Sean carry a false belief about
  owning his own output for multiple sessions.
- **Compressed away the one actionable fact** — that the unblocking action is a free,
  already-written email needing four fields.
- **Did not notice he had misread it**, even though the misreading would have been obvious
  from how he talked about "adding pictures on my site." He had to ask directly.

## What I did right, for calibration

Re-verified every load-bearing claim in the handoff both BEFORE and AFTER writing it — the
minimax grep (1 file), the deleted blob's recoverability at `f45bc34ed^`, and the existence
of all four referenced docs on main. Given that seven verifications earlier in this session
proved nothing, checking twice was proportionate rather than paranoid.

## Open

- The H3 licensing email remains **drafted and unsent**, needing 4 fields from Sean. It is
  the single unblocking action for the zero-cost local path he has now confirmed he wants.
- Nothing generates video yet. The next agent's first job is one video on the 5090, end to
  end — not the full studio.
