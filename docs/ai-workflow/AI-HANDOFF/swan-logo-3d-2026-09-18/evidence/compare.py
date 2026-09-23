"""
Comparison sheet: reference | candidate | signed difference | threshold map.

Usage:
  python compare.py <candidate.png> [--out sheet.png] [--label text]

Prints the same metrics the render gate uses, so the sheet and the numbers can
never disagree: silhouette IoU, mean/p95 |dRGB|, and the share of pixels whose
error exceeds a perceptual threshold.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
REF = REPO / "frontend" / "src" / "assets" / "Logo.png"

# JND-ish thresholds on max-channel absolute error
THRESHOLDS = [2, 4, 8, 16, 32]


def load(p: Path, size: int) -> np.ndarray:
    im = Image.open(p).convert("RGBA")
    if im.size != (size, size):
        im = im.resize((size, size), Image.LANCZOS)
    return np.asarray(im, dtype=np.uint8)


def metrics(ref: np.ndarray, cand: np.ndarray) -> dict:
    ra = ref[:, :, 3] > 128
    ca = cand[:, :, 3] > 128
    inter = int((ra & ca).sum())
    union = int((ra | ca).sum())
    iou = inter / union if union else 0.0

    d = np.abs(ref[:, :, :3].astype(np.int16) - cand[:, :, :3].astype(np.int16)).max(axis=2)
    on_disc = ra | ca
    d_disc = d[on_disc]

    out = {
        "alphaIoU": round(iou, 6),
        "disc_meanMaxChannelError": round(float(d_disc.mean()), 3),
        "disc_p95": float(np.percentile(d_disc, 95)),
        "disc_p99": float(np.percentile(d_disc, 99)),
        "disc_max": int(d_disc.max()),
    }
    for t in THRESHOLDS:
        out[f"disc_share_gt{t}"] = round(float((d_disc > t).mean()), 6)

    both = ra & ca
    db = d[both]
    out["overlap_meanMaxChannelError"] = round(float(db.mean()), 3)
    out["overlap_p95"] = float(np.percentile(db, 95))
    for t in THRESHOLDS:
        out[f"overlap_share_gt{t}"] = round(float((db > t).mean()), 6)
    return out


def build_sheet(ref: np.ndarray, cand: np.ndarray, label: str) -> Image.Image:
    size = ref.shape[0]
    d = np.abs(ref[:, :, :3].astype(np.int16) - cand[:, :, :3].astype(np.int16)).max(axis=2)
    heat = np.zeros((size, size, 3), dtype=np.uint8)
    heat[:, :, 0] = np.clip(d * 4, 0, 255)          # red = error magnitude
    heat[:, :, 1] = np.clip(d * 1, 0, 255)
    heat[:, :, 2] = np.clip(255 - d * 8, 0, 0)
    # threshold map: green pass, yellow >4, red >16
    tmap = np.zeros((size, size, 3), dtype=np.uint8)
    tmap[d <= 2] = (26, 46, 40)
    tmap[(d > 2) & (d <= 8)] = (74, 222, 128)
    tmap[(d > 8) & (d <= 16)] = (250, 204, 21)
    tmap[d > 16] = (239, 68, 68)

    pad, head, foot = 16, 44, 96
    W = pad * 5 + size * 4
    H = head + size + foot
    sheet = Image.new("RGB", (W, H), (10, 12, 18))
    dr = ImageDraw.Draw(sheet)

    tiles = [("REFERENCE", ref), ("CANDIDATE", cand),
             ("ABS ERROR x4", heat), ("PASS / FAIL", tmap)]
    for i, (title, arr) in enumerate(tiles):
        x = pad + i * (size + pad)
        dr.text((x, 14), title, fill=(224, 236, 244))
        mode = "RGBA" if arr.shape[2] == 4 else "RGB"
        sheet.paste(Image.fromarray(arr, mode).convert("RGB"), (x, head))

    m = metrics(ref, cand)
    lines = [
        f"{label}   alphaIoU={m['alphaIoU']:.6f}   meanErr={m['disc_meanMaxChannelError']:.2f}   "
        f"p95={m['disc_p95']:.0f}   p99={m['disc_p99']:.0f}   max={m['disc_max']}",
        f"share err>2 {m['disc_share_gt2']:.4%}   >4 {m['disc_share_gt4']:.4%}   "
        f">8 {m['disc_share_gt8']:.4%}   >16 {m['disc_share_gt16']:.4%}   >32 {m['disc_share_gt32']:.4%}",
        "legend: green <=2 | yellow 3-8 | orange 9-16 | red >16   (max-channel absolute error)",
    ]
    for i, ln in enumerate(lines):
        dr.text((pad, head + size + 10 + i * 22), ln, fill=(224, 236, 244))
    return sheet


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("candidate")
    ap.add_argument("--out", default=None)
    ap.add_argument("--label", default="")
    ap.add_argument("--size", type=int, default=1024)
    ap.add_argument("--json", default=None)
    args = ap.parse_args()

    ref = load(REF, args.size)
    cand = load(Path(args.candidate), args.size)
    m = metrics(ref, cand)
    print(json.dumps(m, indent=2))
    sheet = build_sheet(ref, cand, args.label or Path(args.candidate).stem)
    out = Path(args.out) if args.out else HERE / f"sheet-{Path(args.candidate).stem}.png"
    sheet.save(out)
    print(f"sheet -> {out}")
    if args.json:
        Path(args.json).write_text(json.dumps(m, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
