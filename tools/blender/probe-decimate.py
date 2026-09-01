"""probe-decimate.py — decimation behaviour of a real mesh at several ratios/modes.

Diagnostic, not pipeline. Written 2026-08-25 when swan_pipe.py floored at 124 tris for every
collapse ratio and two guesses at the cause (UV seams; planar 20deg) were both wrong. Run
this BEFORE choosing LOD ratios for a new asset class; do not guess.

    blender -b --python-exit-code 1 --python tools/blender/probe-decimate.py -- <in.obj>
"""
import sys, bpy, bmesh
src = sys.argv[sys.argv.index("--")+1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=src)
obj = [o for o in bpy.context.scene.objects if o.type=="MESH"][0]
def clean(o):
    bm=bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.dissolve_limit(bm, angle_limit=0.0873, verts=bm.verts, edges=bm.edges)
    bm.to_mesh(o.data); bm.free(); o.data.update()
def tris(o): o.data.update(); return len(o.data.loop_triangles)
def copy(o):
    c=o.copy(); c.data=o.data.copy(); bpy.context.collection.objects.link(c); return c
def dec(o, ratio, mode="COLLAPSE", tri=True):
    c=copy(o); m=c.modifiers.new("d","DECIMATE"); m.decimate_type=mode
    if mode=="COLLAPSE": m.ratio=ratio; m.use_collapse_triangulate=tri
    elif mode=="UNSUBDIV": m.iterations=int(ratio)
    else: m.angle_limit=ratio
    bpy.context.view_layer.objects.active=c; bpy.context.view_layer.update()
    bpy.ops.object.modifier_apply(modifier=m.name); return tris(c)
clean(obj); print(f"[probe] welded+dissolved: {tris(obj)} tris, {len(obj.data.polygons)} faces (n-gons kept)")
bev=copy(obj); b=bev.modifiers.new("b","BEVEL"); b.width=0.012; b.segments=2; b.limit_method="ANGLE"
bpy.context.view_layer.objects.active=bev; bpy.context.view_layer.update(); bpy.ops.object.modifier_apply(modifier="b")
print(f"[probe] beveled: {tris(bev)} tris, {len(bev.data.polygons)} faces")
for r in (0.6,0.45,0.3,0.18,0.1,0.05): print(f"[probe] beveled collapse ratio {r}: {dec(bev,r)} tris")
print(f"[probe] beveled collapse 0.18 triangulate=False: {dec(bev,0.18,tri=False)} tris")
for r in (0.45,0.18): print(f"[probe] UNBEVELED collapse ratio {r}: {dec(obj,r)} tris")
print(f"[probe] beveled UNSUBDIV 2 iters: {dec(bev,2,'UNSUBDIV')} tris")
print(f"[probe] beveled PLANAR 20deg: {dec(bev,0.35,'DISSOLVE')} tris | 40deg: {dec(bev,0.7,'DISSOLVE')} tris")
