"""
swan_pipe_manifest.py — the bpy-FREE half of swan_pipe.py: the pipeline plan as data, the
output-dir convention, and the deliberately-INVALID manifest stub.

Split out 2026-08-25 to keep swan_pipe.py under the repo's 300-line cap. Importable without
Blender, which is what lets `--dry-run` work anywhere.
"""
import json
import os

LOD_RATIOS = {"lod0": 1.0, "lod1": 0.45, "lod2": 0.18}


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
        ("collision", "un-beveled macro form, collapse 0.45 — never the render mesh"),
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
