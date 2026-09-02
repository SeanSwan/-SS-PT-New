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

STATUS: RUN. Blender 4.5.13 LTS, 18+ executions across four assets (2026-08-26). Every call in
the 2026-08-25 documentation-only audit has now EXECUTED, including the two it marked UNVERIFIED
(uv.smart_project kwargs, and export_scene.gltf in background mode — blender.org 83188 does not
bite this invocation). shade_auto_smooth stays REPLACED by smooth_by_angle(): the operator exists
in 4.2/4.5, but it applies a geometry-node ASSET with open headless failure reports, and this
pipe runs -b. The bake stage is deliberately absent from plan() until it exists in code.

INVOKE THROUGH scripts/assets/run-blender.mjs, never bare: Blender exits 0 on an uncaught Python
exception (probed), so the wrapper forces --python-exit-code 1 --disable-autoexec and refuses
success unless this script wrote its .swan-pipe.ok sentinel.

The manifest stub is deliberately INVALID (empty provenance): a pipeline that emits pre-approved
provenance is a laundering machine.
"""

import math
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from swan_pipe_manifest import plan, out_dir_for, write_manifest_stub, write_success_receipt, executed_stage_ids, parse_args  # noqa: E402

try:
    import bpy  # noqa: F401
    import bmesh
    IN_BLENDER = True
    # (script dir already on sys.path — see the top-level insert)
    from swan_pipe_stages import (smooth_by_angle, export_collision, render_still,  # noqa: E402
                                   assert_artifact, rig_and_animate, uv_project, emit_part_shapes)
except ImportError:  # allows --dry-run linting outside Blender
    IN_BLENDER = False

SMOOTH_ANGLE = 0.6109  # ~35 degrees

def run_in_blender(args, out_dir, done):
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
    ratios = dict(zip(("lod0", "lod1", "lod2"), (float(x) for x in args.lod_ratios.split(","))))
    tier_max = {k: float(v) for k, v in (kv.split(":") for kv in args.tier_table.split(","))}
    print(f"[swan_pipe] stage tris: source-welded-beveled={base_tris}")
    done.update(["import", "weld", "cleanup", "bevel", "shade", "uv"])

    for name, ratio in ratios.items():
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
            ceiling = int(base_tris * tier_max.get(name, 1.0))
            ok = lambda n: n < prev and n <= ceiling  # noqa: E731 — the tier must MEET its fraction, not just be lower
            print(f"[swan_pipe] stage tris: {name} collapse@{ratio} -> {achieved} (ceiling {ceiling}, prev {prev})")
            if not ok(achieved):
                # Rung 2: planar dissolve removes the bevel bands themselves, which collapse cannot.
                # PROBED on the real mesh (tools/blender/probe-decimate.py): 20deg = 242 (useless),
                # 40deg = 84. Collapse floors at 124 for EVERY ratio <= 0.45 on beveled geometry.
                pd = target.modifiers.new(f"planar_{name}", "DECIMATE")
                pd.decimate_type = "DISSOLVE"
                pd.angle_limit = math.radians(args.planar_deg)
                bpy.context.view_layer.update()
                bpy.ops.object.modifier_apply(modifier=pd.name)
                target.data.update()
                achieved = len(target.data.loop_triangles)
                print(f"[swan_pipe] stage tris: {name} +planar@{args.planar_deg}deg -> {achieved}")
            if not ok(achieved):
                # Rung 3: the UN-BEVELED macro form. At this distance the bevel gene is invisible;
                # the welded blockout is guaranteed lower than any beveled tier. (GLM N1 blocker 2:
                # with only a monotonicity guard the ladder stopped at 103 and never reached this
                # rung; with the tier fraction it must.)
                bpy.data.objects.remove(target, do_unlink=True)
                target = pre_bevel.copy()
                target.data = pre_bevel.data.copy()
                target.name = f"{obj.name}_{name}"
                bpy.context.collection.objects.link(target)
                target.data.update()
                achieved = len(target.data.loop_triangles)
                print(f"[swan_pipe] stage tris: {name} un-beveled form -> {achieved}")
            if not ok(achieved):
                # Rung 4: DECIMATE the un-beveled form. Rung 3 used it as-is and never collapsed it,
                # so a blockout whose welded form already sits just over the ceiling was refused for
                # want of a pass that costs nothing. Probed on drip-cyst (2026-08-26): un-beveled
                # as-is 124 vs ceiling 117 -> refused; un-beveled + collapse 0.45 -> 112 -> accepted.
                dc = target.modifiers.new(f"macro_{name}", "DECIMATE")
                dc.ratio = ratio
                dc.use_collapse_triangulate = True
                bpy.context.view_layer.objects.active = target
                bpy.context.view_layer.update()
                bpy.ops.object.modifier_apply(modifier=dc.name)
                target.data.update()
                achieved = len(target.data.loop_triangles)
                print(f"[swan_pipe] stage tris: {name} un-beveled +collapse@{ratio} -> {achieved}")
            if not ok(achieved):
                raise SystemExit(
                    f"swan_pipe: {name} reached {achieved} tris (ceiling {ceiling} = {tier_max.get(name)} of lod0 {base_tris}, "
                    f"previous tier {prev}) after collapse {ratio}, planar {args.planar_deg}deg and the un-beveled form. "
                    f"Refusing to emit a tier that misses its budget. DIAGNOSE: blender -b --python-exit-code 1 --python "
                    f"tools/blender/probe-decimate.py -- {args.src}  then pass --lod-ratios / --planar-deg / --tier-table.")
            lod_counts[name] = achieved
        done.add("lods")
        uv_project(target)

        # RIG ONLY LOD0. The validator reads skins/clips from lod0.glb; lower tiers are distant
        # silhouettes that never animate. Rigging them would triple the bind cost for nothing.
        rigged = False
        rig_meshes = [target]
        if args.skeleton and name == "lod0":
            clips = [c.strip() for c in args.clips.split(",") if c.strip()]
            arm, rig_meshes = rig_and_animate(target, args.skeleton, clips)
            done.add("rig")
            rigged = True
            if len(rig_meshes) > 1:  # v2 part split — emit the measured hit shapes beside the GLBs
                emit_part_shapes(rig_meshes, out_dir)

        bpy.ops.object.select_all(action="DESELECT")
        for m in rig_meshes:
            m.select_set(True)
        if rigged:
            arm.select_set(True)  # the armature must be in the selection or export_skins writes nothing
        bpy.context.view_layer.objects.active = target
        export_kwargs = dict(
            filepath=os.path.join(out_dir, f"{name}.glb"),
            export_format="GLB", use_selection=True,
            export_apply=not rigged,  # export_apply bakes modifiers away, which destroys the skin
            export_cameras=False, export_lights=False,
        )
        if rigged:
            # export_optimize_animation_size stays at its default (ON). MEASURED: it compresses
            # CONSTANT channels to 2 keys and leaves moving ones at full resolution (idle keeps 24
            # keys on tip.rotation; the 8 channels that never move drop to 2). Turning it off wrote
            # every frame of every channel -- 9x the animation data for identical motion.
            export_kwargs.update(export_skins=True, export_animations=True, export_animation_mode="ACTIONS")
        res = bpy.ops.export_scene.gltf(**export_kwargs)
        assert_artifact(res, os.path.join(out_dir, f"{name}.glb"), f"export {name}")
        if rigged:
            # drop the armature before the next tier: a lingering modifier follows the copies
            bpy.data.objects.remove(arm, do_unlink=True)
            for mesh_obj in rig_meshes:
                for m in [m for m in mesh_obj.modifiers if m.type == "ARMATURE"]:
                    mesh_obj.modifiers.remove(m)

    export_collision(pre_bevel, out_dir, args.collision_ratio)  # PROBED: un-beveled 0.45 -> 38 tris; beveled floors at 124
    done.add("collision")
    render_still(obj, out_dir)
    done.update(["still", "export"])

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

    # ATOMIC OUTPUT (Ox Alpha, N1 blocker 3): six runs wrote into one persistent dir, so a run that died
    # mid-way left the previous run's still.png beside new GLBs, ready to be hashed into a manifest that
    # described different geometry. Build in a temp dir; swap in only on full success.
    # The atomic swap REPLACES out_dir wholesale, eating a curated manifest.json — provenance the
    # pipe cannot regenerate. Did exactly that to four assets (2026-08-26); the validator's exit-2
    # "ZERO manifests" caught it, which is why zero results is an instrument failure, not a pass.
    manifest_path = os.path.join(out_dir, "manifest.json")
    if os.path.exists(manifest_path) and not args.force:
        raise SystemExit(
            f"swan_pipe: {manifest_path} exists and the atomic swap would delete it — that is "
            f"human-authored provenance. Build in a staging dir and copy the GLBs across, or --force.")

    tmp_dir = out_dir.rstrip("/\\") + f".tmp-{os.getpid()}"
    shutil.rmtree(tmp_dir, ignore_errors=True)
    done = set()
    try:
        run_in_blender(args, tmp_dir, done)
        done.add("manifest")
        missing = [st for st in executed_stage_ids(plan(args)) if st not in done]
        if missing:  # plan/code drift is a FAILURE, not a note — run 1 hid collision + still this way
            raise SystemExit(f"swan_pipe: plan() lists stages this run did not execute: {missing}")
        path = write_manifest_stub(args, tmp_dir)
        write_success_receipt(tmp_dir)
    except BaseException:
        shutil.rmtree(tmp_dir, ignore_errors=True)  # never leave a half-run where --all could find it
        raise
    # NOT rmtree-then-replace. That deleted the last good output BEFORE the new one was in place,
    # so any failure in the window - a crash, a full disk, an AV lock, a cross-device replace -
    # left the asset with no output at all. The docstring called it "atomically swapped in"; it
    # was not. Move the old aside first, put the new one in, and only then drop the old. If the
    # replace fails, roll the previous output back.
    backup_dir = out_dir + ".prev"
    shutil.rmtree(backup_dir, ignore_errors=True)
    had_previous = os.path.exists(out_dir)
    if had_previous:
        os.replace(out_dir, backup_dir)
    try:
        os.replace(tmp_dir, out_dir)
    except BaseException:
        if had_previous and not os.path.exists(out_dir):
            os.replace(backup_dir, out_dir)   # the previous good output survives a failed swap
        raise
    shutil.rmtree(backup_dir, ignore_errors=True)
    path = os.path.join(out_dir, os.path.basename(path))
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
