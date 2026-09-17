# MiniSwan ComfyUI Blueprint — canonical index

**Artifact ID:** MS-COMFY-BP-2026-09-16 · **Version:** 1.0 · **Effective:** 2026-09-16
**Supersedes:** none (no prior canonical plan existed for ComfyUI on MiniSwan)
**Owner:** Sean · **Adjudicated by:** `openai/gpt-6-astra-pro` (Mega Blueprints v3.1 architecture authority)
**Status:** **PLAN REVISED — NOT IMPLEMENTED. Nothing has been installed.**
**Repo:** `SS-PT` @ `creator-brains-engine-r2-20260915`

---

## 1. Artifacts in this packet

| Artifact | File | Role |
|---|---|---|
| Consult packet | `PACKET.md` | verified baseline, the 16 GB arithmetic, decisions D-A…D-H requested |
| Adjudication | `ASTRA-PRO-REPLY.md` | Astra Pro's verdict, revised decisions, test IDs, slices (394 lines) |
| This index | `README.md` | canonical entry point, decision summary, readiness receipt |

## 2. What Astra Pro decided

**VERDICT: PLAN REVISED.** Approval covers *installation, arbitration repair, and commissioning only* — it explicitly does **not** authorize advertising `generate` before the fit and adapter gates pass.

**The headline, stated plainly:** MiniSwan cannot run the 5090's video pipelines. H3 is **rejected** — the reference configuration measured **29,850 MiB peak against a 16,376 MiB card**. There is no demonstrated ComfyUI fit on this hardware yet, and the only *measured* GPU fit remains the GSQ language model already installed.

| Decision | Ruling |
|---|---|
| **D-A portfolio** | **Retain GSQ-64K** (the only measured fit). **Commission** PLKSR tiny upscale (128→512, budget ≤2,048 MiB / ≤60 s). **Research-gate** Wan 5B as `WAN5B-TINY-OFFLOAD` (512×288, 17 frames, 20 steps, batch 1, seed 20260916, budget ≤14,336 MiB / ≤1,800 s) — only with enforceable phase-separated offload + tiled VAE. **Day-one service** = CPU ffmpeg. **Rejected:** H3; **deferred:** Krea2, SeedVR2, Qwen3VL-as-encoder, extra Wan quants |
| **D-B transport** | Copy **only the approved subset** to `D:\AI-Weights\ComfyUI`. **No SMB, no runtime dependency on the 5090.** 100 GiB reservation, manifest + SHA-256, `.partial` → atomic promote, hash-mismatch quarantines |
| **D-C arbitration** | **One** policy, **one** authority — extend `worker-resource-policy.mjs`; never a second "Comfy lock". Explicit `gpu.owner/phase/reservationId/fencingToken`, process identity = pid **+ start time**. Transfer requires: refuse `GPU_BUSY` (never kill an active job) → drain → verify **≥15,000 MiB free for 5 consecutive 1 s samples** → reserve → **then** claim the lease. GPU ownership also holds the sleep blocker |
| **D-D topology** | `C:\ComfyUI-Mini-v0.34.2-cu130`, ComfyUI v0.34.2 @ `169fcf35a2fc…`, **side-by-side Python 3.13.15** in a private venv (system 3.12.10 untouched), torch 2.13.0+cu130, loopback **8189**, `--disable-api-nodes` mandatory, weights on D:, **no silent output fallback**. Ada (sm_89) vs Blackwell (sm_120) compatibility is **H-CUDA — unproven until measured** |
| **D-E capability truth** | **Immediately disable the defective scheduled task** and withdraw its stale `ffmpeg,mediasync,generate` registration. Add a `none` sentinel. Stage capabilities only behind completed real jobs: `none` → `ffmpeg` → `ffmpeg,mediasync` → `+generate`. `generate` must carry a **qualified profile allowlist**, not a bare string |
| **D-F fit gate** | H-P / H-W / H-CUDA / B-FF / B-GSQ with hard budgets; NVML polling ≤100 ms; 1 cold + 2 warm runs; full receipt schema + media-QA sidecar; unexplained sampler gaps invalidate a peak-fit receipt |
| **D-G slices** | 0 Contain D1 → 1 Day-one service + arbitration → 2 Independent media delivery → 3 Comfy foundation + tiny upscale → 4 Wan feasibility → 5 Provider/queue integration → 6 Operations/rollback |
| **D-H tests** | T-INSTALL-01, T-NODES-02, T-NET-03, T-MEDIA-04, T-FIT-05, T-ADAPTER-06, T-DENY-07, T-RACE-08, T-OOM-09, T-HONESTY-10, T-GSQ-11, T-SLEEP-12 |

**Biggest risk named by Astra:** treating *"CPU offload enabled"* as proof that Wan's graph actually separates component residency. That can burn days tuning frames while a loader silently retains the encoder, diffusion model, or VAE on CUDA. **Phase-level residency evidence is required before any extended Wan benchmark.**

**Impossible here:** H3 as measured; concurrent GSQ + Comfy residency (only **2,224 MiB** free at GSQ's measured load); fully resident Wan; unbounded resolution/duration/batch.

## 3. Corrections Astra made to this packet

- The packet listed MiniSwan's GSQ backend as **18081** but did not document the **18082** layer Hermes actually calls. Astra flagged the gap and required the topology to be inspected before touching process supervision. *(Resolved: 18082 is the SSH local forward on the 5090's WSL vNIC built in `scripts/miniswan/miniswan-gsq.ps1`.)*
- The packet treated "12.24 GB plus encoder plus VAE" as evidence of fit. Astra rejected checkpoint size as fit proof.
- The packet's "GB" labels are not runtime-allocation units; exact bytes are required.

## 4. Readiness receipt

```text
Repository / branch / commit / dirty state
  SS-PT @ creator-brains-engine-r2-20260915 @ ac49119df, 6c5b0d77d
  shared worktree DIRTY (987 unrelated entries; only owned paths were staged)

Canonical artifact table and superseded artifacts
  PACKET.md (v1.0) + ASTRA-PRO-REPLY.md (adjudication) + this README
  Supersedes: none. No prior canonical plan existed for this surface.

Preservation mechanism and verified snapshot
  No pre-existing canonical artifact was edited, so nothing required snapshotting.
  Prior MiniSwan planning docs (MINISWAN-RESOURCE-MODE-CONTRACT/BLUEPRINT 2026-09-06)
  remain untouched and are the policy source this plan extends.

Applicable conditional artifacts
  Wireframes:            NOT_APPLICABLE - headless worker/runtime; no user-facing surface.
  ERD / migrations:      NOT_APPLICABLE - no relational schema change.
  Threat model:          PARTIAL - loopback-only ComfyUI (no auth), --disable-api-nodes,
                         SSH-forward-only remote access, custom-node allowlist (Astra D-D).
  Performance budget:    APPLICABLE - H-P / H-W / H-CUDA / B-FF budgets above.
  Storage map:           APPLICABLE - D:\AI-Weights\ComfyUI, 100 GiB reservation (Astra D-B).
  Observability/runbook: APPLICABLE - Slice 6 drills.

Green suite command / exit / counts
  NOT RUN for this packet - it specifies no code. (Baseline for the admission gate:
  node --test scripts/miniswan/miniswan-wake.test.mjs
                scripts/miniswan/miniswan-llama-server.test.mjs
                scripts/swan-video-studio/worker-resource-policy.test.mjs)

RED suite command / expected failing IDs
  NOT RUN - no acceptance tests written yet; T-* IDs above are the specification.

Traceability coverage and orphan requirements
  D-A..D-H each map to >=1 T-* ID. No orphan requirements identified at plan stage.

External review identity / completion / accepted-rejected findings
  openai/gpt-6-astra-pro, finish_reason=stop (complete, not truncated)
  prompt=27,758 tok  completion=14,481 tok  ceiling=32,000  reasoning cap=8,000
  ACCEPTED: all corrections in section 3; the D-E "disable the task now" directive;
            the single-arbiter model; the research-gated Wan position.
  REJECTED by Astra: H3; concurrent residency; broad `generate`; Z: mapping;
            speculative encoder substitution; automatic fallback.

Open decisions and owner
  Sean - see section 5.

Next authorized slice and explicit prohibited work
  NEXT: Slice 0 (contain D1) - requires Sean's approval, it changes a live scheduled task.
  PROHIBITED until its gate: advertising `generate`; installing ComfyUI into the GSQ
  path; any second GPU lock; any change to the 5090's install.
```

## 5. Waiting on Sean

1. **Slice 0 (contain D1)** — may I disable `SwanMiniSwanRenderAgent`'s stale `ffmpeg,mediasync,generate` registration and set the launcher to `-Capabilities none` until each class is qualified? This is the one item Astra called *immediate*.
2. **Install ffmpeg** on MiniSwan (`winget install --id Gyan.FFmpeg --exact`) — the day-one useful service, and it makes the existing `mediasync` claim true.
3. **Wan trial authorization** — the research-gated trial needs ~16.89 GB copied to MiniSwan's D:, plus the phase-offload evidence Astra demands *before* any long benchmark.
4. **Cost record** — the adjudication call: see `ASTRA-PRO-REPLY.md` header. Balance before the call was $7.20.
