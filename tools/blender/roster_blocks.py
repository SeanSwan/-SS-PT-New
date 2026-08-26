"""roster_blocks.py — finding the spec blocks in an authored roster document.

Split out of roster_grammar.py on 2026-08-26 when the N4 panel's fixes pushed that file to 326
lines, over the repo's 300-line cap. Both reviewing seats flagged the violation independently.

Three container forms reach this project, because nobody was told which to use — the brief that
commissioned the parasite roster named the FIELDS a spec must carry and never named the container
they live in, and the generator then read zero blocks from an 18-creature document:

    fenced      ```  id: enemy.fryling  ...  ```      the original roster
    heading     ### `parasite.bedbug`  + `- **k:** v`  the parasite roster
    bold        **`bedbug_harbor`**    + `- **k:** v`  a second author, same round

All three are read, and their results are MERGED. v1 returned `fenced or markdown`, so a single
fenced block anywhere in a document discarded every heading block in it — a mixed-format roster
silently lost creatures with no count to notice it by (Sol, N4 panel finding 7).
"""

import re

_HEADER_RES = (
    re.compile(r"^###\s+`([A-Za-z][\w.\-]*)`"),        # ### `parasite.bedbug`
    re.compile(r"^\*\*`([A-Za-z][\w.\-]*)`\*\*\s*$"),  # **`bedbug_harbor`**
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


def _value(raw):
    """A field value with markdown code-span backticks stripped.

    Authors write `- **buildRecipe:** \\`C(0,0,0,2,2,1)\\`` because it renders as code. The v1
    scavenger ignored surrounding text so the backticks never mattered; the v2 grammar matches
    whole statements, so a stray backtick made every recipe in the roster unparseable. That is
    the right tradeoff — strictness surfaces what a scavenger papers over — but the fix belongs
    HERE, at the container boundary, not by loosening the grammar to tolerate decoration.
    """
    v = raw.strip()
    for q in ("`", '"', "'"):
        while v.startswith(q) and v.endswith(q) and len(v) > 1:
            v = v[1:-1].strip()
    return v


def parse_markdown_blocks(text):
    """A `###` or `**bold**` heading followed by `- **key:** value` lines.

    Handles two fields sharing one line separated by a middot, which one author's roster does
    (`**voxelDims:** 14x5x10 · **voxelCount:** 26`).
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
                cur[k] = _value(v.strip().strip("·"))
        else:
            cur[m.group(1)] = _value(body)
    if cur:
        blocks.append(cur)
    return blocks


def parse_fenced_blocks(text):
    """Every fence containing an `id:` line."""
    out = []
    for raw in re.findall(r"```(.*?)```", text, re.DOTALL):
        fields, key = {}, None
        for line in raw.splitlines():
            m = _FENCE_FIELD_RE.match(line.strip())
            if m:
                key = m.group("key")
                fields[key] = _value(m.group("val"))
            elif key and line.strip():
                fields[key] += " " + line.strip()
        if "id" in fields:
            out.append(fields)
    return out


def parse_blocks(text):
    """All container forms, merged, first definition of an id winning.

    A roster that mixes forms yields every creature in it. Duplicate ids are reported by the
    caller rather than silently collapsed here — see `duplicate_ids`.
    """
    seen, out = set(), []
    for b in parse_fenced_blocks(text) + parse_markdown_blocks(text):
        if b["id"] in seen:
            continue
        seen.add(b["id"])
        out.append(b)
    return out


def duplicate_ids(text):
    """Ids defined more than once across all container forms.

    A roster that defines the same creature twice is an authoring error the merge above would
    otherwise hide: the first wins and the second vanishes with no count to notice it by.
    """
    counts = {}
    for b in parse_fenced_blocks(text) + parse_markdown_blocks(text):
        counts[b["id"]] = counts.get(b["id"], 0) + 1
    return sorted(i for i, n in counts.items() if n > 1)
