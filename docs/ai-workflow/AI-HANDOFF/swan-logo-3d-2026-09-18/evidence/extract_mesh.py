"""
SwanStudios header swan mark -> 3-D-ready mesh spec.

WHAT THE REFERENCE ACTUALLY IS (established from pixels, not assumed):
  * 1024x1024 RGBA. The badge is a filled circle, centre (0.5,0.5), r=0.5, and
    100% of the inscribed disc is opaque.
  * The badge is a smooth navy field whose RED CHANNEL IS ALWAYS 0..2. The
    swan's dark regions sit at R>=4. That is a clean, exact discriminator.
  * The swan casts a soft DROP SHADOW on the badge. The shadow is also R<=2,
    which is why every residual-based silhouette swallowed it. It is modelled
    here as a radial-basis field, not as geometry.
  * The swan's shading is BANDED - hard-edged facets - but each facet is NOT a
    single flat colour: the reference's facets carry a visible gradient (the
    wing feathers run dark at the tip to light at the base). An earlier revision
    of this file claimed flat was "the correct model"; measuring it showed flat
    costs 14.6% of the residual at boundaries and 36.7% deep inside
    (experiment_facet_shading.py). So each facet now carries BOTH its median
    (`color`, kept for the rasteriser) and a fitted linear plane (`plane`), which
    is what the renderer uses. The hard facet EDGES are preserved either way -
    the plane is fitted per facet, so neighbouring facets still meet as a step.

Outputs into ./evidence:
  swan-mark.mesh.json     spec: badge field, outline, mesh, facet colours
                          (CANONICAL - includes the rasteriser-only mesh fields)
  swan-mark.render.json   the same spec minus fields the browser never reads;
                          this is the file copied to frontend/src/three/swanMark/
  mesh-render-1024.png    the spec rasterised in Python - the SAME triangles
                          three.js will receive
  dbg-*.png               silhouette / facet debug maps
"""
from __future__ import annotations

import json
from pathlib import Path

import mapbox_earcut as earcut
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.cluster.vq import kmeans2
from skimage import color as skcolor
from skimage import measure, morphology, segmentation

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
SRC = REPO / "frontend" / "src" / "assets" / "Logo.png"

CHROMA_R = 4
BEAK_G, BEAK_B = 35, 65
GRAD_T = 8.0
BARRIER_DILATE = 3
POLY_DEG = 4
RBF_GRID = 9
RBF_SIGMA = 0.11
FACET_MIN_PX = 150
POLY_TOL = 1.8
FACET_OVERLAP = 1      # px each facet grows inward-only, to close seam gaps
LATTICE = 0.25
SUPERSAMPLE = 3

# Mesh fields the Python rasteriser needs but swanMarkFactory.ts never reads.
# They are emitted into swan-mark.mesh.json (the canonical evidence spec) and
# dropped from swan-mark.render.json (the browser payload).
RENDER_DROP = ("vertexColor", "facetRings", "ringFacet")

# Per-facet ANALYSIS fields. The browser reads `color` (fallback) and `plane`; the
# rest are diagnostics that gate_spec.py and the hostile review read, so they stay in
# the canonical spec and are dropped from the payload. Measured at 21.0 KB - the same
# defect class as RENDER_DROP above, and it pays for the gradient planes several
# times over.
FACET_DROP = ("index", "areaPx", "vertices", "triangles", "meanColor",
              "colorStd", "colorSpread", "centroidNorm")


def hexs(rgb) -> str:
    return "#{:02X}{:02X}{:02X}".format(*(int(round(float(v))) for v in rgb))


def hex_to_rgb(h: str):
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


# ---------------------------------------------------------------------------
def build_silhouette(rgb, alpha):
    """Edge-barrier flood fill.

    No colour rule can separate the swan's darkest region (#001158) from the
    badge's darkest region (#000C54) - they are the same colour. But the swan
    still has a HARD edge there while the drop shadow's edge is soft. So build a
    barrier from (strong gradient) OR (chroma, where colour does separate) OR
    (the near-black beak), flood the disc from its rim through everything the
    barrier does not cover, and keep what the flood cannot reach.
    """
    h, w = alpha.shape
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    gy = np.zeros_like(lum)
    gx = np.zeros_like(lum)
    gy[1:-1, :] = lum[2:, :] - lum[:-2, :]
    gx[:, 1:-1] = lum[:, 2:] - lum[:, :-2]
    grad = ndimage.gaussian_filter(np.sqrt(gx * gx + gy * gy), 0.8)

    disc = alpha > 128
    hard = (grad > GRAD_T) | (r >= CHROMA_R) | ((g < BEAK_G) & (b < BEAK_B))
    barrier = morphology.dilation(hard, morphology.disk(BARRIER_DILATE)) & disc

    free = disc & ~barrier
    lab, _ = ndimage.label(free, structure=np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]]))
    yy, xx = np.mgrid[0:h, 0:w]
    c = (w - 1) / 2.0
    rr = np.sqrt((xx - c) ** 2 + (yy - c) ** 2)
    outside_ids = set(np.unique(lab[free & (rr > w / 2.0 - 3)]).tolist()) - {0}
    outside = np.isin(lab, list(outside_ids))
    inside = disc & ~outside
    # The barrier was dilated by BARRIER_DILATE to close gaps in the edge
    # network, so `inside` overshoots the swan by exactly that many pixels.
    # Erode it back before taking the component, or the extra band renders as a
    # bright halo around the silhouette.
    if BARRIER_DILATE > 0:
        inside = morphology.erosion(inside, morphology.disk(BARRIER_DILATE))
    li, ni = ndimage.label(inside, structure=np.ones((3, 3)))
    sz = ndimage.sum(inside, li, range(1, ni + 1))
    swan = li == (int(np.argmax(sz)) + 1)
    swan = ndimage.binary_fill_holes(swan) & disc
    swan = morphology.remove_small_objects(swan, max_size=2000)
    swan = morphology.remove_small_holes(swan, max_size=40000)
    return swan


def fit_badge_field(rgb, alpha, sil):
    """polynomial (coarse gradient) + Gaussian RBF (the drop shadow)."""
    h, w = alpha.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    u = (xx / (w - 1)) * 2 - 1
    v = (yy / (h - 1)) * 2 - 1
    terms = [(i, j) for i in range(POLY_DEG + 1) for j in range(POLY_DEG + 1)
             if i + j <= POLY_DEG]
    B = np.stack([(u ** i) * (v ** j) for i, j in terms], axis=-1).reshape(-1, len(terms))
    solid = (alpha == 255).ravel()

    free = solid & ~sil.ravel()
    keep = free.copy()
    pred = np.zeros((h, w, 3))
    coef = []
    for _ in range(5):
        pred = np.zeros((h, w, 3))
        coef = []
        for c in range(3):
            beta, *_ = np.linalg.lstsq(B[keep], rgb[:, :, c].ravel()[keep], rcond=None)
            coef.append(beta)
            pred[:, :, c] = (B @ beta).reshape(h, w)
        mag = np.abs(pred - rgb).max(axis=2).ravel()
        mad = np.median(np.abs(mag[free] - np.median(mag[free])))
        keep = free & (mag <= max(4.0, 4.0 * mad))
    fr = free.reshape(h, w)
    poly_err = np.abs(pred - rgb).max(axis=2)
    print(f"  poly deg {POLY_DEG}: badge-only mean {poly_err[fr].mean():.2f} "
          f"p95 {np.percentile(poly_err[fr], 95):.2f}")

    cx = np.linspace(-1.05, 1.05, RBF_GRID)
    cy = np.linspace(-1.05, 1.05, RBF_GRID)
    GX, GY = np.meshgrid(cx, cy)
    centres = np.stack([GX.ravel(), GY.ravel()], axis=1)
    d2 = ((u.reshape(-1, 1) - centres[None, :, 0]) ** 2
          + (v.reshape(-1, 1) - centres[None, :, 1]) ** 2)
    R = np.exp(-d2 / (2 * RBF_SIGMA ** 2))
    # Fit the RBF on ALL badge pixels, NOT on the rejection set: the rejection
    # pass exists to clean the polynomial, but the drop shadow it discards is
    # exactly what the RBF is here to capture.
    Rk = R[free]
    rbf_coef = []
    pred2 = np.zeros((h, w, 3))
    for c in range(3):
        target = (rgb[:, :, c].ravel() - (B @ coef[c]))[free]
        gamma, *_ = np.linalg.lstsq(Rk, target, rcond=None)
        rbf_coef.append(gamma)
        pred2[:, :, c] = (B @ coef[c] + R @ gamma).reshape(h, w)
    err2 = np.abs(pred2 - rgb).max(axis=2)
    print(f"  + RBF({RBF_GRID}x{RBF_GRID}): badge-only mean {err2[fr].mean():.2f} "
          f"p95 {np.percentile(err2[fr], 95):.2f} p99 {np.percentile(err2[fr], 99):.2f} "
          f"max {err2[fr].max():.2f}")
    return {
        "polyTerms": [[i, j] for i, j in terms],
        "polyCoef": [[round(float(c), 8) for c in ch] for ch in coef],
        "rbfGrid": RBF_GRID, "rbfSigma": RBF_SIGMA,
        "rbfCentres": [[round(float(a_), 6), round(float(b_), 6)] for a_, b_ in centres],
        "rbfCoef": [[round(float(c), 8) for c in ch] for ch in rbf_coef],
        "residualMean": round(float(err2[fr].mean()), 3),
        "residualP95": round(float(np.percentile(err2[fr], 95)), 3),
        "residualP99": round(float(np.percentile(err2[fr], 99)), 3),
    }


def badge_field_array(field, size):
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float64)
    u = ((xx / (size - 1)) * 2 - 1).reshape(-1)
    v = ((yy / (size - 1)) * 2 - 1).reshape(-1)
    B = np.stack([(u ** i) * (v ** j) for i, j in field["polyTerms"]], axis=-1)
    C = np.array(field["rbfCentres"])
    d2 = (u[:, None] - C[None, :, 0]) ** 2 + (v[:, None] - C[None, :, 1]) ** 2
    R = np.exp(-d2 / (2 * field["rbfSigma"] ** 2))
    out = np.zeros((size * size, 3))
    for c in range(3):
        out[:, c] = B @ np.array(field["polyCoef"][c]) + R @ np.array(field["rbfCoef"][c])
    return np.clip(out, 0, 255).reshape(size, size, 3)


# ---------------------------------------------------------------------------
def segment_facets(rgb, sil):
    """k-means in LAB proposes colours; watershed on the luminance gradient
    turns those proposals into a partition whose boundaries follow real edges."""
    lab = skcolor.rgb2lab(rgb / 255.0)
    px = lab[sil].astype(np.float64)
    centroids, _ = kmeans2(px, 128, minit="++", seed=11)
    dist = np.linalg.norm(lab[:, :, None, :] - centroids[None, None, :, :], axis=3)
    markers = np.argmin(dist, axis=2).astype(np.int32) + 1
    markers[~sil] = 0

    lum = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
    gy = np.zeros(sil.shape)
    gx = np.zeros(sil.shape)
    gy[1:-1, :] = lum[2:, :] - lum[:-2, :]
    gx[:, 1:-1] = lum[:, 2:] - lum[:, :-2]
    grad = ndimage.gaussian_filter(np.sqrt(gx * gx + gy * gy), 1.2)

    ws = segmentation.watershed(grad, markers=markers, mask=sil)
    ws[~sil] = 0
    del dist
    return merge_small(ws, sil, FACET_MIN_PX)


def merge_small(ws, sil, floor):
    for _ in range(12):
        ids, counts = np.unique(ws[ws > 0], return_counts=True)
        small = [int(i) for i, c in zip(ids, counts) if c < floor]
        if not small:
            break
        for s in small:
            m = ws == s
            if not m.any():
                continue
            ring = morphology.dilation(m, morphology.disk(2)) & ~m & sil
            if not ring.any():
                ws[m] = 0
                continue
            vals, cnts = np.unique(ws[ring], return_counts=True)
            sel = vals > 0
            vals, cnts = vals[sel], cnts[sel]
            ws[m] = 0 if len(vals) == 0 else vals[int(np.argmax(cnts))]
    ids, _ = np.unique(ws[ws > 0], return_counts=True)
    remap = {int(v): i + 1 for i, v in enumerate(ids)}
    out = np.zeros_like(ws)
    for k, v in remap.items():
        out[ws == k] = v
    # Any pixel the merge left unlabelled would render as the pre-fill colour,
    # i.e. a bright halo hugging every boundary. Give it to the nearest facet so
    # the facets tile the silhouette exactly.
    gap = sil & (out == 0)
    if gap.any():
        _, ind = ndimage.distance_transform_edt(out == 0, return_indices=True)
        out[gap] = out[ind[0][gap], ind[1][gap]]
    return out, len(remap)


# ---------------------------------------------------------------------------
def _simplify(c, tol, lattice):
    ap = measure.approximate_polygon(c, tolerance=tol)
    if len(ap) >= 2 and np.allclose(ap[0], ap[-1]):
        ap = ap[:-1]
    ap = np.round(ap / lattice) * lattice
    if len(ap) >= 2:
        keep = [0]
        for i in range(1, len(ap)):
            if not np.allclose(ap[i], ap[keep[-1]]):
                keep.append(i)
        if len(keep) >= 2 and np.allclose(ap[keep[0]], ap[keep[-1]]):
            keep.pop()
        ap = ap[keep]
    return ap if len(ap) >= 3 else None


def polygons_of(mask, tol, lattice, min_area=12.0):
    """ALL contours, not just the longest.

    merge_small folds small regions into neighbours, which can leave a facet
    non-contiguous. Keeping only the longest contour silently drops the other
    pieces: that lost 29% of the silhouette area and rendered as a bright halo.
    """
    padded = np.pad(mask, 1)
    cs = measure.find_contours(padded.astype(float), 0.5)
    out = []
    for c in cs:
        c = c - 1.0
        if len(c) < 3:
            continue
        if abs(_signed_area(c)) < min_area:
            continue
        ap = _simplify(c, tol, lattice)
        if ap is not None:
            out.append(ap)
    out.sort(key=lambda a: -abs(_signed_area(a)))
    return out


def _signed_area(poly):
    y = poly[:, 0]
    x = poly[:, 1]
    return 0.5 * float(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))


def polygon_of(mask, tol, lattice):
    ps = polygons_of(mask, tol, lattice)
    return ps[0] if ps else None


def triangulate(poly_rc):
    pts = np.stack([poly_rc[:, 1], poly_rc[:, 0]], axis=1).astype(np.float64)
    ring = np.array([len(pts)], dtype=np.int32)
    try:
        return earcut.triangulate_float64(pts, ring).reshape(-1, 3)
    except Exception:
        return []


# ---------------------------------------------------------------------------
def rasterise(spec, size, ss=SUPERSAMPLE):
    S = size * ss
    field = badge_field_array(spec["badge"]["field"], S)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float64)
    r = S / 2.0
    inside = ((xx + 0.5 - r) ** 2 + (yy + 0.5 - r) ** 2) <= (r - 0.5) ** 2
    arr = np.zeros((S, S, 4), dtype=np.uint8)
    arr[:, :, :3] = field.astype(np.uint8)
    arr[:, :, 3] = np.where(inside, 255, 0).astype(np.uint8)
    V = spec["mesh"]["vertices"]
    facets = spec["facets"]
    rings = spec["mesh"]["facetRings"]
    # Draw each facet as ONE polygon (not its triangles - that would show seams)
    # with a 2px stroke at supersampled scale, i.e. ~0.33 output px of growth.
    # That closes the sub-pixel gap the independent contour simplification
    # leaves between neighbours, with no visible boundary shift.
    #
    # Facets are filled with their fitted PLANE, not a flat median, so this
    # rasteriser describes the same object three.js renders. A linear plane is
    # reproduced exactly by Gouraud interpolation across the facet's triangles, so
    # the two agree by construction rather than by luck.
    #
    # NOTE: everything writes into `arr` and the PIL image is built at the END.
    # `Image.fromarray` does not track later writes to the source array, so
    # building it up front and drawing into it via ImageDraw (as this function
    # originally did) silently renders the pre-fill buffer.
    mask = Image.new("L", (S, S), 0)
    mdraw = ImageDraw.Draw(mask)
    prev: tuple[int, int, int, int] | None = None
    for ring, fi in zip(rings, spec["mesh"]["ringFacet"]):
        pts = [(V[i][0] * S, V[i][1] * S) for i in ring]
        fac = facets[fi]
        # Clear only the previous facet's box rather than reallocating a full-size
        # mask per facet (126 x 3072^2 would be ~1.2 G pixel writes).
        if prev is not None:
            mdraw.rectangle(prev, fill=0)
        mdraw.polygon(pts, fill=255, outline=255, width=1)
        xs_ = [p[0] for p in pts]
        ys_ = [p[1] for p in pts]
        x0 = max(0, int(min(xs_)) - 2)
        x1 = min(S, int(max(xs_)) + 3)
        y0 = max(0, int(min(ys_)) - 2)
        y1 = min(S, int(max(ys_)) + 3)
        prev = (x0, y0, x1, y1)
        if x1 <= x0 or y1 <= y0:
            continue
        sub = np.asarray(mask.crop((x0, y0, x1, y1))) > 0
        if not sub.any():
            continue

        plane = fac.get("plane")
        if plane is None:
            # Older spec with no fitted plane: fall back to the flat median.
            for c in range(3):
                flat = int(hex_to_rgb(fac["color"])[c])
                block = arr[y0:y1, x0:x1, c]
                arr[y0:y1, x0:x1, c] = np.where(sub, flat, block).astype(np.uint8)
            continue

        # Pixel centres in normalised spec space (x right, y DOWN) - the same
        # convention `plane` was fitted in.
        nx = (np.arange(x0, x1) + 0.5) / S
        ny = (np.arange(y0, y1) + 0.5) / S
        for c in range(3):
            c0, cx, cy = plane[c * 3], plane[c * 3 + 1], plane[c * 3 + 2]
            val = c0 + cx * nx[None, :] + cy * ny[:, None]
            block = arr[y0:y1, x0:x1, c]
            arr[y0:y1, x0:x1, c] = np.where(
                sub, np.clip(np.rint(val), 0, 255), block
            ).astype(np.uint8)
    return Image.fromarray(arr, "RGBA").resize((size, size), Image.BOX)


# ---------------------------------------------------------------------------
def main() -> int:
    global POLY_TOL, LATTICE, FACET_MIN_PX
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--tol", type=float, default=POLY_TOL)
    ap.add_argument("--lattice", type=float, default=LATTICE)
    ap.add_argument("--minpx", type=int, default=FACET_MIN_PX)
    ap.add_argument("--tag", default="")
    args = ap.parse_args()
    POLY_TOL, LATTICE, FACET_MIN_PX = args.tol, args.lattice, args.minpx
    img = Image.open(SRC).convert("RGBA")
    a = np.asarray(img, dtype=np.uint8)
    h, w = a.shape[:2]
    alpha = a[:, :, 3]
    rgb = a[:, :, :3].astype(np.float64)

    print("=== silhouette (chromatic-or-beak) ===")
    sil = build_silhouette(rgb, alpha)
    ys, xs = np.nonzero(sil)
    bbox = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
    print(f"  {int(sil.sum()):,} px  bbox {bbox}  "
          f"norm x[{bbox[0]/w:.4f}..{(bbox[2]+1)/w:.4f}] y[{bbox[1]/h:.4f}..{(bbox[3]+1)/h:.4f}]")
    ea = np.asarray(img.convert("RGB")).copy()
    ea[sil & ~np.roll(sil, 1, 0)] = (255, 0, 0)
    Image.fromarray(ea, "RGB").save(HERE / "dbg-silhouette-overlay.png")

    print("=== badge field ===")
    field = fit_badge_field(rgb, alpha, sil)

    print("=== facets ===")
    ws, nf = segment_facets(rgb, sil)
    sizes = {int(i): int(c) for i, c in zip(*np.unique(ws[ws > 0], return_counts=True))}
    covered = int(sum(sizes.values()))
    print(f"  {nf} facets, min {min(sizes.values())} px, max {max(sizes.values())} px")
    print(f"  facet coverage: {covered:,} / {int(sil.sum()):,} px = "
          f"{covered / sil.sum():.6%}  (must be 100.000000%)")
    if covered != int(sil.sum()):
        print("  FAIL: facets do not tile the silhouette")
    rng = np.random.default_rng(3)
    lut = rng.integers(40, 255, size=(nf + 2, 3), dtype=np.uint8)
    lut[0] = (0, 0, 0)
    Image.fromarray(lut[np.clip(ws, 0, nf + 1)], "RGB").save(HERE / "dbg-facets.png")

    print("=== mesh ===")
    vertices: list[list[float]] = []
    triangles: list[list[int]] = []
    tri_facet: list[int] = []
    vcolor: list[str] = []
    facet_records = []
    weld: dict[tuple[int, int], int] = {}

    def vid(r_, c_):
        key = (int(round(r_ / LATTICE)), int(round(c_ / LATTICE)))
        hit = weld.get(key)
        if hit is not None:
            return hit
        i = len(vertices)
        weld[key] = i
        rr = int(np.clip(round(r_), 0, h - 1))
        cc = int(np.clip(round(c_), 0, w - 1))
        vertices.append([round(float(c_) / w, 6), round(float(r_) / h, 6)])
        vcolor.append(hexs(rgb[rr, cc]))
        return i

    rings: list[list[int]] = []
    ring_facet: list[int] = []
    plane_err: list[float] = []
    flat_err: list[float] = []
    plane_px: list[int] = []
    plane_degraded = 0
    order = sorted(sizes, key=lambda i: -sizes[i])
    calls = 0
    dropped = 0
    for i in order:
        raw = ws == i
        # Grow each facet by FACET_OVERLAP but clip to the silhouette, so seams
        # between neighbours overlap instead of gapping, while the OUTER edge
        # stays exactly on the silhouette.
        grown = morphology.dilation(raw, morphology.disk(FACET_OVERLAP)) & sil
        polys = polygons_of(grown, POLY_TOL, LATTICE)
        if not polys:
            dropped += 1
            continue
        # index into facet_records, which is what the renderer and three.js use
        rec = len(facet_records)
        for poly in polys:
            tris = triangulate(poly)
            if len(tris) == 0:
                dropped += 1
                continue
            idx = [vid(r_, c_) for r_, c_ in poly]
            calls += len(poly)
            rings.append(idx)
            ring_facet.append(rec)
            for t in tris:
                triangles.append([idx[int(t[0])], idx[int(t[1])], idx[int(t[2])]])
                tri_facet.append(rec)
        cols = rgb[raw]
        med = np.median(cols, axis=0)
        # Per-facet linear plane, fitted in normalised (x, y) space with y DOWN -
        # the same convention the spec uses everywhere else, so the renderer can
        # evaluate it at a vertex without any axis juggling.
        #
        # Fitted in sRGB, not linear, on purpose: the reference is sRGB and the
        # fidelity metric measures sRGB. An earlier revision shipped only the
        # median (`color`) and flattened the gradient; measuring it showed flat
        # shading costs 14.6% of the residual at facet boundaries and 36.7% deep
        # inside (see experiment_facet_shading.py). The reference's wing facets
        # genuinely carry dark->light gradients, so the plane is the honest model.
        rr_, cc_ = np.nonzero(raw)
        xs_ = cc_ / w
        ys_ = rr_ / h
        A = np.stack([np.ones_like(xs_), xs_, ys_], axis=1)
        coef, *_ = np.linalg.lstsq(A, cols.astype(np.float64), rcond=None)
        # lstsq returns shape (3, 3): ROWS are [const, x, y], COLUMNS are channels.
        # Transpose BEFORE flattening, or the result is
        # [const_r, const_g, const_b, x_r, x_g, x_b, y_r, y_g, y_b] - which is not
        # the per-channel layout the renderer indexes. (Getting this wrong renders
        # a correctly-shaped but completely wrong image, so it is asserted below.)
        plane = [round(float(v), 5) for v in coef.T.reshape(-1)]
        assert len(plane) == 9, plane

        # lstsq minimises SQUARED error, but the fidelity metric is a mean ABSOLUTE
        # error, and on a handful of facets a constant genuinely beats a plane under
        # MAE (the extra two parameters buy variance they do not pay back in bias).
        # So the plane is kept only where it wins on the metric actually scored;
        # otherwise the gradient is zeroed and the facet renders flat. This is why
        # `plane` is always present and always safe to evaluate - no extra flag.
        pred = A @ coef
        e_plane = float(np.abs(pred - cols).mean())
        e_flat = float(np.abs(cols - med[None, :]).mean())
        if e_plane >= e_flat:
            plane = [round(float(med[0]), 5), 0.0, 0.0,
                     round(float(med[1]), 5), 0.0, 0.0,
                     round(float(med[2]), 5), 0.0, 0.0]
            e_plane = e_flat
            plane_degraded += 1

        plane_err.append(e_plane * len(cols))
        flat_err.append(e_flat * len(cols))
        plane_px.append(len(cols))
        facet_records.append({
            "index": rec, "areaPx": sizes[i], "vertices": len(poly), "triangles": len(tris),
            "color": hexs(med), "meanColor": hexs(cols.mean(axis=0)),
            "plane": plane,
            "colorStd": [round(float(v), 2) for v in cols.std(axis=0)],
            "colorSpread": round(float(np.abs(cols - med).max(axis=1).mean()), 2),
            "centroidNorm": [round(float(np.nonzero(raw)[1].mean()) / w, 5),
                             round(float(np.nonzero(raw)[0].mean()) / h, 5)],
        })
    print(f"  {len(vertices):,} welded vertices ({calls - len(vertices):,} shared), "
          f"{len(triangles):,} triangles, {len(facet_records)} facets, "
          f"{len(rings)} rings (dropped {dropped})")
    if plane_px:
        tp = sum(plane_err) / sum(plane_px)
        tf = sum(flat_err) / sum(plane_px)
        print(f"  facet shading: flat {tf:.3f} -> plane {tp:.3f} "
              f"({tp / tf - 1:+.1%}) over {sum(plane_px):,} px")
        print(f"  {len(facet_records) - plane_degraded} facets carry a gradient, "
              f"{plane_degraded} fell back to flat (plane lost on MAE)")

    outline = polygon_of(morphology.remove_small_holes(sil, max_size=60000),
                         POLY_TOL, LATTICE)
    print(f"  outline {len(outline)} vertices")

    spec = {
        "name": "swan-mark", "version": 2,
        "source": str(SRC.relative_to(REPO)), "sourceSize": [w, h],
        "coordinates": {"space": "normalised", "x": "0 left .. 1 right",
                        "y": "0 TOP .. 1 bottom  (flip y for three.js)"},
        "extractor": {"chromaR": CHROMA_R, "beakGate": [BEAK_G, BEAK_B],
                      "polyDeg": POLY_DEG, "rbfGrid": RBF_GRID, "rbfSigma": RBF_SIGMA,
                      "facetMinPx": FACET_MIN_PX, "polygonTolerance": POLY_TOL,
                      "facetOverlapPx": FACET_OVERLAP,
                      "vertexLatticePx": LATTICE, "supersample": SUPERSAMPLE},
        "badge": {"shape": "circle", "centre": [0.5, 0.5], "radius": 0.5, "field": field},
        "swan": {"bboxNorm": [bbox[0] / w, bbox[1] / h, (bbox[2] + 1) / w, (bbox[3] + 1) / h],
                 "areaPx": int(sil.sum()),
                 "outline": [[round(float(c_) / w, 6), round(float(r_) / h, 6)]
                             for r_, c_ in outline]},
        "mesh": {"vertices": vertices, "triangles": triangles,
                 "triangleFacet": tri_facet, "vertexColor": vcolor,
                 "facetRings": rings, "ringFacet": ring_facet},
        "facets": facet_records,
    }
    # The canonical spec ALWAYS gets the untagged name, and a --tag run also writes a
    # tagged copy for provenance. Writing only the tagged name (as this did
    # originally) silently leaves swan-mark.mesh.json stale, so
    # verify_spec_parity.py and gate_spec.py end up validating the PREVIOUS run.
    blob = json.dumps(spec, separators=(",", ":"))
    canon = HERE / "swan-mark.mesh.json"
    canon.write_text(blob, encoding="utf-8")
    print(f"  wrote {canon.name} {canon.stat().st_size / 1024:.1f} KB  (canonical)")
    if args.tag:
        out = HERE / f"swan-mark.mesh{args.tag}.json"
        out.write_text(blob, encoding="utf-8")
        print(f"  wrote {out.name} {out.stat().st_size / 1024:.1f} KB  (tagged copy)")

    # The browser renderer reads only vertices / triangles / triangleFacet out of
    # `mesh`. vertexColor, facetRings and ringFacet exist for the Python rasteriser
    # above, and shipping them to the browser is ~135 KB of dead payload. So the
    # render spec is emitted separately, and verify_spec_parity.py asserts it is a
    # byte-identical subset of the full spec - the two can never silently drift.
    render_spec = dict(spec)
    render_spec["mesh"] = {k: v for k, v in spec["mesh"].items() if k not in RENDER_DROP}
    render_spec["facets"] = [
        {k: v for k, v in f.items() if k not in FACET_DROP} for f in spec["facets"]
    ]
    render_spec["emittedFor"] = "browser"
    rblob = json.dumps(render_spec, separators=(",", ":"))
    rcanon = HERE / "swan-mark.render.json"
    rcanon.write_text(rblob, encoding="utf-8")
    print(f"  wrote {rcanon.name} {rcanon.stat().st_size / 1024:.1f} KB  (canonical payload)")
    if args.tag:
        rpath = HERE / f"swan-mark.render{args.tag}.json"
        rpath.write_text(rblob, encoding="utf-8")
        print(f"  wrote {rpath.name} {rpath.stat().st_size / 1024:.1f} KB  (tagged copy)")
    print(f"  dropped - mesh: {', '.join(RENDER_DROP)}; facets: {', '.join(FACET_DROP)}")

    print("=== rasterise ===")
    ren = rasterise(spec, 1024)
    ren.save(HERE / "mesh-render-1024.png")
    rr = np.asarray(ren, dtype=np.uint8)
    d = np.abs(rr[:, :, :3].astype(np.int16) - a[:, :, :3].astype(np.int16)).max(axis=2)
    on = (rr[:, :, 3] > 128) | (alpha > 128)
    print(f"  disc mean {d[on].mean():.3f}  p95 {np.percentile(d[on], 95):.0f}  "
          f"max {d[on].max()}   share>8 {(d[on] > 8).mean():.3%}")
    print(f"  swan mean {d[sil].mean():.3f}  p95 {np.percentile(d[sil], 95):.0f}  "
          f"share>8 {(d[sil] > 8).mean():.3%}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
