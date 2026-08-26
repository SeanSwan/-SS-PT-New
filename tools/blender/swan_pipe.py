"""
swan_pipe.py — headless Blender: voxel source -> game-ready GLB set + manifest stub.

    blender -b --python tools/blender/swan_pipe.py -- --in <file.vox|.obj|.glb> --id <asset-id> [opts]

WHY IT LOOKS LIKE THIS
----------------------
The art law is inherited, not invented. `world.miniature-play.voxel-realm`
(design-brain worlds.md entry 16) mandates "beveled voxels with disciplined
roughness, not plastic cubes" and bans Minecraft likeness. Two panel seats
independently reached the same engineering conclusion: voxel is the AUTHORING
dialect, never the draw dialect. Per-unit micro-detail on a swarm is N unique
geometries and draw-call death on the Lite tier.

So this script's whole job is the translation:
    voxel source (silhouette + palette)
      -> welded/decimated mesh (macro form)
      -> bevel (the "not plastic cubes" gene)
      -> UV + bake micro-detail into normal/AO/roughness
      -> LOD0/1/2 + a simple collision proxy
      -> GLB export + a still poster
      -> manifest stub for scripts/assets/validate-asset.mjs

STATUS: UNRUN. Blender is not installed on this machine (verified 2026-08-25).
Every bpy call below is written against the 4.5 LTS API but has NOT executed.
Treat it as reviewed-not-verified until the first real run. The manifest it emits
is deliberately INVALID (budgets/provenance incomplete) so the validator rejects
it until a human fills in the provenance — a pipeline that emits pre-approved
provenance is a laundering machine.
"""

import argparse
import json
import os
import sys

try:
    import bpy  # noqa: F401
    import bmesh
    IN_BLENDER = True
except ImportError:  # allows --dry-run linting outside Blender
    IN_BLENDER = False


LOD_RATIOS = {"lod0": 1.0, "lod1": 0.45, "lod2": 0.18}
COLLISION_RATIO = 0.08


def parse_args(argv):
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        argv = []
    p = argparse.ArgumentParser(prog="swan_pipe")
    p.add_argument("--in", dest="src", required=True, help="source .vox/.obj/.glb")
    p.add_argument("--id", dest="asset_id", required=True, help="registry asset id, e.g. enemy.fryling")
    p.add_argument("--out", dest="out_dir", default=None, help="output dir (default assets/runtime/<id>)")
    p.add_argument("--skeleton", default=None, help="registry skeleton id; omit for a static prop")
    p.add_argument("--bevel-width", type=float, default=0.012, help="the 'not plastic cubes' gene")
    p.add_argument("--bake-size", type=int, default=1024)
    p.add_argument("--dry-run", action="store_true", help="print the plan and exit (works without Blender)")
    return p.parse_args(argv)


def plan(args):
    """The pipeline as data, so --dry-run can show it without Blender."""
    return [
        ("import", f"load {args.src}"),
        ("weld", "merge_by_distance — voxel exporters emit duplicate verts at every cube face"),
        ("cleanup", "limited dissolve on coplanar faces — collapses cube grids into flat n-gons"),
        ("bevel", f"width={args.bevel_width}, segments=2, clamp — THE inherited art gene"),
        ("shade", "shade_auto_smooth ~35deg — keeps hard silhouette, softens bevel"),
        ("uv", "smart_uv_project, island_margin 0.02"),
        ("bake", f"normal + AO + roughness @ {args.bake_size} — micro-detail becomes texture, not geometry"),
        ("lods", f"decimate to {LOD_RATIOS}"),
        ("collision", f"convex-ish proxy at {COLLISION_RATIO} — never the render mesh"),
        ("still", "one orthographic poster for the still tier"),
        ("export", "GLB per LOD (+Y up, no cameras/lights, apply modifiers)"),
        ("manifest", "emit INVALID stub — provenance is a human act"),
    ]


def out_dir_for(args):
    return args.out_dir or os.path.join("assets", "runtime", args.asset_id.replace(".", "/"))


def write_manifest_stub(args, out_dir):
    """Deliberately invalid. The validator must reject this until a human fills it in."""
    stub = {
        "schema": "swan.game-asset.v1",
        "id": args.asset_id,
        "zone": None,
        "skeleton": args.skeleton,
        "animations": [] if args.skeleton else None,
        "budgets": None,
        "provenance": {
            "humanOwner": None,
            "createdAtUtc": None,
            "aiAssisted": None,
            "similarityReviewed": False,
            "license": None,
            "_note": "swan_pipe emits these EMPTY on purpose. A pipeline that pre-fills "
                     "provenance launders it. Fill in by hand, then validate.",
        },
        "runtime": {
            "lod0": "lod0.glb", "lod1": "lod1.glb", "lod2": "lod2.glb",
            "collision": "collision.glb", "stillFallback": "still.png",
            "compression": "none",
        },
        "sha256": {},
        "_source": {"file": os.path.basename(args.src), "pipeline": "swan_pipe.py"},
    }
    path = os.path.join(out_dir, "manifest.json")
    os.makedirs(out_dir, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(stub, fh, indent=2)
    return path


# --------------------------------------------------------------- blender ops

def run_in_blender(args, out_dir):
    bpy.ops.wm.read_factory_settings(use_empty=True)

    ext = os.path.splitext(args.src)[1].lower()
    if ext == ".obj":
        bpy.ops.wm.obj_import(filepath=args.src)
    elif ext in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=args.src)
    elif ext == ".vox":
        raise SystemExit(
            "swan_pipe: .vox needs an importer addon. Export .obj from MagicaVoxel, or open the "
            ".vox in Goxel and export glTF2 — a documented workaround for MagicaVoxel's exporter."
        )
    else:
        raise SystemExit(f"swan_pipe: unsupported source {ext}")

    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        raise SystemExit("swan_pipe: no mesh in source — refusing to emit an empty asset")

    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active

    # weld + dissolve: voxel exporters emit a quad per cube face with duplicate verts
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.dissolve_limit(bm, angle_limit=0.0873, verts=bm.verts, edges=bm.edges)  # ~5deg
    bm.to_mesh(me)
    bm.free()

    bev = obj.modifiers.new("swan_bevel", "BEVEL")
    bev.width = args.bevel_width
    bev.segments = 2
    bev.limit_method = "ANGLE"
    bev.angle_limit = 0.5236  # 30deg
    bpy.ops.object.modifier_apply(modifier=bev.name)

    bpy.ops.object.shade_auto_smooth(angle=0.6109)  # ~35deg
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.uv.smart_project(island_margin=0.02)
    bpy.ops.object.mode_set(mode="OBJECT")

    os.makedirs(out_dir, exist_ok=True)
    base_tris = len(obj.data.loop_triangles)

    for name, ratio in LOD_RATIOS.items():
        target = obj
        if ratio < 1.0:
            target = obj.copy()
            target.data = obj.data.copy()
            bpy.context.collection.objects.link(target)
            dec = target.modifiers.new(f"dec_{name}", "DECIMATE")
            dec.ratio = ratio
            bpy.context.view_layer.objects.active = target
            bpy.ops.object.modifier_apply(modifier=dec.name)
        bpy.ops.object.select_all(action="DESELECT")
        target.select_set(True)
        bpy.context.view_layer.objects.active = target
        bpy.ops.export_scene.gltf(
            filepath=os.path.join(out_dir, f"{name}.glb"),
            export_format="GLB", use_selection=True,
            export_apply=True, export_cameras=False, export_lights=False,
        )

    print(f"[swan_pipe] base triangles: {base_tris}")
    return base_tris


def main():
    args = parse_args(sys.argv)
    out_dir = out_dir_for(args)

    if args.dry_run or not IN_BLENDER:
        why = "--dry-run" if args.dry_run else "bpy unavailable (not running inside Blender)"
        print(f"[swan_pipe] PLAN ONLY ({why}) — nothing written except the manifest stub")
        for step, detail in plan(args):
            print(f"  {step:<10} {detail}")
        path = write_manifest_stub(args, out_dir)
        print(f"[swan_pipe] manifest stub -> {path}")
        print("[swan_pipe] stub is INVALID on purpose. Next: fill provenance by hand, then")
        print(f"[swan_pipe]   node scripts/assets/validate-asset.mjs {path}")
        return

    run_in_blender(args, out_dir)
    path = write_manifest_stub(args, out_dir)
    print(f"[swan_pipe] manifest stub -> {path}")
    print("[swan_pipe] NOW: fill provenance by hand, hash the GLBs, then validate.")


if __name__ == "__main__":
    main()
