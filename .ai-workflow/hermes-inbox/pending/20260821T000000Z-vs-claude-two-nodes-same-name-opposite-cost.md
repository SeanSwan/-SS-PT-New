# Two nodes, nearly the same name, opposite cost models — and I documented only one

**Surface:** MiniMax H3 local video · **Agent:** vs-claude (Opus 5)
**On main:** `418695750` · local first-frame graph proven, zero credits

## What happened

Sean opened ComfyUI, picked a node called **"MiniMax H3 First-Last-Frame to Video"**, and was
asked to buy credits. His reaction was exactly right: *"I thought I'm using my own GPU."*

He was. The node he clicked was not the one we had been using.

ComfyUI has TWO MiniMax families installed, with nearly identical display names:

| Category | Reality |
|---|---|
| `partner/video/MiniMax` | HOSTED. POSTs to MiniMax's servers, bills per run. Shows `407.3 credits/Run`, `Status: Waiting for server`, a `watermark` toggle. |
| `model/conditioning|latent|patch/minimax` | LOCAL. Runs on the operator's own GPU. Free. |

Same product name, same model name, adjacent in the node menu, opposite cost model. The only
reliable disambiguator is the **category**, which is not what a person reads first.

## The actual failure was mine, and it was an omission

I wrote a README documenting the local graph and the exact model files it loads. It never
mentioned that a near-identical PAID family was installed on the same machine, one click
away, under a name a reasonable person would assume was the thing they already own.

**Rule: documenting what to use is only half the job when a near-identical wrong option is
reachable. If a mistaken choice costs money, deletes data, or hits a third-party service, the
doc must name the decoy and give the tell that separates them. "Use X" is incomplete when Y
sits beside it wearing X's name.**

The tell here is cheap to state and impossible to misread once known: **anything under
`partner/` costs money.** That sentence would have prevented the whole thing, and I had every
piece of information needed to write it days ago — I had already enumerated these nodes while
checking whether H3 was installed.

## Recording the tradeoff, not just the warning

The paid node is not a trap. It does something local cannot: **15 seconds in a single run**,
where local caps near 4.46s and reaches 15 by chaining four clips. It also exposes a
watermark toggle.

So the README now records the tradeoff rather than only the warning. Choosing the API
deliberately is legitimate; choosing it by accident is not, and those two need different
remedies — one needs a price tag, the other needs a signpost.

**Rule: when warning about an expensive path, state what it is GOOD for in the same breath.
A warning with no upside reads as "this is broken", which is false, and the reader
discovers the omission the first time they genuinely need it.**

## What I built

The free equivalent of what Sean was actually attempting — the SwanStudios logo as the
opening frame: `LoadImage -> ImageScale(1280x704) -> first_frame` on `MiniMaxH3ImageToVideo`.
The scale step is load-bearing, not tidiness: an encoded first frame must match the sampler's
latent stride, and 720 throws where 704 succeeds. Same defect already diagnosed in the
procession chain, now handled inside the graph instead of by an external rescale.

Rendered and verified: 1280x704, 4.458s, ~120s on the 5090, zero credits.

## Mistakes I made

- **Documented the right node without naming the wrong one**, when the wrong one is adjacent,
  similarly named, and costs money. Sean found it by clicking it.
- I had enumerated both families days earlier while confirming H3 was installed, and read
  past the `partner/` category without registering what it meant.

## Open

- **Sean's cut still pending** between the two 15s films (alpine-mirror, storm-breaking).
- **Registering `minimax/hailuo-hosted` as an explicit second provider** would move the paid
  option into the UI as a deliberate choice with its cost visible, rather than a node that can
  be clicked by mistake. The registry already supports it as a peer.
- **Sean-gated:** Linear credential expired (HTTP 401, USER scope) — regenerate + full restart.
