"""
Pick the cheapest supersample factor that already sits on the error floor.

size_fidelity.py showed that rendering the object at 4x and letting CSS downscale
beats rendering at the native header size by 2.5-4.6x. It also showed the 4x error
is FLAT (~2.2) across 16..128 px, which suggests 4x is already past the point of
diminishing returns - the residual is the facet partition, not the resolution.

This script tests that directly: header sizes at factors 1, 2, 4 and 8, against the
PNG downscaled to the same size. If 2x is already on the floor, shipping 4x is
wasted GPU; if 4x is meaningfully better than 2x, the extra is earned.

Usage:  python supersample_sweep.py
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
SRC = REPO / "frontend" / "src" / "assets" / "Logo.png"

SIZES = [24, 28, 32, 36, 44, 52]
FACTORS = [1, 2, 4, 8]


def composite_on(im: Image.Image, bg=(10, 10, 15)) -> np.ndarray:
    a = np.asarray(im.convert("RGBA"), dtype=np.float64) / 255.0
    rgb, alpha = a[:, :, :3], a[:, :, 3:4]
    bgv = np.array(bg, dtype=np.float64) / 255.0
    return (rgb * alpha + bgv * (1 - alpha)) * 255.0


def main() -> int:
    ref = Image.open(SRC).convert("RGBA")

    print(f"{'size':>5} " + "".join(f"{'x'+str(f):>10}" for f in FACTORS) + "   best")
    print("-" * (7 + 10 * len(FACTORS) + 10))

    table: dict[int, dict[int, float]] = {}
    for n in SIZES:
        truth = composite_on(ref.resize((n, n), Image.LANCZOS))
        row = {}
        for f in FACTORS:
            p = HERE / f"shot-ssw-{n}x{f}.png"
            if not p.exists():
                print(f"{n:>5}   missing {p.name}")
                return 1
            img = Image.open(p).convert("RGBA")
            if img.size != (n * f, n * f):
                print(f"{n:>5}   {p.name} is {img.size}, expected {(n * f, n * f)}")
                return 1
            cand = composite_on(img.resize((n, n), Image.LANCZOS))
            row[f] = float(np.abs(cand - truth).max(axis=2).mean())
        table[n] = row
        best = min(row, key=lambda k: row[k])
        cells = "".join(
            f"{row[f]:>9.2f}{'*' if f == best else ' '}" for f in FACTORS
        )
        print(f"{n:>5} {cells}   x{best}")

    print()
    print("mean across sizes:")
    means = {f: float(np.mean([table[n][f] for n in SIZES])) for f in FACTORS}
    for f in FACTORS:
        print(f"  x{f}: {means[f]:.3f}")
    print()

    # Marginal gain: how much does each step actually buy?
    print("marginal gain vs the previous factor:")
    for i in range(1, len(FACTORS)):
        a, b = FACTORS[i - 1], FACTORS[i]
        gain = means[a] - means[b]
        pct = 100 * gain / means[a]
        print(f"  x{a} -> x{b}: {gain:+.3f} ({pct:+.1f}%)")
    print()

    # x8 as the practical floor reference: if x4 is within 2% of x8, x4 is enough.
    floor = means[8]
    for f in FACTORS:
        d = 100 * (means[f] - floor) / floor
        tag = "ON FLOOR" if d <= 2.0 else "above floor"
        print(f"  x{f} is {d:+.1f}% vs x8  -> {tag}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
