"""Is the candidate systematically offset from the reference?

Sweeps sub-pixel shifts and scale, and reports the error at each. A clear
minimum away from (0,0) means the pipeline has a registration bug; a minimum at
(0,0) means the residual error is boundary modelling, not misalignment.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
REF = REPO / "frontend" / "src" / "assets" / "Logo.png"
SIZE = 1024


def err(ref, cand, mask):
    d = np.abs(cand[:, :, :3].astype(np.int16) - ref[:, :, :3].astype(np.int16)).max(axis=2)
    return float(d[mask].mean())


def main() -> int:
    cand_p = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "mesh-render-1024.png"
    ref = np.asarray(Image.open(REF).convert("RGBA"), dtype=np.uint8)
    sil = np.asarray(Image.open(HERE / "dbg-silhouette.png"), dtype=np.uint8) > 128 \
        if (HERE / "dbg-silhouette.png").exists() else None
    # rebuild swan mask from the silhouette experiment instead
    from scipy import ndimage
    from skimage import morphology
    rgb = ref[:, :, :3].astype(np.float64)
    alpha = ref[:, :, 3]
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
    outside = np.isin(lab, list(oid))
    inside = disc & ~outside
    li, ni = ndimage.label(inside, structure=np.ones((3, 3)))
    sz = ndimage.sum(inside, li, range(1, ni + 1))
    sil = li == (int(np.argmax(sz)) + 1)
    sil = ndimage.binary_fill_holes(sil) & disc
    print(f"swan mask {int(sil.sum()):,} px")

    cand0 = Image.open(cand_p).convert("RGBA")
    print(f"\n{'dx':>6} {'dy':>6} {'scale':>7} {'swanMean':>9} {'discMean':>9}")
    best = None
    for scale in (1.0, 0.9985, 0.99925, 1.00075, 1.0015):
        base = cand0
        if scale != 1.0:
            n = int(round(SIZE * scale))
            big = cand0.resize((n, n), Image.LANCZOS)
            off = (n - SIZE) // 2
            base = big.crop((off, off, off + SIZE, off + SIZE))
        for dx in (-1.0, -0.5, -0.25, 0.0, 0.25, 0.5, 1.0):
            for dy in (-1.0, -0.5, -0.25, 0.0, 0.25, 0.5, 1.0):
                shifted = base.transform(
                    (SIZE, SIZE), Image.AFFINE, (1, 0, -dx, 0, 1, -dy),
                    resample=Image.BILINEAR, fillcolor=(0, 0, 0, 0))
                cand = np.asarray(shifted, dtype=np.uint8)
                e = err(ref, cand, sil)
                on = (cand[:, :, 3] > 128) | (alpha > 128)
                de = err(ref, cand, on)
                if best is None or e < best[0]:
                    best = (e, dx, dy, scale)
                if abs(dx) <= 0.5 and abs(dy) <= 0.5 and scale in (1.0,):
                    print(f"{dx:6.2f} {dy:6.2f} {scale:7.5f} {e:9.3f} {de:9.3f}")
    print(f"\nBEST: swanMean {best[0]:.3f} at dx={best[1]} dy={best[2]} scale={best[3]}")
    if best[1] == 0 and best[2] == 0 and best[3] == 1.0:
        print("=> registration is correct; residual error is boundary modelling")
    else:
        print("=> REGISTRATION BUG: the pipeline is off by a sub-pixel shift/scale")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
