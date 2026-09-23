"""
Extract a machine-readable spec for the SwanStudios header swan mark.

Pipeline
  1. fit the badge (a smooth radial gradient) and take the residual
  2. derive the swan silhouette from that residual + the R-channel chroma cue
  3. segment the swan into its low-poly facets
  4. polygonise every facet and sample its colour
  5. write swan-mark.spec.json

  6. VALIDATE THE SPEC INDEPENDENTLY: re-render the spec with plain polygon
     fills (no Three.js, no browser) and measure it against the reference.
     A spec that cannot reproduce the reference as flat polygons is a bad spec,
     and finding that out here is far cheaper than finding it out in the browser.

Writes into ./evidence only.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.cluster.vq import kmeans2
from skimage import color as skcolor
from skimage import measure, morphology, segmentation

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
SRC = REPO / "frontend" / "src" / "assets" / "Logo.png"

# --- tunables (all reported in the spec so a reviewer can vary them) ---------
FIT_DEG = 4
FIT_RADIAL_POWERS = 6
SEED_SCORE = 22.0
GROW_SCORE = 5.0
FACET_K = 56
FACET_MIN_PX = 260
POLY_TOL = 1.6


def hexs(rgb) -> str:
    return "#{:02X}{:02X}{:02X}".format(*(int(round(float(v))) for v in rgb))


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


# ---------------------------------------------------------------------------
# 1. badge model
# ---------------------------------------------------------------------------
def fit_badge(rgb: np.ndarray, alpha: np.ndarray):
    h, w = alpha.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    nx = (xx / (w - 1)) * 2 - 1
    ny = (yy / (h - 1)) * 2 - 1

    poly = [(i, j) for i in range(FIT_DEG + 1) for j in range(FIT_DEG + 1) if i + j <= FIT_DEG]
    basis = [(nx ** i) * (ny ** j) for i, j in poly]
    rad = np.sqrt(nx ** 2 + ny ** 2)
    basis += [rad ** k for k in range(1, FIT_RADIAL_POWERS + 1)]
    A = np.stack(basis, axis=-1).reshape(-1, len(basis))

    solid = (alpha == 255).ravel()
    disc = (alpha > 128).ravel()
    resid = np.zeros((h, w, 3), dtype=np.float64)
    coefs = []
    keep = solid.copy()
    for _ in range(6):
        Afit = A[keep]
        for c in range(3):
            ch = rgb[:, :, c].ravel()
            beta, *_ = np.linalg.lstsq(Afit, ch[keep], rcond=None)
            coefs.append(beta)
            resid[:, :, c] = (ch - A @ beta).reshape(h, w)
        mag = np.abs(resid).max(axis=2).ravel()
        mad = np.median(np.abs(mag[disc] - np.median(mag[disc])))
        keep = solid & (mag <= max(4.0, 4.0 * mad))
    return resid, keep, disc.reshape(h, w)


# ---------------------------------------------------------------------------
# 2. silhouette
# ---------------------------------------------------------------------------
def swan_silhouette(rgb, resid, alpha):
    h, w = alpha.shape
    score = np.maximum(np.abs(resid).max(axis=2), rgb[:, :, 0].astype(np.float64))
    disc = alpha > 128

    seeds = (score > SEED_SCORE) & disc
    seeds = morphology.opening(seeds, morphology.disk(2))
    lab, n = ndimage.label(seeds, structure=np.ones((3, 3)))
    if n == 0:
        raise SystemExit("FAIL: no seeds")
    sizes = ndimage.sum(seeds, lab, range(1, n + 1))
    seed_mask = lab == (int(np.argmax(sizes)) + 1)

    # hysteresis: grow the seed through anything above GROW_SCORE
    grown = segmentation.watershed(
        -score, markers=np.where(seed_mask, 1, 0), mask=disc & (score > GROW_SCORE)
    )
    grown = grown == 1
    grown = morphology.closing(grown, morphology.disk(6))
    grown = morphology.remove_small_holes(grown, max_size=8000)
    grown = morphology.remove_small_objects(grown, max_size=20000)
    lab2, n2 = ndimage.label(grown, structure=np.ones((3, 3)))
    if n2 == 0:
        raise SystemExit("FAIL: no component after growth")
    sizes2 = ndimage.sum(grown, lab2, range(1, n2 + 1))
    sil = lab2 == (int(np.argmax(sizes2)) + 1)
    return sil, score


# ---------------------------------------------------------------------------
# 3. facets
# ---------------------------------------------------------------------------
def segment_facets(rgb, sil, score):
    lab_img = skcolor.rgb2lab(rgb / 255.0)
    px = lab_img[sil]
    rs = np.random.default_rng(7)
    centroids, _ = kmeans2(px.astype(np.float64), FACET_K, minit="++", seed=7)
    # assign every pixel in the image, then keep only the swan
    d = np.linalg.norm(lab_img[:, :, None, :] - centroids[None, None, :, :], axis=3)
    quant = np.argmin(d, axis=2).astype(np.int32)
    quant[~sil] = -1

    # connected components per quantised colour => candidate facets
    facets = np.zeros_like(quant)
    nid = 0
    for q in range(FACET_K):
        m = quant == q
        if not m.any():
            continue
        lab, n = ndimage.label(m, structure=np.ones((3, 3)))
        for i in range(1, n + 1):
            comp = lab == i
            if comp.sum() >= FACET_MIN_PX:
                nid += 1
                facets[comp] = nid
    # absorb the leftovers into the nearest surviving facet
    leftover = sil & (facets == 0)
    if leftover.any():
        _, ind = ndimage.distance_transform_edt(facets == 0, return_indices=True)
        facets[leftover] = facets[ind[0][leftover], ind[1][leftover]]
    facets[~sil] = 0
    del d, rs
    return facets, nid


# ---------------------------------------------------------------------------
# 4. polygonise
# ---------------------------------------------------------------------------
def polygonise(facets, nid, rgb):
    h, w = facets.shape
    out = []
    for i in range(1, nid + 1):
        comp = facets == i
        if comp.sum() < FACET_MIN_PX:
            continue
        padded = np.pad(comp, 1)
        contours = measure.find_contours(padded.astype(float), 0.5)
        if not contours:
            continue
        c = max(contours, key=len)
        c = c - 1.0
        approx = measure.approximate_polygon(c, tolerance=POLY_TOL)
        if len(approx) < 3:
            continue
        # drop the duplicated closing vertex
        if np.allclose(approx[0], approx[-1]):
            approx = approx[:-1]
        if len(approx) < 3:
            continue
        cols = rgb[comp]
        poly = [[round(float(p[1]) / w, 5), round(float(p[0]) / h, 5)] for p in approx]
        out.append({
            "id": i,
            "area_px": int(comp.sum()),
            "vertices": len(poly),
            "polygon": poly,
            "color": hexs(cols.mean(axis=0)),
        })
    out.sort(key=lambda f: -f["area_px"])
    return out


# ---------------------------------------------------------------------------
# 6. validate the spec by re-rendering it
# ---------------------------------------------------------------------------
def badge_field(spec, size):
    """Evaluate the spec's badge polynomial to an RGB array. Pure numpy."""
    b = spec["badge"]
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    u = (xx / (size - 1)) * 2 - 1
    v = (yy / (size - 1)) * 2 - 1
    terms = b["fieldTerms"]
    B = np.stack([(u ** i) * (v ** j) for i, j in terms], axis=-1).reshape(-1, len(terms))
    out = np.zeros((size * size, 3), dtype=np.float64)
    for c in range(3):
        out[:, c] = B @ np.array(b["fieldCoef"][c], dtype=np.float64)
    return np.clip(out, 0, 255).reshape(size, size, 3)


def render_spec(spec, size, badge=True):
    b = spec["badge"]
    cx, cy, r = b["centre"][0] * size, b["centre"][1] * size, b["radius"] * size
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    inside = ((xx + 0.5 - cx) ** 2 + (yy + 0.5 - cy) ** 2) <= (r - 0.5) ** 2
    arr = np.zeros((size, size, 4), dtype=np.uint8)
    if badge:
        field = badge_field(spec, size).astype(np.uint8)
        arr[:, :, :3] = field
        arr[:, :, 3] = np.where(inside, 255, 0).astype(np.uint8)
    img = Image.fromarray(arr, "RGBA")
    d = ImageDraw.Draw(img, "RGBA")
    for f in sorted(spec["facets"], key=lambda f: -f["area_px"]):
        pts = [(x * size, y * size) for x, y in f["polygon"]]
        d.polygon(pts, fill=hex_to_rgb(f["color"]) + (255,))
    return img


def sample_ramp(ramp, t):
    """ramp: list of [t, '#hex'] ascending."""
    t = min(max(t, 0.0), 1.0)
    for i in range(len(ramp) - 1):
        t0, c0 = ramp[i]
        t1, c1 = ramp[i + 1]
        if t0 <= t <= t1:
            k = 0.0 if t1 == t0 else (t - t0) / (t1 - t0)
            a = np.array(hex_to_rgb(c0), dtype=float)
            b = np.array(hex_to_rgb(c1), dtype=float)
            return tuple(int(round(v)) for v in (a + (b - a) * k))
    return hex_to_rgb(ramp[-1][1])


def main() -> int:
    img = Image.open(SRC).convert("RGBA")
    a = np.asarray(img, dtype=np.uint8)
    h, w = a.shape[:2]
    alpha = a[:, :, 3]
    rgb = a[:, :, :3].astype(np.float64)

    print("=== 1. badge fit ===")
    resid, solid, disc = fit_badge(rgb, alpha)
    print(f"  disc {int(disc.sum()):,} px | solid-fit {int(solid.sum()):,} px")

    print("=== 2. silhouette ===")
    sil, score = swan_silhouette(rgb, resid, alpha)
    ys, xs = np.nonzero(sil)
    bbox = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
    print(f"  swan {int(sil.sum()):,} px | bbox px {bbox} "
          f"| norm x[{bbox[0]/w:.4f}..{(bbox[2]+1)/w:.4f}] y[{bbox[1]/h:.4f}..{(bbox[3]+1)/h:.4f}]")

    print("=== 3. facets ===")
    facets, nid = segment_facets(rgb, sil, score)
    keep = [i for i in range(1, nid + 1) if (facets == i).sum() >= FACET_MIN_PX]
    print(f"  {len(keep)} facets >= {FACET_MIN_PX}px (of {nid} candidates)")

    print("=== 4. polygonise ===")
    polys = polygonise(facets, nid, rgb)
    tot_v = sum(p["vertices"] for p in polys)
    print(f"  {len(polys)} polygons, {tot_v} vertices total")
    covered = sum(p["area_px"] for p in polys)
    print(f"  facet area {covered:,} px vs silhouette {int(sil.sum()):,} px "
          f"({covered / sil.sum():.2%} coverage)")

    # --- badge model --------------------------------------------------------
    # The badge is a smooth 2-D field. Model it with a low-order polynomial in
    # normalised device coords and let the residual choose the degree: the
    # earlier "radial ramp from the brightest pixel" model was wrong because the
    # brightest badge pixel is an edge highlight, not the gradient focus.
    print("=== badge model ===")
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    u = (xx / (w - 1)) * 2 - 1
    v = (yy / (h - 1)) * 2 - 1
    badge_mask = disc & ~morphology.dilation(sil, morphology.disk(8))
    print(f"  badge-only pixels: {int(badge_mask.sum()):,}")

    def basis_terms(deg):
        return [(i, j) for i in range(deg + 1) for j in range(deg + 1) if i + j <= deg]

    badge_fit = None
    for deg in (2, 3, 4, 5):
        terms = basis_terms(deg)
        B = np.stack([(u ** i) * (v ** j) for i, j in terms], axis=-1).reshape(-1, len(terms))
        Bm = B[badge_mask.ravel()]
        pred = np.zeros((h, w, 3), dtype=np.float64)
        coefs = []
        for c in range(3):
            beta, *_ = np.linalg.lstsq(Bm, rgb[:, :, c].ravel()[badge_mask.ravel()], rcond=None)
            coefs.append(beta.tolist())
            pred[:, :, c] = (B @ beta).reshape(h, w)
        err = np.abs(pred - rgb).max(axis=2)[badge_mask]
        print(f"  degree {deg:>2} ({len(terms):>2} terms): mean {err.mean():5.2f}  "
              f"p95 {np.percentile(err, 95):5.2f}  max {err.max():5.2f}")
        if badge_fit is None or err.max() < badge_fit[0]:
            badge_fit = (float(err.max()), deg, terms, coefs, pred)

    _, deg, terms, coefs, badge_pred = badge_fit
    print(f"  chose degree {deg}")
    badge_err = np.abs(badge_pred - rgb).max(axis=2)[badge_mask]
    print(f"  badge-only error: mean {badge_err.mean():.2f} p95 {np.percentile(badge_err, 95):.2f} "
          f"max {badge_err.max():.2f}")
    # How much of the whole-disc error is badge vs swan?
    d_all = np.abs(badge_pred - rgb).max(axis=2)
    print(f"  badge model on disc : mean {d_all[disc].mean():.2f}")
    print(f"  badge model on swan : mean {d_all[sil].mean():.2f}  (expected large; not a badge region)")

    # brightest / darkest badge pixels, reported for the reviewer
    bl = np.where(badge_mask, d_all * 0 + (0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1]
                                           + 0.0722 * rgb[:, :, 2]), -1)
    gy_, gx_ = np.unravel_index(int(np.argmax(bl)), bl.shape)
    dl = np.where(badge_mask, 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1]
                  + 0.0722 * rgb[:, :, 2], 1e9)
    dy_, dx_ = np.unravel_index(int(np.argmin(dl)), dl.shape)
    print(f"  brightest badge px ({gx_ / w:.4f},{gy_ / h:.4f}) {hexs(rgb[gy_, gx_])}")
    print(f"  darkest   badge px ({dx_ / w:.4f},{dy_ / h:.4f}) {hexs(rgb[dy_, dx_])}")

    # keep a 9-stop radial ramp too, purely as a human-readable summary
    lum = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
    rr = np.sqrt((xx - gx_) ** 2 + (yy - gy_) ** 2)
    rmax = float(rr[badge_mask].max())
    ramp = []
    for i in range(9):
        t = i / 8.0
        m = badge_mask & (np.abs(rr / rmax - t) < 0.05)
        if m.sum() >= 50:
            ramp.append([round(t, 4), hexs(rgb[m].mean(axis=0))])
    print("  human-readable ramp from the brightest badge pixel:")
    for t, c in ramp:
        print(f"    r={t:.3f}  {c}")

    spec = {
        "name": "swan-mark",
        "source": str(SRC.relative_to(REPO)),
        "sourceSize": [w, h],
        "coordinateSystem": "normalised 0..1, origin top-left, y down (convert to y-up for three)",
        "extractor": {
            "badgeFitDegree": FIT_DEG,
            "badgeFitRadialPowers": FIT_RADIAL_POWERS,
            "seedScore": SEED_SCORE,
            "growScore": GROW_SCORE,
            "facetK": FACET_K,
            "facetMinPx": FACET_MIN_PX,
            "polygonTolerance": POLY_TOL,
        },
        "badge": {
            "shape": "circle",
            "centre": [0.5, 0.5],
            "radius": 0.5,
            "fieldModel": "polynomial",
            "fieldDegree": deg,
            "fieldTerms": [[i, j] for i, j in terms],
            "fieldCoef": [[round(c, 8) for c in ch] for ch in coefs],
            "fieldBasisNote": (
                "u = (x/W)*2-1, v = (y/H)*2-1, x right, y down; "
                "value = sum over k of coef[channel][k] * u**fieldTerms[k][0] * v**fieldTerms[k][1]; "
                "clamp 0..255"
            ),
            "fieldResidualMax": round(float(badge_err.max()), 3),
            "fieldResidualMean": round(float(badge_err.mean()), 3),
            "rampFromBrightest": ramp,
            "brightestPx": [round(gx_ / w, 5), round(gy_ / h, 5), hexs(rgb[gy_, gx_])],
            "darkestPx": [round(dx_ / w, 5), round(dy_ / h, 5), hexs(rgb[dy_, dx_])],
        },
        "swan": {
            "bbox": [bbox[0] / w, bbox[1] / h, (bbox[2] + 1) / w, (bbox[3] + 1) / h],
            "areaPx": int(sil.sum()),
            "areaNorm": round(float(sil.sum()) / (np.pi * (w / 2) ** 2), 5),
        },
        "facets": polys,
    }
    (HERE / "swan-mark.spec.json").write_text(json.dumps(spec, indent=2), encoding="utf-8")
    print(f"wrote swan-mark.spec.json ({len(json.dumps(spec)) / 1024:.1f} KB)")

    # --- independent validation render --------------------------------------
    print("=== 6. validate spec (flat polygon re-render, no browser) ===")
    for size in (1024,):
        ren = render_spec(spec, size)
        ren.save(HERE / "spec-render-1024.png")
        ra = np.asarray(ren, dtype=np.uint8)
        ref = a
        # silhouette IoU
        ren_sil = ra[:, :, 3] > 128
        ref_sil = alpha > 128
        inter = (ren_sil & ref_sil).sum()
        union = (ren_sil | ref_sil).sum()
        print(f"  badge IoU            : {inter / union:.6f}")
        # swan-only IoU
        rs = ren_sil & ~np.pad(np.ones((1, 1)), ((0, 0), (0, 0))).astype(bool)
        # rebuild swan mask from spec polygons for an honest comparison
        m = Image.new("L", (size, size), 0)
        md = ImageDraw.Draw(m)
        for f in spec["facets"]:
            md.polygon([(x * size, y * size) for x, y in f["polygon"]], fill=255)
        ren_swan = np.asarray(m, dtype=np.uint8) > 128
        inter2 = (ren_swan & sil).sum()
        union2 = (ren_swan | sil).sum()
        print(f"  swan IoU             : {inter2 / union2:.6f}")
        # colour error over the swan
        both = ren_swan & sil
        diff = np.abs(ra[:, :, :3].astype(float) - ref[:, :, :3].astype(float))[both]
        print(f"  swan mean|dRGB|      : {diff.mean():.2f}   p95 {np.percentile(diff, 95):.2f}")
        # full-image error over the disc
        d2 = np.abs(ra[:, :, :3].astype(float) - ref[:, :, :3].astype(float))[ref_sil]
        print(f"  disc mean|dRGB|      : {d2.mean():.2f}   p95 {np.percentile(d2, 95):.2f}")
        del rs
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
