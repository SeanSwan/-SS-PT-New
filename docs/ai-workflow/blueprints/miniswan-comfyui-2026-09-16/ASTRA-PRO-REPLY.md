# Consult reply — GPT-6 Astra Pro (openai/gpt-6-astra-pro) — 2026-09-17T06:08:35.182Z

> tokens: prompt=27758 completion=14481 | finish_reason: stop | max_tokens: 32000

## VERDICT — PLAN REVISED

**This card has demonstrated the GSQ language-model workload, but no ComfyUI generation pipeline has yet demonstrated fit on MiniSwan; approve a tiny image-upscale trial and a tightly bounded, sequentially offloaded Wan 5B trial, not H3 or unrestricted video generation.**

**GSQ and ComfyUI must take exclusive ownership through the existing worker-resource policy: finish active work before switching, terminate the idle outgoing GPU process, verify released VRAM, and only then load the incoming workload.**

Approval covers installation, arbitration repair, and commissioning. **It does not authorize advertising `generate` before the fit and adapter gates pass.**

## D-A MODEL PORTFOLIO

### Approved portfolio and commissioning candidates

“Budget” below means an acceptance limit, **not a measured prediction**. H-* entries are explicitly unmeasured hypotheses resolved by D-F.

| Status / profile | Model, quantisation, encoder, VAE, auxiliaries | Exact initial workload | VRAM and wall-clock status | Unlocked work |
|---|---|---|---|---|
| **Retain: GSQ-64K** | Existing `Qwen3.8-27B-GSQ-RCO-IQ3_S-mtp.gguf`; existing 64K context, one slot, `q8_0` KV, all CUDA layers; no vision encoder/VAE | Existing Hermes configuration, unchanged | **Measured:** 14,152 MiB device usage at load; 46.8 tok/s through Hermes. Neither number establishes maximum runtime VRAM. | Existing language service; the only measured GPU fit in this packet |
| **Commission: PLKSR-TINY** | `4xNomosWebPhoto_RealPLKSR.pth`; preserve checkpoint dtype, record actual execution dtype; no encoder, VAE or LoRA | One synthetic RGB **128×128** image → **512×512**, batch 1, GPU execution | **H-P:** device peak ≤2,048 MiB and completion ≤60 s. These are trial hypotheses, not extrapolated measurements. | Small image upscale; **not** text/video generation |
| **Research-gated: WAN5B-TINY-OFFLOAD** | `wan2.2_ti2v_5B_fp16.safetensors`; original `umt5_xxl_fp8_e4m3fn_scaled.safetensors`, **not** a substituted Qwen encoder; `wan2.2_vae.safetensors`; no LoRA/upscaler | T2V, **512×288, 17 frames, 24 fps, 20 steps, batch 1**, seed **20260916** | **H-W:** device peak ≤14,336 MiB; completion within a **1,800 s commissioning timeout**. Actual latency and offload penalty are unknown. | Only this short-video profile, after qualification |
| **Day-one service: FFMPEG-CPU** | No neural weights; explicitly CPU decode/filter/encode | Synthetic **512×288, 24 fps, 48-frame** H.264 MP4 using `libx264` | No GPU-model residency is requested. End-to-end completion remains a commissioning gate, not supplied evidence. | `ffmpeg`; `mediasync` requires its separate round-trip test |

**The certain GPU win is the already-measured GSQ service.** There is no evidentiary basis for labeling any new ComfyUI pipeline “unquestionably fits.” Day one must preserve and revalidate that win while adding a completed CPU media job; it must not depend on Wan research succeeding.

### Mandatory Wan execution constraints

The Wan trial is approved **only** with these enforceable phases:

1. Encode with the original UMT5 encoder.
2. Retain conditioning on host memory; release the encoder’s GPU tensors and verify release.
3. Denoise with the fp16 diffusion model using verified block/sequential CPU offload. Do not retain the encoder or VAE on GPU.
4. Release diffusion GPU residency before VAE decoding.
5. Use spatially tiled VAE decoding: proposed **256-pixel output-space tiles, 64-pixel overlap**, full 17-frame temporal extent.
6. Record the actual node inputs, tile-unit conversion, sampler, scheduler, CFG and shift in the frozen API graph. Copy the latter sampling parameters from the existing Wan graph; do not guess them from this packet.

If the pinned implementation cannot implement those phase boundaries or tile settings, **H-W is blocked**, not silently replaced by an ordinary loader workflow. Capture phase-boundary memory evidence.

No numerical wall-clock penalty can honestly be derived from the H3 benchmark. D-F measures the same Wan graph on the reference GPU and reports the target/reference ratio; an additional same-hardware comparison is required to isolate the offload penalty itself.

### Not approved for initial hosting

- **H3:** reject on MiniSwan. The measured configuration peaked at **29,850 MiB**, exceeding MiniSwan’s total by **13,474 MiB**.
- **Krea2:** defer. Its compatible encoder and complete executable graph are unspecified. “12.24 GB plus encoder plus VAE” is not a fit proof.
- **SeedVR2 3B/7B NVFP4:** defer. Small checkpoint size does not prove activation fit or Ada-compatible execution of the chosen loader/kernel path.
- **Qwen3VL 4B:** do not copy as a speculative replacement for UMT5. Encoder compatibility is a model-interface requirement, not a VRAM optimization.
- **Additional Wan quantisations:** not approved without an identified artifact, hash, loader pin and separate qualification profile.

## D-B WEIGHT TRANSPORT

**Choose option 1: copy only the approved subset to local D:. No SMB publishing and no runtime dependency on the 5090.**

Use authenticated SSH/SFTP or an approved local transfer mechanism. Z: is a source-local filesystem path, not a MiniSwan mapping.

| Allocation | Budget |
|---|---:|
| PLKSR checkpoint | 0.03 GB as reported |
| Optional Wan trial: diffusion + UMT5 + VAE | 16.89 GB as reported |
| Active checkpoint allocation | **25 GiB hard budget**, pending exact byte inventory |
| Transfer/quarantine allowance | **25 GiB** |
| Outputs, temporary media and receipts | **50 GiB**, with retention/cleanup policy |
| Total reservation on D: | **100 GiB** |

The reported **602 GB free** is sufficient for that reservation. Recheck actual free bytes before copying.

Policy:

- Canonical weight root: `D:\AI-Weights\ComfyUI`.
- Manifest every file with exact bytes, SHA-256, origin and intended model loader.
- Transfer to `.partial`; hash-check, then atomically promote on the same volume.
- Same hash means reuse. Same name with different hash means quarantine and explicit resolution—never overwrite.
- No second weight copies inside the ComfyUI install, user profile or node cache.
- Copy Wan only when its commissioning slice begins.
- Do not move or alter anything on the 5090.

The packet’s GB labels are not reliable runtime-allocation units. Exact file bytes are required; even exact file bytes do **not** equal loaded GPU tensors plus activations.

## D-C VRAM ARBITRATION CONTRACT

### One policy and one authority

Extend `worker-resource-policy.mjs` and its existing `worker-admission.mjs` path. Do not introduce an independent “Comfy lock” alongside a GSQ lock.

Proposed policy state, with names adapted to the existing implementation:

```text
gpu:
  owner: none | gsq | comfy
  phase: idle | reserved | loading | serving | draining | releasing | fault
  reservationId
  fencingToken
  ownerProcessIdentity
  jobId
  lastTelemetryAt
  minimumFreeMiBAfterUnload: 15000

heavy:
  activeReservations
  limit: existing resource-mode limit
```

Use one cross-process serialized state authority. Process identity must include start time, not PID alone. A crashed coordinator must reconcile actual processes and GPU state before issuing a new token.

**Every GSQ launch/restart path and every Comfy launch must obey it.** An ungated watchdog restart defeats the architecture.

### Ownership transfer

1. Check mode, profile qualification, fresh telemetry, heavy capacity and current ownership.
2. If the other tenant has active work: refuse with `GPU_BUSY`; **do not kill that job**.
3. For an idle outgoing tenant: disable new requests, recheck in-flight count, mark draining, then stop its GPU process.
4. Verify process exit and **≥15,000 MiB free for five consecutive one-second samples**.
5. Reserve incoming ownership atomically.
6. For render work, claim the queue lease only after this reservation succeeds. If lease claim fails, release the reservation.
7. Launch/load only under the valid reservation and fencing token.
8. Hold ownership through output validation and durable receipt writing.

Warm idle residency is allowed only while retaining ownership. It never authorizes the other tenant to load concurrently.

Use process termination—not merely a model-unload API response—as the initial auditable release mechanism. Forced termination is reserved for explicit cancellation or failure recovery after the affected request has been marked failed.

### Mode interaction

- **`balanced`:** one heavy reservation total, including GSQ loading, GSQ inference, Comfy loading and Comfy execution.
- **`full`:** still one heavy reservation; requires the existing future expiry.
- **`cool`:** no new heavy work.
- **`sleep`:** reject new work.
- Mode downgrade or expiry drains active work; it does not silently kill it.
- Loading is heavy work, not a loophole before handler execution.
- GPU ownership also holds the sleep blocker. Crashes must clear stale blockers only after reconciliation.

GSQ’s measured load leaves **2,224 MiB free** by subtraction, not enough evidence to admit any proposed Comfy job concurrently.

### Refusal and GSQ preservation

Example refusal:

```json
{
  "allowed": false,
  "code": "GPU_BUSY",
  "owner": "gsq",
  "action": "Wait for the active GSQ request to finish, then retry.",
  "leaseClaimed": false
}
```

Also distinguish `MODE_DENIED`, `TELEMETRY_STALE`, `GPU_RELEASE_INCOMPLETE`, and `PROFILE_UNQUALIFIED`. A denial must never increment lease attempts or start a handler.

**Preserve Hermes’ `miniswan-gsq` endpoint on 18082.** The packet identifies the backend as 18081 but does not explain the 18082 routing layer. Inspect that topology before changing process supervision. During vision ownership, the front door must return an actionable retryable busy response or bounded wait; it must not independently restart GSQ.

## D-D INSTALL TOPOLOGY

**Match the reference candidate first, without replacing system Python 3.12.10.**

| Component | Decision |
|---|---|
| Install | `C:\ComfyUI-Mini-v0.34.2-cu130` |
| ComfyUI | v0.34.2, commit `169fcf35a2fc163fec31338b816503ddac0d3fcf` |
| Python | Side-by-side **3.13.15**, private `.venv` |
| Torch / torchvision / torchaudio | **2.13.0+cu130 / 0.28.0+cu130 / 2.11.0+cu130** |
| Kitchen / Aimdo | **0.2.31 / 0.4.15**, only if required by the selected environment |
| Custom nodes | None initially unless a qualified graph requires them; every addition needs a commit and dependency lock |
| H3 Studio node | **Do not install** for this portfolio |
| Comfy HTTP | **127.0.0.1:8189** |
| GSQ | Preserve existing 18081 backend and 18082 Hermes path |

Resolve and install the actual wheel set before blessing these pins. The reference environment snapshot is evidence of that reference install, not proof of MiniSwan compatibility. If the pinned artifacts cannot be obtained or installed coherently, stop and issue a version amendment; do not silently downgrade.

Launch under the arbiter with:

```text
--listen 127.0.0.1
--port 8189
--disable-auto-launch
--disable-api-nodes
--extra-model-paths-config C:\swan\comfy\extra_model_paths.yaml
--user-directory D:\SwanStudios-Comfy\user
--input-directory D:\SwanStudios-Comfy\input
--temp-directory D:\SwanStudios-Comfy\temp
--output-directory D:\SwanStudios-Video\output
```

```yaml
miniswan:
  base_path: D:/AI-Weights/ComfyUI
  diffusion_models: diffusion_models
  text_encoders: text_encoders
  vae: vae
  upscale_models: upscale_models
```

No silent output fallback: an unavailable output volume fails admission. Associate artifacts with job ID and hash; use qualified `mediasync` delivery to integrate the render library without making Z: a runtime dependency.

### Ada/CUDA verification

**The same cu130 label does not prove the same wheel/kernel paths work on sm_89 and sm_120.** Treat compatibility as **H-CUDA** until the following pass:

- Record driver, Python, wheel hashes, `torch.version.cuda`, device capability and `torch.cuda.get_arch_list()`.
- Run synchronized CUDA allocation and the actual dtypes/operators used by each qualified graph.
- Run graph-level loader and kernel tests, including any custom extension.
- Record execution devices; silent CPU fallback does not qualify a GPU profile.
- A missing usable kernel, unsupported dtype path or extension-build dependency blocks that profile.

Do not install `nvcc` speculatively. If a required extension needs compilation, that is an explicit dependency amendment.

Use an allowlist for custom nodes and deny unnecessary outbound access. `--disable-api-nodes` is mandatory but is not a security sandbox for arbitrary third-party node code. Remote access is SSH forwarding only.

## D-E CAPABILITY TRUTH + GATE

**Immediately disable the defective scheduled task and withdraw its stale registration.** If the queue cannot expire or retract that registration, block dispatch to this worker until repaired.

Add an explicit `none` sentinel to the launcher, mapping to an empty capability set. Omission or an empty string must not accidentally restore defaults.

| Stage | Exact task argument | Transition gate |
|---|---|---|
| Repair complete; no commissioned media class | `-Capabilities none` | Explicit empty-set handling tested |
| FFmpeg class qualified | `-Capabilities ffmpeg` | Real synthetic transcode through the worker handler, validated output and receipt |
| Media transfer qualified | `-Capabilities ffmpeg,mediasync` | Real media round-trip, hash match and durable destination |
| Wan profile qualified | `-Capabilities ffmpeg,mediasync,generate` | D-F Wan pass **and** D-H real adapter job pass **and** profile-aware routing |

Install FFmpeg with:

```powershell
winget install --id Gyan.FFmpeg --exact --source winget `
  --accept-package-agreements --accept-source-agreements
```

Record the installed version, executable hashes and absolute executable paths. Verify `ffmpeg` and `ffprobe` under the **scheduled-task account**, not merely an interactive shell.

Commissioning uses an isolated synthetic-job harness invoking the same admission, dispatch and handler code. It must not expose unqualified classes to the production queue.

### `generate` cannot mean “any generation”

Before enabling it, extend capability metadata and lease filtering with a qualified profile allowlist, initially:

```text
provider: comfyui/wan-2.2
profile: WAN5B-TINY-OFFLOAD-v1
workflowSha256: <qualified graph hash>
width: 512
height: 288
frames: 17
fps: 24
steps: 20
batch: 1
```

If the queue only understands the bare string `generate`, **leave it off** until routing is repaired. Hard rejection inside a handler is too late for the capability-honesty requirement.

Audit the adapter’s H3 default provider ID. MiniSwan must use explicit Wan configuration, including the URL `http://127.0.0.1:8189`, workflow path and verified node mappings. Never inherit the default 8188 or H3 graph.

## D-F FIT GATE PROTOCOL

### Test matrix

Use synthetic, non-PII inputs; seed **20260916** wherever applicable.

| ID | Workload | Acceptance budget |
|---|---|---|
| H-P | PLKSR 128×128 → 512×512, batch 1 | ≤2,048 MiB device peak; ≤60 s |
| H-W | Wan profile exactly as D-A | ≤14,336 MiB device peak; ≤1,800 s |
| H-CUDA | Pinned CUDA environment plus required graph kernels | Correct GPU execution, no unsupported-kernel errors or undeclared fallback |
| B-FF | CPU FFmpeg, 512×288, 24 fps, 48 frames | Fully decodable 2-second MP4; commissioning watchdog 120 s |
| B-GSQ | Existing Hermes synthetic probe, unchanged configuration | Successful authenticated path, correct configuration, recorded runtime memory and throughput |

Timeouts are operational pass limits—not promised speeds. PLKSR and Wan limits are hypotheses until measured.

### Execution and sampling

For every GPU trial:

1. Prove exclusive ownership and release-gate satisfaction.
2. Freeze workflow, environment, model hashes, inputs and sampling parameters.
3. Run **one cold-process run and two additional runs in that process**. Record OS-cache state as known/unknown; “cold process” does not imply cold disk cache.
4. Poll device-wide used/free memory with NVML at **≤100 ms** intervals.
5. Reset and collect PyTorch peak allocated/reserved statistics per phase where instrumentable.
6. Record host RAM, paging, CPU usage, device utilization and phase times.
7. Capture missing-sample intervals. An unexplained sampler gap invalidates a peak-fit receipt.
8. Finish with process release and the ≥15,000 MiB-free gate.

Device sampling can miss short spikes; allocator statistics do not capture all device allocations. Preserve both and state that limitation. A sampled peak alone is not an absolute physical maximum.

### Receipt extension

Store JSON plus media-QA sidecar in `benchmark-receipts/`:

```text
artifactId, runId, jobId, profileId, qualificationStatus
machineId, GPU, driver, OS, RAM
repoCommit, ownedPatchHash, comfyCommit, customNodePins
pythonVersion, packageLockHash, wheelHashes
modelHashes, workflowHash, inputHashes, seed
width, height, frames, fps, steps, batch
sampler, scheduler, cfg, shift
dtypeByComponent, deviceByPhase, offloadConfig, tileConfig
ownerToken, mode, telemetryAge, baselineUsedMiB
devicePeakUsedMiB, minimumFreeMiB
torchPeakAllocatedMiB, torchPeakReservedMiB, samplerGaps
hostPeakRAM, paging, phaseSeconds, queueWaitSeconds, wallSeconds
outputPath, outputBytes, outputSha256, ffprobeResult
mediaQA, errors, exitCode, releaseGateResult
```

Record the dirty working tree’s **owned patch**, not a misleading clean-commit claim. Never include keys or sensitive prompts.

### Pass/fail

All three GPU runs must:

- Complete without OOM, driver reset, unsupported kernels or undeclared fallback.
- Meet their memory and timeout budgets.
- Produce the exact requested geometry and frame count.
- Pass decode/integrity checks and human QA: no black/empty output, corruption, NaNs, severe tiling seams or obvious broken temporal output.
- Release ownership and memory correctly.

Output hashes are mandatory, but cross-run or cross-GPU bitwise equality is not assumed.

For Wan performance, run the identical graph on the 5090 **only as a separate authorized benchmark, without modifying its install**. Report the ratio as a cross-system comparison, not pure offload overhead. If that benchmark is unavailable, the penalty remains unknown.

**Failure:** keep the profile unadvertised, stop its process, retain evidence, verify release, and restore GSQ. Any change to quantisation, dimensions, frame count, nodes or offload configuration creates a new profile version requiring qualification. Do not automatically retry with undisclosed weaker settings.

## D-G SLICES

| Order | Entry evidence | Exit evidence | No-go boundary |
|---|---|---|---|
| **0. Contain D1** | Existing task and queue registration captured | Task disabled; stale capability removed; empty-set semantics tested | No production media leases yet |
| **1. Day-one useful service and arbitration** | GSQ launcher, 18081/18082 topology and policy code inspected | Shared arbiter integrated; synthetic Hermes request succeeds on the 4080; FFmpeg installed; real worker CPU transcode completes; publish only `ffmpeg` | No Comfy load while any GSQ launch path bypasses ownership |
| **2. Independent media delivery** | Qualified FFmpeg artifact | Real `mediasync` job, durable delivery and matching hash; publish `ffmpeg,mediasync` | No assumed share or permanently awake 5090 dependency |
| **3. Comfy foundation and tiny GPU upscale** | Released GPU; pinned environment resolved | Loopback-only instance, API-node guard verified, H-CUDA and H-P receipts, successful GSQ handback | Failed kernel/fit/security checks block Comfy promotion; no `generate` |
| **4. Wan feasibility** | Exact model hashes, valid node graph, enforceable phase offload and tiling | Three H-W passes and QA | Any failed fit gate keeps Wan research-only |
| **5. Provider and queue integration** | Qualified Wan profile | Real `comfyuiLocal` job; profile allowlist; denial, OOM and honesty tests pass; enable bounded `generate` | Bare broad `generate` routing is a release blocker |
| **6. Operations/rollback** | Qualified services | Sleep, crash, expiry, restart and restoration drills recorded | No unattended operation with unresolved split-brain ownership |

**Day one ends with actual completed media work and the preserved, revalidated GSQ GPU service—not a speculative video benchmark.** If Wan fails, MiniSwan remains useful; it is not relabeled a video-generation worker.

## D-H TEST IDS

| Requirement → ID | Test | Required evidence |
|---|---|---|
| D-D → **T-INSTALL-01** | Verify pins, venv isolation, CUDA capability and representative GPU kernels | Lock/hash receipt, interpreter path, device/operator results |
| D-D/security → **T-NODES-02** | Query `/object_info`; validate every frozen graph class and input; verify paid API node types absent | Saved object-info hash, graph validation, launch arguments and startup log |
| D-D/security → **T-NET-03** | Inspect listener; test LAN/tailnet denial and SSH-forward access | Loopback socket evidence and connection results |
| D-E → **T-MEDIA-04** | Run FFmpeg under task identity and perform media round-trip | Handler receipt, `ffprobe`, source/destination hashes |
| D-A/D-F → **T-FIT-05** | Execute H-P and H-W independently | Three-run receipts, memory traces and QA per profile |
| D-E/provider → **T-ADAPTER-06** | Submit synthetic Wan job through the actual `comfyuiLocal` path; exercise prompt, seed and duration mappings | Provider/profile identity, submitted graph hash, history, resolved output and media receipt |
| D-C → **T-DENY-07** | Hold active GSQ request; offer eligible render job; repeat for stale telemetry, `cool`, expired `full`, and `sleep` | Reasoned denial; **zero lease-claim API calls**, zero handlers and unchanged lease counters |
| D-C → **T-RACE-08** | Simultaneous GSQ/render acquisition; stale coordinator token; GSQ auto-restart during Comfy ownership | Exactly one owner, rejected stale token, no overlapping GPU processes |
| D-C/rollback → **T-OOM-09** | With GSQ stopped, inject controlled CUDA allocation exhaustion in a disposable Comfy-owned test process | Failed job, no successful artifact, process cleanup, release gate, successful Hermes recovery |
| D-E → **T-HONESTY-10** | Check every advertisement stage; offer H3, unknown provider, larger Wan dimensions and excess frames | Queue does not offer unsupported profiles; no lease claimed; expired qualification withdraws capability |
| GSQ preservation → **T-GSQ-11** | Serve through 18082, switch to Comfy, request GSQ while busy, switch back | Existing endpoint behavior preserved; actionable busy response; successful post-switch inference |
| Resource modes → **T-SLEEP-12** | Test loading/rendering sleep blocker, mode expiry and coordinator crash | No sleep during owned active work; no new work after expiry; reconciled recovery |

T-OOM-09 must run in a maintenance window with a watchdog. Do not exhaust the GPU while GSQ is serving, and do not use driver-crash testing as the ordinary OOM drill.

## IMPOSSIBLE HERE

- **The measured H3 configuration cannot fit:** 29,850 MiB peak versus 16,376 MiB total. Reducing image size is not a substantiated repair for this stack.
- **The approved workloads cannot share residency with the measured GSQ configuration.** Only 2,224 MiB remained at its measured load point; coexistence is prohibited.
- **Fully resident Wan is not approved.** The reported weight sum leaves no demonstrated activation/runtime budget. Decimal GB versus GiB must be resolved before claiming the file sum alone exceeds physical VRAM, but unit clarification does not establish executable fit.
- **Unbounded resolution, duration or batch size is impossible to certify from these receipts.**
- Offloaded H3 or other radically different implementations are not proven universally impossible; they are **outside this approved plan**, with no fit evidence.

## BIGGEST RISK

**Treating “CPU offload enabled” as proof that Wan’s actual graph separates component residency.**

That can waste days tuning frames and tiles while a loader retains the encoder, diffusion model or VAE on CUDA. Require phase-level residency evidence before any extended Wan benchmark.

## REJECTED

- Current `ffmpeg,mediasync,generate` advertisement: demonstrably false.
- “SeedVR2 fits” and “Krea plausibly fits” as deployment conclusions: checkpoint sizes are insufficient evidence.
- Qwen3VL as a drop-in Wan encoder: compatibility is unestablished.
- H3 installation by house-pattern imitation: irrelevant weights/nodes and a measured non-fitting reference workload.
- Mapping Z: without infrastructure changes: no share exists, and this plan may not modify the 5090.
- Concurrent GSQ/Comfy residency or independent launch locks: breaks the working language path.
- Broad `generate` without profile-aware filtering: permits unsupported leases.
- Unmeasured latency promises or scaling the 5090 H3 timing to Wan: different hardware and workload.
- Automatic fallback to another graph, output directory or quantisation: hides failed qualification.

## CONFIDENCE

| Decision | Confidence | Reason |
|---|---|---|
| D-A | **High** on exclusions and GSQ preservation; **low** on new Comfy fit | Only GSQ and reference H3 have supplied execution measurements |
| D-B | **High** | Local storage capacity and absence of sharing are verified |
| D-C | **High** on contract; **medium** on implementation | Correct exclusive ownership model; launcher/proxy integration needs inspection and race tests |
| D-D | **Medium** | Reference pins exist; Ada wheel/kernel compatibility remains unmeasured |
| D-E | **High** | Defect is verified; promotion must follow completed class-specific jobs |
| D-F | **High** on protocol; **low** on predicted outcomes | Auditable gates are specified; H-P/H-W are deliberately unresolved |
| D-G | **High** | Day-one usefulness does not depend on speculative video fit |
| D-H | **High** on coverage | Tests address fit, routing, security, denial, recovery and GSQ continuity; no results are yet claimed |
