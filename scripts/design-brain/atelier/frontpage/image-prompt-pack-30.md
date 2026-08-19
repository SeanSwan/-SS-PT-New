# Front-Page Background Plate Prompts — 30, Windows-spotlight register

**Requested by Sean 2026-08-19:** *"we should be spitting out 30 different prompts that would get me beautiful
images based off of the Microsoft Windows photographer theme: all those different cities, animals, and pictures
they take that are completely just beautiful, marvelous, and look ultra professional."*

**How to run** (from the main tree, spend-gated):
```
node scripts/forge.mjs bracket "<prompt>" --n 3 --aspect 16:9 --confirm-spend
node scripts/forge.mjs pick <variantId-prefix>
node scripts/forge.mjs refine <variantId-prefix> "warmer, lower sun"
```
`bracket` costs money; `pick`, `list` and cost preview are free. Default model `openai/gpt-5.4-image-2`.

**Layer roles** (D8 — living world at distance, parallax depth):
`FAR` = slowest-moving horizon plate · `MID` = the populated middle distance · `NEAR` = foreground texture/occluder.

**Standing style suffix** — append to every prompt:
> *Ultra-professional landscape photography, large-format clarity, no text, no watermark, no people's faces
> identifiable, deep shadow detail, natural film grain, colour graded toward deep sapphire blue (#002060) with
> ice-blue highlights (#60C0F0) and restrained warm gold accents (#C6A84B). Cinematic, not stock.*

**Rules:** no yoga/meditation language. Nothing identifiable as a real person. No gym-equipment clichés.

---

## A · WARM AMBER IN BLUE — for M1 "Still Water" (quiet)

1. **FAR** — A vast still lake at last light, the far shore a single dark band, sky graduating from deep sapphire at the zenith to a thin seam of amber at the horizon. Nothing moves. Water like polished stone.
2. **MID** — Low mist lying flat across dark water, lit from behind by warm amber so the mist glows while the water stays cold blue. Empty.
3. **NEAR** — Extreme close detail of dark water surface catching amber light in long broken ribbons, shallow depth of field, the rest falling to near-black.
4. **FAR** — A wide wetland at dusk, reeds in silhouette, one warm band of cloud low in a vast cold blue sky, immense negative space in the upper two thirds.
5. **MID** — A pale stone causeway crossing dark water toward a distant warm light, viewed from far away, the path small in the frame.

## B · DEEP NIGHT TO DAWN — for M2 "The Descent" (full cinematic)

6. **FAR** — The moment before sunrise over open water: sky still deep indigo overhead, the faintest cold blue-white breaking at the horizon, one star remaining.
7. **FAR** — The same water thirty minutes later, first warm light striking only the tops of distant hills while the foreground stays in deep blue shadow.
8. **MID** — Fog banks over a valley at dawn, lit from within by early sun, layers receding into blue distance — five or six distinct depth planes.
9. **NEAR** — Frost crystals on a dark surface catching the first low sun, sharp foreground detail, background dissolving to cold blue bokeh.
10. **FAR** — A great mountain lake at true night under clear sky, water almost black, mountains as darker shapes against a star field, no artificial light anywhere.
11. **MID** — Sunrise breaking through a stand of tall trees, god-rays raking across cold mist, warm gold cutting deep blue shadow.

## C · COLD CRYSTALLINE WITH WARM WINDOWS — for M3 "The Plaza" (people-first, the Vegas living-lights read)

12. **FAR** — A modern city seen from a great distance at blue hour, thousands of small warm windows against cold blue architecture, the whole skyline small in a large sky.
13. **MID** — An elevated plaza at night, lit from beneath, wet stone reflecting warm light, distant figures reduced to soft motion blur and shadow.
14. **NEAR** — Rain on dark glass at night with a warm-lit city thrown out of focus behind it, droplets sharp, city as fields of amber and ice-blue bokeh.
15. **FAR** — A bridge crossing dark water at night, its lights doubled in the reflection, deep blue everywhere except the warm line of the span.
16. **MID** — A glass building at dusk, interior warmth glowing through a cold blue facade, seen from across water, perfectly still.
17. **NEAR** — Light refracting through thick textured glass, warm amber arriving through cold blue material, abstract, no recognisable object.

## D · DUSK — for M4 "The Instrument" (product-forward)

18. **FAR** — A wide coastal horizon twenty minutes after sunset, sea and sky nearly the same deep blue, a single warm gradient at the edge, extreme calm.
19. **MID** — Long shadows raking across open ground at low sun, gold rim light on every edge, cold blue in every shadow.
20. **NEAR** — A dark textured surface — slate, brushed metal, still water — with one gold rim of light along its top edge, the rest deep and quiet.
21. **FAR** — Rolling terrain in receding blue layers at dusk, each ridge lighter than the last, atmospheric perspective doing all the work.

## E · SWAN-SPECIFIC — heritage motif, handled with restraint (never a mascot)

22. **FAR** — A single swan on vast dark water, very small in the frame, seen from far off, immense negative space around it.
23. **MID** — A swan's wake spreading across still water at dawn, the bird itself just leaving the frame, only the disturbance remaining.
24. **NEAR** — Extreme macro of a single white feather against deep blue-black, edge-lit, every barb sharp, almost architectural.
25. **FAR** — Several swans as small white marks on a wide misted lake at first light, cold blue, one warm seam of sky.
26. **MID** — The moment of a swan taking off, wings down, water thrown up and catching low gold light, mostly silhouette.

## F · WEATHER AND ATMOSPHERE — universal parallax layers, usable by any design

27. **FAR** — A wall of distant rain crossing open water, sunlit on one side and dark on the other, seen from miles away.
28. **MID** — Aurora over a cold northern landscape, ice-blue and faint gold, reflected in still water below.
29. **NEAR** — Slow drifting particulate — dust, snow, spray — lit from the side against a dark blue field, foreground occlusion layer, mostly empty.
30. **FAR** — A vast cloud bank lit from within at dusk, viewed from above as if from altitude, blue shadow and gold core, no ground visible.

---

## Selection guidance

- Bracket `--n 3` before picking; the rubric in `shared/contactSheet.mjs` scores the sheet.
- Each design needs **at least three plates** (FAR / MID / NEAR) from a single lighting family — mixing families
  across one design's layers breaks the parallax illusion.
- Plate pack is shared across all eight designs per the same-pack law; the lighting FAMILY is the lever, not
  the individual plate.
- Prompts 22–26 are the heritage motif. Use sparingly — one per design at most. `Swans.mp4` remains the hero.
