#!/usr/bin/env python
"""RED proof for ME-1: the hasWebGL() probe is what silences the three.js error.

Claim under test
----------------
`hasWebGL()` in `swanMarkScene.ts` is the reason a WebGL-less page no longer logs
`THREE.WebGLRenderer: Error creating WebGL context.` Without it, three is asked for
a context it cannot get and logs a console ERROR on a page that degrades perfectly
well via the PNG fallback.

Why this patches the BUNDLE and not the source
----------------------------------------------
The source file is the deliverable and is not touched. `component-bundle.js` is a
build artifact, regenerable with `node build.mjs`, so it is safe to mutate and
restore. Patching it is the only way to run the counterfactual through the real
component without editing shipped code.

The counterfactual is run through the SAME harness (`shoot-component.mjs --nogl`)
that produces the GREEN result, so the only variable is the probe.

Expected
--------
  patched   -> ERROR present, RESULT: PASS (fallback still works - the component
               catches the throw), and the console is NO LONGER silent
  restored  -> `no console errors or warnings`

Run:  python red_me1_webgl_probe.py
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
HARNESS = HERE / "harness"
BUNDLE = HARNESS / "component-bundle.js"
BACKUP = HARNESS / "component-bundle.js.redbak"

NODE = Path(
    r"C:\Users\BigotSmasher\.workbuddy-ai\binaries\node\versions\22.22.2-2\node.exe"
)
if not NODE.exists():
    NODE = Path("node")

# The probe guard as esbuild emits it, with the source's 4-space indent preserved.
GUARD = (
    'if (!hasWebGL()) {\n'
    '      throw new Error("SwanMarkScene: WebGL is unavailable");\n'
    '    }'
)
DISABLED = '/* RED: probe removed */'


def run_nogl(label):
    print(f"\n=== {label} ===")
    p = subprocess.run(
        [str(NODE), "shoot-component.mjs", "--nogl"],
        cwd=HARNESS,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    out = (p.stdout or "") + (p.stderr or "")
    # The two lines that decide the question, plus the verdict.
    for line in out.splitlines():
        low = line.lower()
        if "console error" in low or "console warning" in low:
            print("  console: " + line.strip())
        elif "RESULT:" in line:
            print("  " + line.strip())
        elif "webgl context" in low or "webglrenderer" in low:
            print("  logged : " + line.strip()[:140])
    return out


def main():
    if not BUNDLE.exists():
        print("FAIL: run `node build.mjs` first - component-bundle.js is missing")
        return 2
    if GUARD not in BUNDLE.read_text(encoding="utf-8"):
        print("FAIL: probe guard not found verbatim in the bundle.")
        print("      The bundle and the source have diverged - rebuild first.")
        return 2

    shutil.copy2(BUNDLE, BACKUP)
    try:
        src = BUNDLE.read_text(encoding="utf-8")
        BUNDLE.write_text(src.replace(GUARD, DISABLED, 1), encoding="utf-8")

        red = run_nogl("RED  - probe removed (counterfactual)")
        silent = "no console errors or warnings" in red.lower()
        errored = "webgl context" in red.lower() or "webglrenderer" in red.lower()

        if not errored:
            print("\nINCONCLUSIVE: expected the three.js error, saw none.")
            return 1
        if silent:
            print("\nINCONCLUSIVE: error logged but harness still reported silence.")
            return 1
        print("\nRED confirmed: without the probe, three logs a console ERROR.")
    finally:
        shutil.move(str(BACKUP), str(BUNDLE))

    green = run_nogl("GREEN - probe restored (shipped state)")
    if "no console errors or warnings" not in green.lower():
        print("\nFAIL: the restored bundle is not silent. Rebuild and re-check.")
        return 1

    print("\nRESULT: PASS - the probe is load-bearing, and removing it is observable.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
