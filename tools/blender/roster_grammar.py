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


def _one_box(m, tag):
    x, y, z, dx, dy, dz = (int(g) for g in m.groups())
    return {"name": tag, "size": (dx, dy, dz), "at": (x, y, z)}


def parse_box(text, mirror_break=False):
    """`C(x,y,z,dx,dy,dz)` and `N(k,sx,sy,sz,C(...))` -> [{name,size,at}].

    N is matched and masked FIRST, because every N contains a C and a naive C-scan would
    double-count the inner box and then miss the repetition entirely.
    """
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
            z = bz + i * sz + (1 if (mirror_break and i % 2 == 1) else 0)
            out.append({"name": "%s.%d" % (base["name"], i),
                        "size": base["size"],
                        "at": (bx + i * sx, by + i * sy, z)})
        n_idx += 1
        masked = masked.replace(m.group(0), " " * len(m.group(0)), 1)
    for i, m in enumerate(C_RE.finditer(masked)):
        out.append(_one_box(m, "c%d" % i))
    return out


def parse_recipe(text, mirror_break=False):
    """Dispatch on which grammar the text is written in. BOX wins when both could match."""
    if "C(" in text:
        boxes = parse_box(text, mirror_break=mirror_break)
        if boxes:
            return boxes, "box"
    prose = parse_prose(text)
    return prose, ("prose" if prose else "none")


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
    """Which reading of MIRROR-BREAK does this roster actually mean?

    Returns (flag, report). Decided by which reading agrees with more DECLARED voxelCounts.
    A LIVE tie returns None — the caller must refuse rather than pick, because a wrong reading
    silently distorts every creature that uses N().

    A roster with no N() anywhere has no ambiguity to resolve: both readings are the same
    function. That is a VACUOUS tie, not an undecidable one, and returning None for it locks
    out every roster written in the PROSE grammar — which is what the four already-built assets
    use. Caught 2026-08-26 by running the original roster through the new auto path; the
    selftest had asserted the wrong behaviour because its tie fixture also had no N().
    """
    if not any("N(" in str(b.get("buildRecipe", "")) for b in blocks):
        return False, "no N() in any recipe — the mirror-break ambiguity is vacuous here"
    off = on = d_off = d_on = discriminating = 0
    for b in blocks:
        raw = str(b.get("voxelCount", "")).strip()
        declared = raw.split()[0] if raw else ""
        if not declared.isdigit():
            continue
        recipe = b.get("buildRecipe", "")
        c_off, k = parse_recipe(recipe, mirror_break=False)
        c_on, _ = parse_recipe(recipe, mirror_break=True)
        if k != "box":
            continue
        n_off, n_on = len(occupied_cells(c_off)), len(occupied_cells(c_on))
        a_off, a_on = (n_off == int(declared)), (n_on == int(declared))
        off += a_off
        on += a_on
        # A z-shift only moves the COUNT when the shifted copy would have overlapped an existing
        # cell. Recipes whose N copies never overlap score identically under both readings and
        # carry no information — counting them dilutes the signal toward 50/50 and makes a
        # decisive roster look like a coin flip.
        if n_off != n_on:
            discriminating += 1
            d_off += a_off
            d_on += a_on
    report = ("OFF agrees with %d declared counts, ON with %d; among the %d recipe(s) where the "
              "readings actually differ, OFF %d / ON %d" % (off, on, discriminating, d_off, d_on))
    if discriminating and d_off != d_on:
        return (d_on > d_off), report
    if off == on:
        return None, report + " — TIE, undecidable from the roster itself"
    return (on > off), report
