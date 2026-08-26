"""roster-to-obj.py — turn authored enemy specs into voxel-blockout .obj files.

Consumes an authored roster (docs/ai-workflow/AI-HANDOFF/*-roster-*.md, *-expansion-*.md) and
emits one .obj per creature in the duplicate-vertex-per-face topology a voxel exporter produces
— which is exactly what swan_pipe.py's weld + limited-dissolve stages exist to clean up.

    python tools/blender/roster-to-obj.py --roster <md> --out assets/source/enemy
    python tools/blender/roster-to-obj.py --roster <md> --list        # parse only, no writes
    python tools/blender/roster-to-obj.py --roster <md> --expect 18   # completeness gate

No bpy. Runs anywhere. The GRAMMARS live in roster_grammar.py so they can be tested without a
filesystem; this file is the policy layer — what to refuse, and what to write.

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
  - a recipe in no grammar this tool knows (reported as UNPARSEABLE against the creature, not
    as "no blocks found" against the roster — the failure belongs on the right thing)
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import roster_grammar as G  # noqa: E402


def describe(comps):
    """Components as sizes and extents, largest first.

    NOT "the main body plus orphans". For a tethered pair of near-equal halves, calling one half
    orphaned is technically true and useless — it frames a design decision as an accident. Sizes
    and extents let the author see what the recipe actually built.
    """
    return "; ".join(
        "%d cell(s) x%d..%d y%d..%d z%d..%d"
        % (len(c), min(p[0] for p in c), max(p[0] for p in c),
           min(p[1] for p in c), max(p[1] for p in c),
           min(p[2] for p in c), max(p[2] for p in c))
        for c in comps)


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
        for a, b, c, d in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1),
                           (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
            faces.append((base + a + 1, base + b + 1, base + c + 1, base + d + 1))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("# %s\n" % header)
        for v in verts:
            fh.write("v %d %d %d\n" % v)
        for f in faces:
            fh.write("f %d %d %d %d\n" % f)
    return len(verts), len(faces)


def check(spec, mode):
    """Returns (cells, grammar, [problems]). A problem is a refusal for THIS block only."""
    problems = []
    try:
        clusters, grammar = G.parse_recipe(spec.get("buildRecipe", ""), mode=mode)
    except G.RecipeError as exc:
        return None, "box", ["malformed recipe: %s" % exc]
    if grammar == "none":
        return None, grammar, ["buildRecipe is in no grammar this tool knows "
                               "(not BOX `C(x,y,z,dx,dy,dz)`, not PROSE `name WxHxD at (x,y,z)`)"]
    cells = G.occupied_cells(clusters)
    n = len(cells)
    if not 4 <= n <= 40:
        problems.append("occupied cells %d outside 4-40 (below has no silhouette; above blows "
                        "the tier ceilings)" % n)

    # Multi-piece is a DECLARATION, not an accident to be guessed at. `voxelCount` is already
    # declared intent the gate verifies; `components` works the same way. Default 1 keeps every
    # existing spec refusing exactly as before, while a designed swarm or tethered pair can say
    # so and be checked rather than blocked.
    comps = G.components(cells)
    want = str(spec.get("components", "1")).strip().split()[0]
    want = int(want) if want.isdigit() else 1
    if len(comps) != want:
        problems.append("recipe builds %d separate piece(s), the spec declares %d: %s. Contact is "
                        "6-neighbour at the CELL level — a single bridging cell connects two "
                        "boxes; edge and corner contact do not count. A floating piece makes a "
                        "disconnected mesh and the convex hull swallows the gap. If the split is "
                        "deliberate, declare `components: %d`."
                        % (len(comps), want, describe(comps), len(comps)))
    if x_mirror_symmetric(cells):
        problems.append("perfect X-mirror symmetry — the art law bans plastic-cube regularity")
    raw = str(spec.get("voxelCount", "")).strip()
    declared = raw.split()[0] if raw else ""
    if declared.isdigit() and int(declared) != n:
        problems.append("voxelCount says %s, the recipe yields %d (delta %+d) — the spec "
                        "disagrees with itself" % (declared, n, n - int(declared)))
    return cells, grammar, problems


def main():
    ap = argparse.ArgumentParser(prog="roster-to-obj")
    ap.add_argument("--roster", required=True)
    ap.add_argument("--out", default="assets/source/enemy")
    ap.add_argument("--list", action="store_true", help="parse and report, write nothing")
    ap.add_argument("--expect", type=int, default=None,
                    help="the number of spec blocks this roster MUST yield. Per-block tolerance "
                         "means a truncated authoring pass produces fewer assets and every one of "
                         "them looks fine — the generator architecturally cannot see a block that "
                         "was never written (Ox Alpha, N3 blocker 1). Pass the count; a short "
                         "roster fails.")
    ap.add_argument("--mirror-break", choices=["auto"] + list(G.MODES), default="auto",
                    help="The BOX grammar says odd-indexed N copies get z+=1. That may be a rule "
                         "the AUTHOR applied (off) or one the READER applies — and 'odd' is not "
                         "index-base-pinned, so reader-side is two readings (on0, on1), not one. "
                         "`auto` decides STRUCTURALLY: the reading under which fewest creatures "
                         "shatter into disconnected pieces, which does not depend on the author's "
                         "arithmetic. Refuses on a genuine tie rather than guessing.")
    args = ap.parse_args()

    blocks = G.parse_blocks(open(args.roster, encoding="utf-8").read())
    if not blocks:
        print("[roster] EXIT 2 - no spec blocks found in %s. Zero parsed is not a pass."
              % args.roster, file=sys.stderr)
        sys.exit(2)

    if args.mirror_break == "auto":
        mode, report = G.resolve_mirror_break(blocks)
        if mode is None:
            print("[roster] EXIT 2 - %s. Pass --mirror-break %s explicitly; guessing would "
                  "silently distort every creature that uses N()."
                  % (report, "|".join(G.MODES)), file=sys.stderr)
            sys.exit(2)
        print("[roster] mirror-break resolved from the roster itself: %s\n           %s"
              % (mode.upper(), report))
    else:
        mode = args.mirror_break
        print("[roster] mirror-break forced %s by flag" % mode.upper())

    ok = refused = 0
    for spec in blocks:
        ident = spec["id"]
        cells, grammar, problems = check(spec, mode)
        if problems:
            refused += 1
            print("  REFUSED %s" % ident)
            for p in problems:
                print("          %s" % p)
            continue
        slug = ident.split(".", 1)[1] if "." in ident else ident
        rig = spec.get("rig", "none")
        if args.list:
            print("  ok      %-26s cells=%-3d grammar=%-5s rig=%-3s role=%s"
                  % (ident, len(cells), grammar, "yes" if rig != "none" else "no",
                     spec.get("role", "?")))
        else:
            path = os.path.join(args.out, slug, "%s-blockout.obj" % slug)
            v, f = write_obj(path, cells, "%s - %d voxels, generated from the authored roster"
                             % (ident, len(cells)))
            print("  wrote   %s  (%d cells, %d verts, %d quads, rig=%s)"
                  % (path, len(cells), v, f, rig))
        ok += 1

    print("\n[roster] %d written, %d refused, %d blocks parsed" % (ok, refused, len(blocks)))
    if args.expect is not None and len(blocks) != args.expect:
        print("[roster] EXIT 1 - expected %d spec blocks, parsed %d. A truncated authoring pass "
              "yields fewer assets and each one looks fine; only this count sees the blocks that "
              "were never written." % (args.expect, len(blocks)), file=sys.stderr)
        sys.exit(1)
    sys.exit(1 if refused else 0)


if __name__ == "__main__":
    main()
