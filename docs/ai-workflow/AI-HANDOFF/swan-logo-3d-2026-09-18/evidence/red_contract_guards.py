"""
Are the SwanMark3D contract guards vacuous?

A passing suite proves nothing on its own - a guard can be green because the code is
right, or green because the guard is checking the wrong thing. This script mutates
the code one defect at a time and asserts that a SPECIFIC test goes red for each.

Each mutation is reverted in a `finally`, and the whole set is verified restored at
the end (byte comparison), so this is safe to run against the working tree.

Run:  python red_contract_guards.py
"""
from __future__ import annotations

import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
FE = REPO / "frontend"

# On Windows `node_modules/.bin/vitest` is a POSIX shell script, not a PE binary -
# subprocess raises WinError 193 if you exec it directly. Invoke the JS entry through
# node instead, which works on both platforms.
NODE = Path(
    r"C:\Users\BigotSmasher\.workbuddy-ai\binaries\node\versions\22.22.2-2\node.exe"
)
if not NODE.exists():
    NODE = Path("node")
VITEST = FE / "node_modules" / "vitest" / "vitest.mjs"

SCENE = FE / "src" / "components" / "SwanMark3D" / "swanMarkScene.ts"
COMPONENT = FE / "src" / "components" / "SwanMark3D" / "SwanMark3D.tsx"
TESTSUITE = FE / "src" / "components" / "SwanMark3D" / "SwanMark3D.contract.test.ts"
LOGO = FE / "src" / "components" / "Header" / "components" / "Logo.tsx"
SPEC = FE / "src" / "three" / "swanMark" / "swan-mark.mesh.json"
BADGE = FE / "src" / "three" / "swanMark" / "badgeField.ts"

# (label, file, find, replace, the test name expected to fail)
MUTATIONS = [
    (
        "M1 sizing policy: supersample 2 -> 4",
        SCENE,
        "supersample = 2,",
        "supersample = 4,",
        "supersamples 2x by default",
    ),
    (
        "M2 WebGL probe removed",
        SCENE,
        "if (!hasWebGL()) {",
        "if (false) {",
        "probes for WebGL before handing three a canvas",
    ),
    (
        "M3 dead payload field re-added",
        SPEC,
        '"triangles":',
        '"ringFacet": [0], "triangles":',
        "carries no rasteriser-only fields",
    ),
    (
        # The repair for this guard was itself a defect: the first version grepped
        # the raw file text for `areaPx`, which legitimately survives at
        # `swan.areaPx`. This mutation proves the repaired, structure-aware version
        # still catches a facet-level field coming back.
        "M5 facet analysis field re-added",
        SPEC,
        '"facets":[{"color":',
        '"facets":[{"areaPx":1,"color":',
        "carries no facet analysis fields",
    ),
    (
        "M6 third key added to a facet record",
        SPEC,
        '"facets":[{"color":',
        '"facets":[{"index":0,"color":',
        "gives every facet exactly the two fields",
    ),
    (
        # The whole point of round 3. If a future extractor run drops the planes and
        # writes flat colours everywhere, every shape check still passes - only this
        # guard notices.
        "M7 sRGB transfer perturbed at the knee",
        BADGE,
        "c < 0.04045",
        "c < 0.05",
        "srgbToLinear matches THREE.Color",
    ),
    (
        # The exact rot the drift guard exists to catch: the effect survives but its
        # dependency array is emptied, so a drift change is dropped again. This is a
        # mutation of the DEP LIST, not of the call - the call still exists.
        "M10 drift effect dep-list emptied",
        COMPONENT,
        "}, [drift]);",
        "}, []);",
        "routes a drift change to the scene",
    ),
    (
        # The regression this guard was written for: point the fallback back at the
        # 1.2 MB brand asset. Nothing else in the suite notices, because the brand
        # asset is a perfectly valid PNG that renders correctly - it is just 56x
        # too heavy for a 36px mark and on the critical path of every page.
        "M11 fallback re-pointed at the 1.2 MB brand asset",
        COMPONENT,
        "'../../assets/Logo.mark128.png'",
        "'../../assets/Logo.png'",
        "ships a fallback asset right-sized",
    ),
    (
        # Re-creates the exemption that let a 339-line test file pass its own Rule 4
        # check: drop the sibling test file from the list the guard walks. The
        # line-count loop still passes; only the coverage assertion catches it.
        "M12 Rule 4 list no longer covers its own test files",
        TESTSUITE,
        "      ['./swanMarkPayload.contract.test.ts', "
        "lines('./swanMarkPayload.contract.test.ts')],\n",
        "",
        "keeps every module under rule 4s",
    ),
]


def run_targeted(name: str) -> tuple[int, str]:
    """Run vitest filtered to one test name; return (exit, output)."""
    p = subprocess.run(
        [str(NODE), str(VITEST), "run", "src/components/SwanMark3D", "-t", name],
        cwd=FE, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def run_suite() -> tuple[int, str]:
    p = subprocess.run(
        [str(NODE), str(VITEST), "run", "src/components/SwanMark3D"],
        cwd=FE, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def main() -> int:
    print("=== baseline: the suite must be green before mutating ===")
    code, out = run_suite()
    if code != 0:
        print("FAIL: baseline is not green - fix that first")
        print(out[-1500:])
        return 2
    m = re.search(r"Tests\s+(\d+) passed", out)
    print(f"  ok  {m.group(0) if m else 'all tests passed'}\n")

    # Snapshot everything we are about to touch.
    backups = {f: f.read_bytes() for f in (SCENE, LOGO, SPEC, BADGE, COMPONENT, TESTSUITE)}
    failures = []

    try:
        for label, path, find, repl, test_name in MUTATIONS:
            src = path.read_text(encoding="utf-8")
            if find not in src:
                print(f"SKIP {label}: anchor not found")
                failures.append(label)
                continue
            path.write_text(src.replace(find, repl, 1), encoding="utf-8")
            try:
                code, out = run_targeted(test_name)
                # vitest exits non-zero AND reports the failure we expect.
                went_red = code != 0 and "failed" in out.lower()
                # Guard against the mutation breaking the file so badly that vitest
                # cannot even collect it - that is a crash, not a proven guard.
                collected = "Test Files" in out
                if went_red and collected:
                    print(f"  RED  {label}\n       -> '{test_name}' failed as intended")
                else:
                    print(f"  ???? {label}: expected '{test_name}' to fail; exit={code}, "
                          f"collected={collected}")
                    failures.append(label)
            finally:
                path.write_bytes(backups[path])

        # M4 needs a structural edit rather than a string swap.
        label = "M4 one breakpoint dropped from the size ladder"
        src = LOGO.read_text(encoding="utf-8")
        blocks = [m.start() for m in re.finditer(r"\.logo-mark\s*\{", src)]
        if len(blocks) != 8:
            print(f"SKIP {label}: found {len(blocks)} .logo-mark blocks, expected 8")
            failures.append(label)
        else:
            # Remove the last `.logo-mark { ... }` block.
            start = blocks[-1]
            end = src.index("}", start) + 1
            LOGO.write_text(src[:start] + src[end:], encoding="utf-8")
            try:
                code, out = run_targeted("keeps the whole size ladder")
                if code != 0 and "failed" in out.lower() and "Test Files" in out:
                    print(f"  RED  {label}\n       -> 'keeps the whole size ladder' failed as intended")
                else:
                    print(f"  ???? {label}: expected failure; exit={code}")
                    failures.append(label)
            finally:
                LOGO.write_bytes(backups[LOGO])

        # M8/M9 need surgery on the plane arrays rather than a string swap.
        def structural(label: str, transform, test_name: str) -> None:
            src = SPEC.read_text(encoding="utf-8")
            out = transform(src)
            if out == src:
                print(f"SKIP {label}: transform was a no-op (anchor moved?)")
                failures.append(label)
                return
            SPEC.write_text(out, encoding="utf-8")
            try:
                code, res = run_targeted(test_name)
                if code != 0 and "failed" in res.lower() and "Test Files" in res:
                    print(f"  RED  {label}\n       -> '{test_name}' failed as intended")
                else:
                    print(f"  ???? {label}: expected failure; exit={code}")
                    failures.append(label)
            finally:
                SPEC.write_bytes(backups[SPEC])

        PLANE_RE = re.compile(r'"plane":\[([^\]]+)\]')

        def zero_gradients(src: str) -> str:
            """Keep the constant term, drop every x/y slope. Model degrades to flat."""

            def repl(m: re.Match) -> str:
                nums = m.group(1).split(",")
                if len(nums) != 9:
                    return m.group(0)
                for k in (1, 2, 4, 5, 7, 8):
                    nums[k] = "0.0"
                return '"plane":[' + ",".join(nums) + "]"

            return PLANE_RE.sub(repl, src)

        def truncate_first_plane(src: str) -> str:
            """Emit 6 numbers instead of 9 - the transposed/truncated-block defect."""
            m = PLANE_RE.search(src)
            if not m:
                return src
            nums = m.group(1).split(",")[:6]
            return src[: m.start()] + '"plane":[' + ",".join(nums) + "]" + src[m.end():]

        structural(
            "M8 every shading plane flattened",
            zero_gradients,
            "actually carries gradients",
        )
        structural(
            "M9 first shading plane truncated to 6 numbers",
            truncate_first_plane,
            "well-formed 9-number shading plane",
        )
    finally:
        for f, b in backups.items():
            f.write_bytes(b)

    print("\n=== restore check ===")
    for f, b in backups.items():
        same = f.read_bytes() == b
        print(f"  {'ok  ' if same else 'FAIL'} {f.name} byte-identical to pre-run")
        if not same:
            failures.append(f"{f.name} not restored")

    code, out = run_suite()
    print(f"\n  suite after restore: {'PASS' if code == 0 else 'FAIL'}")

    if failures or code != 0:
        print(f"\nRESULT: FAIL - {failures}")
        return 1
    print("\nRESULT: PASS - every guard went red for its own defect, and the tree is restored")
    return 0


if __name__ == "__main__":
    sys.exit(main())
