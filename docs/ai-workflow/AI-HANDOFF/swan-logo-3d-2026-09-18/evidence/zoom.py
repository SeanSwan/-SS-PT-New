"""Zoom the same region of the reference and a candidate side by side, so the
question 'is the shading banded or smooth?' is answered by looking, not guessing."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
REF = REPO / "frontend" / "src" / "assets" / "Logo.png"


def main() -> int:
    cand = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "mesh-render-1024.png"
    box = tuple(int(v) for v in sys.argv[2:6]) if len(sys.argv) >= 6 else (300, 180, 700, 560)
    zoom = 3
    ref = Image.open(REF).convert("RGB").crop(box)
    c = Image.open(cand).convert("RGB").crop(box)
    w, h = ref.size
    pad = 12
    sheet = Image.new("RGB", (w * zoom * 2 + pad * 3, h * zoom + pad * 2 + 30), (10, 12, 18))
    d = ImageDraw.Draw(sheet)
    d.text((pad, 8), f"REFERENCE  crop={box}", fill=(224, 236, 244))
    d.text((pad * 2 + w * zoom, 8), f"CANDIDATE  {cand.name}", fill=(224, 236, 244))
    sheet.paste(ref.resize((w * zoom, h * zoom), Image.NEAREST), (pad, 30))
    sheet.paste(c.resize((w * zoom, h * zoom), Image.NEAREST), (pad * 2 + w * zoom, 30))
    out = HERE / f"zoom-{cand.stem}.png"
    sheet.save(out)
    print(out)

    # numeric answer: how many distinct colours along a horizontal scanline?
    import numpy as np
    a = np.asarray(Image.open(REF).convert("RGB"))
    for y in (300, 420, 500, 620):
        row = a[y, 200:860]
        d1 = np.abs(np.diff(row.astype(int), axis=0)).max(axis=1)
        steps = (d1 > 3).sum()
        print(f"  scanline y={y}: {steps} colour steps > 3 across x=200..860, "
              f"max step {d1.max()}, median step {np.median(d1):.0f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
