"""
Does the 3-D object beat the PNG at header sizes, and should the canvas render
native or supersampled?

The header renders the logo at 28/32/36/44/52 CSS px. A canvas at that size has
very little to work with, so the question is whether rendering the object at
NATIVE size (backing = css * dpr) or SUPERSAMPLED (backing = k * css, downscaled
by the browser) is closer to what the PNG looks like at the same size.

Both candidates are compared against the reference the app actually ships:
frontend/src/assets/Logo.png resized to N px with the browser's own filter
(LANCZOS as a stand-in for a high-quality browser downscale).

The GL renders come from harness/shoot.mjs --sizes, at backing == N.

Usage:  python size_fidelity.py
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
SRC = REPO / "frontend" / "src" / "assets" / "Logo.png"

SIZES = [16, 24, 28, 32, 36, 44, 48, 52, 64, 96, 128]

def prep(im: Image.Image) -> Image.Image:
    return im.convert("RGBA")


def composite_on(im: Image.Image, bg=(10, 10, 15)) -> np.ndarray:
    """Flatten alpha onto a dark header background so alpha edges count."""
    a = np.asarray(im, dtype=np.float64) / 255.0
    rgb, alpha = a[:, :, :3], a[:, :, 3:4]
    bgv = np.array(bg, dtype=np.float64) / 255.0
    return (rgb * alpha + bgv * (1 - alpha)) * 255.0


def main() -> int:
    ref_src = prep(Image.open(SRC))
    print(f"reference {ref_src.size[0]}x{ref_src.size[1]}")
    print()
    print(f"{'size':>5} {'native mean':>12} {'native p95':>11} "
          f"{'ss4 mean':>10} {'ss4 p95':>9}   verdict")
    print("-" * 68)

    rows = []
    tiles = []
    for n in SIZES:
        # What the app ships today: the 1024 PNG, browser-downscaled to N px.
        truth = composite_on(ref_src.resize((n, n), Image.LANCZOS))

        shot = HERE / f"shot-size-{n}.png"
        ss_shot = HERE / f"shot-ss-{n}.png"
        if not shot.exists() or not ss_shot.exists():
            print(f"{n:>5}   (missing shots - run: node shoot.mjs --sizes && node shoot.mjs --super)")
            continue
        native = composite_on(prep(Image.open(shot)))
        if native.shape != truth.shape:
            print(f"{n:>5}   shape {native.shape} vs {truth.shape} - skipped")
            continue

        # Supersampled: a REAL 4N render, box/LANCZOS-downscaled to N. This is
        # what the browser does when a 4N canvas is laid out at N CSS px.
        ss = composite_on(prep(Image.open(ss_shot)).resize((n, n), Image.LANCZOS))

        dn = np.abs(native - truth).max(axis=2)
        ds = np.abs(ss - truth).max(axis=2)
        nm, np95 = dn.mean(), np.percentile(dn, 95)
        sm, sp95 = ds.mean(), np.percentile(ds, 95)
        verdict = "supersample wins" if sm < nm else "native wins"
        rows.append((n, nm, np95, sm, sp95, verdict))
        print(f"{n:>5} {nm:>12.2f} {np95:>11.0f} {sm:>10.2f} {sp95:>9.0f}   {verdict}")

        # Only the header-relevant sizes go on the contact sheet; beyond 64px the
        # two candidates are visually indistinguishable and the sheet gets silly.
        if n <= 64:
            tiles.append((n, truth, native, ss))

    if not rows:
        return 1

    # Contact sheet: for each size, REFERENCE | NATIVE | SUPERSAMPLED, magnified
    # 8x with NEAREST so the actual pixels are visible.
    print()
    wins = sum(1 for r in rows if r[5] == "supersample wins")
    print(f"supersample won {wins}/{len(rows)} sizes")

    mag = 8
    pad = 8
    cell_h = max(n for n, *_ in tiles) * mag + 18
    total_w = pad + sum((n * mag + pad) * 3 for n, *_ in tiles)
    sheet = Image.new("RGB", (total_w, cell_h), (16, 16, 22))
    from PIL import ImageDraw
    dr = ImageDraw.Draw(sheet)
    x = pad
    for n, truth, native, ss in tiles:
        for img, label in ((truth, "PNG"), (native, "native"), (ss, "ss")):
            up = Image.fromarray(img.astype(np.uint8), "RGB").resize((n * mag, n * mag), Image.NEAREST)
            sheet.paste(up, (x, 16))
            dr.text((x, 4), f"{label} {n}px", fill=(200, 210, 225))
            x += n * mag + pad
    out = HERE / "sheet-size-fidelity.png"
    sheet.save(out)
    print(f"wrote {out.name} ({sheet.size[0]}x{sheet.size[1]})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
