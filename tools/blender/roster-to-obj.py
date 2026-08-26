"""roster-to-obj.py — turn authored creature specs into voxel-blockout .obj files.

    python tools/blender/roster-to-obj.py --roster <md> --mirror-break off --list
    python tools/blender/roster-to-obj.py --roster <md> --mirror-break off --out assets/source/enemy
    python tools/blender/roster-to-obj.py --roster <md> --explain     # report the ambiguity only

No bpy. The GRAMMARS live in roster_grammar.py, the CONTAINERS in roster_blocks.py, and the
mirror-break REPORT in roster_resolve.py, so each can be tested without a filesystem. This file
is the policy layer: what to refuse, and what to write.

--mirror-break IS REQUIRED, DELIBERATELY. Two generations of this tool tried to infer it and both
inferences were circular (see roster_resolve.py). The reading is now an operator decision, stated
on the command line and echoed into every .obj header so a built asset records the semantics it
was built under. `--explain` prints everything known about the ambiguity and exits without
building, which is the honest replacement for a resolver that guessed.

WHAT IT REFUSES (per block, non-fatal — one bad block never kills the run):
  - a recipe in neither grammar, or mixing both
  - a malformed statement: wrong arity, unbalanced parens, non-positive or oversized extent
  - an occupied-cell count outside 4-40
  - a piece count that disagrees with the declared `components:` (default 1)
  - perfect X-mirror symmetry
  - a declared voxelCount matching NEITHER counting convention
  - an id that is not a safe path component
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import roster_blocks as B          # noqa: E402
import roster_grammar as G         # noqa: E402
import roster_resolve as R         # noqa: E402


def x_mirror_symmetric(cells):
    xs = [c[0] for c in cells]
    lo, hi = min(xs), max(xs)
    return {(lo + hi - x, y, z) for x, y, z in cells} == cells


def describe(comps):
    """Components as sizes and extents, largest first — not "the body plus orphans".

    For a tethered pair of near-equal halves, calling one half orphaned frames a design decision
    as an accident.
    """
    return "; ".join(
        "%d cell(s) x%d..%d y%d..%d z%d..%d"
        % (len(c), min(p[0] for p in c), max(p[0] for p in c),
           min(p[1] for p in c), max(p[1] for p in c),
           min(p[2] for p in c), max(p[2] for p in c))
        for c in comps)


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


def _declared_int(spec, key, default=None):
    raw = str(spec.get(key, "")).strip()
    head = raw.split()[0] if raw else ""
    return int(head) if head.isdigit() else default


def check(spec, mode):
    """Returns (cells, grammar, [problems]). A problem refuses THIS block only."""
    problems = []
    try:
        clusters, grammar = G.parse_recipe(spec.get("buildRecipe", ""), mode=mode)
    except G.RecipeError as exc:
        return None, "?", ["malformed recipe: %s" % exc]
    if grammar == "none":
        return None, grammar, ["buildRecipe is in no grammar this tool knows (not BOX "
                               "`C(x,y,z,dx,dy,dz)`, not PROSE `name WxHxD at (x,y,z)`)"]
    cells = G.occupied_cells(clusters)
    n = len(cells)
    if not cells:
        return None, grammar, ["recipe parsed but occupies no cells"]
    if not 4 <= n <= 40:
        problems.append("occupied cells %d outside 4-40 (below has no silhouette; above blows the "
                        "tier ceilings)" % n)

    # Multi-piece is a DECLARATION, not an accident to be guessed at. An invalid value is an
    # error, not a silent 1 — unable-to-verify must never become a false declaration.
    comps = G.components(cells)
    # ABSENT means 1; PRESENT-but-unparseable is an error. Those are different states and the
    # default must be decided in exactly one place — computing it twice is how every spec
    # without the field ended up refused as "not a number".
    if "components" not in spec:
        want = 1
    else:
        want = _declared_int(spec, "components", None)
    if want is None:
        problems.append("components: %r is not a number. Absence means 1; a present-but-malformed "
                        "value is refused rather than coerced to 1, because unable-to-verify must "
                        "not become a false declaration." % str(spec.get("components"))[:24])
    elif len(comps) != want:
        problems.append("recipe builds %d separate piece(s), the spec declares %d: %s. Contact is "
                        "6-neighbour at the CELL level — one bridging cell joins two boxes; edge "
                        "and corner contact do not count. If the split is deliberate, declare "
                        "`components: %d`." % (len(comps), want, describe(comps), len(comps)))
    if x_mirror_symmetric(cells):
        problems.append("perfect X-mirror symmetry — the art law bans plastic-cube regularity")

    # THE COUNTING CONVENTION IS THE AUTHOR'S, NOT MINE. The BOX grammar states
    # `cells = sum(dx*dy*dz)`; this tool naturally computes the deduplicated union. They differ
    # only when boxes overlap. An earlier version enforced the union alone and reported two
    # creatures as self-contradictory when the tool was the one contradicting the spec — one of
    # which (deep.barreleye) is entirely valid under the rule its author wrote down.
    declared = _declared_int(spec, "voxelCount")
    if declared is not None:
        summed = G.summed_cells(clusters)
        if declared not in (n, summed):
            problems.append("voxelCount says %d; the recipe yields %d distinct cells and %d summed "
                            "(sum of dx*dy*dz, the convention the grammar states). It matches "
                            "neither." % (declared, n, summed))
    return cells, grammar, problems


def main():
    ap = argparse.ArgumentParser(prog="roster-to-obj")
    ap.add_argument("--roster", required=True)
    ap.add_argument("--out", default="assets/source/enemy")
    ap.add_argument("--list", action="store_true", help="parse and report, write nothing")
    ap.add_argument("--explain", action="store_true",
                    help="report everything known about the mirror-break ambiguity and exit "
                         "without building. Replaces the resolver that used to guess.")
    ap.add_argument("--expect", type=int, default=None,
                    help="the number of spec blocks this roster MUST yield. Per-block tolerance "
                         "means a truncated authoring pass produces fewer assets and every one of "
                         "them looks fine; only this count sees blocks that were never written.")
    ap.add_argument("--mirror-break", choices=list(G.MODES), default=None,
                    help="REQUIRED unless --explain. Which reading of the grammar's MIRROR-BREAK "
                         "rule to build under. Not inferred: two generations of inference were "
                         "circular. Run --explain first, ask the roster's author, then state it.")
    args = ap.parse_args()

    text = open(args.roster, encoding="utf-8").read()
    blocks = B.parse_blocks(text)
    if not blocks:
        print("[roster] EXIT 2 - no spec blocks found in %s. Zero parsed is not a pass."
              % args.roster, file=sys.stderr)
        sys.exit(2)
    for dup in B.duplicate_ids(text):
        print("[roster] WARNING duplicate id %r — the first definition wins and the rest are "
              "invisible" % dup)

    if args.explain:
        print("[roster] %d spec block(s). Mirror-break ambiguity:" % len(blocks))
        print(R.report(blocks, text))
        sys.exit(0)
    if args.mirror_break is None:
        print("[roster] EXIT 2 - --mirror-break is required. The grammar's MIRROR-BREAK rule has "
              "at least three readings that build different creatures, and inferring it was "
              "circular twice over. Run --explain to see what each implies, ask the roster's "
              "author, then state the reading.", file=sys.stderr)
        sys.exit(2)
    print("[roster] mirror-break = %s (operator-stated, not inferred)" % args.mirror_break)

    ok = refused = 0
    for spec in blocks:
        ident = spec["id"]
        if not G.SAFE_ID_RE.match(ident):
            refused += 1
            print("  REFUSED %s\n          id is not a safe path component; it becomes a directory "
                  "name and the roster is authored by a language model. Allowed: lowercase "
                  "alphanumerics with single dots or hyphens between segments." % ident)
            continue
        cells, grammar, problems = check(spec, args.mirror_break)
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
            v, f = write_obj(path, cells, "%s - %d voxels, mirror-break=%s, from the authored "
                             "roster" % (ident, len(cells), args.mirror_break))
            print("  wrote   %s  (%d cells, %d verts, %d quads, rig=%s)"
                  % (path, len(cells), v, f, rig))
        ok += 1

    print("\n[roster] %d written, %d refused, %d blocks parsed" % (ok, refused, len(blocks)))
    if args.expect is not None and len(blocks) != args.expect:
        print("[roster] EXIT 1 - expected %d spec blocks, parsed %d." % (args.expect, len(blocks)),
              file=sys.stderr)
        sys.exit(1)
    sys.exit(1 if refused else 0)


if __name__ == "__main__":
    main()
