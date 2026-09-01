---
decision: Finish the local 5090 video stack — install Krea 2, close the installer's size-not-hash gap, and stop treating the 4080 as an upscaling box
status: open
supersedes: none
---

# Handoff — MiniMax H3 / Krea 2 local video stack on the 5090

**Written** 2026-09-01 · **Branch** `codex/aftertaste-hardening-20260830` · **HEAD at writing** `de9856db5`
**Audience** the next agent picking up the local video pipeline, with no prior context.

> **Read this first:** the H3 pipeline is **finished and working**. Nothing here is a rescue job.
> The work left is one install, one real security-ish gap in a sibling script, and one stale doc.
> Do not "fix" the parts that already work — several of them look wrong and are not, and this
> document says which.

---

## 1. What this machine is, and where everything lives

Sean's main box: **RTX 5090 (Blackwell, sm_120)**, Windows 11. A second PC has a **4080 (16 GB, Ada)** —
see §6, because the job Sean wanted it for is one it physically cannot do.

| Thing | Path |
|---|---|
| ComfyUI candidate | `C:\ComfyUI-H3-v0.34.2-cu130\` |
| Launcher (Desktop) | `Swan Local Video 5090.cmd` |
| Weights library | `Z:\AI-Weights\ComfyUI\` |
| Render output | `Z:\SwanStudios-Video\output` |
| Workflows (in ComfyUI) | `…\user-candidate\default\workflows\` |
| **Git copies of all of the above** | `docs/ai-workflow/AI-HANDOFF/evidence/aftertaste-h3/workflows/` |

**ComfyUI 0.34.2 · PyTorch 2.13.0+cu130 · Python 3.13.**

The git copies exist because on 2026-08-31 these files lived **only** on the Desktop and inside the
ComfyUI user profile — no repository anywhere. Wiping or re-creating the profile would have lost the
proven first/last-frame graph. If you change one of these files in place, **copy it back into the
repo** or the next re-image loses it again.

### Weights present on `Z:\AI-Weights\ComfyUI\` (verified on disk 2026-09-01)

| File | Folder | What it is |
|---|---|---|
| `minimax_h3_fl2va_pruned_fp8_scaled.safetensors` | `diffusion_models` | H3 itself |
| `seedvr2_3b_nvfp4.safetensors` | `diffusion_models` | restoration, 3B |
| `seedvr2_7b_nvfp4.safetensors` | `diffusion_models` | restoration, 7B |
| `4xNomosWebPhoto_RealPLKSR.pth` | `upscale_models` | 4× ESRGAN-family upscaler |
| `rife_v4.25.safetensors` | `frame_interpolation` | frame interpolation |

**Krea 2 is absent.** That is the main task — §4.

`extra_model_paths.yaml` maps `diffusion_models`, `text_encoders`, `vae`, `loras`, `upscale_models`,
`controlnet`, `clip_vision`, `frame_interpolation` to `Z:/AI-Weights/ComfyUI/`. **Any folder not
named there silently falls back to `C:\ComfyUI-H3-v0.34.2-cu130\models\<folder>`** on the system
drive, which has ~146 GB free against Z:'s ~715 GB. If you add a new model class, map it *before*
downloading, not after.

---

## 2. The four workflows, and exactly what each one does

Load them from the **Workflows panel in the left rail** — not the Models tab, and not the `+` button,
which opens a blank graph. This trips people every time.

| Workflow | Does |
|---|---|
| `00 SWAN — H3 local — Text to Video` | text → video. 12 nodes. No frame inputs, correct for T2V. |
| `01 SWAN - H3 local - First + Last Frame` | start image + end image → video. 16 nodes, `first_frame` and `last_frame` both wired. |
| `02 SWAN - Restore 2x (SeedVR2)` | 2× restoration only. **Named honestly** — see below. |
| `03 SWAN - Finish 4K + 48fps` | the real chain: ESRGAN 4× + RIFE 2× frame interpolation. |

**Why 02 has that name.** It was originally called "Upscale to 2K-4K" and contained **no upscaler and
no RIFE** — just a 2× resize that reaches 2688×1536 from 1344×768 and never approaches either 2K or
4K. An outside review caught it. It was renamed to what it does, and `03` was built as the real
chain and then **run rather than asserted**: prompt `3c766796` took a clip from 1280×704 / 24fps /
107 frames to **3840×2160 / 48fps / 213 frames**, ffprobe-confirmed. 213 = (107−1)×2+1, which is the
exact RIFE formula — a useful arithmetic check that the interpolation really happened.

### The em-dash trap — do not "tidy" this

Windows CMD under legacy code page 437 turns `—` into `ΓÇö`. A launcher checking for a workflow by an
em-dashed path reports the file missing while it sits right there. **Four Windows scripts in this
project have been broken this way**, one of them a security fix that silently never ran. The
first/last-frame workflow name and every path inside the launcher are ASCII-only on purpose.

A pre-commit gate now enforces it: `scripts/hooks/windows-script-ascii-gate.mjs` blocks non-ASCII in
staged `.ps1` / `.cmd` / `.bat` — contents *and* filename, because the first incident was a filename.
Deliberate exception: put `swan-guard-allow-unicode` in the first 40 lines.

---

## 3. The six findings that were fixed — do not re-fix these

An external hostile review returned **REVISE** with six findings. All six were verified against the
files before being accepted, and all six are fixed in `dfeb3c70c`. Listed so you do not spend a day
rediscovering them:

1. **Data loss in the Blender output swap.** `swan_pipe.py` did `rmtree(out_dir)` *then*
   `os.replace(...)`; a crash between those lines destroyed the last good output while the docstring
   called it "atomically swapped in". Now: move aside → replace → roll back on failure → drop backup.
   `swan_pipe_swap_selftest.py` proves a *failed* swap preserves the previous output, and carries a
   negative control running the old sequence to confirm it really did destroy it.
2. **The workflow overclaimed** — §2 above.
3. **The launcher lied.** It printed a hard-coded "Verified candidate: ComfyUI 0.34.2 / Python 3.13.15
   / Torch CUDA 13" after nothing but an HTTP 200, so it would keep claiming those versions after any
   upgrade. It now reads `/system_stats` and reports what is actually running.
4. **Installers accepted files by approximate size.** Within 3% is not identity — it accepts a
   corrupted file of the right length. Hugging Face publishes SHA-256 as the LFS oid, so digests were
   pinned and checked with `Get-FileHash`. **⚠ This fix landed in `Install-VideoUpscale.ps1` ONLY —
   see §4.2.**
5. **CI had never run on this branch.** Both workflow triggers were `branches: [main]`, so every claim
   about the asset gate concerned a workflow that had executed zero times here. Push now covers
   `codex/**` and `claude/**`, and the paths include the H3 evidence directory.
6. **Movable action tags.** `actions/checkout@v4` is repointable; pinned to full SHAs.

**Explicitly NOT accepted:** "there is no website / Aftertaste Creative Lab." That is a scope
proposal, not a fault — this branch is deliberately local ComfyUI tooling. Recorded so the
disagreement stays explicit rather than quietly reappearing as a defect.

---

## 4. THE ACTUAL WORK — Krea 2

Sean's decision, in his words: **"It's gonna be local. Using it on the fifty ninety."** Krea 2 is
**not** hosted-only for our purposes: `Comfy-Org/Krea-2` is **ungated** and ships ComfyUI-ready
quantisations. Do not re-litigate local-vs-hosted; it is settled, and hosted would be a T3
external-visible action under the operator bridge anyway (it puts the dataset on someone else's
machine).

### 4.1 Run the install

```powershell
cd C:\ComfyUI-H3-v0.34.2-cu130\   # wherever you keep the rescued copy
.\Install-Krea2.ps1               # DRY RUN — prints what is missing, downloads nothing
.\Install-Krea2.ps1 -Download     # fetch
```

Three files, ~17.4 GiB total, all into `Z:\AI-Weights\ComfyUI\`:

| File | GiB | What |
|---|---|---|
| `diffusion_models/krea2_turbo_fp8_scaled.safetensors` | 12.24 | the model (8-step Turbo, fp8) |
| `text_encoders/qwen3vl_4b_fp8_scaled.safetensors` | 4.88 | text encoder (Qwen3-VL 4B, fp8) |
| `vae/qwen_image_vae.safetensors` | 0.24 | VAE |

`hf download` resumes partials and skips complete files, so re-running after an interruption is safe.
**Settings that matter at inference — verified 2026-09-01 from the shipped ComfyUI template**
(`image_krea2_turbo_t2i.json` in `comfyui_workflow_templates_json`): KSampler **8 steps, cfg 1.0,
euler/simple, denoise 1.0**, negative conditioning via **ConditioningZeroOut**, and
**CLIPLoader type `krea2`**. Earlier guidance here said "cfg 0.0, mu 1.15" — the shipped template
has **no mu parameter anywhere**, and cfg 1.0 with a zeroed negative is the no-CFG equivalent. Do
not go hunting for a mu knob.

**Why fp8 and not NVFP4:** NVFP4 is Blackwell-native and smaller (7.15 GiB), but it has an open
ComfyUI loading issue on the 5090 and sources disagree on whether it needs an extra backend. Treat
NVFP4 as a *speed experiment after* fp8 is proven working, never as the baseline.

### 4.2 ✅ FIXED 2026-09-01 — the finding-4 gap is closed and the verifier is tested

`Install-Krea2.ps1` originally verified downloads by **size within 2%** — precisely the defect
finding 4 named; the fix had landed in `Install-VideoUpscale.ps1` only (its sibling untouched —
the Rule 20 sibling-sweep failure mode, recorded in §8).

**Done, same session that wrote this doc's follow-up:**
- Three SHA-256 digests pulled from the HF paths-info API for `Comfy-Org/Krea-2` and pinned in the
  `$files` table (the API's byte sizes matched the published GiB figures exactly).
- Size comparison replaced with `Get-FileHash` identity check, same shape as
  `Install-VideoUpscale.ps1:110`.
- Verification now runs **even when nothing needed downloading** (the VerifyOnly path), so a
  completed install is re-checked on every run.
- **Negative control executed and passed:** wrong-content files placed at all three destinations →
  script reported `SHA MISMATCH` on each and exited 1, then the dummies were removed. The verifier
  has rejected something; it is a tested instrument.
- The fixed script is mirrored at `evidence/aftertaste-h3/workflows/Install-Krea2.ps1` (this was the
  live-Desktop-vs-git mirror rule in §1 being honored).

### 4.3 Training a Krea 2 LoRA — a SEPARATE install, deliberately

Full detail in `Install-Krea2-Training-NOTES.md`. The load-bearing points:

- **Do NOT train inside this ComfyUI.** AI Toolkit's Krea 2 trainer has an open, unfixed VRAM
  regression on **PyTorch 2.13 / Triton 3.7** ([ostris/ai-toolkit#990](https://github.com/ostris/ai-toolkit/issues/990)).
  Give AI Toolkit **its own venv** with `torch==2.11.0+cu130`, `torchvision==0.26.0+cu130`,
  `torchaudio==2.11.0+cu130`. **CUDA 13 is fine — the torch *version* is the problem.** Do not
  downgrade this ComfyUI to train.
- Train against **RAW, never Turbo**; 1024px; rank 32; no EMA; no differential guidance; sampling
  off; 1,000–2,000 step window. Timestep type `sigmoid` **silently degrades** Krea 2 — the
  most-reported failure after the torch one.
- **The dataset already exists as a pipeline.** `swan-taste-brain` gained S5 LoRA dataset export
  (`prompter/export-lora-dataset.mjs`). It captions from the render's *originating prompt*, which is
  stored exactly — no vision-model captioning, which would badly reconstruct a sentence already held.
- **LICENCE GATE — do not weaken this.** Only `generated: true` renders (made from Sean's own
  prompts) are ever exported. Third-party reference photographs, including the Midlibrary corpus,
  are refused and counted by reason. Training *redistributes* what the licence covers. Same law as
  the existing OWN-MATERIAL rule.
- **Blocked on Sean, not on code.** Last measurement: **0 trainable images, 9 reference pictures
  correctly refused.** Sean must judge his OWN renders (Judge tab → "My renders") to build a pool;
  a LoRA wants 12+.

### 4.4 ✅ DONE 2026-09-01 — the stale doc is corrected

`H3-UPGRADE-RESEARCH-AND-TASTE-SWAN-INTEGRATION-2026-08-31.md` **§5.4** used to say *"Krea 2 is a
cloud/hosted text-to-image model"* and ask Sean to confirm local vs hosted. §5.4 now records the
decision — local, on the 5090, open weights from the ungated `Comfy-Org/Krea-2` — so the next agent
is not sent to ask Sean something he already decided.

---

## 5. How to test right now

1. Double-click `Swan Local Video 5090.cmd`. It reports the ComfyUI version it *actually* finds and
   the render path it will *actually* use.
2. Open the **Workflows panel in the left rail**. Double-click a workflow.
3. Renders land in `Z:\SwanStudios-Video\output`.

**Renders must go to one directory.** Output used to split between `output-candidate` on C: and Z:,
which hid renders from the taste brain — it joins renders in a single directory and reported "no
renders to judge" while 17 sat on disk.

At the time of writing ComfyUI was **not running** (nothing answered on `127.0.0.1:8189`).

---

## 6. The 4080 second PC — the job Sean wanted for it is impossible

Sean's plan was for the 16 GB 4080 to do 4K upscaling so the 5090 stays free. **It cannot**, for two
independent reasons, either of which alone is fatal:

**(a) The weights will not load at all.** The SeedVR2 files are `nvfp4`. ComfyUI gates NVFP4 behind
`props.major < 10` in `comfy/model_management.py:1978` — Blackwell only. A 4080 is Ada, major 8.
This is not a performance question; the format is refused.

**(b) Even in another format, 16 GB is below the floor.** SeedVR2's own chunk law
(`comfy/ldm/seedvr/constants.py`) is:

```
max_latent_frames = (free_GiB - 8.5 - 4*0.55) / (0.55 * megapixels)
```

It reserves **8.5 GiB before any activation**. On a 16 GB card the formula returns **zero or negative
frames** at 2K and 4K — it cannot form a single chunk. With the 7B model it cannot run at any tested
resolution; with 3B it manages 3 latent frames at the smallest setting and nothing above.

Low-VRAM tooling does not help: nothing beats the 8.5 GiB reserved floor. Full measurement table in
`evidence/aftertaste-h3/workflows/TWO-PC-SPLIT.md`.

**So:** give the 4080 a different job (dataset prep, captioning, encoding, a second ComfyUI for
image-only work), or accept that upscaling stays on the 5090. Do not spend a session trying to make
SeedVR2 fit.

---

## 7. Recommended order for the next session

1. ~~Fix `Install-Krea2.ps1` hash verification~~ **DONE 2026-09-01** (§4.2) — digests pinned,
   negative control passed (exit 1 on wrong content).
2. ~~Run `Install-Krea2.ps1 -Download`~~ **DONE 2026-09-01** — all three files fetched and SHA-256
   verified against the pinned digests (script exit 0). A follow-up flip-one-byte control on the
   REAL VAE (size unchanged) was rejected with exit 1, then the byte was restored and the full
   verify passed clean — the exact defect class the old 2% size check could never catch.
3. ~~Render one image~~ **DONE 2026-09-01** — queued headless via the API using the shipped
   template's exact graph (8 steps / cfg 1.0 / euler / simple / ConditioningZeroOut / CLIPLoader
   type `krea2`, LoRA path off): `history` reported success and
   `Z:\SwanStudios-Video\output\Krea2_install_proof_00001_.png` (1024x1024, seed 42) is a correct,
   photorealistic render of the prompt. Krea 2 fp8 is proven working on the 5090.
4. ~~Correct §5.4~~ **DONE 2026-09-01** of the upgrade-research doc (§4.4).
5. **Only then** consider LoRA training — and it stays blocked until Sean has judged 12+ of his own
   renders. Say so plainly rather than working around it.
6. Optional: NVFP4 Krea as a speed experiment, *after* fp8 is proven.

**Not merge-ready.** The branch is **43 ahead / 42 behind** `origin/main`. It works locally; a
deliberate sync is a separate task with its own review.

---

## 8. Standing rules that bit this work specifically

- **ASCII-only in Windows scripts.** Four incidents. Gate now enforces it.
- **Validate the instrument before believing a negative.** On 2026-09-01 a checker misread
  `samplers[0]` and reported a healthy asset as broken; a change to the shared Blender pipeline was
  nearly committed on the strength of it. A tool reporting a defect is a *claim*, not a finding.
- **`git commit -F <file>`.** The shell mangles commit messages containing backticks and quotes.
- **Never `git worktree remove --force` on a tree containing a junction** — it follows the link and
  deletes the real target. This destroyed a 29 MB licensed corpus on 2026-08-31. Copy, never link.
- **Size is not identity.** §4.2 exists because that lesson was applied to one file and not its
  sibling — which is itself the Rule 20 sibling-sweep failure mode.
