"""
Diagnose the mesh render against the reference.

Answers three questions with numbers, not impressions:
  1. Are there swan pixels no triangle covers?          (magenta probe)
  2. How much error is boundary band vs flat facet colour?  (erosion split)
  3. Which facets carry the most error, and do they have an internal gradient?
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
REF = REPO / "frontend" / "src" / "assets" / "Logo.png"
SIZE = 1024

spec = json.loads((HERE / "swan-mark.mesh.json").read_text(encoding="utf-8"))
ref = np.asarray(Image.open(REF).convert("RGBA"), dtype=np.uint8)
if ref.shape[0] != SIZE:
    ref = np.asarray(Image.open(REF).convert("RGBA").resize((SIZE, SIZE), Image.LANCZOS),
                     dtype=np.uint8)

sil = np.asarray(Image.open(HERE / "mesh-swan-mask.png"), dtype=np.uint8) > 128 \
    if (HERE / "mesh-swan-mask.png").exists() else None
# rebuild the silhouette from the spec outline instead
m = Image.new("L", (SIZE, SIZE), 0)
ImageDraw.Draw(m).polygon([(x * SIZE, y * SIZE) for x, y in spec["swan"]["outline"]], fill=255)
sil = np.asarray(m, dtype=np.uint8) > 128

# ---- 1. magenta probe -------------------------------------------------------
V = spec["mesh"]["vertices"]
T = spec["mesh"]["triangles"]
TF = spec["mesh"]["triangleFacet"]
facets = spec["facets"]

S = SIZE * 3
yy, xx = np.mgrid[0:S, 0:S].astype(np.float64)
u = (xx / (S - 1)) * 2 - 1
v = (yy / (S - 1)) * 2 - 1
B = np.stack([(u ** i) * (v ** j) for i, j in spec["badge"]["fieldTerms"]], axis=-1)
B = B.reshape(-1, len(spec["badge"]["fieldTerms"]))
field = np.clip(np.stack([B @ np.array(spec["badge"]["fieldCoef"][c]) for c in range(3)],
                         axis=1), 0, 255).reshape(S, S, 3)
cx, cy, r = S / 2, S / 2, S / 2
inside = ((xx + 0.5 - cx) ** 2 + (yy + 0.5 - cy) ** 2) <= (r - 0.5) ** 2
arr = np.zeros((S, S, 4), dtype=np.uint8)
arr[:, :, :3] = field.astype(np.uint8)
arr[:, :, 3] = np.where(inside, 255, 0).astype(np.uint8)
im = Image.fromarray(arr, "RGBA")
dr = ImageDraw.Draw(im, "RGBA")
MAGENTA = (255, 0, 255, 255)
dr.polygon([(x * S, y * S) for x, y in spec["swan"]["outline"]], fill=MAGENTA)
for t in T:
    dr.polygon([(V[i][0] * S, V[i][1] * S) for i in t], fill=MAGENTA)
probe = np.asarray(im.resize((SIZE, SIZE), Image.BOX), dtype=np.uint8)
mag = (probe[:, :, 0] > 200) & (probe[:, :, 2] > 200) & (probe[:, :, 1] < 60)
uncovered = mag & sil
print("=== 1. coverage probe ===")
print(f"  silhouette px            : {int(sil.sum()):,}")
print(f"  magenta px inside swan   : {int(uncovered.sum()):,}  "
      f"({uncovered.mean() * 100:.4f}% of the frame, "
      f"{uncovered.sum() / sil.sum():.4%} of the swan)")
if uncovered.any():
    lab, n = ndimage.label(uncovered, structure=np.ones((3, 3)))
    sz = ndimage.sum(uncovered, lab, range(1, n + 1))
    print(f"  uncovered blobs          : {n}  largest {int(sz.max())} px")

# ---- 2. real render ---------------------------------------------------------
ren = np.asarray(Image.open(HERE / "mesh-render-1024.png").convert("RGBA"), dtype=np.uint8)
err = np.abs(ren[:, :, :3].astype(np.int16) - ref[:, :, :3].astype(np.int16)).max(axis=2)

# boundary band of the swan = sil minus its erosion
band = sil & ~ndimage.binary_erosion(sil, iterations=2)
interior = sil & ndimage.binary_erosion(sil, iterations=2)
print("\n=== 2. error split ===")
for name, msk in (("swan boundary (2px)", band), ("swan interior", interior)):
    e = err[msk]
    print(f"  {name:<20} n={int(msk.sum()):>8,}  mean {e.mean():6.2f}  "
          f"p95 {np.percentile(e, 95):6.1f}  share>8 {(e > 8).mean():7.3%}")

# facet edge band: pixels near a facet boundary
fb = np.zeros_like(sil)
for i in np.unique(TF):
    pass
# cheap approximation: colour discontinuities inside the swan
gi = np.zeros_like(err, dtype=float)
gi[1:-1, :] += np.abs(np.diff(ref[:, :, 1].astype(float), axis=0))[:-1, :]
gi[:, 1:-1] += np.abs(np.diff(ref[:, :, 1].astype(float), axis=1))[:, :-1]
edge = sil & (gi > 6)
print(f"  swan colour edges        n={int(edge.sum()):>8,}  mean {err[edge].mean():6.2f}  "
      f"share>8 {(err[edge] > 8).mean():7.3%}")
print(f"  swan flat interior       n={int((interior & ~edge).sum()):>8,}  "
      f"mean {err[interior & ~edge].mean():6.2f}  "
      f"share>8 {(err[interior & ~edge] > 8).mean():7.3%}")

# ---- 3. worst facets --------------------------------------------------------
print("\n=== 3. worst facets (error over the facet's own pixels) ===")
lbl = np.zeros((SIZE, SIZE), dtype=np.int32)
dr2 = ImageDraw.Draw(Image.new("L", (1, 1)))
tmp = Image.new("I", (SIZE, SIZE), 0)
for fi, f in enumerate(facets):
    m2 = Image.new("1", (SIZE, SIZE), 0)
    d2 = ImageDraw.Draw(m2)
    for t, tf in zip(T, TF):
        if tf != fi:
            continue
        d2.polygon([(V[i][0] * SIZE, V[i][1] * SIZE) for i in t], fill=1)
    lbl[np.asarray(m2, dtype=bool)] = fi + 1
del dr2, tmp

rows = []
for fi, f in enumerate(facets):
    msk = (lbl == fi + 1) & sil
    if msk.sum() < 200:
        continue
    e = err[msk]
    rows.append((e.mean(), fi, f["areaPx"], f["meanColor"],
                 f["colorStd"], (e > 8).mean()))
rows.sort(reverse=True)
print(f"{'meanErr':>8} {'facet':>6} {'areaPx':>8} {'color':>8}  colorStd(RGB)        share>8")
for mean_e, fi, area, col, cstd, sh in rows[:14]:
    print(f"{mean_e:8.2f} {fi:>6} {area:>8} {col:>8}  "
          f"({cstd[0]:5.1f},{cstd[1]:5.1f},{cstd[2]:5.1f})  {sh:7.2%}")

tot = sum(r[0] * facets[r[1]]["areaPx"] for r in rows)
area = sum(facets[r[1]]["areaPx"] for r in rows)
print(f"\nfacet-area-weighted mean error: {tot / area:.3f}")
hi_grad = [r for r in rows if max(r[4]) > 12]
print(f"facets with internal gradient (colorStd>12): {len(hi_grad)} of {len(rows)}")
if hi_grad:
    ga = sum(facets[r[1]]["areaPx"] for r in hi_grad)
    ge = sum(r[0] * facets[r[1]]["areaPx"] for r in hi_grad) / ga
    print(f"  they cover {ga:,} px ({ga / area:.1%} of swan) at mean error {ge:.2f}")
