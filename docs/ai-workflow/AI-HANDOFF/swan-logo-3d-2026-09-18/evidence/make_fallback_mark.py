"""
Regenerate the right-sized PNG fallback for the header swan mark.

WHY THIS EXISTS
---------------
`SwanMark3D` shows a PNG before the 3-D chunks resolve, and keeps it forever when
WebGL is unavailable. It used to point at `assets/Logo.png` - the 1024x1024,
1,206,009-byte brand asset - while the header lays the mark out at 28-52 CSS px.
Every page therefore transferred 1.15 MiB to draw a 36px logo, and handed the
browser a 36:1 downscale, the regime where its resampler degrades worst.

This writes `assets/Logo.mark128.png` instead: the same image, LANCZOS-downscaled
once, at a resolution matched to the sizes actually used.

WHY 128
-------
Chosen by measurement, not by arithmetic - `fallback_asset_audit.py` renders each
candidate through the real component in real Chromium at dpr 1 and dpr 2 and scores
it against the same LANCZOS reference the live canvas is gated against. 128 came out
nowhere clearly worse than the 1024 asset and clearly better at 32px, in every run:

    dpr 1 (4 repeats)  128 -> 3.12   shipped 1024 -> 3.47   spread of 128: 0.00
    dpr 2 (4 repeats)  128 -> 1.78   shipped 1024 -> 2.15

The one case where 128 would be UPSCALED is 52 CSS px at dpr >= 3 (156 device px).
52px only triggers at a >=3840 CSS px viewport, which is desktop-class and therefore
dpr 1-2 (52-104 device px) - so no real display hits it. 160 was measured as the
cover-everything option and was NOT better (3.50 vs 3.12 at dpr 1), so it was
rejected rather than shipped on principle.

Deterministic: same input + same Pillow = same bytes. The contract test asserts the
output's size and dimensions, so a careless re-run cannot silently regress it.

Usage:  python make_fallback_mark.py
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
ASSETS = REPO / "frontend" / "src" / "assets"
SRC = ASSETS / "Logo.png"
OUT = ASSETS / "Logo.mark128.png"
SIZE = 128


def main() -> int:
    if not SRC.exists():
        print(f"missing source asset: {SRC}")
        return 1

    src = Image.open(SRC)
    if src.size != (1024, 1024):
        # Not fatal, but the choice of 128 was measured against a 1024 source.
        print(f"WARNING: source is {src.size}, not (1024, 1024) - re-measure before trusting 128")

    out = src.convert("RGBA").resize((SIZE, SIZE), Image.LANCZOS)
    out.save(OUT, "PNG", optimize=True, compress_level=9)

    before, after = SRC.stat().st_size, OUT.stat().st_size
    print(f"wrote {OUT.relative_to(REPO)}")
    print(f"  {SIZE}x{SIZE} RGBA, {after:,} bytes "
          f"({after / before * 100:.2f}% of {SRC.name}, -{100 - after / before * 100:.1f}%)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
