"""Silhouette experiment: edge-barrier flood fill.

The problem: the swan's darkest region (#001158) is the same colour as the
badge's darkest region (#000C54), so no colour threshold separates them. But the
swan still has a hard EDGE there, while the drop shadow's edge is soft.

So: build a barrier from (strong gradient) OR (chroma, where colour does
separate) OR (the near-black beak), then flood the disc from its rim. Whatever
the flood cannot reach is inside the swan.

Run:  python silhouette_exp.py [grad_thresh] [dilate]
Writes dbg-sil-<tag>.png overlay for each candidate so the result is judged by eye.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from skimage import morphology

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
SRC = REPO / "frontend" / "src" / "assets" / "Logo.png"


def silhouette(rgb, alpha, grad_t, dil, chroma_r=4, beak=(35, 65)):
    h, w = alpha.shape
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    gy = np.zeros_like(lum)
    gx = np.zeros_like(lum)
    gy[1:-1, :] = lum[2:, :] - lum[:-2, :]
    gx[:, 1:-1] = lum[:, 2:] - lum[:, :-2]
    grad = ndimage.gaussian_filter(np.sqrt(gx * gx + gy * gy), 0.8)

    disc = alpha > 128
    hard = (grad > grad_t) | (r >= chroma_r) | ((g < beak[0]) & (b < beak[1]))
    barrier = morphology.dilation(hard, morphology.disk(dil)) & disc

    free = disc & ~barrier
    lab, n = ndimage.label(free, structure=np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]]))
    # anything touching the disc rim is OUTSIDE the swan
    yy, xx = np.mgrid[0:h, 0:w]
    cx = cy = (w - 1) / 2.0
    rr = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    rim = free & (rr > (w / 2.0) - 3)
    outside_ids = set(np.unique(lab[rim]).tolist()) - {0}
    outside = np.isin(lab, list(outside_ids))
    # everything not reachable from the rim is inside: the barrier ring itself,
    # plus any free pocket it encloses
    inside = disc & ~outside

    core = np.zeros_like(inside)
    if inside.any():
        li, ni = ndimage.label(inside, structure=np.ones((3, 3)))
        sz = ndimage.sum(inside, li, range(1, ni + 1))
        core = li == (int(np.argmax(sz)) + 1)
    swan = ndimage.binary_fill_holes(core) & disc
    swan = morphology.remove_small_objects(swan, max_size=2000)
    swan = morphology.remove_small_holes(swan, max_size=40000)
    return swan, grad


def main() -> int:
    img = Image.open(SRC).convert("RGBA")
    a = np.asarray(img, dtype=np.uint8)
    alpha = a[:, :, 3]
    rgb = a[:, :, :3].astype(np.float64)
    base = np.asarray(img.convert("RGB")).copy()

    cands = []
    if len(sys.argv) >= 3:
        cands = [(float(sys.argv[1]), int(sys.argv[2]))]
    else:
        for gt in (4.0, 6.0, 8.0, 11.0):
            for dl in (2, 3):
                cands.append((gt, dl))

    for gt, dl in cands:
        sil, _ = silhouette(rgb, alpha, gt, dl)
        ys, xs = np.nonzero(sil)
        if not sil.any():
            print(f"grad>{gt:<5} dilate {dl}: EMPTY")
            continue
        tag = f"g{gt:g}-d{dl}"
        ov = base.copy()
        ov[sil & ~np.roll(sil, 1, 0)] = (255, 0, 0)
        ov[sil & ~np.roll(sil, 1, 1)] = (0, 255, 80)
        Image.fromarray(ov, "RGB").save(HERE / f"dbg-sil-{tag}.png")
        print(f"grad>{gt:<5} dilate {dl}: {int(sil.sum()):>8,} px  "
              f"bbox x[{xs.min()/1024:.4f}..{(xs.max()+1)/1024:.4f}] "
              f"y[{ys.min()/1024:.4f}..{(ys.max()+1)/1024:.4f}]  -> dbg-sil-{tag}.png")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
