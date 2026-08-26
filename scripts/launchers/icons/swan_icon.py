r"""
swan_icon.py - the Swan launcher mark, and the PNG -> .ico pipeline behind it.

WHY THIS FILE EXISTS
--------------------
A .cmd file cannot carry an icon. Windows draws the generic batch-script glyph for it and
there is no way to override that from inside the file. The icon has to live on a SHORTCUT
(.lnk) that points at the .cmd. So "give the launcher an icon" is really two jobs:

    1. produce a real multi-resolution .ico   <- this file
    2. build the .lnk that references it      <- Set-SwanLauncher.ps1

TWO MODES
---------
  build   Draw the Swan mark from scratch at 1024px and write the .ico. No source art needed.
  convert Take a PNG (e.g. one ChatGPT generated) and write a correct .ico from it.

Both write the SAME size set Sean's existing launcher icons use - 16/32/48/64/128/256 - plus
20/24/40/96, which Windows reaches for at 125%/150%/175% DPI and in some list views. An .ico
missing those sizes gets a blurry nearest-neighbour scale from Explorer, which is most of why
home-made icons look cheap next to shipped ones.

THE 16px RULE
-------------
Every design decision here is downstream of one fact: the icon is judged at 16px in the
taskbar and 32-48px on the desktop, NOT at 256. So the mark is a bold silhouette with one
piece of negative space, and each downscale is sharpened individually rather than letting a
single resize do all the work. `--contact-sheet` renders every size side by side so the 16px
result is looked at rather than assumed.

PALETTE
-------
Crystalline Swan, per CLAUDE.md. Wing Purple is a glow/edge colour only and is never used as
the mark itself - it fails 4.5:1 on every plate colour except Obsidian (measured 2026-08-26).

USAGE
    python swan_icon.py build   --out ico/SwanLocalVideo.ico --accent ice
    python swan_icon.py convert --png source/swan.png --out ico/SwanLocalVideo.ico
    python swan_icon.py build   --out ico/x.ico --accent gold --contact-sheet preview.png
"""

from __future__ import annotations

import argparse
import os
import sys

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageChops
except ImportError:  # pragma: no cover - environment guard
    sys.exit("Pillow is required:  python -m pip install --user pillow")

# --- Crystalline Swan ---------------------------------------------------------------------
OBSIDIAN = (0x0A, 0x0A, 0x0F)
CARBON = (0x14, 0x14, 0x19)
SAPPHIRE = (0x00, 0x20, 0x60)
ROYAL = (0x00, 0x30, 0x80)
ICE = (0x60, 0xC0, 0xF0)
GOLD = (0xC6, 0xA8, 0x4B)
FROST = (0xE0, 0xEC, 0xF4)
VIOLET = (0x8B, 0x5C, 0xF6)

ACCENTS = {"ice": ICE, "gold": GOLD, "violet": VIOLET, "frost": FROST}

# Windows asks for all of these. Missing ones get scaled badly by Explorer.
ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256]

SS = 4  # supersampling factor; the mark is drawn at 1024*SS and comes down clean
BASE = 1024


# --- geometry ------------------------------------------------------------------------------
def _bezier(p0, p1, p2, p3, steps):
    """Cubic bezier as a point list."""
    out = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0]
        y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
        out.append((x, y))
    return out


def _normals(pts):
    """Unit normal at each point of a polyline."""
    out = []
    n = len(pts)
    for i in range(n):
        a = pts[max(i - 1, 0)]
        b = pts[min(i + 1, n - 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        m = (dx * dx + dy * dy) ** 0.5 or 1.0
        out.append((-dy / m, dx / m))
    return out


def _tapered(spine, w_start, w_end, ease=1.6):
    """
    Offset a spine by a width that tapers from w_start to w_end, returning a closed polygon.

    The taper is eased rather than linear: a swan's neck is thick at the shoulder and thins
    fast, and a linear taper reads as a cone (wrong animal). `ease` > 1 front-loads the thinning.
    """
    norms = _normals(spine)
    n = len(spine)
    left, right = [], []
    for i, (pt, nm) in enumerate(zip(spine, norms)):
        t = i / (n - 1)
        w = w_start + (w_end - w_start) * (t ** ease)
        left.append((pt[0] + nm[0] * w, pt[1] + nm[1] * w))
        right.append((pt[0] - nm[0] * w, pt[1] - nm[1] * w))
    return left + right[::-1]


def _swan_mark(size):
    """
    The mark, as an L-mode alpha mask at `size`: a swan's neck, head and beak. Nothing else.

    WHY NO BODY. Two earlier versions drew the whole bird. Both failed for the same reason -
    a body is a blob, and a blob plus a neck at 16px is a seal. What is unmistakably a swan,
    at any size, is the NECK: a tapered question-mark that leans back off the water, crests,
    and carries the head forward over a short down-angled beak. Reducing to that one curve is
    also the only part of a swan that procedural geometry can render as well as a hand would.

    The curve is a question mark, not a C and not an S laid on its side. p1 pulls hard LEFT to
    give the lower neck its backward belly; p2 pulls up and right to bring the crest over. Get
    those two controls wrong and it becomes a hook (version 1) or a vertical post (version 2).
    """
    S = size
    k = S / 1024.0
    img = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(img)

    def P(x, y):
        return (x * k, y * k)

    # NOTE: widths are HALF-widths - the offset applied to each side. 58 draws a 116px
    # neck on the 1024 grid, which is the right weight. Version 3 passed 100 here and
    # produced a 200px slab; that was a units bug, not a design failure.
    spine = _bezier(P(470, 862), P(300, 640), P(424, 292), P(636, 276), 260)
    d.polygon(_tapered(spine, 58 * k, 19 * k, ease=1.5), fill=255)

    hx, hy, hr = 650 * k, 274 * k, 34 * k
    d.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=255)

    # short beak, angled down about 25 degrees off the head
    d.polygon([P(672, 256), P(760, 292), P(670, 306)], fill=255)

    # A tapered offset polygon ends in a flat, angled cut, which at the foot of the neck
    # looked like a broken stump. Rather than dress the cut, the waterline covers it: a
    # thin lens the neck disappears into. The bird is now ON something, which also gives
    # the composition a base and stops the curve floating in the plate.
    # Wide and THIN. An earlier lens at 390x48 read as a lamp base at 128px and up - the
    # eye takes any wide shape under a vertical stem as a stand. A 560x18 line is water.
    d.ellipse([P(228, 848), P(788, 872)], fill=255)

    return img


def _plate(size, accent):
    """The rounded-square ground: sapphire gradient, accent rim, top sheen."""
    S = size
    k = S / 1024.0
    r = int(196 * k)

    grad = Image.new("RGB", (1, S))
    for y in range(S):
        t = y / max(S - 1, 1)
        t = t ** 0.85
        grad.putpixel(
            (0, y),
            (
                int(ROYAL[0] + (OBSIDIAN[0] - ROYAL[0]) * t),
                int(ROYAL[1] + (OBSIDIAN[1] - ROYAL[1]) * t),
                int(ROYAL[2] + (OBSIDIAN[2] - ROYAL[2]) * t),
            ),
        )
    plate = grad.resize((S, S)).convert("RGBA")

    # corner-light: a soft sapphire bloom top-left so the plate is not flat
    bloom = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(bloom).ellipse(
        [-S * 0.35, -S * 0.5, S * 0.95, S * 0.62], fill=SAPPHIRE + (150,)
    )
    bloom = bloom.filter(ImageFilter.GaussianBlur(S * 0.16))
    plate = Image.alpha_composite(plate, bloom)

    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=r, fill=255)
    plate.putalpha(mask)

    # accent rim, inset by one stroke so it stays inside the mask
    rim = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    w = max(int(9 * k), 1)
    ImageDraw.Draw(rim).rounded_rectangle(
        [w // 2, w // 2, S - 1 - w // 2, S - 1 - w // 2],
        radius=r - w // 2,
        outline=accent + (190,),
        width=w,
    )
    plate = Image.alpha_composite(plate, rim)

    # sheen across the top third
    sheen = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(sheen).ellipse([-S * 0.2, -S * 0.62, S * 1.2, S * 0.30], fill=FROST + (30,))
    sheen = sheen.filter(ImageFilter.GaussianBlur(S * 0.05))
    sheen.putalpha(ImageChops.multiply(sheen.split()[3], mask))
    return Image.alpha_composite(plate, sheen)


def render(accent_name="ice", size=BASE):
    """Full-colour master render at `size`."""
    accent = ACCENTS[accent_name]
    hi = size * SS
    plate = _plate(hi, accent)
    mark = _swan_mark(hi)

    # glow under the mark, in the accent
    glow = Image.new("RGBA", (hi, hi), (0, 0, 0, 0))
    glow.paste(accent + (255,), (0, 0), mark)
    glow = glow.filter(ImageFilter.GaussianBlur(hi * 0.030))

    body = Image.new("RGBA", (hi, hi), (0, 0, 0, 0))
    body.paste(FROST + (255,), (0, 0), mark)

    out = Image.alpha_composite(plate, glow)
    out = Image.alpha_composite(out, body)
    return out.resize((size, size), Image.LANCZOS)


# --- ico writing ---------------------------------------------------------------------------
def _downscale(master, n):
    """
    Resize with a sharpen pass proportional to how far we fell.

    A single LANCZOS from 1024 to 16 is mush. Stepping down and re-sharpening at the small
    end is what keeps the beak and the neck crook visible in the taskbar.
    """
    im = master
    while im.width // 2 >= n and im.width // 2 >= 16:
        im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
    im = im.resize((n, n), Image.LANCZOS)
    if n <= 48:
        amount = 190 if n <= 24 else 140
        im = im.filter(ImageFilter.UnsharpMask(radius=0.7, percent=amount, threshold=1))
    return im


def write_ico(master, out_path):
    os.makedirs(os.path.dirname(os.path.abspath(out_path)) or ".", exist_ok=True)
    frames = [_downscale(master, n) for n in ICO_SIZES]
    # Pillow writes every frame it is handed via append_images.
    frames[-1].save(
        out_path,
        format="ICO",
        sizes=[(n, n) for n in ICO_SIZES],
        append_images=frames[:-1],
    )
    return out_path


def load_png(path):
    im = Image.open(path).convert("RGBA")
    if im.width != im.height:
        s = max(im.size)
        sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        sq.paste(im, ((s - im.width) // 2, (s - im.height) // 2), im)
        im = sq
    if im.width < 256:
        print(f"  ! source is only {im.width}px - 512 or 1024 gives a much better 256 frame")
    return im.resize((BASE, BASE), Image.LANCZOS) if im.width != BASE else im


def contact_sheet(master, path):
    """Every ico size rendered side by side on a neutral grey, so 16px is judged not assumed."""
    pad, sheet_h = 16, 300
    total = sum(n + pad for n in ICO_SIZES) + pad
    sheet = Image.new("RGBA", (total, sheet_h), (128, 128, 128, 255))
    x = pad
    for n in ICO_SIZES:
        sheet.alpha_composite(_downscale(master, n), (x, (sheet_h - n) // 2))
        x += n + pad
    sheet.convert("RGB").save(path)
    return path


def main():
    ap = argparse.ArgumentParser(description="Swan launcher icon builder")
    sub = ap.add_subparsers(dest="cmd", required=True)

    b = sub.add_parser("build", help="draw the Swan mark and write an .ico")
    b.add_argument("--out", required=True)
    b.add_argument("--accent", default="ice", choices=sorted(ACCENTS))
    b.add_argument("--contact-sheet")
    b.add_argument("--png", help="also write the 1024px master as a PNG here")

    c = sub.add_parser("convert", help="turn an existing PNG into a correct .ico")
    c.add_argument("--png", required=True)
    c.add_argument("--out", required=True)
    c.add_argument("--contact-sheet")

    a = ap.parse_args()

    if a.cmd == "build":
        master = render(a.accent)
        if a.png:
            os.makedirs(os.path.dirname(os.path.abspath(a.png)) or ".", exist_ok=True)
            master.save(a.png)
            print(f"  master png : {a.png}")
    else:
        if not os.path.isfile(a.png):
            sys.exit(f"no such png: {a.png}")
        master = load_png(a.png)

    write_ico(master, a.out)
    print(f"  icon       : {a.out}  ({'/'.join(str(n) for n in ICO_SIZES)})")
    if a.contact_sheet:
        contact_sheet(master, a.contact_sheet)
        print(f"  preview    : {a.contact_sheet}   <- look at the 16px end")


if __name__ == "__main__":
    main()
