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
