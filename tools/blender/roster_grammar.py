"""roster_grammar.py — the authoring grammars a roster may be written in, and the cells they mean.

Two grammars reach this project, because two different authors independently invented one:

  PROSE   "abdomen 3x2x1 at (0,0,0)"          — the 2026-08-26 contamination roster
  BOX     "C(0,0,0,3,2,1); N(3,1,0,0,C(...))" — the 2026-08-26 parasite roster

REWRITTEN 2026-08-26 (v2) after independent hostile reviews from Fable and GPT-5.6 Sol found
nine real defects in the v1 regex-scavenger, every one of which was a SILENT wrong answer rather
than an error. The scavenger asked "does a C( appear anywhere in this text" and built whatever it
found. That accepts, without complaint:

    body 3x2x1 at (0,0,0); C(5,0,0,1,1,1)   -> 1 cell. The five prose cells vanish.
    N(2,1,0,0,C(0,0,0,1,1))                 -> the N is dropped, the malformed C ignored.
    N(2,1,0,0,0,C(...))                     -> wrong arity; repetition silently disappears.
    N(2,1,0,0,C(0,0,0,3,1,1)  <no close>    -> 4 cells, zero problems reported.
    # C(0,0,0,2,2,2)                        -> 8 cells from a COMMENT.
    ARC(0,0,0,1,1,1)                        -> 1 cell; no word boundary.
    C(0,0,0,100000,100000,1)                -> accepted; 10^10 cells on materialisation.

v2 TOKENISES INSTEAD OF SCAVENGING. A recipe is a semicolon-separated list of statements; every
statement must match a whole production exactly; anything left unconsumed is an error. The default
answer to malformed input is RecipeError, never a smaller creature.

THE COUNTING CONVENTION IS DECLARED, NOT ASSUMED. The BOX grammar states `cells = sum(dx*dy*dz)`.
v1 counted the deduplicated union, disagreed with the spec, and then blamed the roster author for
the mismatch on two creatures — one of which (deep.barreleye) is entirely valid under the spec's
own rule and was refused. Both conventions are now computed and both are reported; the caller
chooses which one the gate enforces. A tool may not silently hold a convention its spec does not.
"""

import re

# --------------------------------------------------------------- errors
class RecipeError(ValueError):
    """Malformed input. Raised — never absorbed into a smaller creature.

    v1 had this class and used it only for non-positive extents. Everything else degraded
    silently, which is the failure mode the class exists to prevent.
    """


# --------------------------------------------------------------- limits
# A roster is authored by a language model and drives filesystem writes. Expansion happens before
# any cell-count check can run, so the 4-40 creature bound is no defence against a typo:
# N(2000000,...) built two million boxes in 1.66s before anything looked at it, and a single
# C(0,0,0,100000,100000,1) passed v1's only guard (positivity) while implying 10^10 cells.
MAX_COPIES = 256
MAX_EXTENT = 64
MAX_BOXES = 4096

# --------------------------------------------------------------- BOX grammar
_N = r"-?\d+"
_P = r"\d+"          # extents are positive by construction, not by a later check
_S = r"\s*"
C_BODY = _S.join(["", _N, ",", _N, ",", _N, ",", _P, ",", _P, ",", _P, ""])
# Anchored, whole-statement productions. `fullmatch` is what makes unconsumed text an error.
C_STMT = re.compile(r"C\(" + C_BODY + r"\)" + _S)
N_STMT = re.compile(r"N\(" + _S.join(["", _P, ",", _N, ",", _N, ",", _N, ","]) +
                    r"\s*C\(" + C_BODY + r"\)" + _S + r"\)" + _S)
C_NUMS = re.compile(_N)

# The three readings of "MIRROR-BREAK: odd-indexed copies of any N receive z += 1".
#   off  — the author applied it while writing; the reader does nothing
#   on0  — the reader applies it, "odd" counted from 0 (copies 1, 3, 5 ...)
#   on1  — the reader applies it, "odd" counted from 1 (copies 0, 2, 4 ...)
# The grammar pins neither the actor nor the index base, so this is three readings, not two.
#
# AT LEAST TWO MORE EXIST and are NOT modelled here (Fable, N4 panel): `z += 1` read as extent
# GROWTH (dz+1) rather than translation, and "odd-indexed" ranging over the N statements of a
# recipe rather than the copies within one N. They are absent deliberately — see resolve.py,
# which no longer claims to decide this question at all.
MODES = ("off", "on0", "on1")

# A creature id becomes a directory name, and the roster is LLM-authored: untrusted input on a
# path. `evil.../../../../escaped` normalised to `..\..\..\..\` and wrote outside the output root.
SAFE_ID_RE = re.compile(r"^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$")

# --------------------------------------------------------------- PROSE grammar
PROSE_STMT = re.compile(
    r"(?P<name>[A-Za-z][\w \-+']*?)" + _S +
    r"(?P<w>\d+)" + _S + r"[x×]" + _S + r"(?P<h>\d+)" + _S + r"[x×]" + _S + r"(?P<d>\d+)" + _S +
    r"at" + _S + r"\(" + _S + r"(?P<x>-?\d+)" + _S + r"," + _S + r"(?P<y>-?\d+)" + _S + r"," +
    _S + r"(?P<z>-?\d+)" + _S + r"\)" + _S,
    re.IGNORECASE)


def _box(x, y, z, dx, dy, dz, tag):
    for label, v in (("dx", dx), ("dy", dy), ("dz", dz)):
        if v < 1:
            raise RecipeError("%s=%d is not a positive extent; a box with a zero or negative "
                              "dimension contributes no cells and would vanish silently"
                              % (label, v))
        if v > MAX_EXTENT:
            raise RecipeError("%s=%d exceeds the extent cap of %d; a creature is 4-40 cells, so "
                              "this is a typo, and expansion happens before any cell check could "
                              "catch it" % (label, v, MAX_EXTENT))
    return {"name": tag, "size": (dx, dy, dz), "at": (x, y, z)}


def _bump(mode, i):
    if mode == "on0":
        return 1 if i % 2 == 1 else 0
    if mode == "on1":
        return 1 if i % 2 == 0 else 0
    return 0


def _split_top(text, sep):
    """Split on `sep` only at paren depth 0.

    A naive `text.split(",")` cuts inside `(x,y,z)` and destroys every coordinate triple. Caught
    by running the rewrite against a legal prose recipe with a negative x.
    """
    out, buf, depth = [], [], 0
    for ch in text:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        if ch == sep and depth == 0:
            out.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
    out.append("".join(buf))
    return out


def _statements(text):
    """Strip `#` comments PER LINE, then split on `;` at depth 0. Comments are data, not geometry.

    v1 never stripped comments, so `# C(0,0,0,2,2,2)` built an eight-cell box. The first fix
    stripped per STATEMENT, so a comment consumed every following line up to the next semicolon
    and silently ate a real N — trading one silent-loss bug for another.
    """
    clean = "\n".join(line.split("#", 1)[0] for line in text.splitlines())
    return [s.strip() for s in _split_top(clean, ";") if s.strip()]


def parse_box(text, mode="off"):
    """A semicolon-separated list of `C(...)` and `N(k,sx,sy,sz,C(...))` statements.

    Every statement must fullmatch a production. Unconsumed text is an error, not a hint.
    """
    if mode not in MODES:
        raise RecipeError("unknown mirror-break reading %r; expected one of %r" % (mode, MODES))
    out = []
    for idx, stmt in enumerate(_statements(text)):
        if N_STMT.fullmatch(stmt):
            k, sx, sy, sz, x, y, z, dx, dy, dz = (int(v) for v in C_NUMS.findall(stmt))
            if not 1 <= k <= MAX_COPIES:
                raise RecipeError("N(%d,...) repeats %d times; the cap is %d" % (k, k, MAX_COPIES))
            base = _box(x, y, z, dx, dy, dz, "n%d" % idx)
            for i in range(k):
                out.append({"name": "%s.%d" % (base["name"], i), "size": base["size"],
                            "at": (x + i * sx, y + i * sy, z + i * sz + _bump(mode, i))})
        elif C_STMT.fullmatch(stmt):
            out.append(_box(*[int(v) for v in C_NUMS.findall(stmt)], tag="c%d" % idx))
        else:
            raise RecipeError(
                "statement %d is not a whole C or N production: %r. Every statement must match "
                "exactly `C(x,y,z,dx,dy,dz)` or `N(k,sx,sy,sz,C(x,y,z,dx,dy,dz))` with that arity "
                "and balanced parentheses. Partial or unrecognised text is refused rather than "
                "scavenged for anything that looks like a box." % (idx + 1, stmt[:70]))
        if len(out) > MAX_BOXES:
            raise RecipeError("recipe expands past the %d-box cap" % MAX_BOXES)
    return out


def parse_prose(text):
    """A comma- or semicolon-separated list of `name WxHxD at (x,y,z)` clusters."""
    out = []
    for idx, stmt in enumerate(s for part in _statements(text) for s in _split_top(part, ",")):
        stmt = stmt.strip()
        if not stmt:
            continue
        m = PROSE_STMT.fullmatch(stmt)
        if not m:
            raise RecipeError("cluster %d is not a whole `name WxHxD at (x,y,z)` production: %r"
                              % (idx + 1, stmt[:70]))
        out.append(_box(int(m.group("x")), int(m.group("y")), int(m.group("z")),
                        int(m.group("w")), int(m.group("h")), int(m.group("d")),
                        m.group("name").strip()))
    return out


def parse_recipe(text, mode="off"):
    """Dispatch by grammar, refusing text that is partly one and partly the other.

    v1 dispatched on `"C(" in text` and returned the BOX result if it was non-empty. A hybrid
    recipe therefore silently dropped every prose cluster — five of six cells, no error.
    """
    # Detect on the COMMENT-STRIPPED text. Dispatching on the raw string made a fully
    # commented-out recipe report grammar="box" — harmless downstream, but a tool that
    # misreports what it read is a tool whose next report cannot be trusted either.
    live = " ".join(_statements(text))
    has_box = bool(re.search(r"\b[CN]\(", live))
    has_prose = bool(re.search(r"\d+\s*[x×]\s*\d+\s*[x×]\s*\d+\s*at\s*\(", live, re.IGNORECASE))
    if has_box and has_prose:
        raise RecipeError("recipe mixes the BOX and PROSE grammars. Pick one — a hybrid silently "
                          "loses whichever half the dispatcher does not choose.")
    if has_box:
        return parse_box(text, mode=mode), "box"
    if has_prose:
        return parse_prose(text), "prose"
    return [], "none"


# --------------------------------------------------------------- cells
def occupied_cells(clusters):
    """The set of distinct occupied coordinates — what actually gets BUILT."""
    cells = set()
    for c in clusters:
        w, h, d = c["size"]
        x, y, z = c["at"]
        for i in range(w):
            for j in range(h):
                for k in range(d):
                    cells.add((x + i, y + j, z + k))
    return cells


def summed_cells(clusters):
    """sum(dx*dy*dz) over every box, counting overlaps once PER BOX.

    This is what the BOX grammar's own rule states (`cells = sum(dx*dy*dz)`), and it differs from
    `len(occupied_cells())` exactly when boxes overlap. Both are reported so a declared count can
    be checked against the convention its author used instead of the one this tool prefers.
    """
    return sum(dx * dy * dz for c in clusters for dx, dy, dz in [c["size"]])


def components(cells):
    """Every 6-connected component, largest first."""
    remaining, out = set(cells), []
    while remaining:
        start = next(iter(remaining))
        seen, stack = {start}, [start]
        while stack:
            x, y, z = stack.pop()
            for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)):
                n = (x + d[0], y + d[1], z + d[2])
                if n in remaining and n not in seen:
                    seen.add(n)
                    stack.append(n)
        out.append(seen)
        remaining -= seen
    return sorted(out, key=len, reverse=True)
