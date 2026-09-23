"""
Is the flat-per-facet colour model leaving fidelity on the table?

BACKGROUND
----------
`HOSTILE-REVIEW.md` D-3 claimed: "Flat per-facet colour is the correct model for a
banded low-poly design; fitting a gradient inside a facet would fight the design,
not match it." That claim was made by LOOKING at the reference, not by measuring it.
The error map says the interior carries most of the error, so the claim is suspect.

THE EXPERIMENT
--------------
Hold the partition FIXED - the same facet label map the shipped model uses - and
change only how each facet is shaded:

  A. FLAT      - one colour per facet (what ships)
  B. LINEAR    - least-squares plane per facet, RGB independently: c0 + cx*x + cy*y
  C. QUADRATIC - full quadratic per facet

Then measure each against the reference pixels. Same partition, same pixels, one
variable. If B beats A materially, D-3 was wrong and there is real headroom.

This measures the SHADING ceiling only. It is not a render - it says nothing about
whether three.js can express the winner (a vertex-coloured mesh can; that is a
separate, later question).

Usage:  python experiment_facet_shading.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
SRC = REPO / "frontend" / "src" / "assets" / "Logo.png"
SPEC = HERE / "swan-mark.mesht1.8.json"
SIZE = 1024


def rasterise_labels(spec: dict) -> np.ndarray:
    """Facet label per pixel, painted from the mesh. -1 = not covered."""
    lab = Image.new("I", (SIZE, SIZE), -1)
    from PIL import ImageDraw

    draw = ImageDraw.Draw(lab)
    verts = spec["mesh"]["vertices"]
    tris = spec["mesh"]["triangles"]
    tf = spec["mesh"]["triangleFacet"]
    for t, f in zip(tris, tf):
        pts = [(verts[i][0] * SIZE, verts[i][1] * SIZE) for i in t]
        draw.polygon(pts, fill=int(f))
    return np.asarray(lab)


def fit_residual(labels: np.ndarray, ref: np.ndarray, mode: str) -> tuple[float, int]:
    """Mean |residual| over covered pixels for the given shading model."""
    H, W = labels.shape
    ys, xs = np.mgrid[0:H, 0:W]
    total_abs = 0.0
    total_px = 0
    for fid in np.unique(labels):
        if fid < 0:
            continue
        m = labels == fid
        n = int(m.sum())
        if n < 4:
            continue
        x = xs[m].astype(np.float64) / W
        y = ys[m].astype(np.float64) / H
        P = ref[m].astype(np.float64)  # (n, 3)

        if mode == "flat":
            # Best constant per channel is the median; use the mean, which is what
            # a least-squares constant fit gives - comparable to the others.
            A = np.ones((n, 1))
        elif mode == "linear":
            A = np.stack([np.ones(n), x, y], axis=1)
        elif mode == "quadratic":
            A = np.stack([np.ones(n), x, y, x * x, x * y, y * y], axis=1)
        else:
            raise ValueError(mode)

        coef, *_ = np.linalg.lstsq(A, P, rcond=None)
        pred = A @ coef
        total_abs += np.abs(pred - P).sum()
        total_px += n * 3
    return total_abs / max(total_px, 1), total_px // 3


def main() -> int:
    spec = json.loads(SPEC.read_text())
    ref = np.asarray(Image.open(SRC).convert("RGB"), dtype=np.uint8)
    if ref.shape[:2] != (SIZE, SIZE):
        ref = np.asarray(Image.open(SRC).convert("RGB").resize((SIZE, SIZE), Image.LANCZOS))

    labels = rasterise_labels(spec)
    covered = (labels >= 0)
    print(f"spec          : {SPEC.name}")
    print(f"facets        : {len(spec['facets'])}")
    print(f"covered px    : {covered.sum():,} of {SIZE*SIZE:,} "
          f"({covered.mean():.1%}) - the swan silhouette only\n")

    print(f"{'shading model':>14} {'mean |err|':>11} {'vs flat':>9}")
    print("-" * 37)
    base = None
    for mode in ("flat", "linear", "quadratic"):
        err, px = fit_residual(labels, ref, mode)
        if base is None:
            base = err
        rel = f"{err / base - 1:+.1%}" if mode != "flat" else "-"
        print(f"{mode:>14} {err:>11.2f} {rel:>9}")

    print("\nInterpretation: this is the residual against the REFERENCE pixels, so it")
    print("measures shading fidelity only, not the render. A large drop for 'linear'")
    print("means the flat model is the binding constraint, not the partition.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
