# Aftertaste + MiniMax H3 Oracle Implementation Classification

Date: 2026-08-31 UTC

Owner: Sean Swan

Execution lane: `codex/aftertaste-hardening-20260830`

Status: implemented and locally verified; no production merge or push

## Repositories first

1. Aftertaste/SwanStudios monorepo: <https://github.com/SeanSwan/-SS-PT-New>
   - Hardening base: `origin/claude/aftertaste-p0-20260825`
   - Starting commit: `dbac41a837b5cfd146a9e11362dacc6e076b9fb8`
   - Main observed during audit: `2269cd4d439b0a306940539420b1894a0cb8ab19`
   - Drift at start: 31 main-only commits, 28 Aftertaste-only commits
2. MiniMax H3 Studio: <https://github.com/thaakeno/ComfyUI-MiniMax-H3-Studio>
   - Frozen rollback commit: `a6a392f9c71b255dd530750ed9fc1f6455db2b80`
   - Frozen rollback tag: `v0.1.0-alpha.20`

Supporting upstream: <https://github.com/Comfy-Org/ComfyUI> (the local rollback remote still uses its former `comfyanonymous/ComfyUI` URL).

## Decision rule

Every independent-review claim is classified as `ADOPT`, `ADOPT-MODIFIED`, `REJECT`, `DEFER`, or `NEEDS PROBE`. “Adopted” does not mean “already completed”; the implementation status column is authoritative.

## Decision ledger

| Review claim | Decision | Implementation status | Evidence or reason |
| --- | --- | --- | --- |
| Treat licensing as a blocker | REJECT AS BLOCKER | Owner-resolved | Sean explicitly confirmed authorization is handled and approved. Do not reopen it as a work blocker. |
| Freeze current ComfyUI/H3 as rollback | ADOPT | Captured; preserve in place | `C:\ComfyUI` remains untouched at `b963f4ad...`, ComfyUI 0.33.0. H3 Studio remains detached at alpha.20. |
| Build ComfyUI 0.34.0 candidate | ADOPT-MODIFIED | Complete side-by-side | Upstream advanced to stable 0.34.2 (`169fcf35...`) after the review. Candidate is pinned to 0.34.2, not floating main. |
| Python 3.13 + CUDA 13 candidate | ADOPT | Complete side-by-side | Candidate reports Python 3.13.15, Torch 2.13.0+cu130, RTX 5090 CUDA, and enabled Comfy Kitchen CUDA. Rollback remains Python 3.12.0rc3 / Torch 2.11.0+cu128. |
| Preserve FP8 as rollback; benchmark INT8 ConvRot | ADOPT | FP8 benchmark complete; INT8 pending | The rollback model set was not altered. Fixed-seed FP8/LightX candidate benchmark completed; model promotion still requires the INT8 comparison. |
| Make validator positive tests require zero errors | ADOPT | Complete locally | Positive fixtures are globally valid; 36/36 tests pass. |
| Required clips must block validated/shipped assets | ADOPT | Complete locally | Missing clips remain warnings for `planned`; they are errors at `validated` and `shipped`. |
| Add dedicated Aftertaste CI | ADOPT | Complete locally | New workflow runs custom gates, Khronos validation, Python checks, and dependency audit. |
| Expand CODEOWNERS beyond registry | ADOPT | Complete locally | Entire `assets`, asset scripts, Blender tools, asset-pipeline tools, and workflow are protected. |
| Add official Khronos glTF validation | ADOPT | Complete locally | Pinned `gltf-validator@2.0.0-dev.3.10`; all 16 runtime GLBs have zero specification errors. |
| Add glTF Transform 4.4.2 | ADOPT | Complete locally | Exact CLI pin installed in the isolated repo tool package and reports 4.4.2. |
| Add KTX-Software 4.4.2 | ADOPT | Complete on workstation | Authenticode-valid Khronos installer, expected SHA-256, `toktx v4.4.2` verified. |
| Add Blockbench 5.1.6 | ADOPT | Complete on workstation | Official portable binary installed user-locally; version and published SHA-256 verified. |
| Keep Blender 4.5.13 LTS as production pin | ADOPT | Verified | Local binary reports Blender 4.5.13 LTS. |
| Test Blender 5.2.1 in a compatibility lane | ADOPT | Pending | It must not replace the production pin without clean rebuild and browser tests. |
| Fix lexicographic Blender selection | ADOPT | Complete locally | Numeric selector test proves 4.5.13 beats 4.5.9. |
| Reject stale `.swan-pipe.ok` markers | ADOPT | Complete locally | Wrapper requires `--out`, deletes the old marker, injects a UUID, and requires a matching JSON receipt. Ten runner tests pass in total. |
| Add Blender timeout | ADOPT | Complete locally | Default is 30 minutes; accepted overrides are bounded from 60 seconds to 6 hours and timeout exits nonzero. |
| Declarative clips, shared LOD rig, baking | ADOPT | Pending | Required before Fryling can be promoted beyond `planned`. |
| Finish Fryling before roster expansion | ADOPT | Pending | Fryling still has only `idle`; all required clips, materials, texture/compression proof, fallback, and browser deformation remain gates. |
| Build one modular environment proof | ADOPT | Pending | Must follow the complete Fryling proof and precede further roster expansion. |
| Add deterministic browser lab | ADOPT | Pending | Keep separate from the production dashboard; fixed-step R3F/Rapier proof is the target. |
| Upgrade the whole SwanStudios dashboard to prove the game | REJECT | Not planned | Unnecessary scope and risk. |
| Make Blockbench the final canonical source | REJECT | Not planned | Blockbench is optional voxel/blockout authoring; Blender remains canonical after rigging. |
| Treat H3 output as deterministic game geometry | REJECT | Not planned | H3 is reference/motion ideation; game-ready geometry, skeletons, collision, and clips remain deterministic pipeline outputs. |
| Track ComfyUI master or H3 Studio main automatically | REJECT | Not planned | All candidate components require exact commit/version pins. |
| Make WebGPU the production baseline | REJECT | Not planned | WebGL remains baseline; WebGPU can be an experimental flag. |
| Migrate to Godot now | DEFER | Not planned | No evidence justifies an engine migration before the browser proof exists. |
| Manifest v2 with measured-vs-declared and hash-bound reviews | ADOPT | Pending | Implement after the current validator/CI slice and branch synchronization plan are stable. |

## Rollback receipt

| Component | Frozen state | Verification |
| --- | --- | --- |
| ComfyUI | `C:\ComfyUI`, commit `b963f4ad210a42841ab23dfc28a84143a0cce227`, version 0.33.0 | Git and `comfy.log` |
| H3 Studio | `C:\ComfyUI\custom_nodes\ComfyUI-MiniMax-H3-Studio`, commit `a6a392f...`, tag alpha.20 | Git |
| Python/Torch | Python 3.12.0rc3, Torch 2.11.0+cu128 | `comfy.log` |
| GPU | RTX 5090, 32,607 MiB, driver 610.62 | `nvidia-smi` |
| Models | Shared through `Z:\AI-Weights\ComfyUI` | `extra_model_paths.yaml` and startup log |
| Output/temp | `Z:\SwanStudios-Video\output` and `Z:\SwanStudios-Video\temp\temp` | startup log |
| Current service | No listener on TCP 8188 during audit | `Get-NetTCPConnection` |

Rollback means start the existing launcher against `C:\ComfyUI`; the candidate must never overwrite this tree, its custom nodes, user database, output, temp, or Python environment.

## Candidate acceptance contract

Candidate root: `C:\ComfyUI-H3-v0.34.2-cu130`

1. Exact ComfyUI tag `v0.34.2`, commit `169fcf35a2fc163fec31338b816503ddac0d3fcf`.
2. Separate Python 3.13 virtual environment and lock receipt.
3. Stable PyTorch CUDA 13 wheels; CUDA backend must be available on RTX 5090.
4. Separate custom nodes, user database, output, temp, and cache.
5. Shared model directories may be read through explicit `extra_model_paths.yaml`; no model move or overwrite.
6. Exact H3 Studio candidate commit; no floating branch update.
7. Startup smoke must report the exact versions, load native H3 nodes, and bind a candidate-only port.
8. Benchmark profiles use fixed seeds and record total time, sampling time, peak VRAM, output hash, and human quality decision.
9. Baseline profile: 124 frames. Winning-profile long test: 362 frames.
10. No promotion until rollback and candidate are both reproducibly startable.

## Candidate benchmark evidence

- Workflow: `benchmark-workflows\h3-lightx-v1-fp8-124f-api.json`
- Fixed seed: `20260831`
- Profile: FP8 diffusion model + LightX v1 LoRA, 8 steps, video shift 6, audio shift 3
- Output: 124 decoded VP9 frames, 1344 x 768, 24 fps, 5.167 seconds
- Wall time: 168.56 seconds by benchmark receipt; 165.90 seconds in ComfyUI execution log
- Peak VRAM: 29,850 MiB on the RTX 5090
- Workflow SHA-256: `BA19BFC912E264BF316351F6A86AA1B06C676174F1C1329C2153E517205A277E`
- Output SHA-256: `8EEFBB45EDA6FB1E7533658403DF9B3C076466847B5E256A5B74EA524550D83F`
- Quality decision: strong, coherent voxel-mascot identity and usable action/pose ideation; reference-only because the clip contains unwanted generated lettering, a persistent corner glyph, and some prop drift. It is not canonical game geometry or animation.

## Open probes

- Current rollback launcher boot and workflow JSON replay.
- Candidate H3 Studio editable-package metadata repair; direct custom-node loading and its 347 Python plus 168 frontend tests are already proven.
- INT8 ConvRot versus FP8 quality, wall time, and peak VRAM.
- Comfy Kitchen CUDA activation versus eager fallback.
- Explicit SageAttention profile versus native attention; no global monkeypatch.
- Z: model-read throughput and cold/warm load timing.
- Clean Blender build determinism and hash stability.
- Fryling deformation, clip transitions, LOD transitions, and fallback in browser.
- Desktop/mobile browser frame time, physics time, draw calls, triangles, and texture memory.

## Verified references

- ComfyUI 0.34.2 release: <https://github.com/Comfy-Org/ComfyUI/releases/tag/v0.34.2>
- ComfyUI system requirements: <https://docs.comfy.org/installation/system_requirements>
- Blender releases: <https://www.blender.org/download/lts/>
- Blockbench releases: <https://github.com/JannisX11/blockbench/releases/tag/v5.1.6>
- glTF Transform 4.4.2: <https://www.npmjs.com/package/@gltf-transform/cli/v/4.4.2>
- Khronos KTX 4.4.2: <https://github.com/KhronosGroup/KTX-Software/releases/tag/v4.4.2>
- Khronos glTF Validator: <https://github.com/KhronosGroup/glTF-Validator>

## Truth boundary

The current state is a hardened prototype asset factory and a one-profile benchmark-proven H3 candidate. It is not yet a comparison-optimized H3 workstation, a production-ready game asset pipeline, or a proven browser game slice. Those stronger labels remain blocked by the open probes and asset-completion gates above.
