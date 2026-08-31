# H3 candidate workflows + desktop launcher — rescued copies

Date rescued: 2026-08-31 · Reason: these three files were the only copies, and none of them lived in
any git repository. The two workflows sit inside the ComfyUI candidate's **user profile** and the
launcher on the **Desktop**; wiping or re-creating either loses the proven first/last-frame graph.

## What these are

| File | Original location | Verified at rescue |
|---|---|---|
| `00-text-to-video.json` | `C:\ComfyUI-H3-v0.34.2-cu130\user-candidate\default\workflows\00 SWAN — H3 local — Text to Video.json` | parses · 12 nodes · MiniMax H3 node present · no frame inputs (correct for T2V) |
| `01-first-last-frame.json` | `…\workflows\01 SWAN - H3 local - First + Last Frame.json` | parses · 16 nodes · MiniMax H3 node present · **`first_frame` and `last_frame` both wired** |
| `Swan-Local-Video-5090.cmd` | `C:\Users\BigotSmasher\Desktop\Swan Local Video 5090.cmd` | ASCII-only (see the naming trap below) |

These are **UI-format** workflow files — what ComfyUI's Workflow menu loads. They are NOT the
API-format graph that `POST /prompt` accepts; that is produced by **Workflow → Export (API)** and is
a different shape. The taste-brain's `Make` uses its own separately-captured API graph
(`prompter/comfy-workflow.local.json`, armed by `node prompter/capture-workflow.mjs --watch`).

## Restoring

1. Copy the two `.json` files back into
   `C:\ComfyUI-H3-v0.34.2-cu130\user-candidate\default\workflows\`.
2. Copy `Swan-Local-Video-5090.cmd` to the Desktop as `Swan Local Video 5090.cmd`.
3. Start ComfyUI via the launcher, open the **Workflows** panel in the left rail — not Models, and
   not the `+` button, which opens a blank graph — and double-click the workflow.

The restored filenames may use the em-dash form for the T2V file; the first/last-frame file must
keep **ASCII hyphens**.

## The naming trap, kept because it cost a debugging round

Windows CMD under legacy code page 437 mangles the em dash `—` into `ΓÇö`. A launcher that checks
for a workflow file by an em-dashed path therefore reports the file missing while it is sitting right
there. The first/last-frame workflow and every path inside the launcher are ASCII-only for exactly
this reason — do not "tidy" the hyphens back into em dashes.

## Related

- Hardening handoff: `../../AFTERTASTE-MINIMAX-H3-HARDENING-HANDOFF-2026-08-31.md`
- Upgrade research + integration blueprint: `../../H3-UPGRADE-RESEARCH-AND-TASTE-SWAN-INTEGRATION-2026-08-31.md`
- Benchmark evidence for the candidate: `../h3-lightx-v1-fp8-124f-receipt.md`

## Update 2026-08-31 — one render library, and weights kept off C:

Three more files are rescued here, and two config decisions were made:

| File | Original location | What changed |
|---|---|---|
| `Start-H3-Candidate.ps1` | `C:\ComfyUI-H3-v0.34.2-cu130\` | `--output-directory` now resolves to `Z:\SwanStudios-Video\output`, falling back to the local `output-candidate` only when Z: is not mounted |
| `extra_model_paths.yaml` | same | added `upscale_models`, `controlnet`, `clip_vision` mappings to the Z: library |
| `Swan-Local-Video-5090.cmd` | Desktop | reports the render path it will actually use, instead of always naming `output-candidate` |

**Why the output moved.** The candidate wrote video to `output-candidate` on C:, which has ~146 GB
free and is the system drive, while Z: has ~715 GB and already held the 144 MB render library.
Splitting output across two folders also hid renders from the taste brain, which joins renders in a
single directory — the tool reported "no renders to judge" while 17 sat on disk.

**Why the model paths were extended BEFORE downloading anything.** A folder not named in
`extra_model_paths.yaml` falls back to `C:\ComfyUI-H3-v0.34.2-cu130\models\<folder>`. Upscaler
weights are large, so without the mapping the first upscaler download would have quietly filled the
system drive. `upscale_models`, `controlnet` and `clip_vision` now point at Z: and the folders exist.

**Verified at the time of writing:** no upscaler models and no upscaler custom nodes are installed on
either ComfyUI — both `upscale_models` folders contained only ComfyUI's placeholder file. Upscaling
was recommended in the research shortlist but never installed; do not assume it is present.
