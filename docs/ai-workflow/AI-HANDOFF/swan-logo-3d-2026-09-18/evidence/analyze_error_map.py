"""
Where does the fidelity error actually live?

`size_fidelity_component.py` answers "how big is the error". This answers "what
kind of error is it", which is the question that decides whether more polishing
can help at all.

Three zones, from the reference's own alpha mask:

  EDGE    - within `BAND` px of the silhouette boundary. A 3-D render and a PNG
            will never agree here: different antialiasing, different coverage
            estimation. Error here is expected and largely irreducible.
  INTERIOR- near the boundary but inside it (the rim/relief/shading transition).
  CORE    - the eroded interior. Here the two images should agree almost exactly;
            error here means the MODEL is wrong, not the filter.

If the mean is edge-dominated, the practical floor is close and further work
should go elsewhere. If CORE carries real error, that is a genuine target.

Usage:  python analyze_error_map.py [css_size]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
SRC = REPO / "frontend" / "src" / "assets" / "Logo.png"
BG = (10, 10, 15)


def composite_on(im: Image.Image) -> np.ndarray:
    a = np.asarray(im.convert("RGBA"), dtype=np.float64) / 255.0
    rgb, alpha = a[:, :, :3], a[:, :, 3:4]
    bgv = np.array(BG, dtype=np.float64) / 255.0
    return (rgb * alpha + bgv * (1 - alpha)) * 255.0


def zones(mask: np.ndarray, band: int = 1, erode: int = 2):
    """Return (edge, inner, core) boolean masks from a filled silhouette."""
    filled = ndimage.binary_fill_holes(mask)
    edge = filled & ~ndimage.binary_erosion(filled, iterations=band)
    inner = (ndimage.binary_erosion(filled, iterations=band)
             & ~ndimage.binary_erosion(filled, iterations=band + erode))
    core = ndimage.binary_erosion(filled, iterations=band + erode)
    return edge, inner, core


def report(n: int, band: int, erode: int) -> dict:
    page = Image.open(HERE / "shot-comp-default-fullpage.png").convert("RGBA")
    boxes = json.loads((HERE / "shot-comp-default-boxes.json").read_text())
    box = next(b for b in boxes if b["size"] == n)
    crop = page.crop((box["x"], box["y"], box["x"] + box["w"], box["y"] + box["h"]))
    if crop.size != (n, n):
        raise SystemExit(f"crop {crop.size} != {(n, n)}")

    ref = Image.open(SRC).convert("RGBA").resize((n, n), Image.LANCZOS)
    truth = composite_on(ref)
    got = composite_on(crop)
    d = np.abs(got - truth).max(axis=2)

    mask = (np.asarray(ref)[:, :, 3] > 127)
    edge, inner, core = zones(mask, band, erode)
    total = mask.sum()

    print(f"\n=== {n}px  (band={band}px, then {erode}px further) ===")
    print(f"overall mean {d.mean():6.2f}   over {total} lit px")
    print(f"{'zone':>8} {'px':>7} {'share':>7} {'mean':>7} {'p95':>6} {'max':>6} "
          f"{'contrib':>8}")
    print("-" * 56)
    out = {}
    for name, m in (("edge", edge), ("inner", inner), ("core", core)):
        if m.sum() == 0:
            continue
        dm = d[m]
        contrib = dm.sum() / d.sum() * 100 if d.sum() else 0
        print(f"{name:>8} {m.sum():>7} {m.sum()/total:>6.1%} {dm.mean():>7.2f} "
              f"{np.percentile(dm,95):>6.0f} {dm.max():>6.0f} {contrib:>7.1f}%")
        out[name] = {"px": int(m.sum()), "mean": float(dm.mean()), "contrib": float(contrib)}
    outside = ~mask
    print(f"{'outside':>8} {outside.sum():>7} {outside.sum()/d.size:>6.1%} "
          f"{d[outside].mean():>7.2f} {np.percentile(d[outside],95):>6.0f} "
          f"{d[outside].max():>6.0f} {d[outside].sum()/d.sum()*100:>7.1f}%")
    out["outside"] = {"mean": float(d[outside].mean()),
                      "contrib": float(d[outside].sum() / d.sum() * 100)}

    # What the mean would be if the edge were perfect - the theoretical headroom.
    if "edge" in out:
        perfect = d.copy()
        perfect[edge] = 0.0
        print(f"\nif EDGE were perfect      : mean {d.mean():.2f} -> {perfect.mean():.2f}")
    if "core" in out:
        print(f"if CORE were perfect      : mean {d.mean():.2f} -> "
              f"{(d.copy().__setitem__(core, 0.0) or d).mean():.2f}")

    # Visualise: 8x error map, hot = error.
    vis = np.clip(d * 8, 0, 255).astype(np.uint8)
    Image.fromarray(vis, "L").resize((n * 12, n * 12), Image.NEAREST).save(
        HERE / f"dbg-errmap-{n}.png")
    print(f"wrote dbg-errmap-{n}.png (error x8, 12x zoom)")
    return out


if __name__ == "__main__":
    sizes = [int(sys.argv[1])] if len(sys.argv) > 1 else [28, 36, 128]
    for s in sizes:
        report(s, band=1, erode=2)
