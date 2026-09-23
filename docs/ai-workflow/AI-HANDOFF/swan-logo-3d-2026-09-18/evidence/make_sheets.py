"""
Build the final QA sheets for the swan mark.

  sheet-final-header.png   the PNG the app ships vs the 3-D object, at every size
                           the header uses, magnified with NEAREST so the actual
                           pixels are visible, with the measured error printed on
                           each tile so the picture and the number cannot disagree.
  sheet-final-turntable.png  eight yaw steps, proving it is a real 3-D object and
                           not a flat billboard.

Usage:  python make_sheets.py
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
SRC = REPO / "frontend" / "src" / "assets" / "Logo.png"
BG = (10, 10, 15)
APP_LADDER = [28, 32, 36, 44, 52]

FONT = None


def composite_on(im: Image.Image) -> np.ndarray:
    a = np.asarray(im.convert("RGBA"), dtype=np.float64) / 255.0
    rgb, alpha = a[:, :, :3], a[:, :, 3:4]
    bgv = np.array(BG, dtype=np.float64) / 255.0
    return (rgb * alpha + bgv * (1 - alpha)) * 255.0


def header_sheet() -> None:
    page = Image.open(HERE / "shot-comp-default-fullpage.png").convert("RGBA")
    boxes = json.loads((HERE / "shot-comp-default-boxes.json").read_text())
    by = {b["size"]: b for b in boxes}
    ref = Image.open(SRC).convert("RGBA")

    mag = 6
    pad = 14
    cols = len(APP_LADDER)
    cell = max(APP_LADDER) * mag
    head = 46
    w = pad + cols * (cell + pad) * 2 + pad
    h = head + cell + 34 + pad
    sheet = Image.new("RGB", (w, h), (14, 14, 19))
    dr = ImageDraw.Draw(sheet)
    dr.text((pad, 8), "SwanStudios header mark - shipped PNG (left of each pair) vs the 3-D object (right)",
            fill=(224, 236, 244))
    dr.text((pad, 24), "pixels are NEAREST-magnified 6x; error is mean max-channel over the tile, composited on #0A0A0F",
            fill=(150, 165, 185))

    x = pad
    for n in APP_LADDER:
        b = by[n]
        crop = page.crop((b["x"], b["y"], b["x"] + b["w"], b["y"] + b["h"]))
        truth = composite_on(ref.resize((n, n), Image.LANCZOS))
        got = composite_on(crop)
        err = float(np.abs(got - truth).max(axis=2).mean())

        for img, label in ((truth, "PNG"), (got, "3D")):
            up = Image.fromarray(img.astype(np.uint8), "RGB").resize((cell, cell), Image.NEAREST)
            sheet.paste(up, (x, head))
            dr.text((x + 2, head + cell + 4), f"{label} {n}px", fill=(200, 210, 225))
            x += cell + 6
        dr.text((x - cell - 6, head + cell + 18), f"mean err {err:.2f}", fill=(120, 210, 160))
        x += pad

    sheet.save(HERE / "sheet-final-header.png")
    print(f"wrote sheet-final-header.png {sheet.size}")


def turntable_sheet() -> None:
    shots = sorted(HERE.glob("shot-yaw-*.png"))
    if not shots:
        print("no yaw shots - run: node shoot.mjs --turntable")
        return
    ims = [Image.open(p).convert("RGBA") for p in shots]
    n = len(ims)
    tile = ims[0].size[0]
    mag = 1
    pad = 6
    head = 26
    sheet = Image.new("RGB", (pad + n * (tile * mag + pad), head + tile * mag + pad), (14, 14, 19))
    dr = ImageDraw.Draw(sheet)
    dr.text((pad, 8), "Turntable - 8 yaw steps, 45 degrees apart. A flat billboard would not change.",
            fill=(224, 236, 244))
    x = pad
    for i, im in enumerate(ims):
        sheet.paste(Image.fromarray(composite_on(im).astype(np.uint8), "RGB"), (x, head))
        dr.text((x + 2, head + 2), f"{i * 45}deg", fill=(224, 236, 244))
        x += tile * mag + pad
    sheet.save(HERE / "sheet-final-turntable.png")
    print(f"wrote sheet-final-turntable.png {sheet.size}")


if __name__ == "__main__":
    header_sheet()
    turntable_sheet()
