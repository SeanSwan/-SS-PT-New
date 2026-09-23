"""
Swan/badge separation + landmark extraction for the SwanStudios header mark.

The badge is a smooth navy radial gradient; the swan is a faceted low-poly
subject. Hue and saturation cannot separate them (the badge blue sits at full
saturation), so the separation is done on local EDGE ENERGY: facet boundaries
are step changes of 20-60 luminance levels, while the badge ramp moves about
0.04 levels per pixel.

Outputs (into ./evidence):
  ref-swan-mask.png   - binary mask of the swan
  ref-swan-crop.png   - the swan alone, badge removed, 2x
  ref-overlay.png     - mask edge drawn over the original, 2x
  ref-swan.json       - every number below, machine-readable

Read-only w.r.t. the app. Writes only into the evidence folder.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
SRC = REPO / "frontend" / "src" / "assets" / "Logo.png"


def hexs(rgb) -> str:
    return "#{:02X}{:02X}{:02X}".format(*(int(v) for v in rgb))


def main() -> int:
    img = Image.open(SRC).convert("RGBA")
    a = np.asarray(img, dtype=np.uint8)
    h, w = a.shape[:2]
    alpha = a[:, :, 3]
    rgb = a[:, :, :3].astype(np.float32)

    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b

    # --- swan mask -----------------------------------------------------------
    # Neither hue/sat nor a fixed edge threshold separates these two: the badge
    # blue is fully saturated, and its dithered ramp reaches gradient 4-5, which
    # sits inside the swan's own facet range at the low end.
    #
    # The badge is by construction a SMOOTH field, so model it: fit a low-order
    # 2-D polynomial and keep whatever the model cannot explain. Iterative
    # rejection stops the swan from dragging the fit toward itself.
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    nx = (xx / (w - 1)) * 2 - 1
    ny = (yy / (h - 1)) * 2 - 1
    DEG = 4
    poly = [(i, j) for i in range(DEG + 1) for j in range(DEG + 1) if i + j <= DEG]
    basis = [(nx ** i) * (ny ** j) for i, j in poly]
    # A radial gradient is f(sqrt(x^2+y^2)); a plain polynomial cannot express
    # that, which is why the first fit left a 12-level median residual. Add the
    # radial family explicitly.
    rad = np.sqrt(nx ** 2 + ny ** 2)
    basis += [rad ** k for k in range(1, 7)]
    A = np.stack(basis, axis=-1).reshape(-1, len(basis))
    disc = (alpha > 128).ravel()
    solid_fit = (alpha == 255).ravel()

    resid = np.zeros((h, w, 3), dtype=np.float64)
    keep = solid_fit.copy()
    for it in range(6):
        Afit = A[keep]
        for c in range(3):
            ch = rgb[:, :, c].ravel()
            beta, *_ = np.linalg.lstsq(Afit, ch[keep], rcond=None)
            resid[:, :, c] = (ch - A @ beta).reshape(h, w)
        mag = np.abs(resid).max(axis=2).ravel()
        mad = np.median(np.abs(mag[disc] - np.median(mag[disc])))
        thr = max(4.0, 4.0 * mad)
        keep = solid_fit & (mag <= thr)
        print(f"  fit pass {it}: keep {keep.sum():>9,} px  median|resid| "
              f"{np.median(mag[disc]):.2f}  cut {thr:.2f}")

    mag = np.abs(resid).max(axis=2)
    # The beak is genuinely black, which the blue-only polynomial under-explains
    # only weakly, so also admit strongly chromatic pixels (the badge has r<=1).
    chroma_hit = rgb[:, :, 0] >= 6
    subject = disc.reshape(h, w) & ((mag > 6.0) | chroma_hit)
    subject = ndimage.binary_opening(subject, iterations=2)
    subject = ndimage.binary_closing(subject, iterations=4)
    subject = ndimage.binary_fill_holes(subject)
    labels, n = ndimage.label(subject)
    if n == 0:
        print("FAIL: no component found")
        return 1
    sizes = ndimage.sum(subject, labels, range(1, n + 1))
    keep_id = int(np.argmax(sizes)) + 1
    swan = ndimage.binary_fill_holes(labels == keep_id)
    print(f"components               : {n}; kept #{keep_id} at {int(sizes[keep_id - 1]):,} px "
          f"({sizes[keep_id - 1] / disc.sum():.2%} of the disc)")

    # --- geometry ------------------------------------------------------------
    ys, xs = np.nonzero(swan)
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    data: dict = {
        "source": str(SRC.relative_to(REPO)),
        "image": {"w": w, "h": h, "mode": Image.open(SRC).mode},
        "swan": {
            "pixels": int(swan.sum()),
            "bbox_px": [x0, y0, x1, y1],
            "bbox_norm": [x0 / w, y0 / h, (x1 + 1) / w, (y1 + 1) / h],
            "size_norm": [(x1 - x0 + 1) / w, (y1 - y0 + 1) / h],
            "centroid_norm": [float(xs.mean() / w), float(ys.mean() / h)],
            "centroid_offset_pct": [
                float((xs.mean() / w - 0.5) * 100),
                float((ys.mean() / h - 0.5) * 100),
            ],
        },
    }

    s = data["swan"]
    print("\n--- SWAN GEOMETRY (normalised to the 1.0 badge) ---")
    print(f"pixels      : {s['pixels']:,}")
    print(f"bbox px     : x[{x0}..{x1}] y[{y0}..{y1}]  ->  {x1 - x0 + 1} x {y1 - y0 + 1}")
    print(f"bbox norm   : x[{s['bbox_norm'][0]:.4f}..{s['bbox_norm'][2]:.4f}] "
          f"y[{s['bbox_norm'][1]:.4f}..{s['bbox_norm'][3]:.4f}]")
    print(f"size norm   : {s['size_norm'][0]:.4f} x {s['size_norm'][1]:.4f}")
    print(f"centroid    : ({s['centroid_norm'][0]:.4f}, {s['centroid_norm'][1]:.4f})  "
          f"offset dx={s['centroid_offset_pct'][0]:+.2f}% dy={s['centroid_offset_pct'][1]:+.2f}%")

    print("\n--- SILHOUETTE PROFILE (normalised) ---")
    print(f"{'y':>7} {'left':>7} {'right':>7} {'width':>7}")
    profile = []
    for frac in np.arange(0.16, 0.92, 0.03):
        yy = int(frac * h)
        row = np.nonzero(swan[yy])[0]
        if row.size:
            rec = [round(float(frac), 4), round(float(row.min() / w), 4),
                   round(float((row.max() + 1) / w), 4),
                   round(float((row.max() - row.min() + 1) / w), 4)]
            profile.append(rec)
            print(f"{rec[0]:>7.2f} {rec[1]:>7.4f} {rec[2]:>7.4f} {rec[3]:>7.4f}")
    data["silhouette_profile"] = profile

    print("\n--- LANDMARKS (normalised) ---")
    top = np.nonzero(swan[y0])[0]
    bot = np.nonzero(swan[y1])[0]
    left = np.nonzero(swan[:, x0])[0]
    right = np.nonzero(swan[:, x1])[0]
    lm = {
        "topmost": [float(top.mean() / w), y0 / h, float(top.min() / w), float((top.max() + 1) / w)],
        "bottommost": [float(bot.mean() / w), (y1 + 1) / h, float(bot.min() / w), float((bot.max() + 1) / w)],
        "leftmost": [x0 / w, float(left.mean() / h), float(left.min() / h), float((left.max() + 1) / h)],
        "rightmost": [(x1 + 1) / w, float(right.mean() / h), float(right.min() / h), float((right.max() + 1) / h)],
    }
    for k, v in lm.items():
        print(f"{k:<11}: ({v[0]:.4f}, {v[1]:.4f})  span {v[2]:.4f}..{v[3]:.4f}")

    sl = np.where(swan, lum, 1e9)
    by, bx = np.unravel_index(int(np.argmin(sl)), sl.shape)
    sl2 = np.where(swan, lum, -1)
    wy, wx = np.unravel_index(int(np.argmax(sl2)), sl2.shape)
    lm["darkest"] = [bx / w, by / h, hexs(rgb[by, bx])]
    lm["brightest"] = [wx / w, wy / h, hexs(rgb[wy, wx])]
    print(f"darkest    : ({bx / w:.4f}, {by / h:.4f}) = {hexs(rgb[by, bx])}   <- beak")
    print(f"brightest  : ({wx / w:.4f}, {wy / h:.4f}) = {hexs(rgb[wy, wx])}   <- head highlight")
    data["landmarks"] = lm

    # --- beak: the near-black cluster ---------------------------------------
    beak = swan & (lum < 45) & (np.abs(r - g) < 30)
    labels2, n2 = ndimage.label(beak)
    if n2:
        sizes2 = ndimage.sum(beak, labels2, range(1, n2 + 1))
        k2 = int(np.argmax(sizes2)) + 1
        bm = labels2 == k2
        bys, bxs = np.nonzero(bm)
        data["beak"] = {
            "pixels": int(bm.sum()),
            "bbox_norm": [bxs.min() / w, bys.min() / h, (bxs.max() + 1) / w, (bys.max() + 1) / h],
            "centroid_norm": [float(bxs.mean() / w), float(bys.mean() / h)],
        }
        bk = data["beak"]
        print(f"\nbeak        : {bk['pixels']:,} px  bbox "
              f"x[{bk['bbox_norm'][0]:.4f}..{bk['bbox_norm'][2]:.4f}] "
              f"y[{bk['bbox_norm'][1]:.4f}..{bk['bbox_norm'][3]:.4f}]  "
              f"centroid ({bk['centroid_norm'][0]:.4f}, {bk['centroid_norm'][1]:.4f})")

    # --- palettes ------------------------------------------------------------
    print("\n--- SWAN PALETTE (median cut, 12) ---")
    crop = Image.fromarray(np.dstack([rgb, (swan * 255).astype(np.uint8)]).astype(np.uint8), "RGBA")
    box = (x0, y0, x1 + 1, y1 + 1)
    q = crop.crop(box).convert("RGB").quantize(colors=12, method=Image.MEDIANCUT)
    pal = np.array(q.getpalette()[:36], dtype=np.uint8).reshape(-1, 3)
    counts = np.bincount(np.asarray(q).ravel(), minlength=12)
    tot = counts.sum()
    swan_pal = []
    for i in np.argsort(-counts):
        if counts[i] == 0:
            continue
        swan_pal.append({"hex": hexs(pal[i]), "share": round(float(counts[i] / tot), 4)})
        print(f"  {hexs(pal[i])}  {counts[i] / tot:>7.3%}")
    data["swan_palette"] = swan_pal

    print("\n--- BADGE GRADIENT (sampled at 6 fixed points) ---")
    badge = (alpha > 128) & ~ndimage.binary_dilation(swan, iterations=6)
    pts = {
        "upper-right": (0.80, 0.16), "upper-left": (0.16, 0.16),
        "lower-left": (0.16, 0.84), "lower-right": (0.80, 0.84),
        "far-left": (0.06, 0.50), "far-right": (0.94, 0.50),
        "top": (0.50, 0.06), "bottom": (0.50, 0.94),
    }
    badge_samples = {}
    for label, (px, py) in pts.items():
        yy, xx = int(py * h), int(px * w)
        hexv = hexs(rgb[yy, xx])
        badge_samples[label] = {"at": [px, py], "hex": hexv}
        print(f"  {label:<12} ({px:.2f},{py:.2f}) : {hexv}")
    data["badge_samples"] = badge_samples
    bpx = rgb[badge]
    data["badge_palette"] = {
        "mean": hexs(bpx.mean(axis=0)),
        "p05": hexs(np.percentile(bpx, 5, axis=0)),
        "p95": hexs(np.percentile(bpx, 95, axis=0)),
    }
    print(f"  badge mean {data['badge_palette']['mean']}  "
          f"p05 {data['badge_palette']['p05']}  p95 {data['badge_palette']['p95']}")

    # --- edge count: how many distinct facets? ------------------------------
    # Each facet is a near-flat region; count them as connected flat components.
    gy = np.zeros_like(lum)
    gx = np.zeros_like(lum)
    gy[1:-1, :] = lum[2:, :] - lum[:-2, :]
    gx[:, 1:-1] = lum[:, 2:] - lum[:, :-2]
    grad = np.sqrt(gx * gx + gy * gy)
    flat = (grad < 2.5) & ndimage.binary_erosion(swan, iterations=2)
    fl, fn = ndimage.label(flat)
    fs = ndimage.sum(flat, fl, range(1, fn + 1))
    big = int((fs > 400).sum())
    print(f"\nfacet count : {big} flat regions > 400px  (of {fn} total)")
    data["facet_count_gt400px"] = big

    # --- write evidence ------------------------------------------------------
    Image.fromarray((swan * 255).astype(np.uint8), "L").save(HERE / "ref-swan-mask.png")

    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[:, :, :3] = rgb.astype(np.uint8)
    out[:, :, 3] = (swan * 255).astype(np.uint8)
    Image.fromarray(out, "RGBA").crop(box).resize(
        ((x1 - x0 + 1) * 2, (y1 - y0 + 1) * 2), Image.LANCZOS
    ).save(HERE / "ref-swan-crop.png")

    ov = img.convert("RGB").copy()
    d = ImageDraw.Draw(ov)
    edge = swan & ~np.roll(swan, 1, 0)
    ey, ex = np.nonzero(edge)
    for y, x in zip(ey.tolist(), ex.tolist()):
        d.point((x, y), fill=(255, 0, 0))
    cx0, cy0 = max(0, x0 - 40), max(0, y0 - 40)
    cx1, cy1 = min(w, x1 + 41), min(h, y1 + 41)
    ov.crop((cx0, cy0, cx1, cy1)).resize(((cx1 - cx0) * 2, (cy1 - cy0) * 2), Image.LANCZOS).save(
        HERE / "ref-overlay.png"
    )

    (HERE / "ref-swan.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
    print("\nwrote: ref-swan-mask.png, ref-swan-crop.png, ref-overlay.png, ref-swan.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
