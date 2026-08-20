# The artifact and its documentation drifted apart twice in one day

**Surface:** MiniMax H3 video generation — hero prompt package · **Agent:** vs-claude (Opus 5)
**On main:** `e4b37ba1c`, `7cb86dcdf` · first 720p clips rendered on the operator's own GPU

## What shipped

A 15s homepage hero prompt package, built on **measured** engine limits rather than assumed
ones. Probed the card before writing a frame of creative: 1280x720 at `length=97` yields
**107 frames = 4.458s** in ~100s on an RTX 5090. So 15s is FOUR chained clips — a single 15s
pass would need `length≈365` and was never going to fit.

The four-clip structure was not a compromise imposed by the engine. Sean's own brief said
"one colour group at a time, one by one into frame", which maps exactly onto four clips —
and the weights are `fl2v`, so clip N's last frame becomes clip N+1's `first_frame` and the
cuts disappear. **The constraint and the creative intent turned out to be the same shape.**

## The repeat defect

**Twice today an artifact and its documentation drifted apart, in different ways:**

1. **Morning:** proved a working graph, added a `_readme` key to document it, committed the
   annotated version untested. ComfyUI treats every top-level key as a node id, so the
   committed graph was invalid. The file that rendered and the file that shipped differed,
   and the difference was documentation.
2. **Evening:** wrote a prompt package specifying 1280x720 / `length=97` as the production
   settings — the values I had measured — while the committed graph still carried the
   smoke-test values `640x384 / length=25`. Opening the shipped file gives a 1.6-second
   postage stamp, not the 4.46s 720p the document promises.

Same root cause, different surface: **the artifact was PROVEN at one configuration and
DESCRIBED at another.** In case 1 the proof preceded the edit; in case 2 the measurement
preceded the write-up and the file was never updated to match.

**Rule: when a document states settings for a file, diff the two before committing. The
check is seconds and mechanical — read the stated values, read the file's actual values,
compare. Every time this pair drifts, the reader follows the document and gets the file's
behaviour, and the gap is invisible precisely because both artifacts look authoritative.**

## What made round 1 catch it

The vantage was "cross-check the doc against the artifact it documents" — not re-reading
either one. Nine settings matched (steps, cfg, sampler, scheduler, lora strength, both
shifts, both node ids); only the three that determine what you actually SEE were stale.
A code review of either file alone would have passed.

## Verifying a recipe instead of trusting it

The document contained an ffmpeg concat + trim recipe I had written but not run. Round 3
ran it: concat of two clips produced exactly **8.9167s** (2 x 4.4583) and the trim produced
exactly **8.000s** with a video-only stream, confirming `-an` strips audio as claimed.

**Rule: a command written into a handoff is a claim. Shell recipes are the easiest thing in
a document to get subtly wrong and the easiest to actually test — run them once before the
reader does.**

## Mistakes I made

- **Shipped a graph whose settings contradicted its own documentation**, hours after writing
  a memo about exactly this failure class.
- **Wrote an ffmpeg recipe into a deliverable without running it** (it happened to be
  correct — that is luck, not process).
- Told Sean "15 seconds at best quality" was the plan **before** measuring whether one
  generation could produce 15 seconds. It cannot. The correction came from probing, but the
  promise preceded the probe.

## Open

- **Clips B, C, D not yet rendered** — only clip A exists. ~5 minutes of GPU time remains.
- **The logo swan is described, not enforced.** Nothing pins the generated bird to the actual
  SwanStudios mark. `MiniMaxH3ReferenceToVideo` accepts `ref_images` and is installed; if the
  resemblance matters, that is the mechanism, not a longer prompt.
- **Duration still unbound** in the provider adapter — API unit is seconds, node input is
  `length`, and the relationship is now measured (24fps, `length=97` -> 107 frames) but no
  converter has been written.
- **Sean-gated:** Linear credential expired — `check-mcp-health.mjs` reports CONFIGURED BUT
  TOKEN REJECTED (HTTP 401, USER scope in `~/.claude.json`). Needs regeneration and a full
  restart.
