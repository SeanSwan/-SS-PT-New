"""
Is the PNG fallback the right size?

THE PROBLEM
-----------
`SwanMark3D` renders the static PNG on first paint and keeps it forever when WebGL
is unavailable. The asset it points at is `frontend/src/assets/Logo.png` - a
1024x1024, 1,206,009-byte file. The header shows that mark at 28-52 CSS px.

So every page downloads 1.15 MiB to display a 36px logo, and - per the sizing
doctrine in swanMarkScene.ts - it hands the browser a 36:1 downscale, which is
exactly the regime where the compositor's filter degrades most.

WHY THIS SCRIPT EXISTS
----------------------
The claim "a smaller fallback is better" is testable and was NOT assumed. This
generates candidates, renders each through the REAL component in real headless
Chromium via the existing `--nogl` path, and scores each against the same LANCZOS
reference `size_fidelity_component.py` gates the live canvas against. Byte weight
alone would be a weight argument, not a fidelity argument; the whole point is to
show the smaller asset is not worse.

Note the metric's direction: LOWER IS BETTER. It is the mean max-channel error
against the ideal LANCZOS downscale of the 1024 source. A smaller source reduces
the browser's downscale ratio, so it is expected to move TOWARD the ideal - but
"expected" is not "measured", which is why this runs the browser.

Usage:  python fallback_asset_audit.py
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
HARNESS = HERE / "harness"
SRC = REPO / "frontend" / "src" / "assets" / "Logo.png"


def harness_asset() -> Path:
    """The PNG esbuild emitted for the fallback import.

    Discovered from the bundle rather than hardcoded: the filename carries a content
    hash, so it changes on every rebuild that touches the asset. A hardcoded name
    silently measured a stale file after the first rebuild.
    """
    bundle = (HARNESS / "component-bundle.js").read_text(encoding="utf-8", errors="replace")
    refs = sorted(set(re.findall(r"component-assets/Logo[A-Za-z0-9._-]*\.png", bundle)))
    if len(refs) != 1:
        raise SystemExit(f"expected exactly one fallback asset in the bundle, found {refs}")
    return HARNESS / refs[0]


HARNESS_ASSET = harness_asset()

NODE = Path(r"C:\Users\BigotSmasher\.workbuddy-ai\binaries\node\versions\22.22.2-2\node.exe")
if not NODE.exists():
    NODE = Path("node")

BG = (10, 10, 15)  # #0A0A0F, the harness background
APP_LADDER = (28, 32, 36, 44, 52)
CANDIDATES = (96, 128, 192, 256)

# The per-size numbers are noisier than they look: the first run put mark192
# (3.70) ABOVE the shipped 1024 (3.62) while mark128 sat at 3.12, and nothing in
# the sizing doctrine predicts a mid-size dip. A single pass is therefore not
# enough to choose on - re-run the shortlist and require the ranking to hold.
#   python fallback_asset_audit.py --sizes=128,192 --repeats=3
_argv = sys.argv[1:]
REPEATS = next((int(a.split("=", 1)[1]) for a in _argv if a.startswith("--repeats=")), 1)
_sizes = next((a.split("=", 1)[1] for a in _argv if a.startswith("--sizes=")), None)
if _sizes:
    CANDIDATES = tuple(int(s) for s in _sizes.split(",") if s.strip())
# dpr matters because the <img> is resampled to css*dpr device px: an asset that
# looks fine at dpr 1 can be UPSCALED (and so softer) on a retina display.
DPR = next((int(a.split("=", 1)[1]) for a in _argv if a.startswith("--dpr=")), 1)


def composite_on(im: Image.Image) -> np.ndarray:
    a = np.asarray(im.convert("RGBA"), dtype=np.float64) / 255.0
    rgb, alpha = a[:, :, :3], a[:, :, 3:4]
    bgv = np.array(BG, dtype=np.float64) / 255.0
    return (rgb * alpha + bgv * (1 - alpha)) * 255.0


def shoot(tag: str, dpr: int) -> Path:
    """Run the component harness with WebGL disabled; return the fullpage shot."""
    p = subprocess.run(
        [str(NODE), "shoot-component.mjs", "--nogl", f"--dpr={dpr}"],
        cwd=HARNESS, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    out = (p.stdout or "") + (p.stderr or "")
    if p.returncode != 0:
        print(f"  shoot failed for {tag}:\n{out[-1200:]}")
        raise SystemExit(1)
    src = HERE / "shot-comp-nogl-fullpage.png"
    dst = HERE / f"shot-nogl-{tag}.png"
    shutil.copyfile(src, dst)
    return dst


def boxes() -> list[dict]:
    """The integer slot boxes the harness wrote, plus its dpr."""
    return json.loads((HERE / "shot-comp-nogl-boxes.json").read_text())


def measure(shot: Path, ref: Image.Image) -> dict[int, float]:
    """Mean max-channel error per CSS size, against the ideal LANCZOS downscale.

    Everything is compared in DEVICE pixels: the screenshot is `dpr` times the CSS
    layout, and the reference is downscaled to the same device resolution. That
    keeps the metric meaningful on a retina display, where the fallback asset can
    be upscaled and a dpr-1-only measurement would never see it.
    """
    page = Image.open(shot).convert("RGBA")
    bs = boxes()
    dpr = int(bs[0].get("dpr", 1)) if bs else 1
    out: dict[int, float] = {}
    for b in bs:
        n = b["size"] * dpr
        crop = page.crop(
            (b["x"] * dpr, b["y"] * dpr, (b["x"] + b["w"]) * dpr, (b["y"] + b["h"]) * dpr)
        )
        if crop.size != (n, n):
            out[b["size"]] = float("nan")
            continue
        truth = composite_on(ref.resize((n, n), Image.LANCZOS))
        got = composite_on(crop)
        out[b["size"]] = float(np.abs(got - truth).max(axis=2).mean())
    return out


def main() -> int:
    if not SRC.exists() or not HARNESS_ASSET.exists():
        print("missing source asset or harness asset")
        return 1

    original = HARNESS_ASSET.read_bytes()
    ref = Image.open(SRC).convert("RGBA")
    tmp = HERE / "fallback-candidates"
    tmp.mkdir(exist_ok=True)

    # Build the candidates.
    sizes: dict[str, int] = {}
    for n in CANDIDATES:
        p = tmp / f"Logo.mark{n}.png"
        ref.resize((n, n), Image.LANCZOS).save(p, "PNG", optimize=True, compress_level=9)
        sizes[f"mark{n}"] = p.stat().st_size

    # tag -> list of per-size measurements, one entry per repeat.
    runs: dict[str, list[dict[int, float]]] = {}
    try:
        for rep in range(REPEATS):
            print(f"shooting baseline (1024, as shipped) [repeat {rep + 1}/{REPEATS}, dpr {DPR}]...")
            runs.setdefault("shipped1024", []).append(measure(shoot("shipped1024", DPR), ref))

            for n in CANDIDATES:
                tag = f"mark{n}"
                print(f"shooting {tag} [repeat {rep + 1}/{REPEATS}, dpr {DPR}]...")
                shutil.copyfile(tmp / f"Logo.mark{n}.png", HARNESS_ASSET)
                runs.setdefault(tag, []).append(measure(shoot(tag, DPR), ref))
    finally:
        HARNESS_ASSET.write_bytes(original)

    # Average each tag's repeats, and keep the per-size spread so a ranking that
    # is inside the noise is visible rather than silently believed.
    rows: dict[str, dict[int, float]] = {}
    ranges: dict[str, dict[int, float]] = {}
    for tag, reps in runs.items():
        rows[tag] = {
            n: float(np.mean([r[n] for r in reps if n in r])) for n in APP_LADDER
        }
        ranges[tag] = {
            n: float(max(r[n] for r in reps if n in r) - min(r[n] for r in reps if n in r))
            for n in APP_LADDER
        }

    def ladder_mean(tag: str) -> float:
        return float(np.mean([rows[tag][n] for n in APP_LADDER]))

    # Worst per-size repeat range for a tag: the bar a difference must clear.
    def spread(tag: str) -> float:
        return max(ranges[tag].values())

    print()
    hdr = (f"{'asset':>13} {'KiB':>8} " + " ".join(f"{n:>6}" for n in APP_LADDER)
           + f" {'ladder':>7} {'spread':>7}")
    print(hdr)
    print("-" * len(hdr))
    for tag in rows:
        kib = SRC.stat().st_size / 1024 if tag == "shipped1024" else sizes[tag] / 1024
        cells = " ".join(f"{rows[tag][n]:>6.2f}" for n in APP_LADDER)
        print(f"{tag:>13} {kib:>8.1f} {cells} {ladder_mean(tag):>7.2f} {spread(tag):>7.2f}")
        # Per-size repeat range, so a single size cannot hide inside the mean.
        if REPEATS > 1:
            rng = " ".join(f"{ranges[tag][n]:>6.2f}" for n in APP_LADDER)
            print(f"{'  (+/-)':>13} {'':>8} {rng}")

    base = ladder_mean("shipped1024")
    print()
    print("lower is better; 'ladder' is the mean over the sizes the header uses")
    print("the (+/-) line is the per-size range across repeats - a difference smaller")
    print("than that is not a real difference")
    ranked = sorted((t for t in rows if t != "shipped1024"), key=ladder_mean)
    best = ranked[0]
    bestmean = ladder_mean(best)
    print(f"baseline ladder mean : {base:.2f}  ({SRC.stat().st_size/1024:.1f} KiB)")
    print(f"best candidate       : {best} at {bestmean:.2f}  ({sizes[best]/1024:.1f} KiB)")
    delta = (bestmean - base) / base * 100
    print(f"fidelity change      : {delta:+.1f}%   weight change: "
          f"{(sizes[best] - SRC.stat().st_size) / SRC.stat().st_size * 100:+.2f}%")

    # Two separate questions, and they get separate answers:
    #   (1) is the candidate WORSE anywhere?  -> blocks the change
    #   (2) is it BETTER?                     -> would be nice, but not required
    worse = [n for n in APP_LADDER if rows[best][n] - rows["shipped1024"][n] > spread(best)]
    print()
    print("per-size verdict vs the shipped asset (blocking only if clearly worse):")
    for n in APP_LADDER:
        d = rows[best][n] - rows["shipped1024"][n]
        r = max(ranges[best][n], ranges["shipped1024"][n])
        tagtxt = "clearly worse" if d > r else ("clearly better" if d < -r else "indistinguishable")
        print(f"  {n:>3}px  {rows[best][n]:>5.2f} vs {rows['shipped1024'][n]:>5.2f}"
              f"  ({d:+.2f}, noise {r:.2f})  {tagtxt}")

    margin = base - bestmean
    print()
    print(f"margin over baseline : {margin:+.2f}  vs repeat spread {spread(best):.2f}"
          f"  -> {'INSIDE the noise' if margin <= spread(best) else 'clear of the noise'}")

    if worse:
        print(f"\nRESULT: FAIL - {best} is clearly worse at {worse}px")
        return 1
    print(f"\nRESULT: PASS - {best} is nowhere clearly worse than the shipped asset, "
          f"and is {100 - sizes[best] / SRC.stat().st_size * 100:.1f}% smaller")
    if margin <= spread(best):
        print("        (fidelity gain is inside the noise: this is a WEIGHT change, "
              "not a fidelity change)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
