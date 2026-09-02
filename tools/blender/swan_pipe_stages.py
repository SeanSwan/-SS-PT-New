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
    """Minimal shared creature rig + the requested clips, exported inside the GLB.

    WHY MINIMAL: the registry's skeleton contract (skeleton.creature-small.v1) names five clips,
    and the validator now refuses a manifest declaring clips the bytes do not contain (N1). So the
    honest path is a rig the pipe can actually produce for a blockout — three deform bones along
    the silhouette's Y extent — not a Rigify humanoid a 5-voxel fry has no anatomy for. Each clip
    in `clips` must have an authoring recipe below; asking for one that does not exist is a hard
    failure, never a silently shorter animation list.

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

    # ROSTER-V2 (dismemberment contract, D2 2026-09-01): same three-bone chain, but the bones
    # carry PART names and the mesh is SPLIT into part meshes that each bind wholly to one bone.
    # A hard boundary is the point: severing detaches one whole mesh, so there are no half-weighted
    # vertices to smear across the cut. v1 keeps automatic weights and one mesh, unchanged.
    v2 = skeleton_id.endswith(".v2")
    chain = ("root", "body", "head") if v2 else ("root", "mid", "tip")
    bone_map = dict(zip(("root", "mid", "tip"), chain))  # clip recipes speak v1; the map translates

    arm_data = bpy.data.armatures.new(f"{skeleton_id}.data")
    arm = bpy.data.objects.new(skeleton_id, arm_data)
    bpy.context.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    prev = None
    for i, name in enumerate(chain):
        b = arm_data.edit_bones.new(name)
        b.head = (cx, cy, lo + span * (i / 3.0))
        b.tail = (cx, cy, lo + span * ((i + 1) / 3.0))
        if prev is not None:
            b.parent = prev
            b.use_connect = True
        prev = b
    bpy.ops.object.mode_set(mode="OBJECT")

    part_objects = [obj]
    if v2:
        # Split at the head boundary (top third of the silhouette — where the head bone begins).
        # Faces are assigned by their centre's Z; a face is exactly one part, never both.
        boundary = lo + span * (2.0 / 3.0)
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="DESELECT")
        bpy.ops.object.mode_set(mode="OBJECT")
        mw = obj.matrix_world
        for poly in obj.data.polygons:
            poly.select = (mw @ poly.center).z >= boundary
        head_faces = sum(1 for p in obj.data.polygons if p.select)
        if head_faces == 0 or head_faces == len(obj.data.polygons):
            raise SystemExit(f"swan_pipe: v2 part split found {head_faces} head faces of "
                             f"{len(obj.data.polygons)} — a split that produces an empty part is not a split")
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.separate(type="SELECTED")
        bpy.ops.object.mode_set(mode="OBJECT")
        newly = [o for o in bpy.context.selected_objects if o is not obj and o.type == "MESH"]
        if len(newly) != 1:
            raise SystemExit(f"swan_pipe: separate produced {len(newly)} objects, expected 1")
        head_obj = newly[0]
        obj.name, head_obj.name = "part:body", "part:head"
        part_objects = [obj, head_obj]
        print(f"[swan_pipe] v2 split: body {len(obj.data.polygons)} faces, head {len(head_obj.data.polygons)} faces at z>={boundary:.2f}")

        # Hard binding: every vertex of a part to its ONE bone at weight 1.
        for part_obj, bone in ((obj, "body"), (head_obj, "head")):
            vg = part_obj.vertex_groups.new(name=bone)
            vg.add(list(range(len(part_obj.data.vertices))), 1.0, "REPLACE")
            mod = part_obj.modifiers.new("Armature", "ARMATURE")
            mod.object = arm
            part_obj.parent = arm
    else:
        # bind: automatic weights needs the mesh active with the armature selected
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        arm.select_set(True)
        bpy.context.view_layer.objects.active = arm
        res = bpy.ops.object.parent_set(type="ARMATURE_AUTO")
        if res != {"FINISHED"}:
            raise SystemExit(f"swan_pipe: armature bind returned {res}, not FINISHED")

    # ------------------------------------------------------------------ clips
    # WHAT THE PIPE CAN HONESTLY AUTHOR:
    # Three deform bones along the silhouette. That is not enough anatomy for a walk cycle with
    # legs -- but it IS enough for the four clips a wave-survival enemy actually needs, because a
    # legless voxel fry does not walk, it waddles. Each clip below is a pose curve on bones that
    # exist. Nothing here claims a clip the bytes do not contain.
    #
    # Was ONE clip (`idle`) with the other four left UNAUTHORED and unclaimed. Slice 6 needs the
    # creature to actually behave, so walk/attack/die are authored here rather than declared.
    scene = bpy.context.scene
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="POSE")
    arm.animation_data_create()

    # frame -> {bone: (x, y, z) euler radians}. Rotating X leans forward/back, Y leans sideways.
    # CLIP NAMES COME FROM THE SKELETON CONTRACT, NOT FROM TASTE.
    # skeleton.creature-small.v1 names exactly: idle, move, attack, hit, death. An earlier pass here
    # authored "walk" and "die" because those are the words a person reaches for -- the validator
    # rejected both, correctly. The registry is the authority on names; this file supplies motion.
    CLIPS = {
        # a slow breathing sway; the original, unchanged, so existing bytes stay comparable
        "idle": (24, [
            (1,  {"tip": (0.0, 0.0, 0.0)}),
            (12, {"tip": (0.12, 0.0, 0.0)}),
            (24, {"tip": (0.0, 0.0, 0.0)}),
        ]),
        # a waddle: rock side to side, dipping on each plant. Frame 16 repeats frame 1 so it loops.
        # A legless voxel fry does not walk -- giving it a leg cycle it has no anatomy for is how a
        # blockout starts lying about what it is.
        "move": (16, [
            (1,  {"root": (0.0, 0.0, 0.0),   "mid": (0.0, 0.0, 0.0)}),
            (5,  {"root": (0.0, 0.11, 0.0),  "mid": (-0.07, 0.0, 0.0)}),
            (9,  {"root": (0.0, 0.0, 0.0),   "mid": (0.0, 0.0, 0.0)}),
            (13, {"root": (0.0, -0.11, 0.0), "mid": (-0.07, 0.0, 0.0)}),
            (16, {"root": (0.0, 0.0, 0.0),   "mid": (0.0, 0.0, 0.0)}),
        ]),
        # wind up, then lunge. The wind-up is the whole reason an attack reads as an attack --
        # without it the hit is instantaneous and the player has nothing to react to.
        "attack": (16, [
            (1,  {"mid": (0.0, 0.0, 0.0),   "tip": (0.0, 0.0, 0.0)}),
            (4,  {"mid": (-0.15, 0.0, 0.0), "tip": (-0.38, 0.0, 0.0)}),
            (8,  {"mid": (0.28, 0.0, 0.0),  "tip": (0.62, 0.0, 0.0)}),
            (12, {"mid": (0.10, 0.0, 0.0),  "tip": (0.25, 0.0, 0.0)}),
            (16, {"mid": (0.0, 0.0, 0.0),   "tip": (0.0, 0.0, 0.0)}),
        ]),
        # a flinch: snap back on the frame it is struck, then recover. Short on purpose -- a long
        # hit reaction is a stun, and stunning an enemy every time you graze it removes the threat.
        "hit": (12, [
            (1,  {"mid": (0.0, 0.0, 0.0),   "tip": (0.0, 0.0, 0.0)}),
            (3,  {"mid": (-0.22, 0.0, 0.0), "tip": (-0.34, 0.0, 0.0)}),
            (7,  {"mid": (0.06, 0.0, 0.0),  "tip": (0.10, 0.0, 0.0)}),
            (12, {"mid": (0.0, 0.0, 0.0),   "tip": (0.0, 0.0, 0.0)}),
        ]),
        # topple over and settle. Deliberately does NOT return to upright: a death clip that loops
        # back to standing is the classic way a corpse resurrects itself on screen.
        "death": (24, [
            (1,  {"root": (0.0, 0.0, 0.0),  "mid": (0.0, 0.0, 0.0),  "tip": (0.0, 0.0, 0.0)}),
            (10, {"root": (0.55, 0.0, 0.0), "mid": (0.18, 0.0, 0.0), "tip": (0.12, 0.0, 0.0)}),
            (18, {"root": (1.45, 0.0, 0.0), "mid": (0.35, 0.0, 0.0), "tip": (0.25, 0.0, 0.0)}),
            (24, {"root": (1.40, 0.0, 0.0), "mid": (0.30, 0.0, 0.0), "tip": (0.20, 0.0, 0.0)}),
        ]),
    }

    wanted = [c for c in (clips or ["idle"]) if c in CLIPS]
    missing = [c for c in (clips or []) if c not in CLIPS]
    if missing:
        # Fail rather than silently ship fewer clips than asked for. A manifest that claims a clip
        # the GLB does not contain is exactly the drift the validator exists to stop.
        raise SystemExit(f"swan_pipe: no authoring recipe for clip(s) {missing}; known: {sorted(CLIPS)}")

    for name in wanted:
        frame_end, keys = CLIPS[name]
        scene.frame_start, scene.frame_end = 1, frame_end

        # Reset every bone before authoring. Pose is sticky between actions: a bone left rotated by
        # the previous clip and not keyed by this one keeps that rotation, and the clip exports with
        # a lean nobody put there.
        for pb in arm.pose.bones:
            pb.rotation_mode = "XYZ"
            pb.rotation_euler = (0.0, 0.0, 0.0)

        action = bpy.data.actions.new(name)
        arm.animation_data.action = action
        for frame, poses in keys:
            scene.frame_set(frame)
            for bone_name, rot in poses.items():
                pb = arm.pose.bones[bone_map[bone_name]]  # recipes speak v1; the map translates to the chain
                pb.rotation_mode = "XYZ"
                pb.rotation_euler = rot
                pb.keyframe_insert(data_path="rotation_euler", frame=frame)
        if not action.fcurves:
            raise SystemExit(f"swan_pipe: clip '{name}' produced zero fcurves")

        # Stash into an NLA track. An action that is merely present in the file is not reliably
        # picked up by the exporter; one parked on a track is. The active action is then cleared so
        # the next clip starts from a clean slot rather than appending to this one.
        track = arm.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 1, action)
        arm.animation_data.action = None
        print(f"[swan_pipe] clip '{name}': {len(action.fcurves)} fcurves, frames 1-{frame_end}")

    bpy.ops.object.mode_set(mode="OBJECT")
    if not arm.animation_data or not arm.animation_data.nla_tracks:
        raise SystemExit("swan_pipe: no NLA tracks on the armature after keyframing")
    print(f"[swan_pipe] rig: 3 bones ({'/'.join(chain)}), {len(arm.animation_data.nla_tracks)} clip(s): {', '.join(wanted)}")
    # Callers export EVERY returned object plus the armature; v1 returns one mesh, v2 the parts.
    return arm, part_objects


def emit_part_shapes(part_objects, out_dir):
    """Write parts.json: measured hit shapes per part, in the NORMALIZED glTF frame the game
    renders in (1 unit tall, footprint centred, feet at y=0) — the same transform Monster.jsx and
    validate-asset.parts.mjs use, so pipe, gate, and renderer cannot disagree.

    Blender is Z-up; glTF is Y-up (gltf x,y,z = blender x, z, -y — the -y flip swaps that axis's
    min/max). Shapes: the body gets a Y-axis capsule (radius = max lateral half-extent), the head
    a sphere at its box centre with r = longest half-extent — both cover 100% of the longest
    half-extent by construction, comfortably over the gate's 80% floor.
    """
    import json
    import mathutils

    # Measure from VERTICES, not bound_box: after mesh.separate the cached bound_box is stale
    # until a depsgraph update, and a stale box reports the pre-split whole for both parts —
    # the same staleness class N1 hit with modifier_apply. Vertices are ground truth.
    bpy.context.view_layer.update()
    boxes = {}
    for o in part_objects:
        mw = o.matrix_world
        if not o.data.vertices:
            raise SystemExit(f"swan_pipe: part '{o.name}' has no vertices to measure")
        pts = [mw @ v.co for v in o.data.vertices]
        gx = [p.x for p in pts]; gy = [p.z for p in pts]; gz = [-p.y for p in pts]
        tag = o.name.split(":", 1)[1] if ":" in o.name else o.name
        boxes[tag] = ([min(gx), min(gy), min(gz)], [max(gx), max(gy), max(gz)])
    wmin = [min(b[0][k] for b in boxes.values()) for k in range(3)]
    wmax = [max(b[1][k] for b in boxes.values()) for k in range(3)]
    height = wmax[1] - wmin[1]
    if height <= 0:
        raise SystemExit("swan_pipe: zero-height creature; cannot normalize part shapes")
    s = 1.0 / height
    cx = (wmin[0] + wmax[0]) / 2.0
    cz = (wmin[2] + wmax[2]) / 2.0
    norm = lambda v: [round((v[0] - cx) * s, 4), round((v[1] - wmin[1]) * s, 4), round((v[2] - cz) * s, 4)]  # noqa: E731

    parts = []
    for tag, (mn, mx) in boxes.items():
        nmn, nmx = norm(mn), norm(mx)
        half = [(nmx[k] - nmn[k]) / 2.0 for k in range(3)]
        centre = [round((nmn[k] + nmx[k]) / 2.0, 4) for k in range(3)]
        if tag == "body":
            r = round(max(half[0], half[2]), 4)
            seg = max(half[1] - r, 0.0)
            a = [centre[0], round(centre[1] - seg, 4), centre[2]]
            b = [centre[0], round(centre[1] + seg, 4), centre[2]]
            parts.append({"tag": tag, "bone": "body", "severable": False,
                          "hitShape": {"kind": "capsule", "a": a, "b": b, "r": r}})
        else:
            r = round(max(half), 4)
            entry = {"tag": tag, "bone": tag, "severable": True, "onSever": "kill" if tag == "head" else "none",
                     "severAtHpFraction": 0.0 if tag == "head" else 0.5,
                     "hitShape": {"kind": "sphere", "c": centre, "r": r}}
            parts.append(entry)
    path = os.path.join(out_dir, "parts.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(parts, f, indent=2)
    print(f"[swan_pipe] part shapes -> {path} ({', '.join(sorted(boxes))})")
    return path


def uv_project(o):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(island_margin=0.02)
    bpy.ops.object.mode_set(mode="OBJECT")
