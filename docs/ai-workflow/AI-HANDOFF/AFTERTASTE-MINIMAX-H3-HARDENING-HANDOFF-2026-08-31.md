1. Aftertaste / SwanStudios monorepo: <https://github.com/SeanSwan/-SS-PT-New>
2. MiniMax H3 Studio: <https://github.com/thaakeno/ComfyUI-MiniMax-H3-Studio>

# Aftertaste voxel pipeline + MiniMax H3 hardening handoff

Date: 2026-08-31 UTC

Owner: Sean Swan

Implementation branch: `codex/aftertaste-hardening-20260830`

Status: implemented and locally verified; not merged into `main`

License status: owner-resolved; not an engineering blocker

Supporting upstream: [ComfyUI](https://github.com/Comfy-Org/ComfyUI).

## Plain-English summary

The setup is materially stronger than the one reviewed. The old ComfyUI/H3 installation was preserved as a rollback, while a fully separate ComfyUI 0.34.2, Python 3.13, CUDA 13 candidate was installed and proven on the RTX 5090. It loaded 41 H3/MiniMax nodes, passed both H3 Studio test suites, and completed a real fixed-seed 124-frame voxel-character video benchmark.

The game-asset side now fails closed in places that previously allowed misleading green results. Validated or shipped rigged assets cannot omit required clips; validator positive fixtures must have zero errors; every GLB is checked by the Khronos validator and glTF Transform; and Blender cannot pass on a stale sentinel, a missing `--out`, an unbounded hang, or an unrelated prior run receipt.

This is still a hardened prototype factory, not a production-ready game slice. Fryling lacks four required authored clips, baking/compression/browser deformation remain unproven, and the H3 output is suitable only for concept and motion reference.

## Repository and branch truth

| Item | Exact state |
| --- | --- |
| Isolated worktree | `C:\tmp\sspt-aftertaste-hardening-20260830` |
| Feature branch | `codex/aftertaste-hardening-20260830` |
| Base branch | `origin/claude/aftertaste-p0-20260825` |
| Starting commit | `dbac41a837b5cfd146a9e11362dacc6e076b9fb8` |
| `origin/main` observed | `2269cd4d439b0a306940539420b1894a0cb8ab19` |
| Start-of-audit drift | 31 main-only commits / 28 Aftertaste-only commits |
| Shared dirty checkout | Preserved; no unrelated user files staged or edited |
| Existing rollback tree | Preserved at `C:\ComfyUI` |

Do not merge this branch blindly. Synchronize it against current `origin/main` in a fresh integration worktree and rerun the asset gate before a pull request is approved.

## What was hardened in the monorepo

### Asset truth and CI

- Positive validator fixtures now use globally valid GLBs and require zero errors.
- Missing required clips are warnings only for `planned` or `in-progress`; they are errors for `validated` and `shipped`.
- CLI exit contracts distinguish invalid content (`1`) from a broken instrument or unreadable input (`2`).
- All 16 runtime GLBs pass the pinned Khronos validator with zero specification errors.
- All 16 runtime GLBs also pass glTF Transform 4.4.2 inspection.
- A path-scoped GitHub Actions gate runs manifest, GLB, JavaScript, Python, and dependency checks.
- CODEOWNERS now covers asset definitions, runtime files, validators, Blender tooling, and the workflow.
- The asset-tool package is exact-pinned. A `sharp` override to 0.35.4 removes the high-severity advisory present in the transitive older version; current audit reports zero vulnerabilities.

### Blender execution integrity

- Blender 4.5 LTS discovery compares patch versions numerically, so 4.5.13 beats 4.5.9.
- `--out <dir>` is enforced because success cannot be proven without an output receipt.
- A preexisting `.swan-pipe.ok` is removed before launch.
- Each run receives a random UUID through `SWAN_PIPE_RUN_ID`.
- Python writes a JSON receipt with the same run ID and an aware UTC completion timestamp.
- The wrapper rejects missing, legacy, malformed, or mismatched receipts.
- Default timeout is 30 minutes; accepted overrides are bounded from 60 seconds to 6 hours.
- Timeout and Blender nonzero exits fail the wrapper.

## GitHub-visible file map

These links resolve after the feature branch is published. They intentionally target the feature branch, not `main`.

| File | Purpose |
| --- | --- |
| [Decision ledger](https://github.com/SeanSwan/-SS-PT-New/blob/codex/aftertaste-hardening-20260830/docs/ai-workflow/AI-HANDOFF/AFTERTASTE-H3-ORACLE-IMPLEMENTATION-CLASSIFICATION-2026-08-31.md) | ADOPT / REJECT / DEFER / NEEDS PROBE classification |
| [GitHub Actions gate](https://github.com/SeanSwan/-SS-PT-New/blob/codex/aftertaste-hardening-20260830/.github/workflows/aftertaste-asset-gate.yml) | Dedicated asset CI |
| [Asset rule changes](https://github.com/SeanSwan/-SS-PT-New/blob/codex/aftertaste-hardening-20260830/scripts/assets/validate-asset.rules.mjs) | Lifecycle-aware required clips |
| [Asset validator tests](https://github.com/SeanSwan/-SS-PT-New/blob/codex/aftertaste-hardening-20260830/scripts/assets/validate-asset.selftest.mjs) | Real positive GLBs and zero-error contract |
| [Validator CLI tests](https://github.com/SeanSwan/-SS-PT-New/blob/codex/aftertaste-hardening-20260830/scripts/assets/validate-asset.cli.selftest.mjs) | Exit-code and false-green contracts |
| [Blender wrapper](https://github.com/SeanSwan/-SS-PT-New/blob/codex/aftertaste-hardening-20260830/scripts/assets/run-blender.mjs) | Bounded fail-closed execution |
| [Blender pure rules](https://github.com/SeanSwan/-SS-PT-New/blob/codex/aftertaste-hardening-20260830/scripts/assets/run-blender.rules.mjs) | Version, timeout, output, and receipt rules |
| [Blender tests](https://github.com/SeanSwan/-SS-PT-New/blob/codex/aftertaste-hardening-20260830/scripts/assets/run-blender.selftest.mjs) | Ten runner contracts |
| [Blender receipt writer](https://github.com/SeanSwan/-SS-PT-New/blob/codex/aftertaste-hardening-20260830/tools/blender/swan_pipe_manifest.py) | Run-bound success receipt |
| [Khronos wrapper](https://github.com/SeanSwan/-SS-PT-New/blob/codex/aftertaste-hardening-20260830/tools/asset-pipeline/validate-gltf.mjs) | Specification validation and exit semantics |
| [Pinned tool package](https://github.com/SeanSwan/-SS-PT-New/blob/codex/aftertaste-hardening-20260830/tools/asset-pipeline/package.json) | glTF Transform and Khronos validator pins |
| [Benchmark workflow](https://github.com/SeanSwan/-SS-PT-New/blob/codex/aftertaste-hardening-20260830/docs/ai-workflow/AI-HANDOFF/evidence/aftertaste-h3/h3-lightx-v1-fp8-124f-api.json) | Exact fixed-seed ComfyUI API workflow |
| [Benchmark receipt](https://github.com/SeanSwan/-SS-PT-New/blob/codex/aftertaste-hardening-20260830/docs/ai-workflow/AI-HANDOFF/evidence/aftertaste-h3/h3-lightx-v1-fp8-124f-receipt.md) | Performance, hashes, and frame-level QA |

## Workstation tooling receipt

| Tool | Verified state |
| --- | --- |
| Blender | 4.5.13 LTS at `C:\Users\BigotSmasher\AppData\Local\Programs\blender-4.5.13-windows-x64\blender.exe` |
| Blockbench | Official 5.1.6 portable; SHA-256 `6DFC65FD8360974A52383CE801CB31E253E655B39CCBB2E8F560DB4BF99AE93B` |
| KTX-Software | Official 4.4.2, valid Khronos signature; `toktx v4.4.2` |
| glTF Transform | 4.4.2, repo-local exact pin |
| glTF Validator | 2.0.0-dev.3.10, repo-local exact pin |
| Desktop launcher | `C:\Users\BigotSmasher\Desktop\Swan Local Video 5090.cmd` now starts the candidate on 8189; byte-identical rollback copy is `Swan Local Video 5090.rollback-20260831.cmd` |

Blockbench is an optional voxel/blockout authoring tool. Blender remains canonical after rigging. KTX is installed for a later measured texture-compression slice; no manifest falsely claims compression today.

## ComfyUI / H3 rollback and candidate

| Layer | Rollback | Candidate |
| --- | --- | --- |
| Root | `C:\ComfyUI` | `C:\ComfyUI-H3-v0.34.2-cu130` |
| ComfyUI | 0.33.0, `b963f4ad...` | 0.34.2, `169fcf35...` |
| H3 Studio | alpha.20, `a6a392f9...` | detached `8e106b340...` |
| Python | 3.12.0rc3 | 3.13.15 |
| PyTorch | 2.11.0+cu128 | 2.13.0+cu130 |
| CUDA helper | Comfy Kitchen backend disabled in observed log | Comfy Kitchen 0.2.31 enabled |
| Port | 8188 | 8189 |
| Mutable state | Existing user/output/temp | Separate candidate user/input/output/temp |
| Weights | Shared read path | Same shared read path; no model move or overwrite |

The candidate also has a 114-entry `requirements-lock.txt`, a candidate-only launcher, a benchmark launcher, and a human-readable receipt. H3 Studio's upstream editable setuptools install still fails package auto-discovery because its repository exposes multiple top-level packages; direct pinned custom-node loading works and does not depend on that editable install path.

Double-click behavior is now verified: the desktop CMD checks the candidate prerequisites and shared-weight drive, starts `Start-H3-Candidate.ps1` in a minimized PowerShell window, waits for a real `/system_stats` response on 8189, and opens the browser only after the API answers.

Current setup choices follow the official [ComfyUI 0.34.2 release](https://github.com/Comfy-Org/ComfyUI/releases/tag/v0.34.2) and [ComfyUI system requirements](https://docs.comfy.org/installation/system_requirements), which recommend Python 3.13 and stable CUDA 13 PyTorch for current NVIDIA installations.

## Real H3 benchmark

| Field | Result |
| --- | --- |
| Profile | FP8 diffusion + LightX v1 LoRA |
| Seed | `20260831` |
| Resolution | 1344 x 768 |
| Frames / rate | 124 / 24 fps |
| Wall time | 168.56 seconds |
| Comfy execution | 165.90 seconds |
| Peak VRAM | 29,850 MiB |
| Output SHA-256 | `8EEFBB45EDA6FB1E7533658403DF9B3C076466847B5E256A5B74EA524550D83F` |
| Decision | Reference-only |

The generated Fryling-like character remained coherent through movement, expression, impact, and defeat poses. The clip also contains generated lettering, a persistent corner glyph, and prop drift. It is useful for concept and motion ideation, not source geometry or final animation.

## Verification evidence

| Gate | Fresh result |
| --- | --- |
| GLB measurement tests | 10/10 |
| Asset validator tests | 36/36 |
| Asset CLI contracts | 4/4 |
| Blender runner contracts | 10/10 |
| Blender receipt contracts | 2/2 |
| Khronos wrapper contracts | 3/3 |
| Registered manifests | 4/4 valid; planned clip warnings preserved |
| Runtime GLBs | 16/16 zero Khronos errors; 16/16 glTF Transform inspected |
| Roster grammar | 53/53 |
| H3 Studio Python | 347/347 |
| H3 Studio frontend | 168/168 |
| Dependency audit | 0 vulnerabilities |
| Workflow YAML / diff hygiene | parsed; clean |

Three LOD0 files have Khronos warnings but zero errors: Fryling, Grease Fly, and Patty Larva. Those warnings remain visible and are not promoted to false-clean silence.

## Remaining work, in order

1. Synchronize the feature branch with current `origin/main` in a clean integration worktree; resolve the 31/28 divergence deliberately.
2. Complete Fryling's `move`, `attack`, `hit`, and `death` clips on the canonical shared rig.
3. Implement and measure baking plus KTX/BasisU compression; update manifests only from measured artifacts.
4. Build the isolated deterministic browser lab and prove deformation, animation transitions, LOD transitions, collision, and still fallback.
5. Record desktop/mobile frame time, physics time, draw calls, triangles, and texture memory.
6. Run a fair same-workflow rollback/candidate comparison, then test INT8 ConvRot against FP8 for quality, time, and peak VRAM.
7. Only after a winning 124-frame profile, run the 362-frame long test.
8. Repair H3 Studio's editable-package metadata upstream or carry an explicit local patch; do not silently float to `main`.

## Rollback instructions

- Do not overwrite or upgrade `C:\ComfyUI` in place.
- Stop candidate port 8189 before starting rollback port 8188.
- Start the existing rollback launcher against `C:\ComfyUI` if candidate behavior regresses.
- Candidate state can be removed independently because its environment, nodes, databases, outputs, inputs, and temp directories are isolated.
- Shared weights are read-only dependencies for both environments; neither candidate setup moved or replaced them.

## Review prompt for ChatGPT Pro

Review the two repositories and the feature-branch files linked above. Treat every success claim as unproven until it is supported by the exact code, test, receipt, or artifact hash. Focus on: false-green paths in CI and subprocess handling; glTF/GLB validation gaps; deterministic asset provenance; Blender atomicity and timeout behavior; ComfyUI/H3 version compatibility; benchmark methodology; whether the visual QA supports only reference use; and the safest branch-synchronization plan. Licensing is owner-resolved and is not part of this review. Return findings by severity, exact file/line, reproduction, consequence, and narrow fix. Distinguish `confirmed`, `inferred`, `unknown`, and `deferred` evidence.

## Truth boundary

Confirmed: side-by-side candidate boot, CUDA activation, node registration, test counts, FP8 benchmark, artifact hashes, current asset gates, and installed creator-tool versions.

Not yet confirmed: INT8 superiority, 362-frame stability, Blender hash determinism after a new clean build, complete Fryling animation, texture-compression quality, or browser/gameplay performance.

Therefore the correct label is: **hardened and benchmark-proven prototype pipeline; not yet a production-ready game asset pipeline or game slice**.
