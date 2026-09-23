"""
Spec-gate probe for the SwanStudios header swan mark.

Reads the LIVE header logo (frontend/src/assets/Logo.png) and reports the facts a
3D reconstruction must be derived from, rather than remembered:
  - true pixel dimensions and colour model
  - alpha / silhouette geometry (is it a circle badge? where is the content box?)
  - palette clusters with sampled hex + population share
  - a coarse facet map so the low-poly topology can be inventoried

Read-only. Writes nothing but stdout.
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parents[5]
SRC = REPO / "frontend" / "src" / "assets" / "Logo.png"


def rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    return "#{:02X}{:02X}{:02X}".format(*rgb)


def main() -> int:
    if not SRC.exists():
        print(f"FAIL: reference not found at {SRC}", file=sys.stderr)
        return 2

    img = Image.open(SRC)
    print(f"file            : {SRC.relative_to(REPO)}")
    print(f"bytes           : {SRC.stat().st_size:,}")
    print(f"mode            : {img.mode}")
    print(f"size            : {img.width} x {img.height}")
    print(f"aspect          : {img.width / img.height:.6f}")
    print(f"info keys       : {sorted(img.info.keys())}")

    rgba = img.convert("RGBA")
    a = np.asarray(rgba, dtype=np.uint8)
    alpha = a[:, :, 3]

    print("\n--- ALPHA ---")
    print(f"alpha min/max   : {int(alpha.min())} / {int(alpha.max())}")
    opaque = alpha == 255
    transparent = alpha == 0
    partial = (~opaque) & (~transparent)
    total = alpha.size
    print(f"fully opaque    : {opaque.sum():>9,}  ({opaque.sum() / total:7.3%})")
    print(f"fully transp.   : {transparent.sum():>9,}  ({transparent.sum() / total:7.3%})")
    print(f"partial alpha   : {partial.sum():>9,}  ({partial.sum() / total:7.3%})")

    if opaque.any():
        ys, xs = np.nonzero(opaque)
        print(f"opaque bbox     : x[{xs.min()}..{xs.max()}] y[{ys.min()}..{ys.max()}]")
        print(f"opaque bbox wh  : {xs.max() - xs.min() + 1} x {ys.max() - ys.min() + 1}")

    # Is the opaque region a centred circle?
    if opaque.any():
        ys, xs = np.nonzero(opaque)
        cx = (xs.min() + xs.max()) / 2.0
        cy = (ys.min() + ys.max()) / 2.0
        r = (xs.max() - xs.min() + 1) / 2.0
        yy, xx = np.mgrid[0 : a.shape[0], 0 : a.shape[1]]
        inside = (xx - cx) ** 2 + (yy - cy) ** 2 <= (r * 0.995) ** 2
        coverage = opaque[inside].mean() if inside.any() else 0.0
        print(f"centre          : ({cx:.1f}, {cy:.1f})  radius~{r:.1f}")
        print(f"circle fill     : {coverage:.4%} of the inscribed disc is opaque")
        print("                 (near 100% => the badge is a filled circle)")

    # Content mask = pixels that differ from the dominant background colour.
    rgb = a[:, :, :3].astype(np.int16)
    flat = rgb.reshape(-1, 3)
    step = max(1, flat.shape[0] // 400_000)
    sample = flat[::step]
    quant = (sample // 8) * 8
    counts = Counter(map(tuple, quant.tolist()))
    bg_q, bg_n = counts.most_common(1)[0]
    print("\n--- BACKGROUND ---")
    print(f"dominant bucket : {rgb_to_hex(bg_q)}  ({bg_n / len(sample):.2%} of sampled px)")
    bg = np.array(bg_q, dtype=np.int16)
    dist = np.abs(rgb - bg).sum(axis=2)
    content = (dist > 24) & opaque
    print(f"content pixels  : {int(content.sum()):,}")
    if content.any():
        ys, xs = np.nonzero(content)
        bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
        print(f"content bbox    : x[{bx0}..{bx1}] y[{by0}..{by1}]  ->  {bx1 - bx0 + 1} x {by1 - by0 + 1}")
        W = a.shape[1]
        print(
            "normalised      : x[{:.4f}..{:.4f}] y[{:.4f}..{:.4f}]".format(
                bx0 / W, bx1 / W, by0 / W, by1 / W
            )
        )
        # The swan sits off-centre on the badge; measure that offset, do not assume.
        print(
            f"content centroid: ({xs.mean() / W:.4f}, {ys.mean() / a.shape[0]:.4f}) "
            f"vs badge centre (0.5000, 0.5000)"
        )

    print("\n--- PALETTE (content pixels only, k-means-free histogram) ---")
    cpx = a[:, :, :3][content]
    if cpx.size:
        q = (cpx.astype(np.int16) // 12) * 12
        cc = Counter(map(tuple, q.tolist()))
        print(f"{'hex':<9} {'share':>8}  mean-of-bucket")
        for bucket, n in cc.most_common(22):
            sel = q == np.array(bucket, dtype=np.int16)
            mean = cpx[sel.all(axis=1)].mean(axis=0)
            print(
                f"{rgb_to_hex(bucket):<9} {n / len(cpx):>7.3%}  "
                f"{rgb_to_hex(tuple(int(v) for v in mean.round()))}"
            )

    # Brightness ramp tells us the facet shading direction (light source).
    print("\n--- LUMINANCE RAMP over content (sampled) ---")
    lum = (0.2126 * cpx[:, 0] + 0.7152 * cpx[:, 1] + 0.0722 * cpx[:, 2]) if cpx.size else np.array([])
    if lum.size:
        for p in (1, 5, 25, 50, 75, 95, 99):
            print(f"  p{p:<3}: {np.percentile(lum, p):6.1f}")

    # Coarse 16x16 facet map: mean colour per cell, so topology can be read off.
    print("\n--- 16x16 CELL MAP (mean colour, '.' = background/transparent) ---")
    N = 16
    h, w = a.shape[:2]
    rows = []
    for gy in range(N):
        row = []
        for gx in range(N):
            y0, y1 = gy * h // N, (gy + 1) * h // N
            x0, x1 = gx * w // N, (gx + 1) * w // N
            cell_mask = content[y0:y1, x0:x1]
            if cell_mask.mean() < 0.35:
                row.append("  .    ")
                continue
            cell = a[y0:y1, x0:x1, :3][cell_mask]
            m = cell.mean(axis=0).round().astype(int)
            row.append(rgb_to_hex(tuple(m)))
        rows.append(" ".join(row))
    for i, r in enumerate(rows):
        print(f"{i:>2} {r}")

    print("\nOK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
