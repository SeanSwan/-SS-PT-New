# minimax_h3_t2v_api.json — MiniMax H3 text-to-video (ComfyUI API format)

**Documentation lives HERE, never inside the .json.** ComfyUI treats every top-level key in
an API-format graph as a node id, so adding a `_readme` key makes the whole graph invalid
with `Node 'ID #_readme' has no class_type`. That mistake was made and caught by a hostile
round: the graph was proven working, then annotated, then committed — and the committed
version could not run.

## Proven

Rendered `h3_smoke_00001_.mp4` — h264, 640x384, 39 frames, 1.625s, 225KB — on a local
ComfyUI 0.33.0 / RTX 5090 (34.2 GB) in ~59 seconds. Zero API cost.

## Why text-only works with `fl2va` weights

`MiniMaxH3ImageToVideo` declares `first_frame` and `last_frame` as **OPTIONAL** (verified
against `/object_info`). Omitting them IS the text-only path. A paid review claimed the
opposite — that these weights are first-frame-conditioned and the registry's `text2video`
claim was false — and recommended chaining an image model to synthesise a keyframe. That
would have added a model download and a chained graph to work around a limitation that does
not exist.

## Bindings

    SWAN_COMFYUI_WORKFLOW    = <path to this graph>
    SWAN_COMFYUI_NODE_PROMPT = 6
    SWAN_COMFYUI_NODE_SEED   = 8

## DURATION IS DELIBERATELY UNBOUND

The API's `duration` is **seconds**. Node 6's matching input is `length`, which is neither
seconds nor a 1:1 frame count — `length=25` produced **39 frames**. `FIELD_CANDIDATES` maps
`duration -> ['value','length','duration','frames']`, so binding them would name-match
happily and silently render a **4-frame clip for a "4 second" request**. Measure the
`length` -> seconds relationship and add an explicit converter before binding it.

## Audio is installed and NOT wired

`minimax_h3_audio_vae_fp32.safetensors` is present; this graph decodes video only. Adding
audio needs the audio VAE decode plus muxing — `SaveAudio*` and `CreateVideo` both exist.


## PAID vs FREE — read the node's CATEGORY, not its name

ComfyUI ships TWO MiniMax families and their names are nearly identical. The category is the
only reliable tell:

| Category | What it is |
|---|---|
| `partner/video/MiniMax` | **HOSTED API.** Sends your prompt to MiniMax's servers and bills credits per run. Shows `NNN credits/Run`, `Status: Waiting for server`, and a `watermark` toggle. |
| `model/conditioning/minimax`, `model/latent/minimax`, `model/patch/minimax` | **LOCAL.** Runs on your own GPU. Free. |

A node called "MiniMax H3 First-Last-Frame to Video" under `partner/` is the PAID one. The
free equivalent is `MiniMaxH3ImageToVideo`, whose `first_frame` and `last_frame` inputs are
optional and do the same job on your own hardware.

**Anything under `partner/` costs money.** The graphs in this folder use only `model/` nodes.

### Honest tradeoff

The paid API node can produce 15 seconds in a single run and exposes a watermark toggle.
Local generation caps at ~4.46s per clip and reaches 15s by chaining four (see
`render-swan-procession.mjs`). If a one-shot 15s matters more than cost, the API node is a
legitimate choice — just a deliberate one.

## minimax_h3_firstframe_api.json

Local first-frame conditioning: `LoadImage -> ImageScale(1280x704) -> first_frame`. The
scale node is not optional — an encoded first frame must match the sampler's latent stride,
and 720 fails where 704 succeeds. Proven: rendered `logo_flf_00001_.mp4` from `Logo.png` at
1280x704 in ~120s, zero credits.
