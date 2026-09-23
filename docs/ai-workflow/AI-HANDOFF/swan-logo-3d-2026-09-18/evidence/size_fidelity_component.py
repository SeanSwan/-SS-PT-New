"""
End-to-end fidelity of the SwanMark3D COMPONENT at the sizes the header uses.

This is the number that answers Sean's brief. Everything else - the spec gate, the
Python rasteriser, the standalone factory harness - is a proxy. This compares the
pixels the component actually put on screen against the PNG the app ships today,
downscaled to the same size.

MEASUREMENT NOTES (both learned the hard way, both cost a false FAIL)
--------------------------------------------------------------------
1. Crops come from a FULL-PAGE screenshot plus integer bounding boxes, NOT from
   elementHandle.screenshot(). The latter was measured clipping a row at 16px,
   which is 6% of the image and produced a fake 34-level error.
2. The component's canvas backing store was separately verified byte-identical to
   the standalone factory render at 16px and 28px (max|d| = 0), so the render is
   not the variable - the capture is.

The metric is max-channel error after compositing both images onto the page
background, because the canvas is transparent outside the badge.

Usage:  python size_fidelity_component.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
SRC = REPO / "frontend" / "src" / "assets" / "Logo.png"
BG = (10, 10, 15)  # #0A0A0F

# The sizes the header actually lays the logo out at. Read from
# frontend/src/components/Header/components/Logo.tsx: 36 default, 32 at <=768,
# 28 at <=480 and <=375, 44 at >=2560, 52 at >=3840.
APP_LADDER = {28, 32, 36, 44, 52}
# Sizes below the ladder are stress cases, reported but not gated.
TARGET = 5.0


def composite_on(im: Image.Image) -> np.ndarray:
    a = np.asarray(im.convert("RGBA"), dtype=np.float64) / 255.0
    rgb, alpha = a[:, :, :3], a[:, :, 3:4]
    bgv = np.array(BG, dtype=np.float64) / 255.0
    return (rgb * alpha + bgv * (1 - alpha)) * 255.0


def main() -> int:
    tag = "default"
    page_path = HERE / f"shot-comp-{tag}-fullpage.png"
    boxes_path = HERE / f"shot-comp-{tag}-boxes.json"
    if not page_path.exists() or not boxes_path.exists():
        print(f"missing {page_path.name} / {boxes_path.name}")
        print("run: node shoot-component.mjs")
        return 1

    page = Image.open(page_path).convert("RGBA")
    boxes = json.loads(boxes_path.read_text())
    ref = Image.open(SRC).convert("RGBA")

    # A full-page screenshot at deviceScaleFactor N is N times larger than the CSS
    # layout, so every box has to be scaled by it. At dpr 1 this is a no-op and the
    # numbers are exactly what they were before the field existed.
    dpr = int(boxes[0].get("dpr", 1)) if boxes else 1
    if dpr != 1:
        print(f"(deviceScaleFactor {dpr}: crops and reference scaled to device px)")

    print(f"{'css':>5} {'crop':>10} {'mean':>8} {'p95':>6} {'p99':>6} {'share>8':>9}  gated  verdict")
    print("-" * 70)

    rows = []
    for b in boxes:
        n = b["size"] * dpr
        crop = page.crop(
            (b["x"] * dpr, b["y"] * dpr, (b["x"] + b["w"]) * dpr, (b["y"] + b["h"]) * dpr)
        )
        if crop.size != (n, n):
            print(f"{b['size']:>5}   crop {crop.size} != {(n, n)}")
            return 1
        truth = composite_on(ref.resize((n, n), Image.LANCZOS))
        got = composite_on(crop)
        d = np.abs(got - truth).max(axis=2)
        mean, p95, p99 = float(d.mean()), float(np.percentile(d, 95)), float(np.percentile(d, 99))
        share8 = float((d > 8).mean())
        gated = b["size"] in APP_LADDER
        verdict = ("OK" if mean <= TARGET else "FAIL") if gated else "n/a (below ladder)"
        rows.append((b["size"], mean, gated, mean <= TARGET))
        print(
            f"{b['size']:>5} {crop.size[0]:>4}x{crop.size[1]:<5} {mean:>8.2f} {p95:>6.0f} "
            f"{p99:>6.0f} {share8:>8.2%}  {'yes' if gated else ' no'}   {verdict}"
        )

    gated_rows = [r for r in rows if r[2]]
    means = [r[1] for r in rows]
    print()
    print(f"mean across the ladder : {np.mean(means):.2f}")
    print(f"mean on the app ladder : {np.mean([r[1] for r in gated_rows]):.2f} "
          f"(sizes {sorted(APP_LADDER)})")
    worst = max(gated_rows, key=lambda r: r[1])
    print(f"worst app size         : {worst[0]}px at {worst[1]:.2f}")

    fails = [r for r in gated_rows if not r[3]]
    if fails:
        print(f"\nRESULT: FAIL - {len(fails)} app size(s) above {TARGET}: {[r[0] for r in fails]}")
        return 1
    print(f"\nRESULT: PASS - every app ladder size is within {TARGET} mean levels of the shipped PNG")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
