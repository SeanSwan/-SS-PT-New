# MiniMax H3 / H3 Studio + Project Aftertaste Deep-Research Handoff

**Prepared:** 2026-08-30
**Purpose:** Give ChatGPT Pro enough exact repository, file, runtime, and evidence context to perform a deep web review and return an implementation-grade recommendation.
**Evidence posture:** This is an audit and research handoff. It is not an authorization to install, upgrade, commit, push, deploy, spend money, or modify production code.

## 1. Primary repositories — read these first

### Repository 1 — game blueprints and Aftertaste planning

- GitHub repository: https://github.com/SeanSwan/-SS-PT-New
- Relevant remote branch: `claude/aftertaste-p0-20260825`
- Blueprint commit: `b68ec1d39916317166587fe43422d97feabf88b0`
- Panel-packet commit: `7e1767c729fac20cbe71ba5ae58388007e870ead`
- Blueprint file: `docs/ai-workflow/brainstorms/aftertaste-swanverse-game-blueprint-2026-08-25.md`
- Direct blueprint link: https://github.com/SeanSwan/-SS-PT-New/blob/b68ec1d39916317166587fe43422d97feabf88b0/docs/ai-workflow/brainstorms/aftertaste-swanverse-game-blueprint-2026-08-25.md
- Review/panel packet: `docs/ai-workflow/brainstorms/aftertaste-voxel-game-panel-packet-2026-08-25.md`
- Direct packet link: https://github.com/SeanSwan/-SS-PT-New/blob/7e1767c729fac20cbe71ba5ae58388007e870ead/docs/ai-workflow/brainstorms/aftertaste-voxel-game-panel-packet-2026-08-25.md

### Repository 2 — local ComfyUI checkout used for H3

- GitHub repository: https://github.com/comfyanonymous/ComfyUI
- Local checkout: `C:\ComfyUI`
- Local HEAD observed: `b963f4a`
- Local version observed: ComfyUI `0.33.0`
- Important limitation: the local Swan workflows and API JSON files are local artifacts, not proven committed files in the upstream ComfyUI repository.
- Local launcher: `C:\Users\BigotSmasher\Desktop\Swan Local Video 5090.cmd`
- Local workflows:
  - `C:\ComfyUI\user\default\workflows\00 SWAN — H3 local (start here).json`
  - `C:\ComfyUI\user\default\workflows\01 SWAN — H3 local + first frame.json`
- Local API workflow: `C:\ComfyUI\swan-h3-t2v-api.json`

### Supporting repository — H3 Studio custom node

- GitHub repository: https://github.com/thaakeno/ComfyUI-MiniMax-H3-Studio
- Local checkout: `C:\ComfyUI\custom_nodes\ComfyUI-MiniMax-H3-Studio`
- Local commit observed: `a6a392f9c71b255dd530750ed9fc1f6455db2b80`
- Release observed: `v0.1.0-alpha.20`
- Direct release tree: https://github.com/thaakeno/ComfyUI-MiniMax-H3-Studio/tree/a6a392f9c71b255dd530750ed9fc1f6455db2b80

If ChatGPT Pro cannot access a private repository or a local checkout, the exact local files must be uploaded or pasted. A GitHub URL alone does not grant repository access.

## 2. User’s requested research question

Determine whether the current MiniMax H3/H3 Studio + ComfyUI workstation is configured for the best practical quality, speed, reproducibility, and maintainability, and determine what is actually required to build and test animated voxel characters for Project Aftertaste.

The research must distinguish:

1. Proven local installation and historical output.
2. Committed game design/architecture decisions.
3. Local but uncommitted setup artifacts.
4. Recommended future installations.
5. Claims that still require a real benchmark or visual test.

Do not infer that a planned tool has been installed merely because it appears in a blueprint.

## 3. Verified local H3 state

- RTX 5090, approximately 32 GB VRAM.
- ComfyUI at `C:\ComfyUI`, version `0.33.0`, local HEAD `b963f4a`.
- H3 Studio alpha.20 installed as a custom node.
- H3 telemetry-disable marker present: `C:\ComfyUI\custom_nodes\ComfyUI-MiniMax-H3-Studio\.h3studio-telemetry-disabled`.
- H3 core weights are present under `Z:\AI-Weights\ComfyUI`:
  - `diffusion_models/minimax_h3_fl2va_pruned_fp8_scaled.safetensors`
  - `text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors`
  - `vae/minimax_h3_video_vae_fp16.safetensors`
  - `vae/minimax_h3_audio_vae_fp32.safetensors`
  - `loras/minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors`
- Approximate H3 weight footprint: 41 GB.
- `extra_model_paths.yaml` maps these weights from the Z drive.
- The launcher binds only to `127.0.0.1:8188`, stores output/temp on `Z:\SwanStudios-Video`, and passes `--disable-api-nodes`.
- The server was not listening on port 8188 during the latest audit. This means current live health was not proven in that session.

## 4. Historical render evidence

The local ComfyUI log records MiniMax H3 text encoder, DiT, and video VAE loading, followed by multiple completed prompts. Recorded execution times include 72.80, 164.44, 200.27, 387.66, 392.76, 399.60, and 520.26 seconds.

The times are not a valid speed benchmark because resolution, frame count, warm/cold state, and profile are not normalized.

Current output evidence includes:

- `Z:\SwanStudios-Video\output\s15_896x512_00001_.mp4`: H.264 + AAC, 896×512, 362 video frames, 24 FPS, 15.08 seconds.
- `Z:\SwanStudios-Video\output\len209_av_00001_.mp4`: H.264 + AAC, 1344×768, 209 video frames, 24 FPS, 8.71 seconds.

This proves that the local H3 workflow has produced real video/audio media. It does not prove that the current server is running, that the current launcher still works, or that the setup is optimized.

## 5. H3 workflow concerns requiring research

The local workflows are inconsistent:

- The main visual workflow uses `MiniMaxH3SigmaShift` values `5 / 5`.
- The API workflow uses sigma-shift values `12 / 3`.
- The API workflow uses 1344×768 and length 61.
- H3’s native frame alignment uses a video/audio latent grid rather than treating length as seconds.

ChatGPT Pro should determine which sigma-shift and sampling profiles are correct for:

- draft concept generation;
- 4-step fast iteration;
- official LightX quality mode;
- reference-image or first-frame workflows;
- audio/video generation;
- long clips near the trained upper range.

The result should be one canonical workflow plus a small benchmark matrix, not several loosely named workflows.

## 6. Current performance concerns

The log showed:

- PyTorch `2.11.0+cu128`.
- Python `3.12.0rc3`.
- PyTorch attention active.
- Comfy Kitchen optimized CUDA backend disabled.
- Triton unavailable.
- A warning that optimized CUDA operations require newer CUDA support.

Research questions:

1. Should a side-by-side Python 3.13 / PyTorch CUDA 13 environment be built for the RTX 5090?
2. Which attention, Triton, Comfy Kitchen, SageAttention, or other kernels are genuinely compatible with the 5090 architecture?
3. Which packages should be compiled locally instead of installed from generic wheels?
4. Does the Z drive introduce model-staging or temp/cache bottlenecks compared with local NVMe?
5. What are measured cold-start, warm-start, peak-VRAM, and frames-per-minute numbers for the canonical profiles?
6. What is the correct rollback strategy if a performance upgrade degrades quality or stability?

No in-place runtime upgrade should be recommended without a side-by-side benchmark and rollback path.

## 7. What the game blueprint actually proposes

The Aftertaste blueprint proposes Route A-prime:

1. Build a 1-enemy + 1-environment asset-factory proof.
2. Run a 48-hour greybox fun probe.
3. Only then expand bespoke art and game scope.

The intended asset layers are:

- macro silhouette / low-poly or voxel-derived form;
- selective microvoxel identity detail;
- baked normal, AO, roughness, emissive, and vertex-color detail.

Every production asset should have LOD0/LOD1/LOD2, impostor or still fallback, collision, stable semantic ID, provenance, license state, and explicit performance budgets.

The proposed browser architecture is a separate Aftertaste package using React Three Fiber and Three.js, with a renderer-independent fixed-timestep simulation and seeded RNG. No such package is currently present in the repository.

## 8. Voxel/animation setup gap

The following tools were absent during the audit:

- Blender
- MagicaVoxel
- Blockbench
- Godot
- `gltf-transform`
- `toktx`

Therefore the workstation does not currently have a proven voxel-character production pipeline.

H3 should be treated as a concept/reference generator. It does not provide deterministic playable skeletons, animation clips, collision meshes, or reusable game-ready GLBs.

## 9. Recommended target pipeline

For the first proof:

`MagicaVoxel or Blockbench → Blender 4.5 LTS → rig/animate/LOD/collision → GLB → glTF optimization → validator → browser greybox`

Recommended responsibilities:

- MagicaVoxel/Blockbench: silhouette, palette, blockout.
- Blender: canonical source, cleanup, bevel/remesh decisions, UVs, baking, rigging, animation, LODs, collision, GLB export.
- `gltf-transform` plus meshopt/KTX2: deterministic runtime optimization.
- Validator: asset ID, budgets, skeleton, clips, provenance, license, hash, and forbidden-feature checks.
- H3: visual ideation, reference motion, trailer/lore material, and concept sheets.
- Optional TRELLIS.2 or another local image-to-3D system: rough base blockouts only, followed by human cleanup and rigging.

## 10. Safety, licensing, and reproducibility questions

ChatGPT Pro must investigate:

- MiniMax H3 model license and whether intended game/commercial use is permitted.
- H3 Studio dependency and model-license compatibility.
- Whether generated references or AI-generated meshes can be shipped commercially.
- TRELLIS.2 and Hunyuan3D license differences.
- Asset provenance requirements for human-authored, AI-assisted, and externally sourced assets.
- Whether prompts, reference images, or customer data could enter telemetry or third-party services.
- How to maintain a license/provenance receipt beside every asset.

The launcher’s local-only binding and disabled API-node boundary should be preserved unless there is a deliberate security review and explicit approval.

## 10A. Initial authoritative web sources

These are starting points, not a substitute for current-source verification:

- ComfyUI system requirements and current NVIDIA/PyTorch guidance: https://docs.comfy.org/installation/system_requirements
- ComfyUI native MiniMax H3 node implementation: https://github.com/Comfy-Org/ComfyUI/blob/master/comfy_extras/nodes_minimax_h3.py
- Comfy-Org MiniMax H3 model repository and license entry: https://huggingface.co/Comfy-Org/MiniMax-H3
- H3 Studio upstream documentation and release history: https://github.com/thaakeno/ComfyUI-MiniMax-H3-Studio
- Community fast-H3 workflow and 5090 attention-kernel caveats: https://github.com/ChrisJohnson89/minimax-h3-comfyui
- Microsoft TRELLIS.2 image-to-3D repository: https://github.com/microsoft/TRELLIS.2
- Blender release/support information: https://www.blender.org/releases/
- Godot 4 3D scene/glTF import guidance: https://docs.godotengine.org/en/4.0/tutorials/assets_pipeline/importing_scenes.html
- Blockbench export-format documentation: https://blockbench.net/wiki/guides/export-formats/
- Khronos meshopt glTF extension: https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_meshopt_compression/README.md

## 11. Proposed research deliverables from ChatGPT Pro

Please return:

1. A current-source comparison of MiniMax H3, H3 Studio, ComfyUI native H3 nodes, and relevant alternatives.
2. A recommended RTX 5090 software matrix with exact versions and compatibility caveats.
3. A benchmark protocol with fixed prompts, dimensions, frame counts, seeds, warm/cold runs, VRAM capture, and quality scoring.
4. A canonical ComfyUI workflow recommendation and explanation of the sigma-shift discrepancy.
5. A ranked optimization plan: no-cost, low-risk, experimental, and not-recommended changes.
6. A voxel-character pipeline recommendation comparing MagicaVoxel, Blockbench, Blender, Godot, and browser/R3F delivery.
7. A license/provenance risk table for H3, H3 Studio, TRELLIS.2, Hunyuan3D, and any proposed model.
8. A minimum viable one-enemy proof with acceptance criteria.
9. A proposed repository layout for assets, manifests, validators, Blender scripts, benchmark receipts, and generated references.
10. A clear list of claims that remain UNKNOWN until a real local render, asset export, browser test, or license review is completed.

## 12. Acceptance criteria for the next implementation phase

Do not call the setup production-ready until all of the following exist:

- one reproducible H3 workflow;
- one cold/warm benchmark receipt;
- current server startup and health proof;
- one manually authored enemy;
- one environment asset;
- one rigged animated GLB;
- one optimized GLB passing validation;
- one browser greybox loading the asset;
- measured mobile/desktop performance;
- asset provenance and license records;
- rollback instructions for ComfyUI and model/runtime upgrades.

## 13. Explicit non-goals for this handoff

- Do not install Blender, Godot, MagicaVoxel, kernels, or AI 3D models yet.
- Do not upgrade the existing ComfyUI environment in place.
- Do not assume the blueprint means implementation exists.
- Do not use H3 output as a final rigged voxel asset without a separate asset-authoring pipeline.
- Do not push to `main`, deploy, or spend on paid research without separate approval.

## 14. Local evidence locations

- ComfyUI log: `C:\ComfyUI\comfy.log`
- ComfyUI model mapping: `C:\ComfyUI\extra_model_paths.yaml`
- H3 launcher: `C:\Users\BigotSmasher\Desktop\Swan Local Video 5090.cmd`
- H3 Studio source: `C:\ComfyUI\custom_nodes\ComfyUI-MiniMax-H3-Studio`
- H3 workflows: `C:\ComfyUI\user\default\workflows`
- Model weights: `Z:\AI-Weights\ComfyUI`
- Render output/temp/database: `Z:\SwanStudios-Video`
- Game blueprint: `C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\docs\ai-workflow\brainstorms\aftertaste-swanverse-game-blueprint-2026-08-25.md`
- Game panel packet: `C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\docs\ai-workflow\brainstorms\aftertaste-voxel-game-panel-packet-2026-08-25.md`

**Final status:** H3 is installed with historical render evidence; H3 optimization is not benchmark-proven; the voxel animated-character factory remains planned and must be built as a separate deterministic asset pipeline.
