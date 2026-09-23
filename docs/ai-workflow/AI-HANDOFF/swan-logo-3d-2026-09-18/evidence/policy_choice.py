"""
Choose the canvas sizing policy from measurement, in a real browser.

WHY THIS EXISTS
---------------
The first attempt at this used Python to downscale a large render with LANCZOS and
concluded that supersampling 4x was 2.5x better than rendering natively. That was
WRONG, and the error was methodological: LANCZOS is not what a browser does to a
canvas. Chrome's canvas compositing filter degrades badly past ~2x, so a 4x
supersample is actually WORSE than native at header sizes.

That result could only be found by measuring in the browser. This script does.

MEASUREMENT METHOD
------------------
Crops come from a FULL-PAGE screenshot plus integer bounding boxes, not from
elementHandle.screenshot(). The latter was verified to clip a row at some sizes -
at 16px that is 6% of the image and it swamped the metric with a fake 34-level
error. The component's own canvas backing store was separately verified
byte-identical to the standalone factory render, so the crop is the only
variable here.

The metric is max-channel error after compositing both images onto the page
background, because the canvas is transparent outside the badge.

Usage:  python policy_choice.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
SRC = REPO / "frontend" / "src" / "assets" / "Logo.png"
BG = (10, 10, 15)

POLICIES = ["native", "floor128", "ss2", "ss4"]
DESCRIPTION = {
    "native": "backing = css px exactly",
    "floor128": "backing = max(css, 128)",
    "ss2": "backing = max(css*2, 128)",
    "ss4": "backing = max(css*4, 128)",
}


def composite_on(im: Image.Image) -> np.ndarray:
    a = np.asarray(im.convert("RGBA"), dtype=np.float64) / 255.0
    rgb, alpha = a[:, :, :3], a[:, :, 3:4]
    bgv = np.array(BG, dtype=np.float64) / 255.0
    return (rgb * alpha + bgv * (1 - alpha)) * 255.0


def main() -> int:
    ref = Image.open(SRC).convert("RGBA")

    sheets = {}
    for p in POLICIES:
        fp = HERE / f"shot-comp-{p}-fullpage.png"
        bp = HERE / f"shot-comp-{p}-boxes.json"
        if not fp.exists() or not bp.exists():
            print(f"missing {fp.name} / {bp.name} - run: node shoot-component.mjs --sweep")
            return 1
        sheets[p] = (Image.open(fp).convert("RGBA"), json.loads(bp.read_text()))

    sizes = [b["size"] for b in sheets[POLICIES[0]][1]]
    print(f"{'css':>5} " + "".join(f"{p:>10}" for p in POLICIES) + "   best")
    print("-" * (7 + 10 * len(POLICIES) + 10))

    totals: dict[str, list[float]] = {p: [] for p in POLICIES}
    for i, n in enumerate(sizes):
        truth = composite_on(ref.resize((n, n), Image.LANCZOS))
        cells = []
        for p in POLICIES:
            page, boxes = sheets[p]
            b = boxes[i]
            crop = page.crop((b["x"], b["y"], b["x"] + b["w"], b["y"] + b["h"]))
            if crop.size != (n, n):
                print(f"{n:>5}   {p}: crop {crop.size} != {(n, n)}")
                return 1
            got = composite_on(crop)
            m = float(np.abs(got - truth).max(axis=2).mean())
            cells.append(m)
            totals[p].append(m)
        best = POLICIES[int(np.argmin(cells))]
        print(f"{n:>5} " + "".join(f"{c:>10.2f}" for c in cells) + f"   {best}")

    print()
    for p in POLICIES:
        t = totals[p]
        print(f"  {p:<9} mean {np.mean(t):6.3f}   worst {max(t):6.2f}   ({DESCRIPTION[p]})")

    winner = min(POLICIES, key=lambda p: float(np.mean(totals[p])))
    print()
    print(f"WINNER: {winner} - {DESCRIPTION[winner]} (mean {np.mean(totals[winner]):.3f})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
