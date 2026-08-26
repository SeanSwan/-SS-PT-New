"""roster-to-obj.py — turn authored enemy specs into voxel-blockout .obj files.

Consumes the roster Ox Alpha authored (docs/ai-workflow/AI-HANDOFF/ox-enemy-roster-2026-08-26.md)
and emits one .obj per enemy in the duplicate-vertex-per-face topology a voxel exporter produces
— which is exactly what swan_pipe.py's weld + limited-dissolve stages exist to clean up.

    python tools/blender/roster-to-obj.py --roster <md> --out assets/source/enemy
    python tools/blender/roster-to-obj.py --roster <md> --list        # parse only, no writes

No bpy. Runs anywhere.

DESIGNED AGAINST THE AUTHOR'S OWN CRITIQUE (Ox Alpha, §5.3 of its roster reply):
  - "rig: none voids clip validation, or every prop spec will fail parsing"  -> props parse fine
    and carry rig=None; the caller decides whether to pass --skeleton.
  - "the script should assert asymmetry programmatically rather than trusting authors" -> an
    occupied-cell set equal to its own X-mirror is REJECTED. The art law bans plastic-cube
    regularity; a rule enforced by a human is a rule that erodes.
  - "a 9-block single response is the worst case for a partial-parse failure ... commit per
    block, so a truncated response still yields 7 usable assets instead of 0" -> every block is
    parsed and written independently; one malformed block is reported and skipped, never fatal.

WHAT IT REFUSES (per block, non-fatal):
  - a recipe whose clusters do not all touch or overlap (a floating cluster makes a
    disconnected mesh and the convex-hull collision swallows the gap)
  - an occupied-cell count outside 4-40 (below has no silhouette; above blows the tier ceilings
    at the calibration the pipe was probed at)
  - perfect X-mirror symmetry
  - a declared voxelCount that disagrees with the recipe (the spec lying about itself)
"""

import argparse
import os
import re
import sys

CLUSTER_RE = re.compile(
    r"(?P<name>[A-Za-z][\w \-+']*?)\s+"
    r"(?P<w>\d+)\s*[x×]\s*(?P<h>\d+)\s*[x×]\s*(?P<d>\d+)\s*"
    r"at\s*\(\s*(?P<x>-?\d+)\s*,\s*(?P<y>-?\d+)\s*,\s*(?P<z>-?\d+)\s*\)",
    re.IGNORECASE,
)
FIELD_RE = re.compile(r"^(?P<key>[a-zA-Z]+):\s*(?P<val>.*)$")


def parse_blocks(text):
    """Every fenced block that contains an `id:` line. One malformed block never kills the rest."""
    out = []
    for raw in re.findall(r"```(.*?)```", text, re.DOTALL):
        fields, key = {}, None
        for line in raw.splitlines():
            m = FIELD_RE.match(line.strip())
            if m:
                key = m.group("key")
                fields[key] = m.group("val").strip()
            elif key and line.strip():
                fields[key] += " " + line.strip()
        if "id" in fields:
            out.append(fields)
    return out


def parse_recipe(spec):
    clusters = []
    for m in CLUSTER_RE.finditer(spec):
        clusters.append({
            "name": m.group("name").strip(),
            "size": (int(m.group("w")), int(m.group("h")), int(m.group("d"))),
            "at": (int(m.group("x")), int(m.group("y")), int(m.group("z"))),
        })
    return clusters


def occupied_cells(clusters):
    cells = set()
    for c in clusters:
        w, h, d = c["size"]
        x, y, z = c["at"]
        for i in range(w):
            for j in range(h):
                for k in range(d):
                    cells.add((x + i, y + j, z + k))
    return cells


def connected(cells):
    """6-neighbour flood from an arbitrary cell must reach every cell."""
    if not cells:
        return False
    start = next(iter(cells))
    seen, stack = {start}, [start]
    while stack:
        x, y, z = stack.pop()
        for dx, dy, dz in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)):
            n = (x + dx, y + dy, z + dz)
            if n in cells and n not in seen:
                seen.add(n)
                stack.append(n)
    return len(seen) == len(cells)


def x_mirror_symmetric(cells):
    xs = [c[0] for c in cells]
    lo, hi = min(xs), max(xs)
    return {(lo + hi - x, y, z) for x, y, z in cells} == cells


def write_obj(path, cells, header):
    """One cube per cell, six quads each, its own vertices — voxel-exporter topology on purpose."""
    verts, faces = [], []
    for (x, y, z) in sorted(cells):
        base = len(verts)
        for dx in (0, 1):
            for dy in (0, 1):
                for dz in (0, 1):
                    verts.append((x + dx, y + dy, z + dz))
        for a, b, c, d in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
            faces.append((base + a + 1, base + b + 1, base + c + 1, base + d + 1))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(f"# {header}\n")
        for v in verts:
            fh.write("v %d %d %d\n" % v)
        for f in faces:
            fh.write("f %d %d %d %d\n" % f)
    return len(verts), len(faces)


def check(spec):
    """Returns (cells, [problems]). A problem is a refusal for THIS block only."""
    problems = []
    clusters = parse_recipe(spec.get("buildRecipe", ""))
    if not clusters:
        return None, ["buildRecipe parsed to zero clusters"]
    cells = occupied_cells(clusters)
    n = len(cells)
    if not 4 <= n <= 40:
        problems.append(f"occupied cells {n} outside 4-40 (below has no silhouette; above blows the tier ceilings)")
    if not connected(cells):
        problems.append("clusters are not all touching — a floating cluster makes a disconnected mesh and the hull swallows the gap")
    if x_mirror_symmetric(cells):
        problems.append("perfect X-mirror symmetry — the art law bans plastic-cube regularity")
    declared = spec.get("voxelCount", "").strip()
    if declared.isdigit() and int(declared) != n:
        problems.append(f"voxelCount says {declared}, the recipe yields {n} — the spec disagrees with itself")
    return cells, problems


def main():
    ap = argparse.ArgumentParser(prog="roster-to-obj")
    ap.add_argument("--roster", required=True)
    ap.add_argument("--out", default="assets/source/enemy")
    ap.add_argument("--list", action="store_true", help="parse and report, write nothing")
    args = ap.parse_args()

    blocks = parse_blocks(open(args.roster, encoding="utf-8").read())
    if not blocks:
        print(f"[roster] EXIT 2 — no spec blocks found in {args.roster}. Zero parsed is not a pass.", file=sys.stderr)
        sys.exit(2)

    ok = refused = 0
    for spec in blocks:
        ident = spec["id"]
        cells, problems = check(spec)
        if problems:
            refused += 1
            print(f"  REFUSED {ident}")
            for p in problems:
                print(f"          {p}")
            continue
        slug = ident.split(".", 1)[1] if "." in ident else ident
        rig = spec.get("rig", "none")
        if args.list:
            print(f"  ok      {ident:<26} cells={len(cells):<3} rig={'yes' if rig != 'none' else 'no ':<3} role={spec.get('role','?')}")
        else:
            path = os.path.join(args.out, slug, f"{slug}-blockout.obj")
            v, f = write_obj(path, cells, f"{ident} — {len(cells)} voxels, generated from the authored roster")
            print(f"  wrote   {path}  ({len(cells)} cells, {v} verts, {f} quads, rig={rig})")
        ok += 1

    print(f"\n[roster] {ok} written, {refused} refused, {len(blocks)} blocks parsed")
    sys.exit(1 if refused else 0)


if __name__ == "__main__":
    main()
