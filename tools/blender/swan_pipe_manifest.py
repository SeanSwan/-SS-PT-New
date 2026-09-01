"""
swan_pipe_manifest.py — the bpy-FREE half of swan_pipe.py: the pipeline plan as data, the
output-dir convention, and the deliberately-INVALID manifest stub.

Split out 2026-08-25 to keep swan_pipe.py under the repo's 300-line cap. Importable without
Blender, which is what lets `--dry-run` work anywhere.
"""
import argparse
import json
import os

LOD_RATIOS = {"lod0": 1.0, "lod1": 0.45, "lod2": 0.18}


def plan(args):
    """The pipeline as data, so --dry-run can show it without Blender.

    The stage list is CONDITIONAL on args: run_in_blender() records what it executed and the run
    refuses its success sentinel if the two disagree, so a stage listed here that the code skips
    is a hard failure — which is why `rig` appears only when --skeleton was given.
    """
    stages = [
        ("import", f"load {args.src}"),
        ("weld", "merge_by_distance — voxel exporters emit duplicate verts at every cube face"),
        ("cleanup", "limited dissolve on coplanar faces — collapses cube grids into flat n-gons"),
        ("bevel", f"width={args.bevel_width}, segments=2, clamp — THE inherited art gene"),
        ("shade", "bmesh sharp-edge marking at ~35deg then shade smooth — asset-free, headless-safe"),
        ("uv", "smart_uv_project, island_margin 0.02"),
        # ("bake", ...) REMOVED from the plan 2026-08-26 until it exists in the code. A plan that lists a
        # stage the code does not run is the plan/code drift that hid missing collision+still on run 1
        # (Ox Alpha, N1 blocker 2). It returns to this list the day swan_pipe_stages.py bakes.
        ("lods", f"decimate to {LOD_RATIOS}"),
        ("collision", "un-beveled macro form, collapse 0.45 — never the render mesh"),
        ("still", "one orthographic Workbench poster for the still tier"),
        ("export", "GLB per LOD (+Y up, no cameras/lights, apply modifiers)"),
        ("manifest", "emit INVALID stub — provenance is a human act"),
    ]
    if getattr(args, "skeleton", None):
        stages.insert(-1, ("rig", f"3-bone {args.skeleton} bound by automatic weights + the `idle` clip, exported in LOD0"))
    return stages


def out_dir_for(args):
    return args.out_dir or os.path.join("assets", "runtime", args.asset_id.replace(".", "/"))


def write_manifest_stub(args, out_dir):
    """Deliberately invalid. The validator must reject this until a human fills it in."""
    stub = {
        "schema": "swan.game-asset.v1",
        "id": args.asset_id,
        "zone": None,
        "skeleton": args.skeleton,
        "animations": ["idle"] if args.skeleton else None,  # ONLY what the pipe authors; the other 4 registry clips stay unauthored
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


def executed_stage_ids(plan_items):
    """Stage ids run_in_blender() must record as executed — derived FROM plan() so the two cannot drift."""
    return [stage for stage, _ in plan_items]


def parse_args(argv):
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        argv = []
    p = argparse.ArgumentParser(prog="swan_pipe")
    p.add_argument("--in", dest="src", required=True, help="source .vox/.obj/.glb")
    p.add_argument("--id", dest="asset_id", required=True, help="registry asset id, e.g. enemy.fryling")
    p.add_argument("--out", dest="out_dir", default=None, help="output dir (default assets/runtime/<id>)")
    p.add_argument("--skeleton", default=None, help="registry skeleton id; omit for a static prop. When set, the pipe rigs LOD0 and authors the `idle` clip")
    p.add_argument("--bevel-width", type=float, default=0.012, help="the 'not plastic cubes' gene")
    p.add_argument("--bake-size", type=int, default=1024)
    p.add_argument("--lod-ratios", default="1.0,0.45,0.18",
                   help="collapse ratios for lod0,lod1,lod2. DEFAULTS WERE PROBED ON ONE 5-cube mesh (2026-08-25); "
                        "run tools/blender/probe-decimate.py on a new asset class before trusting them")
    p.add_argument("--planar-deg", type=float, default=40.0, help="planar-dissolve fallback when collapse floors (probed: 20deg useless, 40deg works)")
    p.add_argument("--collision-ratio", type=float, default=0.45, help="collapse ratio on the UN-beveled macro form")
    p.add_argument("--tier-table", default="lod1:0.5,lod2:0.25",
                   help="max triangle FRACTION of lod0 per tier. A rung is accepted only if it meets this — "
                        "\"lower than the previous tier\" alone let a 40%% LOD2 through (GLM 5.3, N1)")
    p.add_argument("--force", action="store_true",
                   help="allow the atomic swap to delete an existing manifest.json in --out. Off by "
                        "default: that file is human-authored provenance the pipe cannot regenerate")
    p.add_argument("--dry-run", action="store_true", help="print the plan and exit (works without Blender)")
    return p.parse_args(argv)


# --------------------------------------------------------------- blender ops
