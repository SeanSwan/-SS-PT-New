# Fable 5 — Builder's Adversarial Seat (N1)

**Reviewer:** the builder, adversarially. Every finding rests on a probe RUN this session.
**Document:** docs/ai-workflow/brainstorms/aftertaste-n1-slice-packet-2026-08-26.md

---

## VERDICT
**REVISE** — the pipe is proven on one mesh and the asset is real, but the manifest committed in N1 told a lie the validator could not see, and I found it by parsing the bytes myself, after the commit.

## BLOCKERS

1. **P1 — The N1 manifest declared a skeleton and five animation clips; the GLB contains 0 skins and 0 clips.** Probe A: parsed `lod0.glb`'s JSON chunk — `skins: 0, animations: 0, nodes: 1, images: 0`. The validator checked clip *names against the registry's skeleton list* and never looked in the file. So a rigged-asset manifest passed on an unrigged prop, and it passed *the gate that gated its own commit*. This is the exact "gate for hygiene, document for doctrine" shape the branch gate found, one layer deeper: a name check against a list is not a presence check against bytes. **Fixed this round:** the rules module now parses `lod0.glb` for `skins[]` and `animations[].name`; a declared skeleton with no skin is refused, a declared clip absent from the file is refused. Two fixtures built on real minimal GLBs (with and without a skin). The real manifest now honestly says `skeleton: null, animations: null` — the asset is an unrigged prop today. Proven: putting the five clips back yields refusals and exit 1.

2. **P2 — Ratios are empirical for n=1.** 0.45 / planar 40° / 0.45-on-prebevel were probed on a 5-cube blockout. The pipe hard-codes them. A 200-voxel character floors elsewhere. Not fixed; the honest fix is per-asset ratio override + the probe as a required pre-step for any new asset class, which is a design decision for the next slice rather than a patch.

## WHAT SIX RUNS MISSED
- The lie in blocker 1 survived six runs, a probe, a commit, and the gate — because none of them asked "does the file contain what the manifest says it contains?" They all asked "does the manifest say the right words?"
- The bake stage: still in `plan()`, still not in the code. Run 1 found the same class for collision/still; I fixed those two and did not sweep the third listed stage. Rule 20, again.

## CROSS-VALIDATION THAT HELD
- `measure-glb` vs Blender re-importing the pipe's own output: **260 = 260**. Two independent parsers agree.
- Exit-code honesty: nonexistent input → exit 1 **with** `--python-exit-code 1` **and without it** (the script's own `sys.exit(1)` carries). Blender's silent-0 on uncaught exceptions is now closed both ways.

## NEXT SLICE
**N3 — rig + clip presence.** Blocker 1 is the argument: the asset factory's stated output is *rigged* enemies with five clips, the registry's skeleton contract exists, and the validator now refuses the lie — which means **no rigged asset can pass the gate until the pipe can actually produce one.** The bake (N2) makes the asset prettier; the rig makes it *an enemy*. Cut: bake, second asset, optimize, grey-box. Keep: shared-skeleton Rigify pass in `swan_pipe_stages.py`, one clip (`idle`) exported and present in the bytes, gate VALID on a rigged GLB.

## WHAT I COULD NOT VERIFY
- Whether `export_scene.gltf` exports armatures + actions correctly in background mode on 4.5.13 — the rig path is unrun.
- Whether the probed ratios hold for any mesh other than this one.
