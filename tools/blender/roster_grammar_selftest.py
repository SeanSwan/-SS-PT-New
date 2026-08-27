"""roster_grammar_selftest.py — what the roster tooling must be true of.

Run:  python tools/blender/roster_grammar_selftest.py

EVERY CHECK MUST REFERENCE THE SYMBOL UNDER TEST BY NAME. A fixture that asserts a literal
against a literal names a requirement and defends nothing; three of those shipped here in one
session, one written minutes after the docstring rule against them. Prose did not hold the line,
so the rule is mechanical now: `audit_self_asserting()` at the bottom fails the suite if any
check's arguments touch no module symbol.

The v1 parser had ten holes and every one was a SILENT wrong answer. Each is a permanent case
below — a regression suite earns its keep by remembering what was actually wrong, not by covering
what was easy to imagine.

No filesystem, no bpy. Exit 0 all pass, exit 1 any fail.
"""

import re
import sys

import roster_blocks as B
import roster_grammar as G
import roster_resolve as R

FAILS, RAN = [], []


def check(name, got, want):
    RAN.append(name)
    if got == want:
        print("  ok    %s" % name)
    else:
        print("  FAIL  %s\n          got  %r\n          want %r" % (name, got, want))
        FAILS.append(name)


def refuses(name, fn):
    """The tool must RAISE on this input, not absorb it into a smaller creature."""
    RAN.append(name)
    try:
        fn()
        print("  FAIL  %s\n          accepted; expected RecipeError" % name)
        FAILS.append(name)
    except G.RecipeError:
        print("  ok    %s" % name)


def cells(recipe, mode="off"):
    return len(G.occupied_cells(G.parse_box(recipe, mode=mode)))


# ------------------------------------------------------------------ 1. EQUIVALENCE
# Asymmetric in all three extents and at a partly negative origin: a 2x2x2 at the origin passes
# under a parser that reads extents as (dz,dy,dx) or positions in the wrong order, and every
# asymmetric creature is then silently wrong.
# 3x2x1 body (6) + 1x1x1 head (1) + three 1x1x1 legs (3) = 10.
HAND_COUNTED = {
    (-1, 0, 0), (0, 0, 0), (1, 0, 0), (-1, 1, 0), (0, 1, 0), (1, 1, 0),
    (2, 0, 0),
    (-1, -1, 0), (0, -1, 0), (1, -1, 0),
}
BOX_FORM = "C(-1,0,0,3,2,1); C(2,0,0,1,1,1); N(3,1,0,0,C(-1,-1,0,1,1,1))"
PROSE_FORM = ("body 3x2x1 at (-1,0,0), head 1x1x1 at (2,0,0), "
              "legA 1x1x1 at (-1,-1,0), legB 1x1x1 at (0,-1,0), legC 1x1x1 at (1,-1,0)")

check("BOX matches the hand count", G.occupied_cells(G.parse_box(BOX_FORM)), HAND_COUNTED)
check("PROSE matches the hand count", G.occupied_cells(G.parse_prose(PROSE_FORM)), HAND_COUNTED)
check("EQUIVALENCE: both grammars, one cell set",
      G.occupied_cells(G.parse_box(BOX_FORM)), G.occupied_cells(G.parse_prose(PROSE_FORM)))
# Assert against the PARSED extents, not a literal. The v1 form of this was `len({3,2,1}) == 3`,
# which references nothing and cannot fail.
check("the equivalence fixture has three distinct extents (an axis swap is detectable)",
      len(set(G.parse_box(BOX_FORM)[0]["size"])), 3)

# ------------------------------------------------------------------ 2. counting conventions
# The grammar states cells = sum(dx*dy*dz); the tool naturally computes the deduplicated union.
# They differ exactly when boxes overlap. v1 held the union silently and blamed the author.
OVERLAP = "C(0,0,0,2,1,1); C(1,0,0,2,1,1)"
check("union counts an overlapped cell once", len(G.occupied_cells(G.parse_box(OVERLAP))), 3)
check("summed counts it once per box", G.summed_cells(G.parse_box(OVERLAP)), 4)
check("the conventions agree when nothing overlaps",
      (len(G.occupied_cells(G.parse_box(BOX_FORM))), G.summed_cells(G.parse_box(BOX_FORM))),
      (10, 10))

# ------------------------------------------------------------------ 3. N semantics
check("N consumes its own inner C (no phantom extra box)", cells("N(3,1,0,0,C(0,0,0,1,1,1))"), 3)
check("N offsets compound as i*(sx,sy,sz)",
      sorted(c["at"] for c in G.parse_box("N(3,2,0,0,C(0,0,0,1,1,1))")),
      [(0, 0, 0), (2, 0, 0), (4, 0, 0)])
check("N whose copies overlap unions them", cells("N(3,1,0,0,C(0,0,0,2,1,1))"), 4)
check("negative coordinates survive",
      G.occupied_cells(G.parse_box("C(0,-2,0,1,2,1)")), {(0, -2, 0), (0, -1, 0)})

# ------------------------------------------------------------------ 4. all THREE readings
check("off leaves every copy alone",
      sorted(c["at"] for c in G.parse_box("N(4,1,0,0,C(0,0,0,1,1,1))", mode="off")),
      [(0, 0, 0), (1, 0, 0), (2, 0, 0), (3, 0, 0)])
check("on0 lifts copies 1,3 (base-0 odd)",
      sorted(c["at"] for c in G.parse_box("N(4,1,0,0,C(0,0,0,1,1,1))", mode="on0")),
      [(0, 0, 0), (1, 0, 1), (2, 0, 0), (3, 0, 1)])
check("on1 lifts copies 0,2 (base-1 odd)",
      sorted(c["at"] for c in G.parse_box("N(4,1,0,0,C(0,0,0,1,1,1))", mode="on1")),
      [(0, 0, 1), (1, 0, 0), (2, 0, 1), (3, 0, 0)])
refuses("an unknown reading is refused, not treated as off",
        lambda: G.parse_box("C(0,0,0,1,1,1)", mode="ON"))

# ------------------------------------------------------------------ 5. THE TEN v1 HOLES
# Every one was ACCEPTED by the regex scavenger and produced a smaller creature with no error.
refuses("hybrid prose+box (dropped 5 of 6 prose cells)",
        lambda: G.parse_recipe("body 3x2x1 at (0,0,0); C(5,0,0,1,1,1)"))
refuses("inner C with 5 args (dropped the whole N)",
        lambda: G.parse_box("N(2,1,0,0,C(0,0,0,1,1)); C(9,9,9,1,1,1)"))
refuses("N with 7 args (repetition disappeared)",
        lambda: G.parse_box("N(2,1,0,0,0,C(0,0,0,1,1,1))"))
refuses("unclosed N( (accepted as 4 cells, zero problems)",
        lambda: G.parse_box("N(2,1,0,0,C(0,0,0,3,1,1)\nC(0,1,0,1,1,1)"))
refuses("nested N (outer dropped, 2 cells where 4 belong)",
        lambda: G.parse_box("N(2,3,0,0,N(2,1,0,0,C(0,0,0,1,1,1)))"))
refuses("ARC( — no word boundary (parsed as a box)",
        lambda: G.parse_box("ARC(0,0,0,1,1,1)"))
refuses("extent past the cap (10^10 cells on materialisation)",
        lambda: G.parse_box("C(0,0,0,100000,100000,1)"))
refuses("repeat count past the cap (2M boxes in 1.66s)",
        lambda: G.parse_box("N(2000000,1,0,0,C(0,0,0,1,1,1))"))
refuses("zero extent in BOX (contributed no cells, silently)",
        lambda: G.parse_box("C(0,0,0,0,1,1)"))
refuses("zero extent in PROSE (crashed with ValueError, falsifying 'never fatal')",
        lambda: G.parse_prose("body 0x1x1 at (0,0,0)"))
check("a commented-out recipe yields nothing and is not reported as BOX",
      G.parse_recipe("# C(0,0,0,2,2,2)"), ([], "none"))
check("a comment ends at the newline and does not eat the next statement",
      cells("C(0,0,0,3,1,1); # a comment\nN(2,0,0,1,C(0,1,0,1,1,1))"), 5)

# ------------------------------------------------------------------ 6. containers
OX_MD = "### `parasite.bedbug`\n- **voxelCount:** 34\n- **buildRecipe:** `C(0,0,0,2,2,1)`\n"
GLM_MD = "**`bedbug_harbor`**\n- **voxelDims:** 14x5x10 · **voxelCount:** 26 (carapace 14)\n"
FENCED = "```\nid: enemy.fryling\nvoxelCount: 9\nbuildRecipe: body 2x2x1 at (0,0,0)\n```"
check("heading form parses", [b["id"] for b in B.parse_markdown_blocks(OX_MD)], ["parasite.bedbug"])
check("bold form parses", [b["id"] for b in B.parse_markdown_blocks(GLM_MD)], ["bedbug_harbor"])
check("inline middot fields both split out",
      B.parse_markdown_blocks(GLM_MD)[0].get("voxelCount", "").split()[0], "26")
check("fenced form parses", [b["id"] for b in B.parse_fenced_blocks(FENCED)], ["enemy.fryling"])
# v1 returned `fenced or markdown`, so one fence discarded every heading block in the document.
check("MIXED containers are MERGED, not one discarding the other",
      sorted(b["id"] for b in B.parse_blocks(FENCED + "\n" + OX_MD)),
      ["enemy.fryling", "parasite.bedbug"])
check("a duplicated id is reported rather than silently collapsed",
      B.duplicate_ids(OX_MD + OX_MD), ["parasite.bedbug"])

# ------------------------------------------------------------------ 7. ids are path components
for bad_id in ("evil.../../../../escaped", "UPPER.case", "trailing.", ".leading", "has space"):
    check("unsafe id %r rejected" % bad_id, bool(G.SAFE_ID_RE.match(bad_id)), False)
for ok_id in ("parasite.bedbug", "robot.socket-leech", "enemy.patty-larva", "horsehair"):
    check("safe id %r accepted" % ok_id, bool(G.SAFE_ID_RE.match(ok_id)), True)

# ------------------------------------------------------------------ 8. components
check("components splits two disjoint groups",
      [len(c) for c in G.components({(0, 0, 0), (5, 0, 0), (6, 0, 0)})], [2, 1])
check("components joins face-adjacent cells", len(G.components({(0, 0, 0), (1, 0, 0)})), 1)
check("edge contact is NOT contact", len(G.components({(0, 0, 0), (1, 1, 0)})), 2)

# ------------------------------------------------------------------ 9. the resolver REPORTS
# It must never hand back something a caller can branch on — that is how the circularity returns.
BLK = [{"id": "a", "voxelCount": "4", "buildRecipe": "C(0,0,0,4,1,1); N(2,2,0,0,C(0,1,0,1,1,1))"}]
check("report() returns prose, not a verdict", isinstance(R.report(BLK), str), True)
check("report names the shatter predicate as circular with the gate",
      "SAME predicate the gate refuses on" in R.report(BLK), True)
check("report routes a silent roster to the OWNER, never to a stateless 'author'",
      "OWNER DECISION" in R.report(BLK, "nothing relevant here")
      and "ASK THE AUTHOR" not in R.report(BLK, "nothing relevant here"), True)
check("a roster asserting reader-side semantics is detected as evidence",
      R.textual_assertion("MIRROR-BREAK ... (validator-visible asymmetry)")[0], "reader")
check("a roster asserting author-side semantics is detected too",
      R.textual_assertion("the author has already applied the lift")[0], "author")
check("silence is silence, not a guess", R.textual_assertion("nothing about it")[0], None)
check("divergent() finds only creatures whose readings disagree",
      R.divergent(R.implications(BLK)[0]), ["a"])


# ------------------------------------------------------------------ 10. the meta-check
def audit_self_asserting():
    """Names of checks whose arguments reference no symbol from the modules under test.

    `check("the fixture pins axis order", len({3,2,1}), 3)` passes forever and defends nothing.
    Three shipped in one session. Prose did not stop it; this does.
    """
    # An EXPLICIT allowlist, not a loose pattern: `G.`/`B.`/`R.` reach the modules directly, and
    # these two local helpers are themselves defined in terms of them. Anything else added later
    # has to be listed here deliberately, so a new blind helper cannot silently widen the guard.
    reaches = (re.compile(r"\b[GBR]\."), re.compile(r"\bcells\("),
               re.compile(r"\baudit_self_asserting\("))
    src = open(__file__, encoding="utf-8").read()
    orphans = []
    for label, args in re.findall(
            r"(?m)^check\(\s*(\"[^\"]+\"(?: % [^,]+)?),(.*?)(?=\n(?:check|refuses|for |#|print|def |\Z))",
            src, re.S):
        if not any(rx.search(args) for rx in reaches):
            orphans.append(label)
    return orphans


check("no check asserts a literal against a literal (self-asserting-fixture guard)",
      audit_self_asserting(), [])

print("\n%d checks, %d failed" % (len(RAN), len(FAILS)))
sys.exit(1 if FAILS else 0)
