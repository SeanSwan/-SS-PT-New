# 704 not 720: an encoded first frame must match the sampler's latent exactly

**Surface:** Swan hero — 15s chained procession · **Agent:** vs-claude (Opus 5)
**Result:** two complete 15.000s films rendered on the operator's own GPU, 1280x704, 360 frames each

## The finding worth keeping

Chaining clips through `first_frame` failed at the sampler with:

```
RuntimeError: shape '[1, 24, 1, 1, 22, 2, 40, 2]' is invalid for input of size 86400
```

Read the shape rather than the message: `22*2 = 44` and `40*2 = 80` — a 44x80 latent, which
at this model's stride decodes to **704x1280**. I was feeding a **720**-tall frame.

**Why 720 worked earlier and failed here:** with no `first_frame`, the model builds its own
empty latent and any reasonable size is fine. With an ENCODED first frame, the image's latent
must match the sampler's expected shape exactly — and 720 does not divide cleanly on this
stride. The same graph, the same weights, the same resolution: valid in one mode, invalid in
the other.

**Rule: a dimension that works in one mode is not proven for another. Conditioning inputs
impose shape constraints that unconditioned generation never exercises, so "it rendered at
720" was evidence about text-to-video and told me nothing about image-to-video.**

Diagnosis came from decoding the tensor shape in the error, not from guessing sizes. The
error named the answer; it just named it in latent space.

## The path bug at the most expensive possible moment

All four clips rendered — ~7 minutes of GPU — and then the concat failed:

```
Impossible to open 'variants\procession\variants\procession\alpine-mirror_A.mp4'
```

`f.split('/').pop()` does not split a Windows path. node's `join()` emits backslashes, so the
"basename" was the whole relative path, and ffmpeg resolves concat entries against the LIST
FILE's directory — so it doubled the prefix.

**Rule: path manipulation by string-splitting on `/` is a Windows bug waiting for a long
job to finish. Split on `[\/]` or use `path.basename`. And note WHERE it surfaced — after
every expensive step succeeded, at the cheap step at the end. Order your failures so the
cheap ones happen first: validating the stitch on two dummy files would have cost seconds.**

## What the fail-closed design bought

When clip B errored, the script stopped rather than continuing. That mattered: clips C and D
would have been generated from a frame that did not exist, produced plausible-looking video,
and the defect would have surfaced as "the film looks disjointed" three clips downstream
instead of "clip B failed" immediately.

**Rule: in a chain where step N+1 consumes step N's output, a non-success at any step must
halt. Continuing converts a precise failure into a vague quality complaint.**

## Mistakes I made

- **Wrote a stitch step I never tested** while carefully testing every render step. The
  expensive parts got scrutiny; the cheap final step got assumption — and it was the only
  thing that broke.
- **Assumed 720 was safe for chained clips** because it had rendered unconditioned. That is
  the "proven in one mode" error above, and I made it while holding the measurement that
  disproved it.
- Two Python-patch attempts failed on escaping before I switched to a tool that errors on a
  missed match. Third time this session; the lesson is not landing by repetition.

## Open

- **Both worlds delivered** (alpine-mirror, storm-breaking) at 15.000s exactly — Sean's cut.
- **The logo swan is described, not enforced.** `MiniMaxH3ReferenceToVideo` with `ref_images`
  exists and is installed; if the brand resemblance must be exact, that is the mechanism.
- **704 vs 720** is now the chained-clip standard. A 4K hero should be upscaled in post.
- **Sean-gated:** Linear credential expired (HTTP 401, USER scope) — regenerate + full restart.
