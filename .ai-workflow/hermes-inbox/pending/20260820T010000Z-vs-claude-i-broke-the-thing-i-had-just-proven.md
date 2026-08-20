# I rendered a working video, then documented it, then shipped the documentation broken

**Surface:** MiniMax H3 local video generation · **Agent:** vs-claude (Opus 5)
**On main:** `f2ae84386` then `695cc5336` · first rendered video in this workstream

## The win, stated once

MiniMax H3 generated `h3_smoke_00001_.mp4` — h264, 640x384, 39 frames, 1.625s — on a local
RTX 5090 in ~59 seconds, zero API cost. Queue, agent, licence gate, provider registry and
ComfyUI transport all existed; the missing piece was a workflow graph, and the graph is now
proven.

## The mistake that matters

I proved the graph worked. Then I added a `_readme` key to the JSON to document it. Then I
committed **the annotated version, without re-testing**. ComfyUI treats every top-level key
in an API-format graph as a node id, so the committed file was rejected outright:

    Node 'ID #_readme' has no class_type. The workflow may be corrupted.

**The file that rendered and the file that shipped were different files, and the difference
was documentation.** Caught only because a hostile round re-POSTed the committed artifact
rather than trusting the earlier success.

**Rule: proving something works and then modifying it is starting over, not finishing. Any
edit after the proof — including a comment, including documentation — invalidates the proof
and requires re-running it. The edit that feels too small to re-test is exactly the one that
ships broken, because its smallness is the argument for skipping the check.**

Documentation now lives in a sibling `README.md`, where it cannot corrupt the artifact it
describes. The general form: **an artifact consumed by a machine has no safe place for a
note. Put the note next to it.**

## A paid review was confidently wrong, and probing beat believing

Kimi K3 ($0.02) led with: `fl2va` weights are first/last-frame conditioned, no text-only
path exists, the registry's `text2video` claim is false — and recommended chaining an image
model to synthesise a keyframe.

One probe of `/object_info` disproved it: `MiniMaxH3ImageToVideo` declares `first_frame` and
`last_frame` as **OPTIONAL**. Text-only is the supported path. Following that advice would
have added a model download and a chained graph to route around a limitation that does not
exist — and the rendered video is the proof.

**Rule: a reviewer's confident architectural claim about a system it cannot observe is a
hypothesis. When the running system is reachable, ASK IT. One `/object_info` query beat a
paid model's reasoning, cost nothing, and took ten seconds.**

Its other four answers were sound and were acted on. Value was real; the headline was wrong.

GLM-5.3 **failed to produce output at all** — consumed all 8000 tokens on internal reasoning
and emitted 305 bytes of nothing. Not a wrong answer; no answer. Same shape as Kimi's
earlier timeout: budget spent before the response began.

## Two assumptions I had propagated as fact

- **"ComfyUI is not set up" appeared in three handoff documents I wrote.** It was already
  running, with the 5090 visible and every H3 weight installed — UNet, text encoder, video
  VAE, audio VAE, turbo LoRA, plus Wan 2.2. One probe would have corrected it at any point.
- **"Linear is not configured."** Said it for many turns. The health check shows it IS
  declared, at USER scope in `~/.claude.json`, with an **expired token** returning 401 — which
  registers zero tools and is indistinguishable from absent. The correct report is
  "credential expired, needs regeneration and a full restart", not "not configured".

**Rule: an unverified blocker repeated across documents becomes institutional fact. Each
restatement should re-probe, because the cost of the probe is seconds and the cost of the
wrong version is every reader after you.**

## Mistakes I made

- **Shipped an artifact I had invalidated with my own annotation**, then wrote a commit
  message claiming it was proven — the proof referred to a different file.
- **Repeated "ComfyUI not set up" across three handoffs** without probing once.
- **Reported Linear as unconfigured for many turns** when the tool to check existed and said
  otherwise; my checks kept running in a tree ~2000 commits stale where the script is absent.

## Open

- `duration` deliberately UNBOUND: the API's unit is seconds, the node's is `length`, and
  `length=25` produced 39 frames. Binding them via name-matching would silently render a
  4-frame clip for a "4 second" request. Needs a measured converter.
- Audio VAE installed, not wired. Output is video-only.
- **Sean-gated:** Linear token is expired — regenerate + full Claude Code restart.
