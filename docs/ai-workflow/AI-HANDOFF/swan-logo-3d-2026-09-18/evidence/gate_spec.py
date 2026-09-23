"""
Gate the SPEC (not the Python rasteriser).

The Python rasteriser is a proxy for three.js; it can never reproduce the
reference's own anti-aliasing, so its global pixel error conflates two very
different things:

  A. is the RECONSTRUCTION right?  -> geometry + facet partition + colours
  B. does my rasteriser match the reference's AA?  -> not the deliverable

This script separates them. It reports:

  1. silhouette IoU  - spec outline vs the reference's swan
  2. FLAT-COLOUR FLOOR - the reference re-rendered with the spec's own facet
     partition and facet colours. This is the best ANY renderer can do with
     this facet set; it is the honest ceiling, and it is independent of the
     rasteriser.
  3. facet tightness - how much colour variation each facet still contains
  4. how much of the floor's error sits on facet boundaries vs interiors
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from skimage import morphology

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
SRC = REPO / "frontend" / "src" / "assets" / "Logo.png"
SIZE = 1024


def hex_to_rgb(h):
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def main() -> int:
    spec = json.loads((HERE / "swan-mark.mesh.json").read_text(encoding="utf-8"))
    ref = np.asarray(Image.open(SRC).convert("RGBA"), dtype=np.uint8)
    rgb = ref[:, :, :3].astype(np.float64)
    alpha = ref[:, :, 3]

    # --- reference swan mask (same rule the extractor uses) ------------------
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    gy = np.zeros_like(lum)
    gx = np.zeros_like(lum)
    gy[1:-1, :] = lum[2:, :] - lum[:-2, :]
    gx[:, 1:-1] = lum[:, 2:] - lum[:, :-2]
    grad = ndimage.gaussian_filter(np.sqrt(gx * gx + gy * gy), 0.8)
    disc = alpha > 128
    hard = (grad > 8.0) | (r >= 4) | ((g < 35) & (b < 65))
    barrier = morphology.dilation(hard, morphology.disk(3)) & disc
    free = disc & ~barrier
    lab, _ = ndimage.label(free, structure=np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]]))
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    c = (SIZE - 1) / 2.0
    rr = np.sqrt((xx - c) ** 2 + (yy - c) ** 2)
    oid = set(np.unique(lab[free & (rr > SIZE / 2.0 - 3)]).tolist()) - {0}
    inside = disc & ~np.isin(lab, list(oid))
    inside = morphology.erosion(inside, morphology.disk(3))
    li, ni = ndimage.label(inside, structure=np.ones((3, 3)))
    sz = ndimage.sum(inside, li, range(1, ni + 1))
    sil = ndimage.binary_fill_holes(li == (int(np.argmax(sz)) + 1)) & disc

    print("=== 1. silhouette ===")
    mo = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mo).polygon([(x * SIZE, y * SIZE) for x, y in spec["swan"]["outline"]],
                               fill=255)
    outline_mask = np.asarray(mo, dtype=np.uint8) > 128
    iou = np.logical_and(outline_mask, sil).sum() / np.logical_or(outline_mask, sil).sum()
    print(f"  spec outline vs reference swan IoU : {iou:.6f}")
    print(f"  spec outline area {int(outline_mask.sum()):,} px   "
          f"reference swan {int(sil.sum()):,} px   "
          f"delta {int(outline_mask.sum()) - int(sil.sum()):+,}")

    # --- 2. flat-colour floor ------------------------------------------------
    # Rebuild the facet label map from the spec's own rings.
    print("\n=== 2. flat-colour floor (spec partition, spec colours) ===")
    V = spec["mesh"]["vertices"]
    facets = spec["facets"]
    rings = spec["mesh"]["facetRings"]
    lbl = np.zeros((SIZE, SIZE), dtype=np.int32)
    for ring, fi in zip(rings, spec["mesh"]["ringFacet"]):
        m = Image.new("1", (SIZE, SIZE), 0)
        ImageDraw.Draw(m).polygon([(V[i][0] * SIZE, V[i][1] * SIZE) for i in ring], fill=1)
        lbl[np.asarray(m, dtype=bool)] = fi + 1
    covered = lbl > 0
    print(f"  ring rasterisation covers {int(covered.sum()):,} px "
          f"({covered.sum() / sil.sum():.4%} of the reference swan)")

    flat = np.zeros((SIZE, SIZE, 3), dtype=np.float64)
    for fi, f in enumerate(facets):
        flat[lbl == fi + 1] = hex_to_rgb(f["color"])
    both = covered & sil
    d = np.abs(flat - rgb).max(axis=2)
    print(f"  floor mean |dRGB| on the swan   : {d[both].mean():.3f}")
    print(f"  floor p50 / p90 / p99           : "
          f"{np.percentile(d[both], 50):.0f} / {np.percentile(d[both], 90):.0f} / "
          f"{np.percentile(d[both], 99):.0f}")
    for t in (4, 8, 16, 32):
        print(f"  floor share > {t:<3}                 : {(d[both] > t).mean():.3%}")

    # --- 3. facet tightness --------------------------------------------------
    print("\n=== 3. facet tightness ===")
    spreads = []
    for fi, f in enumerate(facets):
        m = lbl == fi + 1
        n = int(m.sum())
        if n < 100:
            continue
        spreads.append((f["colorSpread"], n, fi, f["areaPx"], f["color"], f["colorStd"]))
    spreads.sort(reverse=True)
    tot = sum(s[1] for s in spreads)
    w = sum(s[0] * s[1] for s in spreads) / tot
    print(f"  area-weighted mean within-facet colour spread: {w:.2f} levels")
    print(f"  facets whose own pixels vary by >8 levels: "
          f"{sum(1 for s in spreads if s[0] > 8)} of {len(spreads)}")
    print(f"  {'spread':>7} {'px':>7} {'facet':>6} {'color':>8}  colorStd")
    for sp, n, fi, area, col, cstd in spreads[:8]:
        print(f"  {sp:7.2f} {n:>7} {fi:>6} {col:>8}  "
              f"({cstd[0]:.1f},{cstd[1]:.1f},{cstd[2]:.1f})")

    # --- 4. where does the floor error live? ---------------------------------
    print("\n=== 4. floor error decomposition ===")
    fb = np.zeros((SIZE, SIZE), dtype=bool)
    for fi in range(len(facets)):
        m = lbl == fi + 1
        if not m.any():
            continue
        fb |= m & ~ndimage.binary_erosion(m, iterations=2)
    inner = both & ~fb
    print(f"  facet-boundary band (2px) : n={int((both & fb).sum()):>7,}  "
          f"mean {d[both & fb].mean():6.2f}")
    print(f"  facet interiors           : n={int(inner.sum()):>7,}  "
          f"mean {d[inner].mean():6.2f}  p90 {np.percentile(d[inner], 90):.0f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
