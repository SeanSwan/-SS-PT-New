r"""
Multi-resolution ICO writing and visual-QA helpers for Swan launcher icons.

BOUNDARY
--------
`swan_icon.py` owns mark geometry and the CLI. This module owns image input,
downscaling, ICO serialization, and contact sheets. Keeping those concerns
separate holds both production modules below the repository's 300-line cap.

TRANSPARENCY CONTRACT
---------------------
Non-square RGBA source art is centered on a transparent square without using
the source as a paste mask. Passing an RGBA image as both source and mask would
multiply its alpha channel (128 becomes 64), making converted artwork too faint.
"""

from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFilter


BASE = 1024
ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256]


def _downscale(master, size):
    """Downscale progressively and sharpen RGB without damaging alpha."""
    image = master
    while image.width // 2 >= size and image.width // 2 >= 16:
        image = image.resize((image.width // 2, image.height // 2), Image.LANCZOS)
    image = image.resize((size, size), Image.LANCZOS)
    if size <= 48:
        amount = 100 if size <= 24 else 125
        rgb, alpha = image.convert("RGB"), image.getchannel("A")
        rgb = rgb.filter(ImageFilter.UnsharpMask(radius=0.7, percent=amount, threshold=2))
        image = rgb.convert("RGBA")
        image.putalpha(alpha)
    return image


def write_ico(master, out_path):
    """Write the exact Windows frame roster used by Swan launcher icons."""
    os.makedirs(os.path.dirname(os.path.abspath(out_path)) or ".", exist_ok=True)
    frames = [_downscale(master, size) for size in ICO_SIZES]
    frames[-1].save(
        out_path,
        format="ICO",
        sizes=[(size, size) for size in ICO_SIZES],
        append_images=frames[:-1],
    )
    return out_path


def load_png(path):
    """Load source art, center it on a transparent square, and normalize to BASE."""
    image = Image.open(path).convert("RGBA")
    if image.width != image.height:
        side = max(image.size)
        square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        square.alpha_composite(
            image,
            ((side - image.width) // 2, (side - image.height) // 2),
        )
        image = square
    if image.width < 256:
        print(f"  ! source is only {image.width}px - 512 or 1024 gives a much better 256 frame")
    return image.resize((BASE, BASE), Image.LANCZOS) if image.width != BASE else image


def contact_sheet(master, path):
    """Render every ICO size on dark, light, and checkerboard backgrounds."""
    pad = 16
    rows = 3
    band = max(ICO_SIZES) + pad * 2
    total_width = sum(size + pad for size in ICO_SIZES) + pad
    sheet = Image.new("RGBA", (total_width, band * rows), (0, 0, 0, 255))

    dark = Image.new("RGBA", (total_width, band), (18, 18, 20, 255))
    light = Image.new("RGBA", (total_width, band), (238, 238, 238, 255))
    checker = Image.new("RGBA", (total_width, band), (255, 255, 255, 255))
    draw = ImageDraw.Draw(checker)
    cell = 8
    for y in range(0, band, cell):
        for x in range(0, total_width, cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle(
                    [x, y, x + cell - 1, y + cell - 1],
                    fill=(200, 200, 200, 255),
                )

    for row, ground in enumerate((dark, light, checker)):
        sheet.alpha_composite(ground, (0, band * row))
        x = pad
        for size in ICO_SIZES:
            sheet.alpha_composite(
                _downscale(master, size),
                (x, band * row + (band - size) // 2),
            )
            x += size + pad

    sheet.convert("RGB").save(path)
    return path
