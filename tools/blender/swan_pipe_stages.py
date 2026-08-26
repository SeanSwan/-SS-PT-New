"""
swan_pipe_stages.py — the stages of swan_pipe.py that are not the LOD loop.

Split out 2026-08-25 when the first real run pushed swan_pipe.py to 333 lines against the
repo's 300-line cap. Same rules as the main file: UNRUN until executed; the docblock of each
function says what it depends on and why.
"""
import os
import bpy
import bmesh
import mathutils


def assert_artifact(op_result, path, what):
    """bpy.ops return {'CANCELLED'} WITHOUT raising — a silent sibling channel to exceptions
    (GLM 5.3, N1 blocker 3). Check the operator result AND that the file exists with bytes."""
    if op_result != {"FINISHED"}:
        raise SystemExit(f"swan_pipe: {what} returned {op_result}, not FINISHED")
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        raise SystemExit(f"swan_pipe: {what} reported FINISHED but wrote no bytes at {path}")


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


def export_collision(obj, out_dir, ratio):
    """Collision proxy = CONVEX HULL of the un-beveled macro form. Closed manifold by construction.

    Run 7 (2026-08-26): the previous approach — collapse-decimate the macro form to ~38 tris — was
    committed as the asset's collision.glb and turned out to be NOT a closed manifold: 15 of 49
    edges had one face. Physics would tunnel through it. Found only when the manifold check Ox
    Alpha asked for was added and RUN. A hull is what a broadphase wants anyway; the L-shape's
    concavity is irrelevant at this scale. `ratio` is kept for the call signature and ignored.
    """
    coll = obj.copy()
    coll.data = obj.data.copy()
    coll.name = f"{obj.name}_collision"
    bpy.context.collection.objects.link(coll)
    # Runs 9/10: hulling a bmesh that still carried the SOURCE faces left those faces overlapping
    # the hull surface -> 8 of 24 edges with the wrong face count. Hull the bare POINT CLOUD.
    bm = bmesh.new()
    for v in coll.data.vertices:
        bm.verts.new(v.co)
    bm.verts.ensure_lookup_table()
    hull = bmesh.ops.convex_hull(bm, input=bm.verts[:])
    # geom_interior and geom_unused can overlap; bmesh.ops.delete refuses duplicates (run 11).
    hull_verts = {g for g in hull["geom"] if isinstance(g, bmesh.types.BMVert)}
    drop = [v for v in bm.verts if v not in hull_verts]
    if drop:
        bmesh.ops.delete(bm, geom=drop, context="VERTS")
    bm.to_mesh(coll.data)
    bm.free()
    coll.data.update()

    # A collision proxy that is not a closed manifold lets physics tunnel through it (Ox Alpha, N1
    # blocker 5). Check the topology, not the triangle count: every edge has exactly two faces.
    bm = bmesh.new()
    bm.from_mesh(coll.data)
    bad = [e for e in bm.edges if len(e.link_faces) != 2]
    n_edges = len(bm.edges)
    bm.free()
    if bad:
        raise SystemExit(f"swan_pipe: collision proxy is not a closed manifold — {len(bad)} of {n_edges} edges lack exactly 2 faces")
    bpy.ops.object.select_all(action="DESELECT")
    coll.select_set(True)
    bpy.context.view_layer.objects.active = coll
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(out_dir, "collision.glb"),
        export_format="GLB", use_selection=True,
        export_apply=True, export_cameras=False, export_lights=False,
    )

    return


def render_still(obj, out_dir):
    """Workbench still for the `still` tier — CPU renderer, no GPU or asset dependency."""
    # --- still poster for the `still` tier: Workbench (CPU, no GPU/asset dependency) --------
    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new("swan_still_cam")
    cam_data.type = "ORTHO"
    cam = bpy.data.objects.new("swan_still_cam", cam_data)
    bpy.context.collection.objects.link(cam)
    scene.camera = cam
    # frame the LOD0 object from a 3/4 view
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    dims = obj.dimensions
    cam_data.ortho_scale = max(dims.x, dims.y, dims.z) * 1.6 or 2.0
    cam.location = (obj.location.x + dims.x * 1.5, obj.location.y - dims.y * 1.5, obj.location.z + dims.z * 1.2)
    import mathutils
    look = mathutils.Vector((obj.location.x + dims.x / 2, obj.location.y + dims.y / 2, obj.location.z + dims.z / 2))
    cam.rotation_euler = (look - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = os.path.join(out_dir, "still.png")
    bpy.ops.render.render(write_still=True)


def rig_and_animate(obj, skeleton_id, clips):
    """Minimal shared creature rig + one clip, exported inside the GLB.

    WHY MINIMAL: the registry's skeleton contract (skeleton.creature-small.v1) names five clips,
    and the validator now refuses a manifest declaring clips the bytes do not contain (N1). So the
    honest path is a rig the pipe can actually produce for a blockout — three deform bones along
    the silhouette's Y extent — not a Rigify humanoid a 5-voxel fry has no anatomy for.

    Bones are placed by the mesh's own bounding box, so this works on any blockout without
    per-asset tuning. Vertices bind by automatic weights.

    Returns the armature object. UNRUN until executed — every claim here is API-level, not
    behavioural, until the first real run says otherwise.
    """
    import mathutils

    bb = [obj.matrix_world @ mathutils.Vector(c) for c in obj.bound_box]
    zs = [v.z for v in bb]
    lo, hi = min(zs), max(zs)
    span = max(hi - lo, 1e-4)
    cx = sum(v.x for v in bb) / 8.0
    cy = sum(v.y for v in bb) / 8.0

    arm_data = bpy.data.armatures.new(f"{skeleton_id}.data")
    arm = bpy.data.objects.new(skeleton_id, arm_data)
    bpy.context.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    names = ("root", "mid", "tip")
    prev = None
    for i, name in enumerate(names):
        b = arm_data.edit_bones.new(name)
        b.head = (cx, cy, lo + span * (i / 3.0))
        b.tail = (cx, cy, lo + span * ((i + 1) / 3.0))
        if prev is not None:
            b.parent = prev
            b.use_connect = True
        prev = b
    bpy.ops.object.mode_set(mode="OBJECT")

    # bind: automatic weights needs the mesh active with the armature selected
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    res = bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    if res != {"FINISHED"}:
        raise SystemExit(f"swan_pipe: armature bind returned {res}, not FINISHED")

    # one clip. `idle` is the only one the pipe can honestly author for a blockout: a slow
    # breathing sway on the tip bone. The other four clips in the registry contract stay
    # UNAUTHORED, and the manifest must not claim them.
    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = 1, 24
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="POSE")
    tip = arm.pose.bones["tip"]
    action = bpy.data.actions.new("idle")
    arm.animation_data_create()
    arm.animation_data.action = action
    for frame, angle in ((1, 0.0), (12, 0.12), (24, 0.0)):
        scene.frame_set(frame)
        tip.rotation_mode = "XYZ"
        tip.rotation_euler = (angle, 0.0, 0.0)
        tip.keyframe_insert(data_path="rotation_euler", frame=frame)
    bpy.ops.object.mode_set(mode="OBJECT")
    if not arm.animation_data or not arm.animation_data.action:
        raise SystemExit("swan_pipe: no action bound to the armature after keyframing")
    print(f"[swan_pipe] rig: 3 bones, action '{action.name}' with {len(action.fcurves)} fcurves")
    return arm
