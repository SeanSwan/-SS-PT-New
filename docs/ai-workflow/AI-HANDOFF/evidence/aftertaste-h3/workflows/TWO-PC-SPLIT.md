# Two-PC video pipeline — what can actually move to the second machine

**Second PC: RTX 4080, 16 GB VRAM, ~112 GB system RAM (3×32 + 1×16).**
**Main PC: RTX 5090, 32 GB VRAM.**

Sean's intent (2026-08-31): main PC generates the video, second PC does the 4K upscaling, so the
5090 is not tied up finishing clips. **The intent is right and the split is worth building — but the
step he wants to move is the one step that cannot move.** Here is the measurement, and the split
that does work.

---

## 1. SeedVR2 cannot run at 2K or 4K on a 16 GB card. At all.

Not "slowly" — the chunk law returns zero or negative frames, which means it cannot form a single
chunk. This is arithmetic from ComfyUI's own source, not an estimate:

`comfy/ldm/seedvr/constants.py` (comment states the sweep was measured on an RTX 5090):

```
max_latent_frames = (free_GiB - RESERVED - K*SIGMA) / (GIB_PER_MPX_FRAME * megapixels)
RESERVED = 8.5   SIGMA = 0.55   K = 4   GIB_PER_MPX_FRAME = 0.55
```

**`RESERVED` is 8.5 GiB before a single frame of activation.** Add the 2.2 GiB safety margin and the
model weights, and a 16 GB card has nothing left.

Latent frames per chunk (0 or negative = cannot run):

| | 1344×768 (source) | 2688×1536 (2×) | 2560×1440 (2K) | 3840×2160 (4K) |
|---|---|---|---|---|
| 5090 32 GB, 7B loaded | 27 | **6** | **7** | 3 |
| 5090 32 GB, 3B loaded | 31 | 7 | 8 | 3 |
| **4080 16 GB, 7B loaded** | **CANNOT RUN** | CANNOT RUN | CANNOT RUN | CANNOT RUN |
| **4080 16 GB, 3B loaded** | 3 | **CANNOT RUN** | **CANNOT RUN** | **CANNOT RUN** |

The 4080 can only run SeedVR2 at roughly the *source* resolution, 3 frames at a time — which is a
draft tool, not a finisher. A 3-frame chunk also throws away most of the temporal context that is
SeedVR2's entire reason for existing.

## 2. The nvfp4 models installed on the main PC will not load on the 4080

`comfy/model_management.py:1978`:

```python
def supports_nvfp4_compute(device=None):
    if not is_nvidia(): return False
    props = torch.cuda.get_device_properties(device)
    if props.major < 10: return False
    return True
```

NVFP4 is **Blackwell-only** (`major >= 10`). The 4080 is Ada, compute capability 8.9, major 8. Do not
copy `seedvr2_*_nvfp4.safetensors` to the second PC and expect them to work — fetch the
`fp8_e4m3fn` or `int8_convrot` builds from the same repo instead.

---

## 3. The split that works

The expensive step is **restoration**, and it has to stay on the 5090. Everything *after* it is cheap,
runs comfortably in 16 GB, and is genuinely worth offloading — a 249-frame 4K sequence is real work.

```
MAIN PC (5090)                          SECOND PC (4080, 16GB)
─────────────────────────────           ──────────────────────────────
H3 generate      1344x768, 24fps
        │
SeedVR2 restore  → 2x (2688x1536)
  7B nvfp4, 6 frames/chunk
  temporal_overlap 3, color "lab"
        │
   write to  Z:\SwanStudios-Video\output
        │
        └──────── shared folder ───────► 4K hop: ESRGAN or Lanczos → 3840x2160
                                         RIFE 4.25: 125 → 249 frames @ 48fps
                                         encode: h264 crf 18-20 (web)
                                                 av1 / ProRes (master)
```

**Why this is still a real offload:** the 4K resize + RIFE + encode over a 249-frame 4K sequence is
minutes of GPU and a lot of disk I/O, and it can run on a batch of finished clips while the 5090 is
already generating the next shot. That is the pipelining Sean actually wants.

**What the 4080 needs** (none of it is nvfp4):

| Purpose | File | Notes |
|---|---|---|
| 4K hop | `4xNomosWebPhoto_RealPLKSR.pth` (28 MiB) | CC-BY-4.0. Per-frame, so use it on already-restored footage where flicker risk is low — or skip it and use plain Lanczos, which never flickers |
| Interpolation | `rife_v4.25.safetensors` (22 MiB) | core node, torch-only, no cupy |
| Optional draft | `seedvr2_3b_fp8_e4m3fn.safetensors` (3.16 GiB) | source-resolution drafts only, 3 frames/chunk |

Both required files total **50 MiB**. The second PC needs ComfyUI ≥ 0.34.2 and essentially nothing
else — SeedVR2 and RIFE are core nodes.

## 4. If the 4080 should carry more

**FlashVSR Ultra Fast** (`lihaoyun6/ComfyUI-FlashVSR_Ultra_Fast`) is the temporal upscaler designed
for low VRAM, with explicit RTX-50 support in its changelog and tiling for small cards. It is the one
credible way to give the 4080 a real restoration role. **Untested here** — treat as the next
experiment, not as a recommendation.

Do **not** try to solve this with the `numz/ComfyUI-SeedVR2_VideoUpscaler` custom node and its
BlockSwap machinery. It is 8 months stale, has an open unfixed temporal-ghosting bug, and its
low-VRAM tooling still cannot beat the 8.5 GiB reserved floor above.

## 5. Before any of this: there is no SSH access to the second PC

Checked 2026-08-31. `~/.ssh/config` defines only `radar` and `radar-net` — two aliases for the
always-on **Linux** box, not a Windows machine with a 4080. Both timed out on connect at the time of
checking.

To drive the second PC from here it needs, in order:

1. An OpenSSH **server** running on it (Windows: Settings → Optional Features → OpenSSH Server, then
   `Start-Service sshd` and `Set-Service sshd -StartupType Automatic`).
2. Its LAN address or Tailscale name.
3. A `Host` block in `~/.ssh/config` with the public key already in its
   `%ProgramData%\ssh\administrators_authorized_keys` (or the user's `.ssh/authorized_keys`).

Until that exists, the second-PC install is a folder to copy, not something that can be driven
remotely. The two files it needs are small enough to carry on the shared Z: drive.

---

## Verification record

Everything above is computed or read from source on this machine on 2026-08-31, not inferred from a
guide:

- chunk law + constants: `comfy/ldm/seedvr/constants.py`
- NVFP4 gate: `comfy/model_management.py:1978-1986`
- frame tables: evaluated directly from those constants
- SSH: both hosts attempted, both timed out; no 4080 host is configured
