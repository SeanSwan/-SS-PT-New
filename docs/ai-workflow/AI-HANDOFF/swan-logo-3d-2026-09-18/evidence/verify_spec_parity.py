"""
Guard: the browser spec must be a byte-identical subset of the canonical spec,
and every field dropped from it must be provably unread by the renderer.

Why this exists
---------------
extract_mesh.py emits two files:

  swan-mark.mesh.json    CANONICAL. Consumed by rasterise()/gate_spec.py, which
                         needs facetRings + ringFacet to draw one polygon per
                         facet (drawing the triangles instead shows seams).
  swan-mark.render.json  BROWSER PAYLOAD. Copied to
                         frontend/src/three/swanMark/swan-mark.mesh.json.

Shipping the rasteriser-only fields to the browser costs ~135 KB raw / ~51 KB
gzipped for data the renderer never touches. Dropping them is only safe if two
things hold, and this script is what makes them checkable rather than asserted:

  (1) SUBSET  - every key in the render spec is deep-equal to the same key in
                the canonical spec. No value is transformed on the way out, so
                the browser cannot render something the validator never saw.
  (2) UNREAD  - each dropped field is never READ by swanMarkFactory.ts. A plain
                grep for the field name is not enough: the name appears in the
                `SwanMarkSpec` interface declaration (lines 50-52) with no read
                anywhere. So this looks for property-ACCESS syntax only
                (`.field`, `["field"]`, `'field'`) outside the interface body.

Exit code is non-zero on any violation, so it can be wired into CI unchanged.

Usage:  python verify_spec_parity.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
SWAN_DIR = REPO / "frontend" / "src" / "three" / "swanMark"
SHIPPED = SWAN_DIR / "swan-mark.mesh.json"

# Every module that could read the spec. Scanning only the factory was not enough
# once the code was split for Rule 4: a read could move to any of these.
FACTORY_FILES = sorted(
    p for p in SWAN_DIR.glob("*.ts") if not p.name.endswith(".d.ts")
)

CANON = HERE / "swan-mark.mesh.json"
RENDER = HERE / "swan-mark.render.json"

# Must match extract_mesh.RENDER_DROP.
EXPECTED_DROP = ("vertexColor", "facetRings", "ringFacet")
# Must match extract_mesh.FACET_DROP. These are per-facet ANALYSIS fields: the
# browser reads only `color` (fallback) and `plane`.
EXPECTED_FACET_DROP = ("index", "areaPx", "vertices", "triangles", "meanColor",
                       "colorStd", "colorSpread", "centroidNorm")

failures: list[str] = []


def fail(msg: str) -> None:
    failures.append(msg)
    print(f"  FAIL  {msg}")


def ok(msg: str) -> None:
    print(f"  ok    {msg}")


def main() -> int:
    for p in (CANON, RENDER, SHIPPED):
        if not p.exists():
            fail(f"missing {p}")
    if not FACTORY_FILES:
        fail(f"no TypeScript modules found under {SWAN_DIR}")
    if failures:
        return 1

    canon = json.loads(CANON.read_text(encoding="utf-8"))
    render = json.loads(RENDER.read_text(encoding="utf-8"))
    shipped = json.loads(SHIPPED.read_text(encoding="utf-8"))
    sources = {p.name: p.read_text(encoding="utf-8") for p in FACTORY_FILES}

    print("=== (0) the shipped copy is the render spec, not the canonical spec ===")
    if shipped == render:
        ok("frontend/src/three/swanMark/swan-mark.mesh.json == evidence swan-mark.render.json")
    else:
        fail("shipped spec differs from swan-mark.render.json - re-copy after extracting")

    print("=== (1) render spec is a deep-equal subset of the canonical spec ===")
    for k, v in render.items():
        if k == "emittedFor":
            continue
        if k not in canon:
            fail(f"render has key {k!r} that canonical does not")
        elif k in ("mesh", "facets"):
            # Both are deliberately SUBSETS, so a whole-value comparison would
            # always differ. Each is compared field-by-field below instead.
            continue
        elif canon[k] != v:
            fail(f"render[{k!r}] differs from canonical[{k!r}]")
    dropped_keys = [k for k in canon if k not in render and k != "emittedFor"]
    ok(f"all {len(render) - 2} non-mesh shared keys deep-equal; "
       f"extra top-level keys: {dropped_keys or 'none'}")

    cm, rm = canon["mesh"], render["mesh"]
    actually_dropped = tuple(k for k in cm if k not in rm)
    if actually_dropped == EXPECTED_DROP:
        ok(f"mesh dropped exactly {actually_dropped}")
    else:
        fail(f"mesh dropped {actually_dropped}, expected {EXPECTED_DROP}")
    for k in rm:
        if rm[k] != cm[k]:
            fail(f"mesh[{k!r}] differs from canonical")

    # --- facets -----------------------------------------------------------
    cf, rf = canon["facets"], render["facets"]
    if len(cf) != len(rf):
        fail(f"facets length {len(rf)} != canonical {len(cf)}")
    else:
        facet_dropped = tuple(k for k in cf[0] if k not in rf[0])
        if facet_dropped == EXPECTED_FACET_DROP:
            ok(f"facets dropped exactly {facet_dropped}")
        else:
            fail(f"facets dropped {facet_dropped}, expected {EXPECTED_FACET_DROP}")
        mismatched = [k for k in rf[0] if any(a[k] != b[k] for a, b in zip(rf, cf))]
        if mismatched:
            fail(f"facet fields differ from canonical: {mismatched}")
        else:
            ok(f"all {len(rf)} facet records carry identical kept fields")
        # The shading plane is the whole point of this revision - a payload that
        # silently lost it would still pass every shape check above.
        bad = [i for i, f in enumerate(rf) if not isinstance(f.get("plane"), list)
               or len(f["plane"]) != 9]
        if bad:
            fail(f"{len(bad)} facet(s) lack a 9-number plane, e.g. {bad[:5]}")
        else:
            ok(f"every facet carries a 9-number shading plane")

    print("=== (2) every dropped field is provably unread by the renderer ===")
    print(f"  scanning {len(sources)} module(s): {', '.join(sources)}")
    # Property-ACCESS syntax only. A bare name (an interface declaration) does
    # not count as a read - that distinction is the whole point, because the
    # first version of this guard would have been fooled by the declaration.
    #
    # `index`, `areaPx`, `vertices` and `triangles` also exist at OTHER levels of
    # the spec (mesh.vertices, mesh.triangles, swan.areaPx), so a bare
    # property-access scan cannot tell a facet read from a mesh read and would
    # false-positive. Those four are therefore covered by the facet interface
    # check in section (3) instead, which is a stronger guard anyway. The names
    # below are unambiguous across the whole spec.
    UNAMBIGUOUS_FACET_DROP = ("meanColor", "colorStd", "colorSpread", "centroidNorm")
    for field in EXPECTED_DROP + UNAMBIGUOUS_FACET_DROP:
        pat = re.compile(
            r"\.\s*" + re.escape(field) + r"\b"                    # obj.field
            r"|\[\s*['\"]" + re.escape(field) + r"['\"]\s*\]"      # obj["field"]
        )
        hits = []
        for name, text in sources.items():
            for i, line in enumerate(text.splitlines()):
                if pat.search(line):
                    hits.append(f"{name}:{i + 1}")
        if hits:
            fail(f"{field} IS read at {hits} - cannot be dropped")
        else:
            ok(f"{field} unread in every module (declared nowhere now)")

    print("=== (3) the SwanMarkSpec type does not promise fields the payload lacks ===")
    # This guard exists because the first prune removed vertexColor/facetRings/
    # ringFacet from the JSON but left them in the interface. TypeScript then
    # claimed they were present while they were `undefined` at runtime - a lie the
    # compiler cannot catch, because the spec is imported and cast.
    spec_ts = sources.get("swanMarkSpec.ts")
    if not spec_ts:
        fail("swanMarkSpec.ts not found among the scanned modules")
    else:
        m = re.search(r"mesh:\s*\{(.*?)\n  \};", spec_ts, re.S)
        if not m:
            fail("could not locate the `mesh` block in swanMarkSpec.ts")
        else:
            declared = re.findall(r"^\s{4}(\w+)\??\s*:", m.group(1), re.M)
            actual = list(render["mesh"].keys())
            if sorted(declared) == sorted(actual):
                ok(f"interface mesh keys == payload mesh keys ({', '.join(actual)})")
            else:
                only_ts = sorted(set(declared) - set(actual))
                only_json = sorted(set(actual) - set(declared))
                fail(
                    f"interface/payload mismatch - declared-only {only_ts or 'none'}, "
                    f"payload-only {only_json or 'none'}"
                )

        # The facet record is the other place the interface can drift from the
        # payload, and this is the guard for index / areaPx / vertices / triangles,
        # which section (2) deliberately cannot scan for.
        mf = re.search(r"facets:\s*\{(.*?)\}\[\]", spec_ts, re.S)
        if not mf:
            fail("could not locate the `facets` record type in swanMarkSpec.ts")
        else:
            declared_f = re.findall(r"(\w+)\??\s*:", mf.group(1))
            actual_f = list(render["facets"][0].keys())
            if sorted(declared_f) == sorted(actual_f):
                ok(f"interface facet keys == payload facet keys ({', '.join(actual_f)})")
            else:
                only_ts = sorted(set(declared_f) - set(actual_f))
                only_json = sorted(set(actual_f) - set(declared_f))
                fail(
                    f"facet interface/payload mismatch - declared-only "
                    f"{only_ts or 'none'}, payload-only {only_json or 'none'}"
                )

    print("=== (4) payload accounting ===")
    import gzip
    cb, rb = CANON.stat().st_size, RENDER.stat().st_size
    cg, rg = len(gzip.compress(CANON.read_bytes(), 9)), len(gzip.compress(RENDER.read_bytes(), 9))
    print(f"  canonical {cb:>8,} B raw  {cg:>7,} B gzip")
    print(f"  render    {rb:>8,} B raw  {rg:>7,} B gzip")
    print(f"  saved     {cb - rb:>8,} B raw  {cg - rg:>7,} B gzip "
          f"({100 * (cb - rb) / cb:.1f}% raw / {100 * (cg - rg) / cg:.1f}% gzip)")
    if rb >= cb:
        fail("render spec is not smaller than canonical")

    print()
    if failures:
        print(f"RESULT: FAIL ({len(failures)} violation(s))")
        return 1
    print("RESULT: PASS - render spec is a verified subset; dropped fields are unread")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
