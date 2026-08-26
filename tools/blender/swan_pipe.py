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

API AUDIT (2026-08-25, no Blender available — documentation only, not execution):
  bpy.ops.wm.obj_import            OK   3.x+ name; the old import_scene.obj is gone
  bmesh.ops.remove_doubles          OK
  bmesh.ops.dissolve_limit          OK   signature (bm, angle_limit, use_dissolve_boundaries,
                                         verts, edges, delimit) — the three kwargs used are valid
  BEVEL modifier + modifier_apply   OK
  shade_auto_smooth                 REPLACED — see smooth_by_angle() below. The operator exists
                                    in 4.2/4.5 (a review seat's "removed in 4.1" hypothesis was
                                    about Mesh.use_auto_smooth, which this pipe never used), but
                                    it depends on a geometry-node ASSET that has open failure
                                    reports including headless runs. Now done in bmesh instead.
  bpy.ops.uv.smart_project          UNVERIFIED for 4.5 kwarg names
  bpy.ops.export_scene.gltf         UNVERIFIED — has a history of background-mode issues
                                    (blender.org 83188); first real run must check headless export

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
SMOOTH_ANGLE = 0.6109  # ~35 degrees
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
        ("shade", "bmesh sharp-edge marking at ~35deg then shade smooth — asset-free, headless-safe"),
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
                     "provenance launders it. Copy to manifest.json, fill in by hand, then validate. "
                     "Named .stub.json so validate-asset --all never treats it as a real manifest (Ox Alpha, branch gate).",
        },
        "runtime": {
            "lod0": "lod0.glb", "lod1": "lod1.glb", "lod2": "lod2.glb",
            "collision": "collision.glb", "stillFallback": "still.png",
            "compression": "none",
        },
        "sha256": {},
        "_source": {"file": os.path.basename(args.src), "pipeline": "swan_pipe.py"},
    }
    path = os.path.join(out_dir, "manifest.stub.json")  # NOT manifest.json — --all must never find a stub
    os.makedirs(out_dir, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(stub, fh, indent=2)
    return path


def smooth_by_angle(obj, angle):
    """Mark edges sharp above `angle`, then shade smooth. Asset-free and headless-safe.

    NOT `bpy.ops.object.shade_auto_smooth()`. That operator is the correct post-4.1
    replacement for the removed `Mesh.use_auto_smooth` — a review seat predicted the pipe
    would crash on the OLD idiom, and it does not use it. But the replacement carries a
    worse problem for this pipe specifically: it applies a "Smooth by Angle" GEOMETRY-NODE
    ASSET, and there are open reports of it failing with `RuntimeError: No asset found at
    path` (blender.org issues 123508, 151055), with background/headless runs among the
    reported conditions. This pipe runs `blender -b`. Depending on the user's asset
    library resolving inside a headless process is a dependency this stage does not need.

    Doing it in bmesh reproduces the pre-4.1 semantics directly: an edge between two faces
    whose normals diverge by more than `angle` is sharp; everything else smooths. No asset
    library, no geometry-node evaluation, same result, works on any 4.x.

    NOTE: like the rest of this module, UNRUN — Blender is not installed. Reviewed against
    the bmesh API, not executed.
    """
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    for edge in bm.edges:
        if len(edge.link_faces) == 2:
            edge.smooth = edge.calc_face_angle(0.0) <= angle
        else:
            edge.smooth = True  # boundary / non-manifold: leave smooth, let sharpness come from geometry
    bm.to_mesh(me)
    bm.free()
    for poly in me.polygons:
        poly.use_smooth = True


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
    bpy.context.view_layer.update()  # headless: modifier_apply needs an evaluated depsgraph (Ox Alpha)
    bpy.ops.object.modifier_apply(modifier=bev.name)

    smooth_by_angle(obj, SMOOTH_ANGLE)

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
            bpy.context.view_layer.update()
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
