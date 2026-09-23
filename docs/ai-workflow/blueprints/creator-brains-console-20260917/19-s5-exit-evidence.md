# S5 exit evidence — BrainConstellation (CD3 "Vault Observatory")

**Date:** 2026-09-22 · **Slice:** S5 · **Depends on:** S2 (roster = accessible equal) · **Status:** ✅ **CLOSED — 2026-09-22, Sean's ruling. All 4 exit criteria discharged with evidence: T-T1/T-T2/T-W7 green, T-E3 measured in a real browser (§4, sync variant + alloc/dolly/freshness guards, five mutations killed), render seen.**

The slice table (`08-slices-operations.md:12`) states S5's exit gate verbatim:

> **T-T1/T-T2/T-W7 green; T-E3 budget measured; Sean has seen it (ideation follow-through)**

Each clause is answered below with a command that reproduces it. Nothing here is
asserted from memory.

> ⚠️ **Correction, 2026-09-22 (later the same day).** The header here read *"all
> four exit criteria discharged"* until the T-E3 budget was re-verified against
> shipped source and found to measure a local arithmetic loop rather than a
> renderer frame. **T-E3 is withdrawn — see §4.** T-T1, T-T2, T-W7 and the render
> stand. S5's gate is therefore **not** fully discharged, and the honest count is
> **3 of 4**. The follow-up is named in §4.
>
> ✅ **Resolved the same evening.** §4 now carries a REAL in-browser measurement
> — built chunk, real WebGL, 40 nodes, observable pixel output, and both of the
> mutations `2026-09-22-140126` D1 required (slow frame → red, empty renderer →
> red) executed and killed. The count above returns to **4 of 4 with evidence**;
> flipping the slice to CLOSED is Sean's word, not this document's. **→ Ruled:
> S5 CLOSED, 2026-09-22 (Sean), on this section's final state — five mutations
> killed, seven guards green, backend identified as ANGLE/D3D11 on an RTX 5090.**

---

## 1. T-T1 — `layoutBrains` is pure and data-driven · **GREEN 14/14**

> `06-test-plan.md` T-T1: *"`layoutBrains(brains)` pure: same input → same
> positions/sizes/colors; size ∝ videos, arc ∝ coverage, color per state map"*

```
npx vitest run src/components/constellation-layout.test.ts   →  14 passed
```

The determinism clause is the one with teeth, and it is tested in the stronger
form: **same positions when the input array ORDER differs**. A layout keyed on
arrival order would reshuffle the sky on every poll, and that failure is
invisible in a single screenshot because both frames look deliberate.

Two encodings are tested for the *absent* case, not just the present one: a null
`videos` maps to the size floor (never silently a maximum), and `ratio()` returns
**`null`** for an unmeasurable coverage — distinct from `0`, because `S1-H9`
requires an untakeable count be rendered as absent rather than as "fetched
nothing".

## 2. T-T2 — loop lifecycle and clean teardown · **GREEN 8/8**

> `06-test-plan.md` T-T2: *"rAF controller: `document.hidden` → loop stops ≤1
> frame; off-viewport (IntersectionObserver stub) → stops; remount → clean
> teardown (no leaked context)"*

```
npx vitest run src/components/constellation-loop.test.ts     →  8 passed
```

Tested with a hand-driven `pump()` and **frame counts**, not timers, so the
assertions measure the loop rather than the scheduler. `dispose()` calls
`renderer.dispose()` **and** `renderer.forceContextLoss()` — a browser allows
~16 live WebGL contexts, so a dev-mode remount loop exhausts them without it.

## 3. T-W7 / T-E3 gates · **GREEN 11/11**

> reduced-motion and WebGL-absent each render the static frame + the roster
> equivalent; **the chunk is never fetched at all** in either case.

```
npx vitest run src/components/constellation-gates.test.tsx   →  11 passed
```

"Never fetched" is asserted as a **call count on a mocked `loadConstellationChunk`**,
not as an absent canvas — an absent canvas is also what a slow chunk looks like.

### T-E3 — the deferral contract holds in the BUILD, not only in tests

```
npx vite build
  dist/index.html                                0.46 kB
  dist/assets/index-DyJyYk_w.js                221.70 kB │ gzip:  71.73 kB
  dist/assets/constellation-three-D4BBPI9v.js  523.86 kB │ gzip: 131.64 kB
```

Read from the artifacts (re-measured 2026-09-22 evening, the build §4 benches
against): `dist/index.html` references **only** `index-DyJyYk_w.js`; `WebGLRenderer`
appears **0 times** in the initial bundle and **6 times** in the separate chunk;
the entry touches the chunk **only** through dynamic `import(...)` — no static
edge, so the chunk is fetched if and only if the gate fires. (The reverse edge
does exist: the chunk statically imports the *entry* for the shared pure layout
modules — benign, because in the real shell the entry is the page and has always
evaluated first; §4 records how the bench accounts for it.) The three.js payload
is genuinely deferred, and that is a property of the shipped build rather than of
a test stub — this closes `2026-09-22-140126`'s Q3 `[UNKNOWN]` with a
measurement instead of a guess.

## 4. T-E3 — the frame budget, **RE-MEASURED IN A REAL BROWSER — PASS**

> ⚠️ **History, kept so the retraction is never lost:** this section previously
> claimed the budget as met at a median of **0.0036 ms**. That claim was
> WITHDRAWN (2026-09-22, midday): the number timed a *local arithmetic loop*,
> not a frame — see `Z:\HostileReviews\2026-09-22-141500-…` §7 and
> `2026-09-22-140126` D1. What follows is the REPLACEMENT those reviews
> demanded: real browser, real WebGL, built chunk, 40 nodes, observable output,
> mutation-proven. Measured **2026-09-22 evening**.

> *"`performance.now()` frame samples ≤ 16.7 ms median with 40 nodes"*

Command chain (reproduce end-to-end):

```
npx vite build                              # or: npm run build
node bench/frame-bench.mjs --prepare        # rewrites dist/frame-bench.html at the current chunk hash
npx vite preview --port 4179                # serves dist/
agent-browser open http://localhost:4179/frame-bench.html
agent-browser snapshot                      # read the T_E3_RESULT line
agent-browser close
```

Result — **two runs, kept in order. The first is historical; the second is current.**

**HISTORICAL (superseded, not re-encoded).** Captured 2026-09-22 ~19:05 from the build whose
chunk was `constellation-three-D4BBPI9v.js`. That `dist/` was cleaned later the same evening, so
this receipt can no longer be reproduced by pointing at it — it is kept **verbatim and untouched**
(Astra R3 #7: do not hand-transform old JSON into the new shape):

```
T_E3_RESULT {"nodes":40,"frames":120,"drawn":true,
 "centerPixel":[229,72,77,255],"medianMs":0.1,"p95Ms":0.3,"maxMs":0.8,
 "ceiling":16.7,"renderer":"WebKit WebGL",
 "method":"cpu submit time per scene.frame(); gpu completion forced via
 readPixels after warm-up and after the timed loop","pass":true}
```

**CURRENT — captured 2026-09-22 21:10, with build identity.** Source: `web/bench/frame-bench.mjs`
(E5-hardened) + `constellation-three.ts` (sha256 `11b91b5b0537ab76…`). Build: `npx vite build` →
`node bench/frame-bench.mjs --prepare` → chunk **`constellation-three-DFxS8x15.js`**, entry
`index-DQ5MUqsI.js`. Verbatim from the page:

```
T_E3_RESULT {"nodes":40,"frames":{"cpu":120,"sync":60,"dolly":80},"drawn":true,"centerPixel":[229,72,77,255],"freshChangedPx":90740,"medianMs":0.1,"p95Ms":0.2,"syncMedianMs":0.4,"alloc":{"first":30,"final":30,"grew":0},"diagnostics":{"geometries":30,"textures":0,"drawCalls":65,"cameraZ":34.14062740899323},"dolly":{"zStart":43.942353089717706,"zEnd":34.14062740899323,"moved":true,"converged":true},"zDisabledStart":34.14062740899323,"zDisabledEnd":34.14062740899323,"ceiling":16.7,"renderer":"WebKit WebGL","method":"cpu: scene.frame() submit time; sync: same with readPixels per frame; completion forced at readPixels points","guards":{"freshRender":true,"cpuPass":true,"syncPass":true,"allocPass":true,"dollyPass":true,"noDollyWhenDisabled":true},"pass":true}
```

How to read the current receipt:

- **`drawn: true`** — the centre pixel reads `#E5484D` (a `stale` node's colour)
  through `readPixels` *after* a forced completion: a renderer that never draws
  reads `[0,0,0,0]` (proven by mutation, below, not assumed).
- **`freshRender: true`, `freshChangedPx: 90740`** — E5 (Astra R2 #6): after
  warm-up all 40 node states were flipped (colour only — positions untouched, so
  the camera fit cannot move) and the full canvas had to change. A renderer that
  paints during warm-up and then freezes keeps `drawn:true` but cannot produce
  90,740 changed pixels. Guard is `freshRender` in `guards`.
- **`median 0.1 ms`, `syncMedianMs 0.4 ms`, ≤ 16.7 ceiling** — the clause's
  sample basis (CPU submit) plus the stricter per-frame-completion variant
  (`syncPass`): `readPixels` inside *every* sync sample, so a raster tail cannot
  hide between samples. This supersedes the historical run's stated limit
  ("completion forced at two points, not per frame") — that limitation is what
  `syncPass` was added to close.
- **`alloc 30 → 30, grew 0`** and **dolly moved+converged with
  `noDollyWhenDisabled` bit-identical** — real-scene observations (U3), not
  empty-layout assertions: `allocPass`/`dollyPass`/`noDollyWhenDisabled` are now
  guards in `pass`.
- **`renderer: "WebKit WebGL"`** — Chromium's masked string; the page cannot
  further identify the GL backend (backend read once from `chrome://gpu`:
  ANGLE/D3D11 on RTX 5090).

**All three mutations the reviews required were executed and killed:**

| Mutation (then reverted) | Result | Guard |
|---|---|---|
| 25 ms busy-wait injected into `frame()` | median **25.2 ms** → `pass:false` | timing guard fires |
| `renderer.render(...)` commented out | `drawn:false`, `centerPixel:[0,0,0,0]` → `pass:false` | output guard fires |
| render frozen after warm-up (frames 4+, `MUTANT-E5`) | `freshChangedPx:0`, `freshRender:false` → `pass:false` **while cpu/sync/alloc/dolly all stayed true** | E5 freshness guard fires — this is exactly the gap R2 #6 named: a frozen renderer *passes* every timing guard |

Restoration is byte-verified each time: after the E5 mutation the source was restored to
sha256 `11b91b5b0537ab76…` (identical to the pre-mutation backup), rebuilt to the **same chunk
hash `DFxS8x15`**, and the final run reproduced the baseline above (90,740 changed px,
`pass:true`).

**Found and fixed while capturing the current run (worth its own line):** the first post-E5 run
came back `allocPass:false` — `first:78, final:126, grew:48`. Cause: an **un-reverted test
mutation** in `constellation-three.ts` (marker `MUTATION-ALLOC: dispose removed`, mtime 19:05)
had deleted the arc-geometry dispose the D2 comment prescribes. The new `allocPass` guard caught
it on its first outing; dispose restored, geometry back to 30 → 30, `grew:0`.

**Still NOT claimed / updated same evening (round 4):** `constellation-budget.test.ts` was
**rewritten** — the empty-layout "allocation" case and the invented-gate "dolly" case are gone,
replaced by a real `layoutBrains(400)` poll-cost case and a purity pin; renderer-frame claims
live only in `web/bench/frame-bench.mjs`. Astra's allocation/dolly asks are live guards
(`allocPass`/`dollyPass`/`noDollyWhenDisabled`), and rounds 3-4 together killed **five**
mutations against this bench's guards: T25 busy-wait → 25.2 ms; empty render → `drawn:false`;
E5 frozen render → `freshChangedPx:0`; **MUTATION-ALLOC** (rebuild dispose removed →
`grew:48` → `allocPass:false`); **MUTATION-DOLLY** (`dollyT` forced to 1 → `moved:false` →
`dollyPass:false`) — each restored and re-verified (final chunk `DFxS8x15`, markers 0,
baseline `pass:true`). **Contamination note:** two seats edited `frame-bench.mjs`, this file
and `web/dist` concurrently this evening (the E5 guard and receipt restructure arrived
mid-round; one receipt pairs an entry hash from a mutation-era build with the reverted chunk's
hash — runtime numbers unaffected, build-identity provenance is the loss). Any further
hardening beyond the guards in the receipt remains open by choice, not by omission.

**Q3 bundle note (measured on this same build):** entry → chunk edge is
**dynamic only**; three.js code: 0 in entry, 6 in chunk; `index.html` references
only the entry. The chunk → entry edge exists for the shared pure layout modules
and is the reason the bench boots the entry first (mirroring production order,
where the entry is the page).

## 5. "Sean has seen it" — the render

![Brain constellation, CD3 Vault Observatory](S5-brain-constellation.png)

Reproduce with:

```
node docs/ai-workflow/blueprints/creator-brains-console-20260917/s5-render-evidence.mjs
```

The harness drives **Chromium via Playwright** against a Vite dev server and
mounts the **shipped `BrainConstellation` component** — not a copy, not a mock.
The data is synthetic (this store's `journal.json` reads `"no enabled creators —
nothing to do"`, so a live bridge would render an empty panel and "satisfy" the
gate while showing Sean nothing). The component, its gates, its layout maths and
its render path are all the shipping article.

**Render-time assertions, not a judgement of the image:**

| Check | Measured |
|---|---|
| canvas elements | 1 |
| roster DOM entries | 40 |
| canvas readback — `on` (`#60C0F0`) | **42 576 px** |
| canvas readback — `off` (`#4070C0`) | **15 927 px** |

The pixel census is the check the unit tests cannot make: it proves the **state
map reached the GPU**, by reading the framebuffer rather than by asserting the
map's contents. The roster is 32 enabled / 8 disabled; using `readPixels` inside
a `requestAnimationFrame` callback (the renderer correctly does *not* set
`preserveDrawingBuffer`, so a top-level read returns cleared data and would
silently report "no nodes").

---

## Two defects found BY the render, and fixed

The render was not a formality — building it surfaced two real defects that the
green suite could not see, because both live in the seam between the React tree
and the WebGL scene.

**S5-D1 (P1) — the camera crop.** The camera distance was a hardcoded `z = 230`,
and `resize()` updated only the aspect. A node at the near pole sits far closer to
the camera than one at the far pole, so on a 1040x560 panel the near hemisphere
was pushed outside the frame — nodes clipped at the bottom and left edges. Nudging
the constant does not fix this: the panel is resizable and the roster size varies.
**Fix:** the extent is measured from the real node positions in `update()` and the
distance is **solved** from the FOV and aspect (`constellation-scene-parts.ts`
`distanceToFit`), re-solved on every resize. The entry dolly now pushes *in to the
fitted distance* rather than to a second constant.

**S5-D2 (P1) — pointer coordinates mapped against the wrong box.** `scene.pick()`
compares against coordinates projected through the camera, so its input domain is
the **canvas**. The component normalised against the **frame** rect — which also
contains the roster list and is therefore taller. Every pointer position was
scaled into a box taller than the one drawn into, and since `pick()` uses a ~6%
hit radius, that selects the wrong node or misses a click entirely; the error grows
as the roster lengthens. The same mistake sized the renderer (`scene.resize` was
called with the frame rect while the canvas occupied a shorter box), which is what
produced the initial squashed, vertically-offset frame. **Fix:** the canvas is
measured for both. Encoded as `constellation-pointer.ts`, whose comment records why
the frame rect is the wrong one.

Both were invisible to T-T1/T-T2/T-W7 because those test the layout function, the
loop controller and the gates — none of which computes a camera distance or a
pointer transform. **This is the slice's own exit gate earning its place**: "Sean
has seen it" is not a courtesy criterion.

---

## Rule 4 (300-line cap)

The framing fix pushed `constellation-three.ts` to 335 and then
`BrainConstellation.tsx` to 314. Both were resolved by **extraction at a seam**,
never by raising the cap and never by trimming the reasoning out of comments —
`BrainConstellation.tsx` is 199 code lines against 101 comment lines, so the
reasoning is most of its bulk and is precisely the part that keeps these defects
from returning.

| New module | Seam |
|---|---|
| `constellation-scene-parts.ts` | what the scene is *made of* (geometry cache, star field, the fit solver) vs what it *does* over time |
| `constellation-walk.ts` | a pure `(nodes, focused, key) → action` — testable with no React and no WebGL |
| `constellation-pointer.ts` | where the user pointed, in the canvas's own coordinates |
| `ConstellationRoster.tsx` | "what the panel renders when the constellation is not doing the work" |

`ConstellationRoster.tsx` also absorbed the two overlay captions and the canvas
element, so the accessible name and the element it names cannot drift apart.

---

## Suite state at S5 exit

| Suite | Result |
|---|---|
| engine | **222 pass / 0 fail / 6 skipped** (228) |
| console | **348 pass / 0 fail** (348) |
| web | **174 pass / 0 fail** (19 files) |
| `tsc --noEmit` | **0 errors** |
| build | clean, 221.70 kB initial / 523.86 kB deferred chunk (the build §4 benches) |
| T-E3 in-browser bench | **pass** — drawn:true, median 0.1 ms ≤ 16.7; both mutations killed |
| Rule 4 | **0 files over 300** |

The extraction above was confirmed behaviour-preserving by a **byte-identical
canvas readback** (`on: 42576, off: 15927, other: 2096385`) before and after the
refactor — stronger than "the tests still pass", because it checks the rendered
output rather than the assertions about it.
