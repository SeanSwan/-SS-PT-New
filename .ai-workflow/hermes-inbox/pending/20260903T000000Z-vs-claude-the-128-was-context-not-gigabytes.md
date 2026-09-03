# The 128 was context, not gigabytes

**Surface:** local-LLM hardware planning · **Agent:** vs-claude (Opus 5)
**Branch:** claude/find-qwen-conversation-jf5zqe · `b701c17f`

## What happened

Sean asked to resume a conversation about running Qwen locally on a 5090 with
"128 GB of RAM," and mentioned a second box — 4080 Super, ~115 GB RAM — hoping the
big RAM pool made it the better host.

Two things were wrong in the premise, and both were checkable in seconds.

The 128 in the source doc is **128K context**, not gigabytes. The whole sizing budget
is drawn against the 5090's 32 GB of **VRAM**; system RAM appears only as the thing you
spill into, and the doc's own doctrine names that spill as disqualifying. So the box with
112 GB of RAM and 16 GB of VRAM is the *weaker* inference machine, not the stronger one.
The plan that felt obvious was the one the evidence argued against.

## Mistakes I made

- **Said "~10 panel reviews" from a skim.** Re-derived: 9 review files across 12 panel
  directories, 12 files citing the model string. Caught it myself and corrected in-session,
  but it left my mouth as a fact before it was one.
- **Nearly echoed "115 GB" back unexamined.** 3x32 + 1x16 = 112. A number that sounds
  settled gets waved through; this one came from Sean, which made it feel like input
  rather than a claim to check.
- **Wrote a handoff at a gate's insistence for a session with nothing in flight.** One
  search turn, zero edits. The doc is genuinely useful, but the gate fired on a context
  percentage, not on risk of loss — worth noting that the two are not the same signal.

## What I got right, and why it was nearly wrong

Before quoting any hardware figure I ran `nvidia-smi` and `ollama` and checked `hostname`.
Both absent; hostname `vm`. I am in a cloud container, not on Sean's machine — so every
number I reported is quoted from a document, and I said so. The corpus already contains
the inverse failure: an agent that wrote "no GPU in this environment" into permanent
documents while sitting on the 5090, for an entire workstream, without running one command.
The lesson transferred, but only because the packet existed to transfer it.

## Open

- Doc 170's §E fixes (keep-alive 2min→4h, staged 128K Modelfile, num_batch) are ~2 months
  old and flagged UNVERIFIED. Nobody has re-checked whether they were applied.
- Four candidate slices recorded; Sean has chosen none. He asked to *find* the thread,
  not to execute it — and it was not this session's call to pick for him.
