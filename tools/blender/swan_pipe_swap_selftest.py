"""Prove the output swap never destroys the last good output.

    python tools/blender/swan_pipe_swap_selftest.py

swan_pipe.py used to `shutil.rmtree(out_dir)` and THEN `os.replace(tmp_dir, out_dir)`. Any failure
between those two lines - a crash, a full disk, an AV lock, a cross-device replace - left the asset
with no output at all, while the module docstring described the operation as atomic. A hostile
review caught it.

This file mirrors the corrected sequence and asserts the property that matters: a FAILED swap must
leave the previous good output exactly where it was. The last check is a negative control that runs
the OLD sequence and confirms it really did destroy the output - without it, the test above could
pass against code that was never broken.
"""
import os, shutil, tempfile, sys

def swap(out_dir, tmp_dir, fail=False):
    """The exact sequence from swan_pipe.py."""
    backup_dir = out_dir + ".prev"
    shutil.rmtree(backup_dir, ignore_errors=True)
    had_previous = os.path.exists(out_dir)
    if had_previous:
        os.replace(out_dir, backup_dir)
    try:
        if fail:
            raise OSError("simulated replace failure (full disk / AV lock / cross-device)")
        os.replace(tmp_dir, out_dir)
    except BaseException:
        if had_previous and not os.path.exists(out_dir):
            os.replace(backup_dir, out_dir)
        raise
    shutil.rmtree(backup_dir, ignore_errors=True)

def mk(root, name, content):
    d = os.path.join(root, name); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "asset.glb"), "w").write(content)
    return d

fails = 0
def check(name, ok, detail=""):
    global fails
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  ' + detail) if detail else ''}")
    if not ok: fails += 1

root = tempfile.mkdtemp()

print("\nHappy path replaces the output:")
out = mk(root, "out", "OLD"); tmp = mk(root, "tmp", "NEW")
swap(out, tmp)
check("new content is in place", open(os.path.join(out, "asset.glb")).read() == "NEW")
check("no .prev left behind", not os.path.exists(out + ".prev"))
check("tmp is consumed", not os.path.exists(tmp))

print("\nA FAILED swap leaves the previous good output intact - the whole point:")
out = mk(root, "out2", "GOOD"); tmp = mk(root, "tmp2", "BROKEN")
try:
    swap(out, tmp, fail=True)
    check("it raised", False, "no exception")
except OSError:
    check("it raised", True)
check("the previous output still EXISTS", os.path.exists(out))
check("...and still has the good content", os.path.exists(os.path.join(out,"asset.glb")) and open(os.path.join(out, "asset.glb")).read() == "GOOD")
check("no orphan .prev left", not os.path.exists(out + ".prev"))

print("\nFirst run, with no previous output, still works:")
out3 = os.path.join(root, "out3"); tmp3 = mk(root, "tmp3", "FIRST")
swap(out3, tmp3)
check("output created", open(os.path.join(out3, "asset.glb")).read() == "FIRST")

print("\nNEGATIVE CONTROL - the OLD sequence really did destroy it:")
out4 = mk(root, "out4", "GOOD"); tmp4 = mk(root, "tmp4", "BROKEN")
try:
    shutil.rmtree(out4, ignore_errors=True)     # the old line
    raise OSError("same failure, old code")     # os.replace never runs
except OSError:
    pass
check("old code left NOTHING (so the new test is not vacuous)", not os.path.exists(out4))

shutil.rmtree(root, ignore_errors=True)
print(f"\n{'ALL CHECKS PASS' if not fails else str(fails) + ' CHECK(S) FAILED'}\n")
sys.exit(1 if fails else 0)
