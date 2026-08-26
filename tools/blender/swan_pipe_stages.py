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
    """Heavily decimated collision proxy — never the render mesh.

    Found MISSING on the first real run (2026-08-25): plan() listed "collision" and "still",
    run_in_blender() produced neither, and the stub declared both. Running it found it;
    three panels reading it did not.
    """
    coll = obj.copy()
    coll.data = obj.data.copy()
    bpy.context.collection.objects.link(coll)
    dec = coll.modifiers.new("dec_collision", "DECIMATE")
    dec.ratio = ratio  # passed in; the module constant did not survive the split (found on run 4)
    dec.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = coll
    bpy.context.view_layer.update()
    bpy.ops.object.modifier_apply(modifier=dec.name)
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


