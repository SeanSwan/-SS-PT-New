"""roster_resolve.py — REPORT on the mirror-break ambiguity. Do not decide it.

The BOX grammar says: "MIRROR-BREAK: odd-indexed copies of any N receive z += 1
(validator-visible asymmetry)". That sentence pins neither the actor (author or reader) nor the
index base, and the readings build different creatures. Something has to settle it.

TWO ORACLES WERE TRIED AND BOTH WERE CIRCULAR.

  v1 scored each reading against every creature's DECLARED voxelCount. Rejected on review: that
  count is produced by the same author whose counts the same roster proves wrong on a third of
  its creatures. The oracle was authored by the party under judgement.

  v2 scored each reading by how many creatures it shatters into disconnected pieces, and claimed
  this was "independent of the author's arithmetic". Rejected on review (Fable, N4 panel): the
  shatter predicate `len(components) > 1` is the IDENTICAL predicate the gate refuses on. So the
  resolver selects whichever reading gets the fewest creatures rejected — "which semantics ships
  the most assets", not "which semantics the author meant". Worse, a z-lift breaks face contact
  far more often than it creates it, so the score carries a standing prior toward `off` on any
  roster whatsoever. I had moved the circularity down one layer, not removed it.

v3 DOES NOT DECIDE. It reports what each reading implies and refuses to launder a preference into
a verdict. The reading is an operator decision passed explicitly on the command line and logged.

THE REAL ANSWER IS CHEAPER THAN ANY OF THIS. The roster's author is a callable seat. Three
independent reviewers each said, unprompted, that asking beats inferring. The grammar's own
parenthetical — "(validator-visible asymmetry)" — says the author expects the VALIDATOR to SEE
the lift, which points to reader-applied, the opposite of what both oracles concluded. That
sentence was in the file the whole time and neither oracle read it.
"""

from roster_grammar import MODES, RecipeError, components, occupied_cells, parse_box, summed_cells

# Text in a roster that asserts the semantics outright. If the document says which reading it
# means, no statistic may overrule it.
_READER_SIDE_HINTS = ("validator-visible", "validator visible", "reader applies",
                      "the reader applies", "applied at parse", "applied by the reader")
_AUTHOR_SIDE_HINTS = ("already applied", "applied while writing", "pre-applied", "author applies")


def textual_assertion(document_text):
    """What the roster SAYS about the reading, if anything. Evidence beats inference."""
    low = document_text.lower()
    reader = [h for h in _READER_SIDE_HINTS if h in low]
    author = [h for h in _AUTHOR_SIDE_HINTS if h in low]
    if reader and not author:
        return "reader", reader
    if author and not reader:
        return "author", author
    if reader and author:
        return "conflict", reader + author
    return None, []


def implications(blocks):
    """Per reading: cells, components, and BOTH counting conventions. Facts, not a verdict.

    Returns {mode: {"cells": n, "summed": n, "pieces": n, "shatters": bool}} per creature id,
    plus a `malformed` map. Callers render this; nothing here scores or ranks.
    """
    per, malformed = {}, {}
    for b in blocks:
        ident = b.get("id", "?")
        recipe = b.get("buildRecipe", "")
        if "C(" not in recipe and "N(" not in recipe:
            continue
        row = {}
        for m in MODES:
            try:
                boxes = parse_box(recipe, mode=m)
            except RecipeError as exc:
                malformed[ident] = str(exc)
                row = None
                break
            cells = occupied_cells(boxes)
            comps = components(cells)
            row[m] = {"cells": len(cells), "summed": summed_cells(boxes),
                      "pieces": len(comps), "shatters": len(comps) > 1}
        if row:
            per[ident] = row
    return per, malformed


def divergent(per):
    """Ids whose readings differ in any observable way. Everything else is vacuous."""
    out = []
    for ident, row in per.items():
        shapes = {(row[m]["cells"], row[m]["pieces"]) for m in MODES}
        if len(shapes) > 1:
            out.append(ident)
    return sorted(out)


def report(blocks, document_text=""):
    """A human-readable account of the ambiguity. Never a decision.

    The caller prints this and then uses the reading the OPERATOR named. If this function ever
    grows a return value the caller branches on, the circularity is back.
    """
    per, malformed = implications(blocks)
    lines = []
    if malformed:
        lines.append("  %d recipe(s) are malformed and were excluded from this report:"
                     % len(malformed))
        for ident, why in sorted(malformed.items())[:5]:
            lines.append("    %-24s %s" % (ident, why[:88]))
    if not per:
        lines.append("  no BOX recipes — the mirror-break ambiguity does not arise here")
        return "\n".join(lines)

    div = divergent(per)
    lines.append("  %d of %d BOX recipe(s) build observably different creatures across readings"
                 % (len(div), len(per)))
    if not div:
        lines.append("  every reading agrees on every creature — the ambiguity is vacuous here")
        return "\n".join(lines)

    for m in MODES:
        shatter = sum(1 for r in per.values() if r[m]["shatters"])
        lines.append("    %-4s %2d creature(s) fall into disconnected pieces" % (m, shatter))
    lines.append("  NOTE: that shatter count is the SAME predicate the gate refuses on, so the")
    lines.append("        reading with the lowest number is the one that ships the most assets,")
    lines.append("        which is not evidence about what the author meant. Reported, not scored.")

    side, hits = textual_assertion(document_text)
    if side == "reader":
        lines.append("  THE ROSTER'S OWN TEXT points to READER-applied (%s) — evidence, and it"
                     % ", ".join(sorted(set(hits))[:2]))
        lines.append("        outranks every statistic above. Prefer on0/on1 unless the author says else.")
    elif side == "author":
        lines.append("  THE ROSTER'S OWN TEXT points to AUTHOR-applied (%s)." % ", ".join(hits[:2]))
    elif side == "conflict":
        lines.append("  THE ROSTER'S OWN TEXT asserts BOTH sides — ask the author.")
    else:
        lines.append("  The roster says nothing about which reading it means. ASK THE AUTHOR;")
        lines.append("        it is one call and it settles what no statistic here can.")
    return "\n".join(lines)
