"""roster_grammar_selftest.py — proves the two grammars mean the same thing.

Run:  python tools/blender/roster_grammar_selftest.py

The load-bearing test is EQUIVALENCE: one creature hand-authored in both grammars must yield
one identical cell set. Everything else guards a specific way the BOX parser could be wrong in
a manner no roster would visibly reveal — N double-counting its own inner C being the worst,
because it produces a plausible creature with a silently extra box.

Each check below names the requirement it encodes. A suite whose fixtures encode the AUTHOR's
assumption instead of the requirement passes while defending nothing; that has happened here
twice (the vacuous-tie fixture, and a count that was typed rather than measured).

No filesystem, no bpy. Exit 0 all pass, exit 1 any fail.
"""

import sys

import roster_grammar as G

FAILS = []
RAN = []


def check(name, got, want):
    RAN.append(name)
    if got == want:
        print("  ok    %s" % name)
    else:
        print("  FAIL  %s\n          got  %r\n          want %r" % (name, got, want))
        FAILS.append(name)


def err(fn):
    """The exception a call raises, or None. Keeps the assertion on the TYPE, not the message."""
    try:
        fn()
        return None
    except Exception as exc:  # noqa: BLE001 — inspecting whatever came out is the point
        return exc


# ------------------------------------------------------------------ 1. EQUIVALENCE (the point)
# Deliberately asymmetric in all three extents AND at a nonzero, partly negative position: a
# fixture that is 2x2x2 at the origin passes under a parser that reads extents as (dz,dy,dx) or
# positions in the wrong order, and then every asymmetric creature is silently wrong.
# 3x2x1 body (6 cells) + 1x1x1 head (1) + three 1x1x1 legs (3) = 10.
HAND_COUNTED = {
    (-1, 0, 0), (0, 0, 0), (1, 0, 0), (-1, 1, 0), (0, 1, 0), (1, 1, 0),   # body 3x2x1 at (-1,0,0)
    (2, 0, 0),                                                            # head
    (-1, -1, 0), (0, -1, 0), (1, -1, 0),                                  # legs
}
BOX_FORM = "C(-1,0,0,3,2,1); C(2,0,0,1,1,1); N(3,1,0,0,C(-1,-1,0,1,1,1))"
PROSE_FORM = ("body 3x2x1 at (-1,0,0), head 1x1x1 at (2,0,0), "
              "legA 1x1x1 at (-1,-1,0), legB 1x1x1 at (0,-1,0), legC 1x1x1 at (1,-1,0)")

box_cells = G.occupied_cells(G.parse_box(BOX_FORM))
prose_cells = G.occupied_cells(G.parse_prose(PROSE_FORM))
check("BOX matches the hand count", box_cells, HAND_COUNTED)
check("PROSE matches the hand count", prose_cells, HAND_COUNTED)
check("EQUIVALENCE: both grammars, one cell set", box_cells, prose_cells)
check("the fixture can actually pin axis order (no two extents equal)",
      len({3, 2, 1}), 3)

# Overlap semantics: both dialects must UNION, not count with multiplicity. Without an
# overlapping fixture, dedup at the N boundary is unanchored.
check("BOX unions overlapping boxes",
      len(G.occupied_cells(G.parse_box("C(0,0,0,2,1,1); C(1,0,0,2,1,1)"))), 3)
check("PROSE unions overlapping clusters",
      len(G.occupied_cells(G.parse_prose("a 2x1x1 at (0,0,0), b 2x1x1 at (1,0,0)"))), 3)
check("N whose own copies overlap unions them",
      len(G.occupied_cells(G.parse_box("N(3,1,0,0,C(0,0,0,2,1,1))"))), 4)

# ------------------------------------------------------------------ 2. N does not double-count
# The inner C of an N must be consumed by the N. If masking fails, this yields 4 cells, not 3,
# and the extra sits exactly on top of a real leg where no silhouette check would see it.
check("N consumes its inner C (no phantom 4th)",
      len(G.occupied_cells(G.parse_box("N(3,1,0,0,C(0,0,0,1,1,1))"))), 3)
check("N offsets are i*(sx,sy,sz), not a fixed shift",
      sorted(c["at"] for c in G.parse_box("N(3,2,0,0,C(0,0,0,1,1,1))")),
      [(0, 0, 0), (2, 0, 0), (4, 0, 0)])
check("negative y is a legal coordinate",
      G.occupied_cells(G.parse_box("C(0,-2,0,1,2,1)")), {(0, -2, 0), (0, -1, 0)})

# ------------------------------------------------------------------ 3. all THREE readings
# "odd-indexed" does not pin an index base, so reader-side MIRROR-BREAK is two readings, not
# one. Missed on the first pass; surfaced by the N4 panel.
check("off leaves every copy alone",
      sorted(c["at"] for c in G.parse_box("N(4,1,0,0,C(0,0,0,1,1,1))", mode="off")),
      [(0, 0, 0), (1, 0, 0), (2, 0, 0), (3, 0, 0)])
check("on0 lifts copies 1,3 (base-0 odd)",
      sorted(c["at"] for c in G.parse_box("N(4,1,0,0,C(0,0,0,1,1,1))", mode="on0")),
      [(0, 0, 0), (1, 0, 1), (2, 0, 0), (3, 0, 1)])
check("on1 lifts copies 0,2 (base-1 odd)",
      sorted(c["at"] for c in G.parse_box("N(4,1,0,0,C(0,0,0,1,1,1))", mode="on1")),
      [(0, 0, 1), (1, 0, 0), (2, 0, 1), (3, 0, 0)])
check("an unknown reading is refused, not silently treated as off",
      isinstance(err(lambda: G.parse_box("C(0,0,0,1,1,1)", mode="ON")), G.RecipeError), True)

# ------------------------------------------------------------------ 4. malformed is not empty
# A box with a zero or negative extent contributes NO cells. Left as data it vanishes silently:
# the creature comes out smaller and every downstream check passes on the smaller thing.
for bad in ("C(0,0,0,0,1,1)", "C(0,0,0,-1,1,1)", "C(0,0,0,3,0,1)"):
    check("non-positive extent %s is refused" % bad,
          isinstance(err(lambda b=bad: G.parse_box(b)), G.RecipeError), True)

# ------------------------------------------------------------------ 5. dispatch
check("dispatch picks BOX when C( is present", G.parse_recipe(BOX_FORM)[1], "box")
check("dispatch falls back to PROSE", G.parse_recipe(PROSE_FORM)[1], "prose")
check("dispatch reports none for unparseable prose",
      G.parse_recipe("14-cell lenticular carapace, bevel 0.4")[1], "none")

# ------------------------------------------------------------------ 6. block parsing, all forms
OX_MD = """### `parasite.bedbug`
- **role:** ambush-drainer
- **voxelCount:** 34
- **buildRecipe:** `C(0,0,0,2,2,1)`

### `parasite.tick`
- **voxelCount:** 12
"""
ox_blocks = G.parse_markdown_blocks(OX_MD)
check("Ox heading form yields 2 blocks", len(ox_blocks), 2)
check("Ox block carries its id", ox_blocks[0]["id"], "parasite.bedbug")
check("Ox block carries voxelCount", ox_blocks[0]["voxelCount"], "34")

GLM_MD = """**`bedbug_harbor`**
- **role:** harborage node
- **voxelDims:** 14×5×10 · **voxelCount:** 26 (carapace 14, head 4)
"""
glm_blocks = G.parse_markdown_blocks(GLM_MD)
check("GLM heading form yields 1 block", len(glm_blocks), 1)
check("GLM inline middot fields both split out", glm_blocks[0].get("voxelDims"), "14×5×10")
check("GLM voxelCount from a shared line", glm_blocks[0].get("voxelCount", "").split()[0], "26")

FENCED = "```\nid: enemy.fryling\nvoxelCount: 9\nbuildRecipe: body 2x2x1 at (0,0,0)\n```"
check("REGRESSION: fenced form still parses (4 built assets depend on it)",
      [b["id"] for b in G.parse_fenced_blocks(FENCED)], ["enemy.fryling"])
check("parse_blocks prefers fenced when both could match",
      [b["id"] for b in G.parse_blocks(FENCED + "\n" + OX_MD)], ["enemy.fryling"])

# ------------------------------------------------------------------ 7. liveness is MEASURED
# The old test asked whether the raw string contains "N(" — false-live for a single copy,
# false-dead for any spacing the parser tolerates but a substring test does not.
ONE_COPY = [{"id": "a", "voxelCount": "1", "buildRecipe": "N(1,1,0,0,C(0,0,0,1,1,1))"}]
# Under base-0 alone this would be vacuous — copy 0 is never odd. Under base-1 the sole copy IS
# the first, so it shifts, and the readings genuinely diverge. Adding the third reading turned a
# case I had called vacuous into an undecidable one. A substring test for "N(" could never have
# told the difference in either direction; only expanding all three readings can.
check("N with ONE copy is LIVE once base-1 is admitted", G.resolve_mirror_break(ONE_COPY)[0], None)
check("a one-cell creature cannot break the tie structurally or by count",
      "TIE" in G.resolve_mirror_break(ONE_COPY)[1], True)
check("no BOX recipes at all -> vacuous, and PROSE rosters still resolve",
      G.resolve_mirror_break([{"id": "a", "voxelCount": "4",
                               "buildRecipe": "body 2x2x1 at (0,0,0)"}])[0], "off")
check("a malformed recipe blocks resolution rather than skewing it",
      G.resolve_mirror_break([{"id": "a", "buildRecipe": "C(0,0,0,0,1,1)"}])[0], None)

# ------------------------------------------------------------------ 8. STRUCTURAL resolution
# Counts cannot separate "semantics is OFF and the author counted right" from "semantics is ON
# and the author's counting pass didn't implement it either" — both predict the same numbers.
# Connectivity can, and it does not depend on the author's arithmetic at all.
# A bar with an N riding on top: under off the copies sit on the bar; under on they lift clear.
BAR = {"id": "bar", "voxelCount": "0",  # deliberately WRONG so the oracle cannot be what decides
       "buildRecipe": "C(0,0,0,4,1,1); N(2,2,0,0,C(0,1,0,1,1,1))"}
mode, rep = G.resolve_mirror_break([BAR])
check("OFF keeps the piece whole, ON floats it -> OFF wins on STRUCTURE", mode, "off")
check("the report says the structural signal is arithmetic-independent",
      "independent of the author" in rep, True)
check("a wrong declared count cannot flip a structural verdict",
      G.resolve_mirror_break([dict(BAR, voxelCount="99")])[0], "off")

# ------------------------------------------------------------------ 9. components() is pure
check("components splits two disjoint groups",
      [len(c) for c in G.components({(0, 0, 0), (5, 0, 0), (6, 0, 0)})], [2, 1])
check("components joins face-adjacent cells", len(G.components({(0, 0, 0), (1, 0, 0)})), 1)
check("edge contact is NOT contact", len(G.components({(0, 0, 0), (1, 1, 0)})), 2)

print("\n%d checks, %d failed" % (len(RAN), len(FAILS)))
sys.exit(1 if FAILS else 0)
