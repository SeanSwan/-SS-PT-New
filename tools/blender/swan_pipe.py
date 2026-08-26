"""
swan_pipe.py — headless Blender: voxel source -> game-ready GLB set + manifest stub.

    blender -b --python-exit-code 1 --python tools/blender/swan_pipe.py -- --in <file.obj|.glb> --id <asset-id> [opts]

    --python-exit-code 1 is NOT optional. Probed 2026-08-25: Blender exits 0 on an uncaught Python
    exception (a NameError traceback and "exit=0" in the same run). The script also catches and
    sys.exit(1)s itself; the flag is belt-and-braces for the case the catch never runs.

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
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from swan_pipe_manifest import LOD_RATIOS, plan, out_dir_for, write_manifest_stub  # noqa: E402

try:
    import bpy  # noqa: F401
    import bmesh
    IN_BLENDER = True
    # (script dir already on sys.path — see the top-level insert)
    from swan_pipe_stages import smooth_by_angle, export_collision, render_still  # noqa: E402
except ImportError:  # allows --dry-run linting outside Blender
    IN_BLENDER = False


SMOOTH_ANGLE = 0.6109  # ~35 degrees


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

    pre_bevel = obj.copy()
    pre_bevel.data = obj.data.copy()
    pre_bevel.name = f"{obj.name}_prebevel"
    bpy.context.collection.objects.link(pre_bevel)

    bev = obj.modifiers.new("swan_bevel", "BEVEL")
    bev.width = args.bevel_width
    bev.segments = 2
    bev.limit_method = "ANGLE"
    bev.angle_limit = 0.5236  # 30deg
    bpy.context.view_layer.update()  # headless: modifier_apply needs an evaluated depsgraph (Ox Alpha)
    bpy.ops.object.modifier_apply(modifier=bev.name)

    smooth_by_angle(obj, SMOOTH_ANGLE)

    # UV projection is done PER LOD, AFTER decimation (see loop). Second real run (2026-08-25):
    # projecting UVs on the base first pinned seams that collapse decimation refuses to cross,
    # so ratio 0.45 and 0.18 both floored at the same 124 triangles. Order matters.
    os.makedirs(out_dir, exist_ok=True)
    obj.data.update()
    base_tris = len(obj.data.loop_triangles)
    lod_counts = {"lod0": base_tris}

    def uv_project(o):
        bpy.ops.object.select_all(action="DESELECT")
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(island_margin=0.02)
        bpy.ops.object.mode_set(mode="OBJECT")

    for name, ratio in LOD_RATIOS.items():
        target = obj.copy()
        target.data = obj.data.copy()
        target.name = f"{obj.name}_{name}"
        bpy.context.collection.objects.link(target)
        if ratio < 1.0:
            dec = target.modifiers.new(f"dec_{name}", "DECIMATE")
            dec.ratio = ratio
            dec.use_collapse_triangulate = True
            bpy.context.view_layer.objects.active = target
            bpy.context.view_layer.update()
            bpy.ops.object.modifier_apply(modifier=dec.name)
            # First real run (2026-08-25): LOD1 and LOD2 came out byte-identical — collapse
            # decimation floors on a low-poly beveled mesh, so ratio 0.45 and 0.18 met the same
            # floor. Record the achieved count so the manifest carries the TRUE tier sizes, and
            # refuse silently-identical tiers: a "lower" LOD that is not lower is a lie.
            target.data.update()
            achieved = len(target.data.loop_triangles)
            prev = list(lod_counts.values())[-1]
            if achieved >= prev:
                # Collapse floored (first real run: 0.45 and 0.18 both stopped at 124 tris on a
                # 260-tri beveled mesh). Planar dissolve removes the bevel bands themselves,
                # which collapse cannot, so it reaches a genuinely lower tier.
                pd = target.modifiers.new(f"planar_{name}", "DECIMATE")
                pd.decimate_type = "DISSOLVE"
                # PROBED, not guessed (2026-08-25, .n1/probe.py on the real asset): collapse floors at
                # 124 tris for EVERY ratio <= 0.45 on this beveled mesh; planar at 20deg = 242 (useless),
                # planar at 40deg = 84 (dissolves the bevel bands, keeps the silhouette). 40deg it is.
                pd.angle_limit = 0.70  # ~40deg
                bpy.context.view_layer.update()
                bpy.ops.object.modifier_apply(modifier=pd.name)
                target.data.update()
                achieved = len(target.data.loop_triangles)
            if achieved >= prev:
                # Last resort with a design rationale, not a hack: the UN-BEVELED macro form.
                # At LOD2 distance the bevel gene is invisible anyway, and the welded blockout
                # is guaranteed lower than any beveled tier.
                bpy.data.objects.remove(target, do_unlink=True)
                target = pre_bevel.copy()
                target.data = pre_bevel.data.copy()
                target.name = f"{obj.name}_{name}"
                bpy.context.collection.objects.link(target)
                target.data.update()
                achieved = len(target.data.loop_triangles)
                print(f"[swan_pipe] {name}: collapse+planar floored at {prev}; using un-beveled macro form ({achieved} tris)")
            if achieved >= prev:
                raise SystemExit(
                    f"swan_pipe: {name} decimated to {achieved} tris, not lower than the previous LOD "
                    f"({prev}) even after planar dissolve. Refusing to emit a fake tier.")
            lod_counts[name] = achieved
        uv_project(target)
        bpy.ops.object.select_all(action="DESELECT")
        target.select_set(True)
        bpy.context.view_layer.objects.active = target
        bpy.ops.export_scene.gltf(
            filepath=os.path.join(out_dir, f"{name}.glb"),
            export_format="GLB", use_selection=True,
            export_apply=True, export_cameras=False, export_lights=False,
        )

    export_collision(pre_bevel, out_dir, 0.45)  # PROBED: un-beveled collapse 0.45 -> 38 tris; the beveled mesh floors at 124
    render_still(obj, out_dir)

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
    # Blender exits 0 when a --python script raises (run 4, 2026-08-25: a NameError traceback
    # and "exit=0" in the same output). An instrument that reports success on a crash is the
    # failure class this whole branch exists to kill. Catch, print, and exit NONZERO ourselves.
    try:
        main()
    except SystemExit as exc:  # our own refusals carry a message; keep their nonzero status
        if exc.code not in (None, 0):
            print(f"[swan_pipe] FAILED: {exc}", file=sys.stderr)
            sys.exit(1)
    except Exception as exc:  # noqa: BLE001
        import traceback
        traceback.print_exc()
        print(f"[swan_pipe] FAILED: {type(exc).__name__}: {exc}", file=sys.stderr)
        sys.exit(1)
