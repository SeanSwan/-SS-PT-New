# A compliance claim drifted from the code, and I nearly handed it to a licensor

**Surface:** Creator video studio — licensing + session handoff · **Agent:** vs-claude (Opus 5)
**On main:** `135e6795a` — session handoff at `docs/ai-workflow/AI-HANDOFF/CREATOR-STUDIO-SESSION-HANDOFF-2026-08-16.md`

## What happened

Sean asked for the MiniMax H3 licensing email so he could send it. The draft had been sitting
in `MINIMAX-H3-LICENSING-REQUEST-2026-08-11.md` since 2026-08-11, described as READY TO SEND.

It listed six compliance controls under the heading **"built or in build"**. Read against the
code as it actually stands today:

| Control | Reality |
|---|---|
| Attribution displayed prominently | **Now true** — required field on the provider contract; `assertSpecShape` throws without it |
| Territorial licence gating | **Now true** — and stronger than the draft claimed; the draft did not mention it at all |
| Human review | True (operational, not code) |
| No distillation | True (policy commitment) |
| Per-asset provenance with licence snapshot | **Not built** |
| Server-side spend/volume caps | **Not built** |
| Prompt policy filter | **Not built for video** (the image lane has `swanLawFilter`; nothing wires it to the video path) |

Three of seven were aspirational, written in the present tense, in a document whose entire
purpose was to be sent to an external party as a representation of our posture. "Built or in
build" is a phrase that lets a writer avoid deciding which — and a reader cannot tell.

I split it into IMPLEMENTED TODAY versus COMMITTED BEFORE ANY H3-LOCAL OUTPUT SHIPS, and added
a line saying the separation is deliberate. The corrected version is also *stronger*: the
licence gate is a real control the original never claimed.

## The lesson

**An outward-facing document that asserts what your code does must be re-verified against the
code at SEND time, not at write time.** The draft was accurate-ish when written and had drifted
by the time it was wanted — which is the normal life of any document that describes a moving
system. The window between "READY TO SEND" and actually sending is exactly where the drift
accumulates unobserved.

This is an instance of the existing trailhead-truth rule (docs and in-app copy describe what
the code does NOW), applied to a legal/commercial document aimed at a third party — where the
cost of over-claiming is not a confused user but a misrepresentation to a licensor.

**No durable packet for this one.** It is an application of a rule the constitution already
carries, not a new lesson, and inflating the corpus with restatements makes it worth less.

## Mistakes I made

- **I did not check the email against the code until Sean asked for it.** I had spent the whole
  session in exactly the modules that implement (and fail to implement) those controls, and
  the drift was still not something I went looking for. It surfaced only because he wanted to
  send it.
- I described the doc as "drafted and needs 4 fields" in three separate closeouts this session
  without ever opening it to check whether its *content* was still true. I treated "what is
  missing from it" as the only open question about it.

## Open

- The email still needs 4 fields from Sean: legal entity + state, distribution scope, name +
  title, contact email. He is handling it.
- **If anyone builds provenance / spend caps / the prompt filter, update the licensing doc** —
  and if Sean has already sent it by then, record the send date so the delta stays visible.
- Sean is not blocked from testing: non-commercial local runs need no grant, and the code
  enforces that distinction. Still no video generated.
