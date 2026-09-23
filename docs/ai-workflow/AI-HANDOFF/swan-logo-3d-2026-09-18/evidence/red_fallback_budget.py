"""
Is the fallback image budget load-bearing, or decoration?

`measure_header_weight.mjs` now FAILS if the fallback PNG exceeds 128 KB. A guard
that has never failed proves nothing - this runs the counterfactual through the SAME
harness, so the asset is the only variable, and shows the budget tripping.

It re-points the fallback at the 1.2 MB brand asset, rebuilds the harness bundles,
measures, then restores and re-measures. Everything is reverted in a `finally` and
the source is checked byte-identical at the end.

Usage:  python red_fallback_budget.py
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = Path(__file__).resolve().parents[5]
HARNESS = HERE / "harness"
COMPONENT = REPO / "frontend" / "src" / "components" / "SwanMark3D" / "SwanMark3D.tsx"

NODE = Path(r"C:\Users\BigotSmasher\.workbuddy-ai\binaries\node\versions\22.22.2-2\node.exe")
if not NODE.exists():
    NODE = Path("node")

RIGHT_SIZED = "'../../assets/Logo.mark128.png'"
BRAND = "'../../assets/Logo.png'"


def rebuild() -> None:
    p = subprocess.run(
        [str(NODE), "build.mjs"], cwd=HARNESS,
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    if p.returncode != 0:
        raise SystemExit(f"build failed:\n{(p.stdout or '') + (p.stderr or '')}")


def measure() -> tuple[int, str]:
    p = subprocess.run(
        [str(NODE), "measure_header_weight.mjs"], cwd=HARNESS,
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def image_line(out: str) -> str:
    for line in out.splitlines():
        if "fallback image budget" in line:
            return line.strip()
    return "(no budget line found)"


def main() -> int:
    if not COMPONENT.exists():
        print(f"missing {COMPONENT}")
        return 1

    original = COMPONENT.read_bytes()
    if RIGHT_SIZED not in original.decode("utf-8"):
        print(f"the component is not pointing at {RIGHT_SIZED} - nothing to mutate")
        return 1

    failures: list[str] = []
    try:
        print("=== RED - fallback re-pointed at the 1.2 MB brand asset ===")
        COMPONENT.write_text(
            original.decode("utf-8").replace(RIGHT_SIZED, BRAND, 1), encoding="utf-8"
        )
        rebuild()
        code, out = measure()
        print("  " + image_line(out))
        if code != 0 and "OVER BUDGET" in out:
            print("  RED as intended: the budget tripped")
        else:
            print(f"  ???? expected a budget failure; exit={code}")
            failures.append("budget did not trip on the brand asset")
    finally:
        COMPONENT.write_bytes(original)
        rebuild()

    print("\n=== GREEN - right-sized asset restored (shipped state) ===")
    code, out = measure()
    print("  " + image_line(out))
    if code == 0 and "ok" in image_line(out):
        print("  GREEN: back under budget")
    else:
        print(f"  ???? expected a pass; exit={code}")
        failures.append("did not return to green")

    print("\n=== restore check ===")
    same = COMPONENT.read_bytes() == original
    print(f"  {'ok  ' if same else 'FAIL'} {COMPONENT.name} byte-identical to pre-run")
    if not same:
        failures.append("component not restored")

    if failures:
        print(f"\nRESULT: FAIL - {failures}")
        return 1
    print("\nRESULT: PASS - the budget is load-bearing and the tree is restored")
    return 0


if __name__ == "__main__":
    sys.exit(main())
