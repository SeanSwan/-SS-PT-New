# Swan Hero — 10 world variants for taste-cut

- **Date:** 2026-08-20 · **Type:** WEBSITE HERO LOOP · **Status:** rendered, awaiting Sean's cut
- **Brief (Sean):** *"ten different versions I can choose from… different background arrangements for the glaciers and mountains and streams and waterfalls… National Geographic and Windows photos, the ultra professional photos Windows has… with my swans swimming by as they are."*
- **Standing taste on file:** NatGeo-grade ultra-realistic nature — glaciers, mountains, islands, fields, wild animals. This brief is that memory, stated again.

---

## The method: hold the subject, vary the world

Every variant runs the **identical swan action** — white and black swans with cygnets crossing right to left at waterline, locked-off camera — and changes **only the world behind them**. Same seed (4242) across all ten.

That is deliberate. If both subject and setting changed per variant, a taste-cut would be comparing two things at once and the choice would be muddy. Holding the swans constant makes the decision exactly one question: **which world do you want to live behind your brand?**

The seed being fixed means differences you see are caused by the *prompt*, not by generation luck.

---

## The ten worlds

| # | Slug | World | Why it might win |
|---|---|---|---|
| 1 | `glacier-lagoon` | Turquoise glacial lagoon, blue ice wall, drifting bergs | Coldest, most "Crystalline Swan" — matches the brand palette without a filter |
| 2 | `alpine-mirror` | Mirrored alpine lake at dawn, pink light on snow peaks | The Windows-wallpaper archetype. Safest, most instantly beautiful |
| 3 | `misted-fjord` | Norwegian fjord, sheer black cliffs into low cloud | Most dramatic scale; the swans read as small and the world as vast |
| 4 | `waterfall-basin` | Plunge basin, cascade behind, spray in sun shafts | Only variant with real motion in the background — the water works |
| 5 | `autumn-boreal` | Golden larch and crimson maple, black glassy water | Warmest. The one that fights the dark-first palette — worth seeing anyway |
| 6 | `geothermal` | Volcanic hot spring, mineral-blue water, steam columns | Strangest and most memorable; risks looking artificial |
| 7 | `blue-hour-tarn` | Highland tarn, indigo sky, faint aurora | Darkest — closest to Obsidian; best for white text overlay |
| 8 | `cenote` | Limestone cenote, turquoise clarity, sunbeams through water | Most "impossible" beauty; least like the existing hero |
| 9 | `frost-marsh` | Frozen reeds at sunrise, frost, low amber sun | Most intimate and least grand — texture over scale |
| 10 | `storm-breaking` | God-light shaft through dark cloud, rain receding | Highest emotional stakes; hardest to loop cleanly |

---

## Choosing well — what to actually look at

Judge in this order. A variant that fails an early test is out regardless of how pretty it is.

1. **Does text survive on it?** This is a homepage hero with copy over it. Busy or bright backgrounds kill legibility. `blue-hour-tarn`, `misted-fjord` and `glacier-lagoon` are the strongest candidates here; `autumn-boreal` and `cenote` are the weakest.
2. **Does it loop?** A background with strong directional motion (`waterfall-basin`, `storm-breaking`) is harder to cut back to the start invisibly.
3. **Does it fight the palette?** Crystalline Swan is cold — deep blue, ice, obsidian, one gold accent. Warm variants have to earn their place.
4. **Do the swans still read?** In a spectacular world the birds can become incidental. If you find yourself watching the background, that variant is beautiful and wrong.

**My recommendation, before you look:** `glacier-lagoon` or `blue-hour-tarn`. Both are cold, both leave room for text, both make the swans the brightest thing in frame. But this is a taste call and my job is to hand you a real field, not to pre-empt it — the whole point of rendering ten is that your eye decides.

---

## Production settings (identical across all ten)

```
width 1280   height 720   length 97  ->  107 frames @ 24fps = 4.458s
steps 4      cfg 1.0      sampler euler / simple      seed 4242 (fixed)
lora  minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors @ 1.0
shift video 5.0 / audio 5.0
~100s render per variant on the RTX 5090
```

**Shared craft suffix** appended to every prompt:

```
shot on a cinema camera at water level, 50mm, shallow depth of field, ultra detailed feather
texture, photorealistic, National Geographic nature photography, extreme clarity, no people,
no text, locked-off camera, no camera movement
```

**Shared subject prefix:**

```
a white mute swan and a black swan glide slowly from right to left across the still water
with their grey cygnets following in single file,
```

---

## After the cut — what happens to the winner

The chosen world becomes the environment for the full **15s procession** already specified in `swan-procession-hero-15s-2026-08-20.md`: four chained 4.46s clips (white family → black family → the logo swan → all three in one line), joined through `first_frame`/`last_frame` so the cuts vanish, then concatenated and trimmed to 15s.

These ten are the **world audition**. The procession is the film.

---

## Honest limits

- **These are 4.46s auditions, not the final hero.** They exist to settle the world question at the lowest possible cost. Judging pacing or story from them would be judging the wrong thing.
- **The logo swan is not in these.** Variants 1–10 use a generic white + black pair, because introducing the brand bird while also varying the world would confound the comparison. It arrives in the procession.
- **720p is the ceiling** for this LoRA. For a full-bleed 4K hero the winner should be upscaled in post, not re-rendered larger — pushing the model past its trained resolution degrades to temporal mush rather than adding detail.
- **Cygnet counts and bird counts will drift** between variants even at a fixed seed, because the prompt text differs. Do not read that as a quality signal.
