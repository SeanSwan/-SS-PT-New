# Swan Procession — 15s homepage hero · MiniMax H3 prompt package

- **Date:** 2026-08-20 · **Type:** WEBSITE HERO LOOP (15s, muted)
- **Brief (Sean):** a version of the existing Swans.mp4 hero, but with one swan rendered as a *real-life* version of the SwanStudios logo bird, moving among a black swan and a white swan with their cygnets on a beautiful lake. Refined: *"crossing the main center point of the camera right to left, individually by their colour groups… one by one into frame in high ultra detail."*
- **Engine reality — MEASURED on the RTX 5090, not assumed:** 1280x720 @ `length=97` produces **107 frames = 4.458s** at 24fps, rendering in **~100 seconds**. Therefore **15s = four chained clips**, not one generation.

---

## Why four clips, not one

A single 15s generation needs `length ≈ 365` (~360 frames) at 720p. Four 4.46s clips at 720p are each **proven to render**. And the model is `fl2va` — **f**irst/**l**ast frame to video — so **clip N's final frame becomes clip N+1's `first_frame`**. That is not a workaround; it is the capability these weights were built for. The cut becomes invisible.

Sean's "one group at a time, one by one into frame" maps exactly onto the four clips.

---

## SECTION 1: SHOT-BY-SHOT EFFECTS TIMELINE

The camera is **locked off** for the entire piece — a still, wide, waterline view. The swans move; the frame does not. That discipline is what makes a procession read as a procession instead of as a camera move.

```
SHOT 1 (0.0-4.4s) - THE WHITE FAMILY ENTERS            [clip A]
- EFFECT: locked frame + surface parallax (foreground reeds drift slowly left)
- An empty lake at first light. Mist sits on the water. The far bank is soft and
  deep-shadowed. A WHITE MUTE SWAN glides in from frame right, neck in the classic
  S-curve, and crosses toward centre. Four grey cygnets follow in single file, tight
  to her flank.
- Camera: locked wide, lens at waterline height, 50mm equivalent, shallow depth so
  the far bank falls to soft bokeh.
- Speed: real-time. No ramping. The stillness IS the hook.
- Transition: she reaches dead centre as the clip ends -> that exact frame becomes
  clip B's first_frame.

SHOT 2 (4.4-8.9s) - THE BLACK FAMILY CROSSES           [clip B]
- EFFECT: locked frame + reflection doubling      ** SIGNATURE VISUAL EFFECT **
- The white family continues out toward frame left. From frame right a BLACK SWAN
  enters - crimson bill, charcoal plumage - the water beneath her mirror-still, so
  her reflection reads as a second inverted bird. Three darker cygnets trail her.
- ** The signature: for roughly 1.5s the two families occupy opposite thirds while
  the CENTRE of frame holds only their two reflections meeting on the water. The real
  birds are at the edges; the centre belongs to the mirror image.
- Camera: locked, identical framing. Nothing moves but the birds.
- Speed: real-time, held.
- Transition: black swan at centre -> last frame -> clip C first_frame.

SHOT 3 (8.9-13.4s) - THE SWAN OF THE LOGO              [clip C]
- EFFECT: locked frame + rim-light bloom on the leading bird
- A third swan enters from frame right: pure white, but carried differently - neck
  held higher and curved more sharply than a mute swan's, wings folded tight and
  slightly raised at the shoulder, catching a cold rim of light along the leading
  edge. This is the SwanStudios mark rendered as a living animal. Two cygnets follow.
- The rim light is Ice Wing cold where it grazes the wing edge; everything else stays
  natural. ONE colour accent, not a filter over the whole frame.
- Camera: locked. Same waterline. The only shot where a light source is doing work.
- Speed: real-time.
- Transition: at centre -> last frame -> clip D first_frame.

SHOT 4 (13.4-15.0s) - THREE FAMILIES, ONE LINE         [clip D, trimmed]
- EFFECT: locked frame, nothing else - LOW DENSITY BY DESIGN
- All three families strung across the frame in a single unbroken line, moving
  together toward frame left. White, black, and the logo swan, cygnets between them.
  The water settles. The mist has lifted a little.
- Camera: locked. Unchanged since frame one.
- Speed: real-time.
- Transition: final frame composed to match SHOT 1's emptiness closely enough for a
  crossfade loop.
```

**Loop note.** A true seamless loop wants first frame == last frame, which fights a procession that travels one direction. Two honest options: (a) a 0.5s crossfade from clip D's tail back to clip A's head — invisible on an empty misted lake; or (b) play once and hold the final frame. Option (a) is recommended and is what the concat below produces.

---

## SECTION 2: MASTER EFFECTS INVENTORY

**Camera movement**
1. **Locked-off frame** — used 4x, shots 1–4. Role: the procession reads *because* the frame refuses to chase it.

**Compositing / optical**
2. **Surface parallax** — 1x, shot 1. Role: proves the shot is alive before any bird enters.
3. **Reflection doubling** ★ — 1x, shot 2. Role: the memorable image; centre frame held by reflections alone.
4. **Rim-light bloom** — 1x, shot 3. Role: marks the logo swan as *the* swan, without costume or graphic.

**Lighting FX**
5. **Low-angle first light + mist** — 4x, all shots. Role: the shared world; the reason four clips read as one place.

**Transitions**
6. **fl2v frame handoff** — 3x, A→B→C→D. Role: the cut that is not a cut.
7. **Tail crossfade** (optional) — 1x, D→A. Role: loop closure.

---

## SECTION 3: EFFECTS DENSITY MAP

```
0.0-4.4s    = LOW      (locked frame + parallax - 2 effects in 4.4s)
4.4-8.9s    = MEDIUM   (locked + reflection doubling + two families - 3 effects)
8.9-13.4s   = MEDIUM   (locked + rim-light bloom + three families - 3 effects)
13.4-15.0s  = LOW      (locked, nothing else - 1 effect in 1.6s)
```

**Density principle applied:** the piece opens low and closes lower. The signature beat sits at the only medium peak, and nothing competes with it.

---

## SECTION 4: ENERGY ARC

**Act 1 — Hook (0–4.4s).** An empty misted lake at first light, held long enough to feel deliberate. The hook is restraint: a homepage opening on stillness reads as confident. The white family entering is the first promise that something is happening.

**Act 2 — Build (4.4–13.4s).** Families arrive one at a time, right to left, each group its own colour. The build is *accumulation*, not escalation — no faster cuts, no swell. The signature beat lands mid-act, when the centre of frame belongs to reflections rather than birds. Act 2 closes on the logo swan, the only bird the eye has been taught to look for by then.

**Act 3 — Resolution (13.4–15.0s).** All three families in one line, travelling together. The brand statement is made structurally rather than verbally: different birds, different colours, their young between them, moving the same direction. Then the lake again.

---

## THE FOUR PROMPTS — paste into ComfyUI node 6

**Shared style suffix** (append to every clip):

```
shot on a cinema camera at water level, 50mm, shallow depth of field, soft morning mist,
glassy still water with mirror reflections, natural low-angle first light, deep shadowed
far bank, muted cool palette, ultra detailed feather texture, photorealistic, no people,
no text, locked-off camera, no camera movement
```

**CLIP A**
```
A white mute swan glides from right to left across a still misted lake at dawn, four grey
cygnets following in single file close to her flank, S-curved neck, water barely disturbed,
```

**CLIP B**
```
A black swan with a crimson bill enters from the right and crosses left across mirror-still
water, three dark cygnets trailing behind her, her reflection doubled perfectly beneath her,
a white swan family exiting at the far left edge,
```

**CLIP C**
```
A pure white swan with a high sharply curved neck and tightly folded wings raised at the
shoulder crosses from right to left, a cold rim of light along the leading edge of her wing,
two cygnets following, black and white swan families ahead of her in the frame,
```

**CLIP D**
```
Three swan families - white, black, and one luminous white swan with a high arched neck -
strung in a single unbroken line moving left across a calm misted lake, cygnets between the
adults, water settling flat behind them,
```

---

## SECTION 5: PRODUCTION SETTINGS (measured, not guessed)

```
width  1280     height 720      length 97  ->  107 frames @ 24fps = 4.458s
steps  4        cfg    1.0      sampler euler / scheduler simple
lora   minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors  @ strength 1.0
shift  shift_video 5.0   shift_audio 5.0
render ~100s per clip on the RTX 5090 (34.2GB)  ->  ~7 minutes for all four
```

**Chaining.** After clip A renders, extract its final frame and load it as `first_frame` on clip B's `MiniMaxH3ImageToVideo` node. Repeat B→C and C→D. That is what `fl2v` means, and it is why the cuts disappear.

**Concat and trim to 15s:**
```
ffmpeg -f concat -safe 0 -i list.txt -c copy swan_procession_raw.mp4
ffmpeg -i swan_procession_raw.mp4 -t 15 -c:v libx264 -crf 16 -pix_fmt yuv420p -an swan_procession_15s.mp4
```
`-an` strips audio deliberately: this is a muted homepage background, and the audio VAE is not wired in the current graph.

---

## Known limits, stated rather than discovered later

- **720p is the ceiling for this LoRA.** The turbo LoRA is a 768p artifact; 1280x720 sits inside that budget and is proven. Pushing beyond it runs off-distribution with a 4-step LoRA and degrades to temporal mush rather than merely rendering slower.
- **Consistency across clips is not guaranteed by the prompt alone.** `first_frame` chaining carries the *scene* forward; it does not lock plumage detail. If a bird's look drifts between clips, the fix is a reference image, not a longer prompt.
- **The logo swan is described, not enforced.** Nothing in this pipeline pins the generated bird to the actual SwanStudios mark. If the resemblance matters, supply the logo as a reference image — H3 exposes `MiniMaxH3ReferenceToVideo` with `ref_images` for exactly this.
- **Cygnet counts will drift.** Generative video does not reliably hold "four cygnets" across 107 frames. Treat counts as direction, not specification.
