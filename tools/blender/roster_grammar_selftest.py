"""roster_grammar_selftest.py — proves the two grammars mean the same thing.

Run:  python tools/blender/roster_grammar_selftest.py

The load-bearing test is EQUIVALENCE: one creature hand-authored in both grammars must yield
one identical cell set. Everything else guards a specific way the BOX parser could be wrong in
a manner no roster would visibly reveal — N double-counting its own inner C being the worst,
because it produces a plausible creature with a silently extra box.

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


# ------------------------------------------------------------------ 1. EQUIVALENCE (the point)
# A hand-counted creature: 2x2x1 body (4 cells) + 1x1x1 head (1) + three 1x1x1 legs (3) = 8.
HAND_COUNTED = {
    (0, 0, 0), (1, 0, 0), (0, 1, 0), (1, 1, 0),   # body
    (2, 0, 0),                                     # head
    (0, -1, 0), (1, -1, 0), (2, -1, 0),            # legs
}
BOX_FORM = "C(0,0,0,2,2,1); C(2,0,0,1,1,1); N(3,1,0,0,C(0,-1,0,1,1,1))"
PROSE_FORM = ("body 2x2x1 at (0,0,0), head 1x1x1 at (2,0,0), "
              "legA 1x1x1 at (0,-1,0), legB 1x1x1 at (1,-1,0), legC 1x1x1 at (2,-1,0)")

box_cells = G.occupied_cells(G.parse_box(BOX_FORM))
prose_cells = G.occupied_cells(G.parse_prose(PROSE_FORM))
check("BOX matches the hand count", box_cells, HAND_COUNTED)
check("PROSE matches the hand count", prose_cells, HAND_COUNTED)
check("EQUIVALENCE: both grammars, one cell set", box_cells, prose_cells)

# ------------------------------------------------------------------ 2. N does not double-count
# The inner C of an N must be consumed by the N. If masking fails, this yields 4 cells, not 3,
# and the extra one sits exactly on top of a real leg where no silhouette check would see it.
check("N consumes its inner C (no phantom 4th)",
      len(G.occupied_cells(G.parse_box("N(3,1,0,0,C(0,0,0,1,1,1))"))), 3)

# ------------------------------------------------------------------ 3. N offsets compound
check("N offsets are i*(sx,sy,sz), not a fixed shift",
      sorted(c["at"] for c in G.parse_box("N(3,2,0,0,C(0,0,0,1,1,1))")),
      [(0, 0, 0), (2, 0, 0), (4, 0, 0)])

# ------------------------------------------------------------------ 4. mirror_break is real
check("mirror_break OFF leaves odd copies alone",
      sorted(c["at"] for c in G.parse_box("N(3,1,0,0,C(0,0,0,1,1,1))", mirror_break=False)),
      [(0, 0, 0), (1, 0, 0), (2, 0, 0)])
check("mirror_break ON raises odd-indexed copies by z+1",
      sorted(c["at"] for c in G.parse_box("N(3,1,0,0,C(0,0,0,1,1,1))", mirror_break=True)),
      [(0, 0, 0), (1, 0, 1), (2, 0, 0)])

# ------------------------------------------------------------------ 5. negative coords survive
check("negative y is a legal coordinate",
      G.occupied_cells(G.parse_box("C(0,-2,0,1,2,1)")), {(0, -2, 0), (0, -1, 0)})

# ------------------------------------------------------------------ 6. dispatch
check("dispatch picks BOX when C( is present", G.parse_recipe(BOX_FORM)[1], "box")
check("dispatch falls back to PROSE", G.parse_recipe(PROSE_FORM)[1], "prose")
check("dispatch reports none for unparseable prose",
      G.parse_recipe("14-cell lenticular carapace, bevel 0.4")[1], "none")

# ------------------------------------------------------------------ 7. block parsing, all forms
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

# ------------------------------------------------------------------ 8. the two kinds of tie
# VACUOUS: no recipe uses N, so both readings ARE the same function. Refusing here would lock
# out every PROSE roster — which is what the four already-built assets use. This fixture used
# to assert None and passed, because it encoded my assumption instead of the requirement.
VACUOUS = [{"id": "a", "voxelCount": "1", "buildRecipe": "C(0,0,0,1,1,1)"},
           {"id": "b", "voxelCount": "1", "buildRecipe": "C(5,0,0,1,1,1)"}]
flag, report = G.resolve_mirror_break(VACUOUS)
check("no N() anywhere is a VACUOUS tie, not a refusal", flag, False)
check("vacuous tie says why", "vacuous" in report, True)

# LIVE: N is used, and both readings agree with exactly as many declared counts. Undecidable.
# 2 cells either way for the first (z-shift does not change the count of a 1-high column),
# and the second is deliberately wrong under both readings, so neither can pull ahead.
LIVE = [{"id": "a", "voxelCount": "2", "buildRecipe": "N(2,1,0,0,C(0,0,0,1,1,1))"},
        {"id": "b", "voxelCount": "99", "buildRecipe": "N(2,1,0,0,C(0,0,0,1,1,1))"}]
flag, report = G.resolve_mirror_break(LIVE)
check("a LIVE tie returns None rather than guessing", flag, None)
check("a live tie says so out loud", "TIE" in report, True)

# A DISCRIMINATING case. Note what it takes: a z-shift only changes the cell COUNT when the
# shifted copy would otherwise have landed on a cell that already exists. `N` copies that never
# overlap anything give the same count under both readings — which is why the aggregate score on
# the real roster was 12-vs-10 rather than 18-vs-0, and why the count is a WEAK discriminator.
# Here the N copies land inside a bar, so OFF merges them away and ON lifts one clear.
DISCRIM = [{"id": "d", "voxelCount": "3",
            "buildRecipe": "C(0,0,0,3,1,1); N(2,1,0,0,C(0,0,0,1,1,1))"}]
check("OFF merges overlapping N copies (3 cells)",
      len(G.occupied_cells(G.parse_box(DISCRIM[0]["buildRecipe"], mirror_break=False))), 3)
check("ON lifts the odd copy clear (4 cells)",
      len(G.occupied_cells(G.parse_box(DISCRIM[0]["buildRecipe"], mirror_break=True))), 4)
check("a roster whose counts only fit OFF resolves OFF",
      G.resolve_mirror_break(DISCRIM)[0], False)

print("\n%d checks, %d failed" % (len(RAN), len(FAILS)))
sys.exit(1 if FAILS else 0)
