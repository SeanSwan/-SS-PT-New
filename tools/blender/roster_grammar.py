"""roster_grammar.py — the authoring grammars a roster may be written in, and the cells they mean.

Two grammars reach this project, because two different authors independently invented one:

  PROSE   "abdomen 3x2x1 at (0,0,0)"          — the 2026-08-26 contamination roster
  BOX     "C(0,0,0,3,2,1); N(3,1,0,0,C(...))" — Ox Alpha's parasite roster, 2026-08-26

BOX is strictly better: it is unambiguous, compact, and expresses repetition. PROSE is what the
first roster shipped in and four built assets depend on it. Both are supported; both must produce
the SAME cell set for the same shape, which roster_grammar_selftest.py proves against a
hand-checked creature rather than asserting.

WHY THIS IS A MODULE AND NOT MORE REGEX IN roster-to-obj.py:
  the caller was at 195 lines and the repo cap is 300. More importantly, a grammar that can be
  imported can be TESTED without touching the filesystem, and the equivalence proof needs exactly
  that.

THE ONE AMBIGUITY, AND HOW IT IS RESOLVED:
  Ox's grammar states "MIRROR-BREAK: odd-indexed copies of any N receive z += 1". That can mean
  the AUTHOR applied it while writing, or the EXPANDER must apply it while reading. The two
  readings yield different cell counts, so the question is empirical, not a matter of taste:
  every spec also declares voxelCount, and only one reading can agree with it. expand takes the
  flag; resolve_mirror_break() runs both readings against the declared counts and reports which
  one the roster actually meant. A guess here would silently distort 18 creatures.
"""

import re

# ---------------------------------------------------------------- grammar: PROSE
PROSE_RE = re.compile(
    r"(?P<name>[A-Za-z][\w \-+']*?)\s+"
    r"(?P<w>\d+)\s*[x×]\s*(?P<h>\d+)\s*[x×]\s*(?P<d>\d+)\s*"
    r"at\s*\(\s*(?P<x>-?\d+)\s*,\s*(?P<y>-?\d+)\s*,\s*(?P<z>-?\d+)\s*\)",
    re.IGNORECASE,
)

# ---------------------------------------------------------------- grammar: BOX
_INT = r"\s*(-?\d+)\s*"
C_RE = re.compile(r"C\(" + _INT + "," + _INT + "," + _INT + "," + _INT + "," + _INT + "," + _INT + r"\)")
N_RE = re.compile(r"N\(" + _INT + "," + _INT + "," + _INT + "," + _INT + r",\s*(C\([^)]*\))\s*\)")


def parse_prose(text):
    """`name WxHxD at (x,y,z)` -> [{name,size,at}]."""
    return [
        {"name": m.group("name").strip(),
         "size": (int(m.group("w")), int(m.group("h")), int(m.group("d"))),
         "at": (int(m.group("x")), int(m.group("y")), int(m.group("z")))}
        for m in PROSE_RE.finditer(text)
    ]


class RecipeError(ValueError):
    """A recipe that is malformed rather than merely refusable.

    A box with a zero or negative extent contributes NO cells. Left as data it vanishes
    silently: the creature simply comes out smaller and every downstream check passes on the
    smaller thing. `C(0,0,0,0,1,1)` is a typo, not a design. Raised, not skipped.
    """


def _one_box(m, tag):
    x, y, z, dx, dy, dz = (int(g) for g in m.groups())
    if dx < 1 or dy < 1 or dz < 1:
        raise RecipeError("C(%d,%d,%d,%d,%d,%d) has a non-positive extent — a box with a zero or "
                          "negative dimension contributes no cells and would vanish silently"
                          % (x, y, z, dx, dy, dz))
    return {"name": tag, "size": (dx, dy, dz), "at": (x, y, z)}


# The three readings of "MIRROR-BREAK: odd-indexed copies of any N receive z += 1".
#   off  — the author applied it while writing; the reader does nothing
#   on0  — the reader applies it, "odd" counted from 0 (copies 1, 3, 5 ...)
#   on1  — the reader applies it, "odd" counted from 1 (copies 0, 2, 4 ...)
# The grammar text does not pin the index base, so ON is really two readings, not one.
# Missed on the first pass; surfaced by the N4 panel.
MODES = ("off", "on0", "on1")


def _bump(mode, i):
    if mode == "on0":
        return 1 if i % 2 == 1 else 0
    if mode == "on1":
        return 1 if i % 2 == 0 else 0
    return 0


def parse_box(text, mode="off"):
    """`C(x,y,z,dx,dy,dz)` and `N(k,sx,sy,sz,C(...))` -> [{name,size,at}].

    N is matched and masked FIRST, because every N contains a C and a naive C-scan would
    double-count the inner box and then miss the repetition entirely.
    """
    if mode not in MODES:
        raise RecipeError("unknown mirror-break reading %r; expected one of %r" % (mode, MODES))
    out, masked, n_idx = [], text, 0
    for m in N_RE.finditer(text):
        k = int(m.group(1))
        sx, sy, sz = int(m.group(2)), int(m.group(3)), int(m.group(4))
        cm = C_RE.search(m.group(5))
        if not cm:
            continue
        base = _one_box(cm, "n%d" % n_idx)
        bx, by, bz = base["at"]
        for i in range(k):
            out.append({"name": "%s.%d" % (base["name"], i),
                        "size": base["size"],
                        "at": (bx + i * sx, by + i * sy, bz + i * sz + _bump(mode, i))})
        n_idx += 1
        masked = masked.replace(m.group(0), " " * len(m.group(0)), 1)
    for i, m in enumerate(C_RE.finditer(masked)):
        out.append(_one_box(m, "c%d" % i))
    return out


def parse_recipe(text, mode="off"):
    """Dispatch on which grammar the text is written in. BOX wins when both could match."""
    if "C(" in text:
        boxes = parse_box(text, mode=mode)
        if boxes:
            return boxes, "box"
    prose = parse_prose(text)
    return prose, ("prose" if prose else "none")


def components(cells):
    """Every 6-connected component, largest first. Pure — the resolver needs it too."""
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


# ---------------------------------------------------------------- cells
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


# ---------------------------------------------------------------- block parsing
_HEADER_RES = (
    re.compile(r"^###\s+`([A-Za-z][\w.\-]*)`"),        # Ox:  ### `parasite.bedbug`
    re.compile(r"^\*\*`([A-Za-z][\w.\-]*)`\*\*\s*$"),  # GLM: **`bedbug_harbor`**
)
_MD_FIELD_RE = re.compile(r"^-\s+\*\*([A-Za-z]+):\*\*\s*(.*)$")
_INLINE_FIELD_RE = re.compile(r"\*\*([A-Za-z]+):\*\*\s*([^·]*)")
_FENCE_FIELD_RE = re.compile(r"^(?P<key>[a-zA-Z]+):\s*(?P<val>.*)$")


def _header(line):
    for rx in _HEADER_RES:
        m = rx.match(line.strip())
        if m:
            return m.group(1)
    return None


def parse_markdown_blocks(text):
    """A `### id` or `**id**` heading followed by `- **key:** value` lines.

    Handles two fields sharing one line separated by a middot, which GLM's roster does
    (voxelDims and voxelCount on one line). A block whose recipe is prose the BOX grammar
    cannot read still parses as a BLOCK — so the caller reports "recipe unparseable" for
    that creature instead of "no blocks found", and the failure lands on the right thing.
    """
    blocks, cur = [], None
    for line in text.splitlines():
        ident = _header(line)
        if ident:
            if cur:
                blocks.append(cur)
            cur = {"id": ident}
            continue
        if cur is None:
            continue
        m = _MD_FIELD_RE.match(line.strip())
        if not m:
            continue
        body = m.group(2)
        if "·" in body and "**" in body:
            for k, v in _INLINE_FIELD_RE.findall(m.group(0)):
                cur[k] = v.strip().strip("·").strip()
        else:
            cur[m.group(1)] = body.strip()
    if cur:
        blocks.append(cur)
    return blocks


def parse_fenced_blocks(text):
    """The original form: every fence containing an `id:` line."""
    out = []
    for raw in re.findall(r"```(.*?)```", text, re.DOTALL):
        fields, key = {}, None
        for line in raw.splitlines():
            m = _FENCE_FIELD_RE.match(line.strip())
            if m:
                key = m.group("key")
                fields[key] = m.group("val").strip()
            elif key and line.strip():
                fields[key] += " " + line.strip()
        if "id" in fields:
            out.append(fields)
    return out


def parse_blocks(text):
    """Fenced blocks first (they carry explicit `id:`), then markdown headings."""
    return parse_fenced_blocks(text) or parse_markdown_blocks(text)


def resolve_mirror_break(blocks):
    """Which of the three readings of MIRROR-BREAK does this roster actually mean?

    Returns (mode, report) where mode is one of MODES, or (None, report) when undecidable.

    DECIDED STRUCTURALLY, NOT BY THE DECLARED COUNTS. The obvious oracle is `voxelCount` — but
    that oracle is produced by the same author whose counts this very roster proves wrong on 6
    of 18 creatures, and two hypotheses predict identical observations: (H1) the semantics is
    OFF and the author counted what they wrote; (H2) the semantics is ON and the author's
    counting pass didn't implement MIRROR-BREAK either. Counts cannot separate them.

    CONNECTIVITY CAN. The grammar states a cluster-touch law, so a reading that shatters more
    creatures into disconnected pieces is a reading the roster was not written under — and that
    signal does not depend on the author's arithmetic at all. On the 2026-08-26 parasite roster
    the two scores diverge sharply: counts split 12/10/10 (nearly uninformative) while shattering
    splits 8/14/17 (decisive for OFF). Counts are kept as a reported secondary and only break a
    structural tie.

    LIVENESS is measured, not sniffed. The old test asked whether the string contains "N(",
    which is false-live for N with one copy and false-dead for any spacing the parser tolerates
    but a substring test does not. The real question — do the readings produce different CELLS
    anywhere — is already computed here.
    """
    cells, malformed = {}, []
    for b in blocks:
        recipe = b.get("buildRecipe", "")
        if "C(" not in recipe:
            continue
        try:
            cells[b.get("id", "?")] = {m: occupied_cells(parse_box(recipe, mode=m)) for m in MODES}
        except RecipeError as exc:
            malformed.append("%s: %s" % (b.get("id", "?"), exc))
    if malformed:
        return None, "malformed recipe(s), cannot resolve: " + "; ".join(malformed)
    if not cells:
        return "off", "no BOX recipes — the mirror-break ambiguity is vacuous here"
    live = [i for i, per in cells.items() if len({frozenset(per[m]) for m in MODES}) > 1]
    if not live:
        return "off", ("no reading produces different cells on any of the %d BOX recipe(s) — "
                       "the ambiguity is vacuous here" % len(cells))

    shatter = {m: sum(1 for per in cells.values() if len(components(per[m])) > 1) for m in MODES}
    agree = {m: 0 for m in MODES}
    for b in blocks:
        raw = str(b.get("voxelCount", "")).strip()
        declared = raw.split()[0] if raw else ""
        per = cells.get(b.get("id", "?"))
        if not declared.isdigit() or per is None:
            continue
        for m in MODES:
            agree[m] += (len(per[m]) == int(declared))

    report = ("%d of %d BOX recipe(s) build different creatures under different readings. "
              "SHATTERED (structural, independent of the author's arithmetic): %s. "
              "Declared-count agreement (secondary — this roster proves that oracle wrong on "
              "6 of 18): %s"
              % (len(live), len(cells),
                 ", ".join("%s=%d" % (m, shatter[m]) for m in MODES),
                 ", ".join("%s=%d" % (m, agree[m]) for m in MODES)))

    best = min(shatter.values())
    winners = [m for m in MODES if shatter[m] == best]
    if len(winners) == 1:
        return winners[0], report
    top = max(agree[m] for m in winners)
    finalists = [m for m in winners if agree[m] == top]
    if len(finalists) == 1:
        return finalists[0], report + " — structural tie broken on counts"
    return None, report + " — TIE across %r, undecidable from the roster itself" % finalists
