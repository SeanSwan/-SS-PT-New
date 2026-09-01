"""smoke.py — the FIRST thing to run after Blender is installed. Nothing else.

    blender -b --python-exit-code 1 --python tools/blender/smoke.py -- <in.obj> <out.glb>

Isolates the two calls every review seat flagged as UNVERIFIED in background mode —
wm.obj_import and export_scene.gltf (upstream 83188) — from bevel/dissolve/UV/LOD, so
the first failure is interpretable. If this passes, swan_pipe.py's remaining risk is its
own logic. If this fails, swan_pipe.py was never the problem. (All six seats, 2026-08-25.)
"""
import sys, os
import bpy
args = sys.argv[sys.argv.index("--") + 1:]
src, dst = args[0], args[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=src)
assert any(o.type == "MESH" for o in bpy.context.scene.objects), "smoke: import produced no mesh"
bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB")
with open(dst, "rb") as fh:
    assert fh.read(4) == b"glTF", "smoke: output is not a GLB (bad magic)"
print(f"[smoke] OK — {os.path.getsize(dst)} bytes at {dst}")
