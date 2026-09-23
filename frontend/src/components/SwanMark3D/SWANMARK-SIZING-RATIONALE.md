# SwanMark sizing rationale — why the two-canvas design exists

Moved here on 2026-09-21 from the leading comment block of `swanMarkScene.ts`, verbatim and
without abridgement. It was 62 lines of the 300 Rule 4 allows that file, and A8's reveal needed
the room.

**Nothing on this page was chosen. Everything here was measured.** Before changing any of the
four constants named at the end, read the table and the correction below — including the part
where a Python model produced the wrong answer and only a real browser caught it.

---

## Why there are two canvases

The displayed canvas is a 2D canvas. The WebGL canvas is a detached scratch buffer that is
blitted into it. This is not decoration — it is measurably better, and the measurement is the
only reason it is here.

A canvas laid out smaller than its backing store is downscaled by the browser's **COMPOSITOR**,
whose filter degrades badly with ratio. Blitting with `drawImage` +
`imageSmoothingQuality = 'high'` uses the image resampler instead (the same path an `<img>`
takes), which is better at every size. Mean max-channel error against the shipped PNG, in a real
browser (`evidence/policy_choice.py`, `evidence/shoot-blit.mjs`):

```
  css   compositor   drawImage(k=2)
   16        7.64           5.89
   28        5.32           4.31
   36        4.68           3.93
   52        3.93           3.43
  128        2.97           2.76
  mean      4.758          3.979
```

## Why k=2, and why not more

Both resamplers get **WORSE** past roughly 2x, so more source resolution is actively harmful
rather than merely wasteful. Measured, compositor path:

```
1x 5.515   2x 4.758   3x 6.436   4x 5.651   8x 6.660   16x 7.329   64x 7.625
```

and the same shape via `drawImage` (k=2 3.979, k=4 5.343, k=8 6.589). An absolute minimum
backing store was also tried and is harmful, because it forces a large downscale ratio at small
sizes; `minBacking` therefore defaults to **no floor**.

## The correction

An earlier version of this reasoning modelled the downscale with Python/LANCZOS and concluded
**4x was best. That was wrong** — LANCZOS is not what a browser does — and only in-browser
measurement caught it. The LANCZOS floor is 1.47–2.44 and is **not reachable through either
browser path**; 3.98 is the practical limit.

The lesson is recorded here rather than in a commit message because the constant it produced
looks arbitrary and is the kind of thing a later reader "tidies" back to a rounder number.

## Why render-on-demand

A static logo must not cost a rAF loop forever. `requestRender()` coalesces to one frame, and a
continuous loop runs only while something is actually moving — drift, or the finite reveal. The
header therefore costs **zero GPU when idle**.

---

## The constants this protects

| Constant | Value | Source file | What measurement set it |
|---|---|---|---|
| `supersample` | `2` | `swanMarkScene.ts` | the k-table above; 4x was measurably worse |
| `minBacking` | `1` (no floor) | `swanMarkScene.ts` | no floor beats any floor at small sizes |
| `maxBacking` | `1024` | `swanMarkScene.ts` | shipped value, upheld by A0r ruling 4 |
| `maxPixelRatio` | `2` | `swanMarkScene.ts` | a 3x phone triples the work for no visible gain |

All four are asserted by `SwanMark3D.contract.test.ts` (`describe('sizing policy')`), which
reads them out of the source text. If you change one, that test is the first thing to tell you.
