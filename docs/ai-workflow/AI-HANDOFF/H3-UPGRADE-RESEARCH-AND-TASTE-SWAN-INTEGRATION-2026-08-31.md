# H3 upgrade research + Taste Swan integration blueprint

Date: 2026-08-31 · Author: Fable 5 (Final Decider) · Status: research verified via live web this session; integration steps 1–2 executed, 3+ planned

Companion to: `AFTERTASTE-MINIMAX-H3-HARDENING-HANDOFF-2026-08-31.md` (committed `a7ffeccda`, branch published this session — its GitHub links now resolve).

## 1. Hostile review verdict on the hardening handoff

**Verdict: APPROVE with findings.** The handoff's truth-boundary discipline is real — I independently re-ran four self-test suites this session (validate-asset 36/36, CLI contracts 4/4, run-blender 10/10, glTF wrapper 3/3) and the secret scan (CLEAN, 18 files). The "reference-only" benchmark verdict and the rollback isolation are honest and correct.

| # | Severity | Finding | State |
|---|---|---|---|
| 1 | CRITICAL | The entire 19-file patch existed only as STAGED, uncommitted files in a `C:\tmp` worktree — one cleanup away from loss, and every GitHub link in the handoff was dead. | **FIXED this session:** committed `a7ffeccda`, branch `codex/aftertaste-hardening-20260830` pushed. `main` untouched. |
| 2 | HIGH | The upgrade silently disconnected the Taste Swan render loop (Rule 20 sibling-sweep miss): `swan-taste-brain/prompter/comfy.local.json` still pointed at the OLD ComfyUI (8188) and `Z:/SwanStudios-Video/output`, while the candidate serves 8189 and writes to `output-candidate`. Make/Judge-renders would have queued to and probed the rollback install. | **FIXED this session:** config repointed (api 8189 + candidate output; rollback values preserved in the file's note). Template re-capture still required — §3 step 2. |
| 3 | MEDIUM | The two candidate workflow JSONs and the desktop launcher CMD live OUTSIDE any git repo (candidate user profile + Desktop). A profile wipe loses the proven first/last-frame graph. | Open. Recommend copying both workflows + the CMD into `docs/ai-workflow/AI-HANDOFF/evidence/aftertaste-h3/` on this branch. |
| 4 | MEDIUM | The benchmark profile (FP8 + LightX v1 LoRA) is already outdated: official PDD Acc LoRAs shipped 2026-08-26 and supersede LightX-class distills, and a published 5090 benchmark measured pruned FP8 8–30 % SLOWER than pruned INT8. The handoff's own item 6 (INT8 vs FP8) is therefore the RIGHT next benchmark — priority raised. | Open — folded into §2 shortlist. |
| 5 | LOW | H3 Studio editable-install metadata patch still deferred (handoff item 8). | Open, unchanged. |
| 6 | ADJACENT | `swan-taste-brain` has NO git remote and ~15 uncommitted files, including the new AI gateway (G0/G1) and `movie.mjs` (the seedance-skill runtime projection). Sean's whole taste corpus is single-disk. | Open — needs Sean's call on a private remote or scheduled local bundle backup. Not edited this session (possible concurrent agent WIP). |

## 2. Upgrade shortlist (live-web research, three parallel passes — HF/GitHub, community/Reddit, API integration)

Ranked by leverage; all links verified in-session unless noted. Full detail with every source lives in the session transcript summaries.

1. **SageAttention 2.2 (Windows wheel)** — measured ~19 % faster on H3 on a 5090; stacks with everything. Prereqs on Blackwell: PyTorch cu130 (have it), remove xformers, sm_120 wheel. `github.com/Comfy-Org/ComfyUI/discussions/11583`
2. **Official PDD Acc LoRAs (alibaba-pai, 2026-08-26)** — joint video+audio in 8 or 4 Euler steps, CFG off; FL2VA variant matches our first/last-frame mode. ~2.5–5× wall clock. Cannot stack with other distill LoRAs. Node: `Jalen-Brunson/ComfyUI-MiniMax-H3-PDD-Acc`
3. **INT8 ConvRot / NVFP4 quant DiT + CPU text-encoder offload** — we peak 29,850 MiB on a 32 GB card (no headroom). Quant frees ~10–15 GB for LoRAs/ControlNet/longer clips, and on 5090 INT8 measured FASTER than FP8. Matches handoff item 6. `huggingface.co/Abiray/Minimax-H3-nvfp4-INT4-INT8-Convrot`
4. **SeedVR2 v2.5 post-upscale** (official node) — the standard fix for H3's soft VAE output; 7B FP16 fits 32 GB. `github.com/comfyorg/comfyui_seedvr2`
5. **`MiniMaxH3AddGuide` for clip extension** — native multi-frame + audio-continuous extension; strictly better than naive last-frame→first-frame chaining (which drifts). Highest-leverage workflow upgrade, zero new models.
6. **RIFE 4.25+ interpolation** (24→48/60 fps) — kills the "slow-motion look" tell. `github.com/Fannovel16/ComfyUI-Frame-Interpolation`
7. **H3-FaceRefine** — community-verified fix for wide-shot face degradation. `github.com/Carasibana/ComfyUI-H3-FaceRefine`
8. **Encode tiers + metadata** — VHS VideoCombine: FFV1/ProRes master → h264 CRF 19 share → WebM web; seed/prompt into filename. Caution: WebM must carry Opus/Vorbis or H3's generated audio is silently dropped.
9. **Fun-Controlnet-Union (pose/depth/canny) + Realism-People LoRA** — control lane + people fidelity, as needed.
10. **Wan 2.2 as second model** — different look, biggest control ecosystem; complementary, not a replacement.

**H3 prompt truths to encode in the generator** (from `huggingface.co/MiniMaxAI/MiniMax-H3/discussions/28` + RunDiffusion guide): ONE structured block of 350–500 words per clip, shots described sequentially, ONE main camera move per clip (pan/tilt/dolly/truck/arc/crane + "slow"), explicit `overall_soundscape` / `non_diegetic_music` sections (`N/A` for silence), keep faces near the camera. No AnimateDiff-style prompt travel — DiT models have no per-frame conditioning.

## 3. Taste Swan ↔ H3 seamless-integration blueprint

The loop is already ~80 % built. What Sean asked for (pick styles/artists from the Midjourney brain in a GUI → prompt → video) is the **Prompt Studio spec** (`swan-taste-brain/docs/PROMPT-STUDIO-SPEC.md`, 2026-08-21) — captured, mostly unbuilt. The seedance-loop-prompt skill already has a dependency-free runtime projection in `prompter/lib/movie.mjs` (uncommitted).

| Step | What | State |
|---|---|---|
| 1 | Point taste-brain at the candidate: `comfy.local.json` → api 8189, output `output-candidate` | **DONE this session** |
| 2 | Re-capture the Make template from the NEW install: run the first/last-frame workflow once in ComfyUI, with `node prompter/capture-workflow.mjs --watch` running (capture is memory-only history; cannot be done for Sean) | **SEAN — one action** |
| 3 | Commit the taste-brain WIP (gateway G0/G1, movie.mjs, tests) after its suites pass; decide backup/remote for the repo | Open |
| 4 | Build Prompt Studio S1–S4: brain browser (223 SREF · 398 artists · 407 handles · themes · 3,980 prompts, click-to-insert), main prompt box, director rounds, iteration ledger. Spec is build-ready; no model needed until S5 | Next build slice |
| 5 | Extend `/api/make` for first/last-frame: `POST /upload/image` (field `image`, `overwrite=true`, use returned `name`), rewrite the two LoadImage nodes located by class_type/wiring — never by node id (ids renumber on edit; our wiring-based field finder already avoids this) | Small slice |
| 6 | Video prompts through the seedance grammar: fold §2's H3 prompt truths into `lib/video.mjs`'s curated table + `movie.mjs` chapters; Make 4 queues seed variants server-side | Small slice |
| 7 | S0 full Midlibrary `/styles` catalog | **BLOCKED on Sean's decision** (spec §4.5 — recommend emailing Midlibrary first) |

Integration plumbing truths (verified against ComfyUI docs): `/prompt` accepts API-format JSON only (Workflow → Export (API)); completion = websocket `executing` with `node: null` (+ `/history/{id}` poll fallback); randomize seed or ComfyUI serves the cached result; `node_errors` come back on the POST, not the socket; local H3 node is `MiniMaxH3ImageToVideo` — do NOT template the similarly-named cloud-billed `MinimaxHailuo03FirstLastFrameNode`.

## 4. Decisions Sean owns

1. Run step 2 (one command + one render) to re-arm Make against the upgraded install.
2. Midlibrary `/styles` acquisition posture (email / browser-paced / skip).
3. Taste-brain backup: private remote vs scheduled bundle.
4. Candidate output location long-term: keep `output-candidate` (isolation) vs re-point to `Z:\SwanStudios-Video\output` (space + one render library) once the candidate is accepted as primary.
5. Whether to green-light the §2 install order (SageAttention → PDD LoRA → INT8 quant → SeedVR2/RIFE) as the next hardening batch.
