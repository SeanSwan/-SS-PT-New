# smoke-workflows.py -- prove the stack still RENDERS after any ComfyUI / driver / model change.
#
#   .venv\Scripts\python.exe smoke-workflows.py            run the smoke (server must be up)
#   .venv\Scripts\python.exe smoke-workflows.py --plan     convert + validate only, queue nothing
#
# WHY. "Schema-valid" is not "runs" -- this branch has been burned by exists-but-never-executed
# twice. This converts the saved SWAN workflows (UI JSON) to API graphs using the live server's
# /object_info as the widget-name authority, queues a SMALL render of each, asserts a real output
# file appears in /history, and appends wall times to smoke-log.csv so performance drift after
# upgrades is data, not vibes.
#
# Covered: 00 (text-to-video, length shrunk to 25 frames ~1s) and 04 (Krea 2 still, full size).
# Skipped: 01 (first/last frame) -- it shares 00's entire model stack and adds only image inputs,
# which need uploaded files; run it by hand when 00 passes but videos misbehave.
# Bypassed nodes (mode 4) are rewired through: model passes straight through a bypassed LoRA.

import csv
import json
import sys
import time
import urllib.request
from datetime import date
from pathlib import Path

URL = "http://127.0.0.1:8189"
ROOT = Path(__file__).resolve().parent
WF_DIR = ROOT / "user-candidate" / "default" / "workflows"
LOG = ROOT / "smoke-log.csv"
PLAN_ONLY = "--plan" in sys.argv

SMOKE = [
    # (filename, {widget-name: override})   overrides keep the smoke small
    ("00 SWAN — H3 local — Text to Video.json", {"length": 25}),
    ("04 SWAN - Krea2 - Character Stills.json", {}),
]

def api(path, payload=None):
    req = urllib.request.Request(URL + path, json.dumps(payload).encode() if payload else None,
                                 {"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=30).read())

def object_info(ntype, cache={}):
    if ntype not in cache:
        cache[ntype] = api(f"/object_info/{ntype}")[ntype]
    return cache[ntype]

SEED_CONTROLS = {"fixed", "randomize", "increment", "decrement"}

def to_api_graph(wf, overrides):
    """Convert one of OUR simple saved workflows (no subgraphs) to an API prompt."""
    nodes = {n["id"]: n for n in wf["nodes"] if n["type"] not in ("Note", "MarkdownNote")}
    # source map: (node_id, out_slot) reachable through bypassed nodes
    def resolve(nid, slot):
        n = nodes[nid]
        if n.get("mode") == 4:  # bypassed: follow the matching-type input through
            out_type = n["outputs"][slot]["type"]
            for i in n["inputs"]:
                if i["type"] == out_type and i.get("link") is not None:
                    src = links[i["link"]]
                    return resolve(src[0], src[1])
            raise RuntimeError(f"bypassed node {nid} has no passthrough for {out_type}")
        return nid, slot
    links = {l[0]: (l[1], l[2]) for l in wf["links"]}
    graph = {}
    for nid, n in nodes.items():
        if n.get("mode") == 4:
            continue
        info = object_info(n["type"])
        spec = list(info["input"].get("required", {}).items()) + list(info["input"].get("optional", {}).items())
        linked = {}
        for i in n.get("inputs", []):
            if i.get("link") is not None:
                src = links[i["link"]]
                linked[i["name"]] = [str(resolve(src[0], src[1])[0]), resolve(src[0], src[1])[1]]
        inputs = dict(linked)
        widgets = list(n.get("widgets_values") or [])
        wi = 0
        for name, decl in spec:
            if name in linked:
                continue
            type_or_enum = decl[0]
            # A widget is: an enum list, a primitive, or any COMBO flavor (incl. COMFY_DYNAMICCOMBO_V3).
            is_widget = (isinstance(type_or_enum, list)
                         or type_or_enum in ("INT", "FLOAT", "STRING", "BOOLEAN")
                         or "COMBO" in str(type_or_enum))
            if not is_widget:
                continue
            if wi >= len(widgets):
                break
            inputs[name] = widgets[wi]
            wi += 1
            # UI stores the seed's control ("randomize"/"fixed") as an extra value; the API doesn't take it
            if name in ("seed", "noise_seed") and wi < len(widgets) and widgets[wi] in SEED_CONTROLS:
                wi += 1
        for name, val in overrides.items():
            if name in inputs:
                inputs[name] = val
        graph[str(nid)] = {"class_type": n["type"], "inputs": inputs}
    return graph

def run_one(fname, overrides):
    wf = json.loads((WF_DIR / fname).read_text(encoding="utf-8"))
    graph = to_api_graph(wf, overrides)
    label = fname.split(".json")[0]
    if PLAN_ONLY:
        print(f"  PLAN  {label}: {len(graph)} api nodes, overrides={overrides or 'none'}")
        return True, 0.0
    t0 = time.time()
    r = api("/prompt", {"prompt": graph})
    if r.get("node_errors"):
        print(f"  FAIL  {label}: node_errors={r['node_errors']}")
        return False, 0.0
    pid = r["prompt_id"]
    for _ in range(240):
        time.sleep(3)
        h = api(f"/history/{pid}")
        if pid in h:
            st = h[pid]["status"]
            if st.get("completed"):
                outs = [o for out in h[pid].get("outputs", {}).values()
                        for k in ("images", "gifs", "video", "videos") for o in out.get(k, [])]
                wall = time.time() - t0
                ok = len(outs) > 0
                print(f"  {'PASS' if ok else 'FAIL'}  {label}: {st['status_str']} wall={wall:.1f}s outputs={[o.get('filename') for o in outs]}")
                return ok, wall
            if st["status_str"] == "error":
                print(f"  FAIL  {label}: {st['status_str']}")
                return False, time.time() - t0
    print(f"  FAIL  {label}: timeout")
    return False, 0.0

def main():
    try:
        stats = api("/system_stats")["system"]
    except Exception as e:
        print(f"  server not answering on {URL} -- start the launcher first ({e})")
        return 1
    print(f"  smoke against ComfyUI {stats['comfyui_version']} / torch {stats['pytorch_version']}")
    results = []
    for fname, overrides in SMOKE:
        ok, wall = run_one(fname, overrides)
        results.append((fname, ok, wall))
    if not PLAN_ONLY:
        new = not LOG.exists()
        with LOG.open("a", newline="") as f:
            w = csv.writer(f)
            if new:
                w.writerow(["date", "comfyui", "torch", "workflow", "ok", "wall_s"])
            for fname, ok, wall in results:
                w.writerow([date.today().isoformat(), stats["comfyui_version"], stats["pytorch_version"], fname, ok, f"{wall:.1f}"])
        print(f"  logged to {LOG.name}")
    return 0 if all(ok for _, ok, _ in results) else 1

if __name__ == "__main__":
    sys.exit(main())
