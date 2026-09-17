# MiniSwan ComfyUI — Astra Blueprint Packet

**Artifact ID:** MS-COMFY-BP-PACKET-2026-09-16
**Purpose:** request the architecture-authority pass (Mega Blueprints v3.1 role) that decides how ComfyUI is installed and bounded on MiniSwan (RTX 4080 SUPER, 16 GB).
**Owner:** Sean · **Authored by:** DSH agent session · **Status:** PLAN — awaiting adjudication
**Repo:** `SS-PT` @ `creator-brains-engine-r2-20260915` · commits `ac49119df`, `6c5b0d77d` · dirty shared tree (987 unrelated entries; nothing outside owned paths was staged)

---

## 0. Remit

Act as `gpt-6-astra`: architecture authority, adjudication and repair for the Mega Blueprints v3.1 build packet. Decide and specify. Do **not** restate this packet back. Every claim you make about fit, memory, or performance must be either (a) derived from the measured numbers below, or (b) explicitly registered as an unmeasured hypothesis with the benchmark that will settle it.

Two sentences we need from you in plain language, because they drive the whole plan:

1. Which generation pipelines can this 16 GB card actually run, at what settings, and which are impossible?
2. How is the single 16 GB GPU arbitrated between this workload and the already-installed GSQ language model?

---

## 1. Verified baseline (5090 = reference system)

**ComfyUI — primary:** `C:\ComfyUI` — git checkout, no venv of its own, `models/` holds the Wan 2.2 stack, `custom_nodes/` = `ComfyUI-MiniMax-H3-Studio` + `swan_prompt`. Root artifacts: `swan-h3-t2v-api.json`, `swan-wan22-t2v-api.json`, `objinfo.json`, `objinfo2.json`, `extra_model_paths.yaml`.

**ComfyUI — candidate (the house pattern to copy):** `C:\ComfyUI-H3-v0.34.2-cu130`

| Property | Value (from `CANDIDATE-RECEIPT.md`) |
|---|---|
| ComfyUI | v0.34.2 @ `169fcf35a2fc163fec31338b816503ddac0d3fcf` |
| H3 Studio node | @ `8e106b3400bc090cfbb4b385a3b3bda2abf3e145` (detached pin) |
| Python | 3.13.15 (own `.venv`) |
| PyTorch / TV / TA | 2.13.0+cu130 / 0.28.0+cu130 / 2.11.0+cu130 |
| Comfy Kitchen / Aimdo | 0.2.31 / 0.4.15 |
| Port | **8189**, `--listen 127.0.0.1`, `--disable-auto-launch` |
| Hard guard | **`--disable-api-nodes`** — partner/paid nodes are not even loaded, so a paid call cannot be queued by accident |
| Model paths | `--extra-model-paths-config` → `Z:/AI-Weights/ComfyUI/` (weights never duplicated) |
| State dirs | `--user-directory user-candidate --input-directory input-candidate --temp-directory temp-candidate` |
| Output | `Z:\SwanStudios-Video\output` (falls back to `output-candidate` when Z: absent — one render library, so the taste brain joins renders from one directory) |
| Rollback tree | `C:\ComfyUI` stays separate and unchanged |
| Evidence | `requirements-lock.txt` env snapshot, `benchmark-receipts/*.json` machine receipt + media-QA sidecar, `smoke-workflows.py`, `smoke-log.csv` |

**Measured benchmark (the number that governs everything):** fixed-seed H3 render, **1344×768 @ 24 fps, 124 frames, wall 168.56 s, peak VRAM 29,850 MiB** on a 32 GB RTX 5090. Output SHA-256 recorded. Promotion decision: *reference-only*.

**Weight library `Z:\AI-Weights\ComfyUI`** — Z: is a **fixed internal NTFS disk (3.73 TB, 680 GB free) on the 5090, not a network share**, and `net use` shows no mappings, `Get-SmbShare` shows no shares. Totals: diffusion_models 38.05 GB, text_encoders 19.49 GB, vae 6.12 GB, loras 1.82 GB, upscale_models 0.03 GB, frame_interpolation 0.02 GB.

| Folder | File | GB |
|---|---|---|
| diffusion_models | `minimax_h3_fl2va_pruned_fp8_scaled.safetensors` | 19.52 |
| diffusion_models | `krea2_turbo_fp8_scaled.safetensors` | 12.24 |
| diffusion_models | `seedvr2_7b_nvfp4.safetensors` | 4.43 |
| diffusion_models | `seedvr2_3b_nvfp4.safetensors` | 1.86 |
| text_encoders | `qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors` | 14.61 |
| text_encoders | `qwen3vl_4b_fp8_scaled.safetensors` | 4.88 |
| vae | `minimax_h3_video_vae_fp16.safetensors` | 4.85 |
| vae | `minimax_h3_audio_vae_fp32.safetensors` | 0.56 |
| vae | `seedvr2_ema_vae_fp16.safetensors` | 0.47 |
| vae | `qwen_image_vae.safetensors` | 0.24 |
| loras | `minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors` | 1.82 |
| upscale_models | `4xNomosWebPhoto_RealPLKSR.pth` | 0.03 |
| frame_interpolation | `rife_v4.25.safetensors` | 0.02 |

**Non-Z (local to the 5090's primary install):** `wan2.2_ti2v_5B_fp16.safetensors` 9.31 GB, `umt5_xxl_fp8_e4m3fn_scaled.safetensors` 6.27 GB, `wan2.2_vae.safetensors` 1.31 GB.

**Render-agent integration surface (`shared/providers/video/comfyuiLocal.mjs`, repo `-SS-PT-New`):**

- `PROVIDER_ID = 'comfyui/minimax-h3'`; per-provider env suffix, e.g. `comfyui/wan-2.2` → `WAN_2_2`
- `SWAN_COMFYUI_URL` — default `http://127.0.0.1:8188`
- `SWAN_COMFYUI_WORKFLOW` — path to an API-format graph export
- `SWAN_COMFYUI_NODE_PROMPT` / `_IMAGE` / `_DURATION` / `_SEED` — the node ids the adapter writes into
- `verify()` never throws; every failure states what to DO
- `buildGraph()` / `findOutputFile()` from `comfyuiGraph.mjs`; errors as `ComfyError` with codes (`E_NOT_CONFIGURED`, …)
- The agent reaches ComfyUI over HTTP; **ComfyUI ships with no authentication**, which is why the 5090 binds loopback.

## 2. Verified baseline (MiniSwan = target)

| Property | Value |
|---|---|
| GPU | RTX 4080 SUPER, **16,376 MiB**, driver 591.86, idle 226 MiB used |
| CPU / RAM | Ryzen 7 7800X3D (8c/16t) / 95.1 GB |
| Disks | C: 1.86 TB (483 GB free), D: 952 GB (602 GB free) |
| OS | Windows 11 Pro build 26100, Windows PowerShell 5.1 |
| Present | Node v24.19.0, npm 11.17.0, Python 3.12.10, git 2.55.0, VS Code, Tailscale 1.102.3, sshd |
| **Absent** | **ffmpeg**, **ComfyUI**, Docker, Ollama, llama.cpp on PATH, `nvcc`, LM Studio |
| Sleep policy | watchdog `sleep_min 20`, `cap 320`, blockers `SESSION_ACTIVE` / `SSH_ACTIVE`; S3 wake by magic packet verified; full-off wake unproven |
| Worker task | `SwanMiniSwanRenderAgent` → `start-render-agent.ps1 -WorkerMode balanced -TelemetryFresh -Capabilities ffmpeg,mediasync,generate` |

**Competing tenant already installed on the same GPU — the GSQ language model:**

- llama.cpp **b10809** (CUDA 13.3), `Qwen3.8-27B-GSQ-RCO-IQ3_S-mtp.gguf`, 11.29 GiB, 64K ctx, 1 slot, KV `q8_0`, all layers CUDA0, loopback 127.0.0.1:**18081**, `--api-key-file`
- Measured at load: **14,152 MiB used / 16,376 MiB total** (probe `mini64k-vram.json`), i.e. **~1.9 GB free**
- Started on demand by `C:\swan\hermes-profiles\gsq\MiniSwan-GSQ.ps1`; verified 46.8 tok/s generation through Hermes' path
- Admission gate already in the profile: `minimumFreeMiBAfterUnload: 15000`

**Known defect (D1):** the worker task advertises `ffmpeg,mediasync,generate` but the box has **no ffmpeg and no ComfyUI**, so the Render queue's lease filter can route it work it cannot execute. `start-render-agent.ps1`'s own default is now `ffmpeg,mediasync`; the scheduled task overrides it back to include `generate`.

**Resource-mode contract already in force** (`MINISWAN-RESOURCE-MODE-CONTRACT-2026-09-06.md`): modes `cool` (0 heavy, 0 browser) / `balanced` (1 heavy, fresh telemetry) / `full` (1 heavy, requires future expiry) / `sleep` (reject new work). Policy module `worker-resource-policy.mjs`, adapter `worker-admission.mjs` runs **before** handler dispatch; a denial must not claim a lease.

## 3. The arithmetic you must confront

| Pipeline | Weights (diffusion + encoder + VAE) | Fits 16,376 MiB? |
|---|---|---|
| MiniMax H3 (as configured on the 5090) | 19.52 + 14.61 + 4.85 = **38.98 GB** | **No** — and the measured peak was 29,850 MiB on a 32 GB card |
| Wan 2.2 TI2V **5B** fp16 (as on the 5090) | 9.31 + 6.27 + 1.31 = **16.89 GB** | **Not simultaneously** — exceeds total VRAM before any activation/KV |
| Krea2 turbo **fp8** (image) | 12.24 + encoder + VAE | **Plausibly yes** at modest resolution |
| SeedVR2 **3B** nvfp4 (upscale) | 1.86 + 0.47 | Yes |
| Qwen3VL **4B** fp8 (small encoder) | 4.88 | Yes |
| GSQ 27B IQ3_S (already installed) | 11.29 @ 64K KV | Yes — measured 14,152 MiB, **~1.9 GB headroom** |

**Do not hand-wave the Wan case.** "16.89 GB of weights into a 16.376 GB card" is not a rounding problem; it is a decision about quantisation, sequential/CPU offload, tiled VAE, resolution, frame count, and text-encoder tier — each of which costs speed. If you believe the 5B pipeline is reachable, say at which quant, which encoder, which resolution/frame budget, and what wall-clock penalty, and register the numbers as hypotheses with the benchmark that settles them. If it is not reachable, say so and stop.

## 4. Decisions we need from you

**D-A Model portfolio.** The exact list of what MiniSwan should host: for each entry — model, quantisation, encoder tier, VAE, LoRA/upscaler, peak-VRAM hypothesis, expected wall-clock class, and the job classes it unlocks. Include at least one *certain* win (something that unquestionably fits) so the box is useful on day one, not only after a research project.

**D-B Weight transport.** Z: cannot be mapped (internal disk, no SMB share). Options: (1) download/copy only the fit-list subset to MiniSwan's D: (602 GB free); (2) publish Z: as a read-only SMB share from the 5090 and consume it from MiniSwan — cost: MiniSwan jobs then depend on the 5090 being awake; (3) hybrid. Decide, and give the disk budget and the collision/duplication policy.

**D-C VRAM arbitration.** GSQ (language) and ComfyUI (vision) cannot both hold the card. Specify the ownership contract: who may hold the GPU, how the other is evicted, what happens to an in-flight job, how the render agent's `balanced` mode interacts with a model load, and how the admission gate reports a refusal without claiming a lease. Extend the existing `worker-resource-policy.mjs` shape rather than inventing a second policy.

**D-D Install topology.** Version pins (match the 5090 candidate's v0.34.2 / PyTorch 2.13.0+cu130 / Python 3.13.15, or justify diverging given MiniSwan has Python 3.12.10), venv location, ports, directory layout, `extra_model_paths.yaml`, and **replicate `--disable-api-nodes`**. Note the 4080 is Ada (sm_89) while the 5090 is Blackwell (sm_120) — state whether the same cu130 wheel set is correct for both and how that is verified rather than assumed.

**D-E Capability truth (D1).** Decide what the Render queue should be told this worker can do — and when. The rule to respect: a capability must not be advertised until a real job of that class has completed on this hardware. Specify the ffmpeg install (the 5090 uses winget `Gyan.FFmpeg`), the exact `-Capabilities` value the scheduled task should carry at each stage, and the transition gate.

**D-F Measured fit gate.** Define the benchmark protocol that converts every hypothesis above into evidence: fixed seed, exact resolution/frame/step budget, the VRAM sampler, the receipt schema (extend the 5090's `benchmark-receipts` pattern), the pass thresholds, and the fail action. Peak VRAM, wall clock, output hash, and a media-QA judgement must all be recorded.

**D-G Slice plan.** Ordered slices with entry evidence, exit evidence, and a no-go boundary. Day-one slice must end with something demonstrably working end-to-end on the 4080, not with a research result.

**D-H Test plan.** Requirement-linked test IDs: install verification, `/object_info` node registration, a real generation through the render agent's `comfyuiLocal` adapter, an admission-denial test proving no lease is claimed, a VRAM-exhaustion/rollback drill, and the capability-honesty test (the queue must not offer a job class this box cannot run).

## 5. Constraints that are not negotiable

- **No paid API nodes.** `--disable-api-nodes` stays; partner nodes bill MiniMax credits per run.
- **Loopback only.** ComfyUI has no auth; it binds `127.0.0.1`. Remote access only via SSH forward, never a LAN/tailnet bind.
- **Zero PII to models; no keys in packets or logs.**
- **The 5090 stays the reference and the rollback tree** — MiniSwan gets its own install; nothing on the 5090 is modified by this plan.
- **Do not break the GSQ path.** Hermes depends on `miniswan-gsq` on 18082; a ComfyUI install that steals the GPU without arbitration breaks a working system.
- **Honesty over optimism.** "Not runnable here" is an acceptable and useful answer. An unmeasured "should fit" is not.

## 6. Required output contract (fixed, so the reply is diffable)

```
VERDICT            one of: PLAN APPROVED / PLAN REVISED / BLOCKED
D-A MODEL PORTFOLIO
D-B WEIGHT TRANSPORT
D-C VRAM ARBITRATION CONTRACT
D-D INSTALL TOPOLOGY
D-E CAPABILITY TRUTH + GATE
D-F FIT GATE PROTOCOL
D-G SLICES (ordered, entry/exit evidence, no-go)
D-H TEST IDS (requirement -> test -> evidence)
IMPOSSIBLE HERE    what this card cannot do, stated plainly
BIGGEST RISK       the one thing most likely to waste days
REJECTED           anything in this packet you are rejecting, and why
CONFIDENCE         high/medium/low per decision, with the reason
```
