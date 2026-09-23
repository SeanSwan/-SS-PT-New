---
decision: "Post-slice hostile review of N1 — the Blender pipe ran for the first time and produced a real asset. Is the proof real, and what is the next slice?"
status: open
supersedes: none
privacy: IDs/roles only. "Owner" = the human product owner.
---

# SLICE PACKET — N1 (Project Aftertaste) · 2026-08-26

## 0. Your remit

Post-slice hostile review, standing roster (Ox Alpha · GLM 5.3 · HY3 · Fable as builder-adversary). Two jobs: **break it**, and **name the next slice** — one recommendation, why it beats the alternatives, what to cut.

Calibration: this project's failure class is *an instrument that did not run reports clean*. It recurred **seven** times yesterday. This slice added an eighth and then calibrated it (§3). Assume a ninth is in here.

Answer shape: `## Verdict` (APPROVE / REVISE / REJECT) · `## Blockers` (numbered, severity, exact file, concrete fix) · `## What the builder's six runs missed` · `## NEXT SLICE` · `## What I could not verify`.

---

## 1. What N1 was supposed to prove

Every seat on the branch gate said the same thing: `swan_pipe.py` was ~270 lines of never-executed `bpy`, the whole asset-factory priority rested on it, and the next slice must be *install Blender, run one real asset end-to-end, smoke first*. Success criterion: the GLB opens, and the validator returns VALID with a correctly measured budget.

## 2. What happened (branch `claude/aftertaste-p0-20260825`, commit after `283f20c9f`)

**Install.** Blender 4.5.13 LTS, portable zip from the official mirror into a user directory — no admin, no PATH change. SHA-256 computed and compared to the mirror's published `.sha256` **before** extraction: match. `blender -b --version` exit 0. **gltf-transform HELD** — nothing calls it.

**Source.** A real voxel-style OBJ: a 5-cube L-shaped "fryling" blockout, 40 vertices / 30 quads, each cube with its own vertices per face — the duplicate-vertex topology voxel exporters emit, which is what the pipe's weld + dissolve stages exist to clean.

**Smoke first** (`tools/blender/smoke.py`, 20 lines): `wm.obj_import` → `export_scene.gltf` in background, nothing else. Both calls every review had marked UNVERIFIED work on 4.5.13: 60-triangle GLB, magic bytes verified.

**Then the pipe. Six runs to clean.**

| Run | Result | Found by running |
|---|---|---|
| 1 | exit 0, 3 GLBs | **lod1 == lod2** (124 tris each). **No `collision.glb`, no `still.png`** — the pipe's own `plan()` listed both, its stub declared both, `run_in_blender()` produced neither. Three panels read this code; none caught it. |
| 2 | refused | New guard: a tier not strictly lower than the previous is refused as a fake. Correct behaviour. |
| 3 | refused | I hypothesised UV seams were pinning collapse decimation and moved UV projection after decimation. **Still 124. The hypothesis was wrong** — a mechanism asserted without proof. |
| probe | — | `tools/blender/probe-decimate.py` on the real mesh: beveled collapse floors at **124 for every ratio ≤ 0.45**; planar dissolve 20° = 242 (useless), **40° = 84**; un-beveled collapse 0.45 = **38**. |
| 4 | traceback, **exit 0** | Planar 40° gave lod2 = 103. But `export_collision` crashed on a constant that did not survive a module split — **and Blender reported exit 0 on the traceback.** |
| calib. | — | Probed: Blender exits **0 on an uncaught Python exception**, honours `sys.exit(N)`, and ships `--python-exit-code N`. Every "pipe exit=0" I had read before this was worthless for in-script failures. |
| 5 | all 5 artifacts | collision = 124 — it decimated the *beveled* mesh and hit the same floor. |
| 6 | **clean** | collision from the un-beveled macro form at 0.45 → 38. Under `--python-exit-code 1`. |

**The asset.** `assets/runtime/enemy/fryling/` is now pipe output, replacing the hand-authored calibration triangle: LOD0 **260** / LOD1 **124** / LOD2 **103** / collision **38** triangles, four distinct hashes, a 118 KB Workbench PNG still, and a manifest whose budgets were measured from the bytes by `measure-glb`, whose provenance names the source `.obj`, the Blender build hash, and a structured similarity review, and which carries `calibrationFixture: false`. **`validate-asset --all` → VALID**, and it gated its own commit through pre-commit.

**The pipe now** (`tools/blender/`): `swan_pipe.py` 260 lines · `swan_pipe_stages.py` 101 (smooth-by-angle, collision, still) · `swan_pipe_manifest.py` 67 (bpy-free: plan, stub, out-dir — keeps `--dry-run` working without Blender) · `smoke.py` 20 · `probe-decimate.py` 40. LOD strategy is a ladder with refusal: collapse → planar 40° → un-beveled macro form → refuse to emit. Every exception is caught and `sys.exit(1)`'d; the documented invocation carries `--python-exit-code 1` as non-optional.

## 3. The builder's own findings against the slice (attack these first)

- **B1 — Ratios are now probed for THIS mesh, and only this mesh.** 0.45 / planar 40° / 0.45-on-prebevel came from a 5-cube blockout. A 200-voxel character will floor somewhere else. The pipe hard-codes numbers that were empirical for n=1.
- **B2 — The "still" is a Workbench render**: flat-shaded, no lighting design, no palette law applied. It satisfies the manifest slot; it does not satisfy the art direction. It is a placeholder wearing a real file's name.
- **B3 — The bake stage does not exist.** `plan()` still lists *"bake normal + AO + roughness — micro-detail becomes texture, not geometry"*, which is the entire art-law translation (voxel = authoring dialect, baked detail = draw dialect). `run_in_blender()` never bakes. This is the same class as run 1's missing collision/still — a stage in the plan and not in the code — and I have not fixed it.
- **B4 — The asset has no textures and no rig.** `textureMB: 0`. `skeleton: skeleton.creature-small.v1` is declared and `animations: [idle, move, attack, hit, death]` are listed — but the GLB contains no armature and no clips. The validator checks clip *names against the registry*, not clip *presence in the file*. A manifest can list five animations a GLB does not contain and pass.
- **B5 — Six runs is a lot.** Two of the six were caused by my own edits (a split that dropped a constant; a wrong mechanism). The seats' "budget half a day for API repair" was right in hours and wrong in kind: the API was fine after the audit; my pipeline logic and my hypotheses were the defects.
- **B6 — The instrument lie was caught late.** I ran four pipe executions reading `exit=$?` before noticing it could not report a Python crash. The artifact check (do the files exist, do they measure) was always the honest instrument; I had it and used the exit code anyway.
- **B7 — `.vox` still unsupported.** The pipe starts at `.obj`. The authoring tool the blueprint names cannot feed it directly.

## 4. Next-slice candidates

- **N2 — Bake stage.** Implement normal/AO/roughness bake in `swan_pipe_stages.py`; the asset gets its first texture; `textureMB` stops being 0; the art law finally executes end-to-end.
- **N3 — Rig + clip presence.** Add a shared-skeleton Rigify pass, and make the validator parse the GLB for `skins` and `animations` so a declared clip must exist in the bytes (closes B4).
- **N4 — Second asset through the pipe** (the companion stage, Law A, app-facing — the DEFER-era ROI argument) to test B1's n=1 problem and the Law-A path.
- **N5 — `optimize.mjs` + gltf-transform** (KTX2/meshopt), unblocking the held install.
- **N6 — P1.5 grey-box fun probe** (48h, standalone Vite, primitives).

**Answer with ONE.** Weigh: the asset factory is the stated priority; the game is DEFERred; B3 and B4 are both "the plan says it, the code doesn't."

## 5. Questions
1. Is a pipe that ran clean once, on one 5-cube mesh, "proven"? What would make it proven?
2. B3 vs B4 — which lie is worse: a bake stage that exists only in the plan, or a manifest that lists clips the GLB does not contain?
3. What did six runs and a probe still not look for?
4. Is anything in §2 a claim I have not actually verified?
