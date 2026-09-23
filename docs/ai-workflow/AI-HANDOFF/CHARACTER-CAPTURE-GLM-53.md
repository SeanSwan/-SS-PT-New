# GLM Consult

**Requested:** `glm-5.3`
**Served:** `glm-5.3`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 2560 in / 25326 out (reasoning: 15726) | total 27886
**Wall:** 939.2s

---

# CHARACTER CAPTURE — Full Design Delivery

**Pre-flight rulings first**, because the blueprint depends on them. Then §8.1–8.6 in full.

---

## 0. RULINGS ON OPEN QUESTIONS

### 0a. The §6 reframe — **Right, but under-scoped. Make it the product, not a feature.**

The reframe is correct and I'll go further: the coverage engine is the *spine* and the extractor is just its first data source. Two sharpenings:

1. **Coverage must aggregate per-subject across all sessions/videos**, not per-video. "Ava's rear-3/4-left bin is empty across 14 videos" is a director's instruction. Per-video coverage is a debug view. This is the actual moat over LoRA Dataset Studio et al.
2. **I half-disagree on "pauses at each angle."** Pauses are right for tripod/turntable work. But a handheld slow orbit at high shutter (1/250s, 4K60 conformed, walking speed ~15°/s) yields sharp frames fine and is 5× faster to shoot than stop-and-hold. The shot-list generator should emit *recipes* ("tripod + pause at these angles" **or** "handheld slow orbit, shutter ≥1/250, 90s") — not mandate pauses. The photogrammetry analogy proves "smooth = blur" only at default shutter speeds.

**Kill nothing, promote everything:** coverage map + named gap cards + printable shot list = first-class deliverables alongside the exports.

### 0b. §2 conflict (Krea "uniform" vs LoRA-field "diverse") — **Doctrine: "Pose-diverse, exposure-normalized, lighting-mild."**

- **Diversity budget goes to pose/angle.** That's the axis with 8+ bins that must be filled and the axis where overfit shows (can't generalize to new angles).
- **Lighting: at most 2 clusters** (e.g., frontal-key + side-key). No silhouettes, no blown highlights, no colored gels. With N=10–30 you cannot afford lighting diversity without diluting identity — each strongly-lit outlier drags the embedding average.
- **Uniformity enforced by normalization, not capture:** all exports exposure-matched to the set median luma (linear gain/offset only — *zero generative processing*), white-balance-matched, resolution-matched.
- **Per-profile:** H3 (inference-time, ≤9, identity holds by *set reuse*): uniform lighting, maximize per-frame fidelity — 1 cluster. Krea (training, 12–30): 2 clusters max, per above.

Reasoning: Sean's bar is fidelity, Krea's own doc says uniformity buys it, and the LoRA field's "diversity" advice is aimed at *flexibility* failures, which is not Sean's failure mode. Diversity of **pose** is non-negotiable in both profiles; diversity of **lighting** is a luxury a 20-image set can't buy.

### 0c. H3 clips export — **Real win, sequenced late.**

Identity in H3 holds by reusing the same reference *set*; clips carry gait, posture, and micro-expression that stills structurally cannot, and H3 is a video generator. Also note the budget arithmetic: 9 stills + 3 clips = exactly the 12-file cap, so clips are a *substitution*, not an addition. **But** Sean asked for photos, stills de-risk the premise test, and clips reuse 95% of the tracking infra. → Slice 7, behind a config flag, with an A/B likeness protocol.

### 0d. §7 competitive read — **Agree, with one caveat.** Concentrate on (a) identity-lock, (b) honest 360° coverage + gap direction, (c) dual export profiles. Caveat: the extractor core (sharpness, dedup, scene-detect) is table stakes — if it's sloppy, the coverage map *lies with confidence*. Budget accordingly; don't skip it, just don't differentiate on it.

### 0e. What I refuse to guess

- **H3 per-image resolution/size limits: unknown.** No number is hard-coded anywhere; exporter emits a manifest warning and the config has an explicit `null // verify empirically` field.
- Face restoration: **banned entirely**, including previews (a restored preview would corrupt Sean's curation judgment). Enforced by a test that fails if a restoration module is importable from the export path.

---

## 8.1 BLUEPRINT

### 8.1.1 Architecture

Two processes, one boundary. The five-year mandate **cannot** cover the CV stack (SAM 3, ArcFace, pose nets, torch/Blackwell wheels); pretending otherwise is the fastest way to kill the tool. So the mandate applies where it can hold:

```
┌───────────────────────── Windows 11 box (RTX 5090, 32GB) ─────────────────────────┐
│                                                                                    │
│  cc-server  (Node 22, ZERO deps, node:http, binds 127.0.0.1:7640)                  │
│  ├─ serves ui/ (vanilla HTML/CSS/JS, no build, no CDN)                             │
│  ├─ watches inbox/ (fs.watch recursive + debounce + Windows lock probe)            │
│  ├─ enqueues jobs: queue/<video_id>.job  (atomic file-create = enqueue)            │
│  ├─ JSON API: GET /state  POST /tag  POST /export  POST /retry  …                  │
│  └─ spawns worker on boot:  uv run --project pipeline python -m cc.worker          │
│                                                                                    │
│  cc.worker  (Python 3.12, uv-pinned, lockfile committed)                           │
│  ├─ claims jobs by rename  queue/x.job → queue/x.claim                             │
│  ├─ GPU: SAM 3 track (≤960px proxy), CPU fine: ArcFace/pose (onnx)                 │
│  └─ writes everything as files under library/<video_id>/ (UI is a file reader)     │
│                                                                                    │
│  State = flat files on disk. No database. UI polls GET /state every 1s.            │
│  Five-year rule: holds for server+UI; worker pinned by uv.lock + model revision    │
│  hashes; documented reality: ML layer re-pinned ~yearly.                           │
└────────────────────────────────────────────────────────────────────────────────────┘
```

Why files-not-DB: `node:sqlite` in 22.14 is still experimental-flag territory [UNSURE — avoided on purpose]; append-only JSONL + atomic-rename JSON survives crashes, is diffable, greppable, and matches the house style.

**ComfyUI fallback path:** if SAM 3 / onnxruntime GPU wheels misbehave on Blackwell (sm_120), the worker is a thin shell and models run via subprocess against ComfyUI's already-proven 0.34.2 env. Adapter interface (below) exists so this is a config swap, not a rewrite. [UNSURE how likely this is; it's cheap insurance.]

### 8.1.2 Stage table (inputs → outputs → choice + why)

| # | Stage | In | Out | Tool | Why this one |
|---|---|---|---|---|---|
| 0 | Watch/enqueue | file in `inbox/` | `queue/<id>.job` | Node `fs.watch` recursive (supported on win32) + 1.5s debounce + stability probe (size stable ×2 polls, openable read-share — Windows locks in-flight copies) | zero-dep, handles the "drop and walk away" mandate; hardlink (fallback copy) into `library/<id>/source.ext` so deleting the inbox copy never orphans a run |
| 1 | Ingest | source video | `probe.json`, `shots.json` | ffmpeg/ffprobe (via `imageio-ffmpeg` bundled binary) + PySceneDetect `ContentDetector` | deterministic, maintained, no GPU needed |
| 1.5 | Preflight | sampled frames | `preflight.json` | own code + OpenCV Laplacian | kill "video too low quality" early: if >60% of sampled frames below sharpness floor **or** short edge <640 → session `needs_input`, UI offers "process anyway" |
| 2 | Sample | shots | frame idx list | own: 2 fps + 5-frame burst at each shot head; cap 4000 candidates (config) | shot heads are where pose/expression variety lives; cap bounds cost |
| 3 | Detect persons | first sample per shot | person chips (bbox, face, thumb, screen-time %) | SAM 3 detect w/ text prompt "person", merged with InsightFace `retinaface` faces (face-in-mask assignment) | SAM 3's text-prompt + persistent-ID claims are the packet's candidate; InsightFace merge gives the *face* thumbnail the tag UI needs |
| 4 | Tag | chips | `subject_ref` | **Human, 1 click** (or auto-pick if dominance margin ≥10% screen-time) | tagging is the one irreplaceable human act; auto-pick keeps the zero-click happy path |
| 5 | Track | subject chip per shot | per-frame bbox+mask (proxy-res) for all shots | SAM 3 video predictor on ≤960px proxy; crops always cut from **source-res** frames via scale transform | persistent IDs through occlusion = the advertised capability. Fallback: SAM 2.1 per-shot + gallery re-association at cuts [UNSURE SAM 3 Windows/GPU packaging — adapter `TrackerAdapter` with `sam3`/`sam2p1` impls selected in config] |
| 6 | Embed | face crops ≥64px | 512-d ArcFace embeddings | InsightFace `buffalo_l` (ArcFace R50, w600k) | de-facto standard, onnx, runs fine on CPU at our volumes (hundreds of crops) — dodges Blackwell onnxruntime-GPU risk entirely [UNSURE wheel status; CPU path is the default] |
| 7 | Identity gate | embeddings + tracker continuity | per-frame: accept / quarantine / reject(reason) | own `calib.py` — **per-video threshold**, not fixed (see 8.1.5) | risk 3: fixed thresholds kill profile/rear coverage; per-video calibration with in-video impostors as negatives is the fix |
| 8 | Quality | crops + frames | sub-scores | OpenCV Laplacian variance on **face crop** (normalized by crop area) + exposure-clip fraction + CR-FIQA-L if installable [UNSURE — wheels are research-grade]; fallback quality proxy: ArcFace embedding norm (MagFace property, quality-correlated) [UNSURE correlation strength — hence percentile-ranked composite, never an absolute cut] | non-generative only; percentile-within-session ranking avoids resolution-dependent magic numbers |
| 9 | Pose | frames/crops | head yaw/pitch/roll, body yaw | 6DRepNet360 (full-range head) + MEBOW (body). Fallbacks: WHENet (±90°) + "no-face + head-mask ⇒ rear bins" heuristic for |yaw|>90; body yaw from RTMPose torso keypoint geometry (shoulder/hip lateral offsets) | both primaries are research code of varying upkeep [UNSURE]; both fallbacks are coarse but coverage bins only need ±23° precision, and rear bins are intentionally coarse |
| 10 | Coverage + select | stages 7–9 + scale | `coverage.json`, `selection.json` | own `coverage.py` — recomputed **from artifacts on disk**, never from a stored summary | honesty requirement (§8.4); selection = per-bin top-k after near-dup suppression (same-bin cosine >0.90 [UNSURE, config] or Δt<0.5s) |
| 11 | Export | selection + source frames | `exports/h3/`, `exports/krea/`, `manifest.json` | Node, copies `lib/lora.mjs` from swan-taste-brain (licence gate preserved verbatim); new `h3.mjs` | reuse proven code; both profiles enforce caps in tests |
| 12 | Report | coverage | `coverage.md`, `shotlist.md` (+ `.json`) | own `report.py` | the capture-director deliverable; shot list = gap cards with recipes |
| 13 | Clips *(optional, Slice 7)* | track + quality time-series | ≤3 clips, 2–15s, ≤15s total | ffmpeg (`-c copy` when keyframe-aligned, else CRF 18 re-encode) | §0c |

**Hard rules encoded in stage 11 and enforced by tests:** never upscale; never face-restore (test asserts the module isn't importable); crop from source pixels only; jpeg re-encode at q≥95 with roundtrip-pixel-diff assertions.

### 8.1.3 Data model

```jsonc
// subjects/<sid>/subject.json  — Subject = a real person, aggregates across sessions
{ "id": "ava", "name": "Ava",
  "consent": { "scope": "self|third_party", "confirmedBy": "sean", "date": "2026-09-05" },
  "gallery": { "embeddings": "gallery.npy",   // confirmed accept frames, all sessions
               "centroidCos": null },          // NOT used for gating; per-video calib is
  "mergedCoverage": "coverage.json" }          // union across sessions → gap cards

// library/<vid>/session.json  — Session = one processed video
{ "id": "ava_interview", "source": "source.ext", "sha4mb": "…", "subject": "ava",
  "status": "ingest|preflight|needs_input|segment|tagging|tracking|analyzing|review|exported|failed",
  "stageCursor": "track", "resumeSafe": true, "blendRisk": false,
  "stats": { "shots": 7, "candidates": 1180, "accepted": 214, "quarantined": 63 } }

// library/<vid>/candidates.jsonl  — CandidateFrame (append-only, idempotent by frame_idx)
{ "frame": 18341, "tSec": 767.3, "shot": 4, "track": 12,
  "bbox": [x,y,w,h], "mask": "masks/18341.png",          // mask saved only for selected frames
  "face": { "found": true, "box": [..], "embIdx": 190, "cos": 0.44, "crFiqa": 0.71 },
  "quality": { "lap": 0.83, "exposureClip": 0.01, "facePx": 612, "composite": 0.79 },
  "pose": { "headYaw": -78, "headPitch": 4, "headRoll": -3, "bodyYaw": -95 },
  "bins": { "face": "PROFILE_L:LEVEL", "body": "E", "scale": "BUST" },
  "decision": "accept|quarantine|reject", "reasons": ["id_borderline"] }

// coverage.json  — CoverageBin axes (canonical, tests pin these):
//  face: 8 yaw bins × 3 pitch bins
//    yaw: FRONT |y|≤22; 3/4_L/R 23–67; PROFILE_L/R 68–112; REAR3/4_L/R 113–157; REAR 157–180
//    pitch: UP>15 / LEVEL ±15 / DOWN<−15  (roll |r|>25 = "tilted" flag, not a bin)
//  body: 8 compass bins N,NE,E,SE,S,SW,W,NW (±22.5° around each)
//  scale (mask height ÷ frame height): WIDE<0.10 FULL 0.10–0.25 HALF 0.25–0.40 BUST 0.40–0.65 CU>0.65
//  each cell: { "count": 3, "qualifiedKrea": 2, "qualifiedH3": 2, "idConfidence": "high|low" }
//  + sheet coverage: config/sheet.json rows P1(8)/P2(8)/P3(4), each row = bin + expr + notes

// config/profiles — ExportProfile = named constraint+policy bundle
"h3":  { "stills": 9, "clips": 0, "maxFiles": 12, "lightingClusters": 1,
         "bg": "original", "longEdge": [1024,2048], "imageLimits": null }   // null = UNVERIFIED
"krea": { "images": 20, "min": 12, "max": 30, "lightingClusters": 2,
          "bg": "neutral-feather-4px", "normalizeExposure": true, "longEdge": [1024,1536],
          "minImageDims": [512,512] }
```

Note the face-size vs image-size distinction: Krea's ≥512 is on **image** dims; face-px targets are *quality weights* (CU/BUST prefer face ≥512px, HALF ≥250, FULL ≥120), not hard gates — otherwise risk 6 (face-gate vs body requirement) silently deletes every full-body frame.

### 8.1.4 Disk layout

```
character-capture/
  serve.mjs  config/app.json  config/sheet.json  README.md
  ui/            (index.html, app.js, style.css — vanilla, no build)
  lib/           server.mjs watch.mjs queue.mjs state.mjs api.mjs lora.mjs h3.mjs
  tests/         *.mjs (node tests) + pipeline/tests/*.py
  pipeline/
    pyproject.toml  uv.lock  fetch_models.py   (pinned HF revisions + sha256)
    cc/  worker.py ingest.py preflight.py segment.py detect.py track.py
         identity.py quality.py pose.py coverage.py select.py report.py clips.py
    models/       (HF_HOME; ~2–4GB)  fixtures/  tools/
  inbox/                       ← the watch folder
  queue/                       ← *.job / *.claim
  subjects/<sid>/
  library/<vid>/  source.ext probe.json shots.json session.json candidates.jsonl
                  frames/ masks/ exports/h3/ exports/krea/ reports/coverage.md shotlist.md
```

### 8.1.5 Identity calibration (the risk-3/4 answer, in full)

Per video, at stage 7:

1. **Positives** = frames in the confirmed track with cos ≥ 0.55 (self-evident matches); take their min → `minPos`.
2. **Negatives** = every other detected face in the video (tagging other people is free negatives); need ≥3, else fall back to `defaultThr = 0.38` [UNSURE — mid-range of the packet's 0.30–0.45 band; config].
3. `thr = clamp( maxNeg + 0.05, 0.28, 0.45 )`, additionally `thr ≤ minPos − 0.02`. If those conflict (lookalikes), set `thr = midpoint(maxNeg, minPos)` and set session flag `ambiguous_identity` → re-tag prompt, export blocked.
4. **Band logic:** cos ≥ thr → accept; cos ∈ [thr−0.08, thr) **with tracker continuity** → quarantine (kept, reviewable, excluded from auto-export); below → reject.
5. **Tracker-vs-identity disagreement:** ≥15% of a shot's tracked frames reject/quarantine → shot flagged `blend_risk`; ≥2 flagged shots → session-level alert, auto-export blocked pending review. Sporadic disagreement → frame quarantined only (never silently dropped — recall is the scarce resource).

Reasoning: within a shot, tracker continuity is strong evidence and ArcFace is pose-degraded — so continuity rescues borderline profiles. At shot boundaries and post-occlusion re-acquisitions, ArcFace is authoritative. Quarantine keeps the 360° tail reviewable instead of deleted.

### 8.1.6 Failure & resume

| Failure | Behaviour |
|---|---|
| Crash at any stage | Worker restart reads `session.stageCursor` + per-stage `reports/<stage>.done` markers; each stage idempotent; `candidates.jsonl` upserts by `frame_idx`; tracking restarts at shot granularity, not video granularity |
| File locked / still copying | Poll ×40 @1.5s, then `failed:locked` with retry button |
| Duplicate drop (same content) | sha of first 4MB + size → dedupe, link to existing session |
| Corrupt/truncated video | ffmpeg error → `failed:corrupt`, card in UI, inbox file untouched |
| GPU OOM | track retries at 720px proxy, then CPU SAM checkpoint [UNSURE viability]; else `failed:oom` with guidance |
| Worker dead | Server health-checks subprocess, restarts, resumes |
| Export interrupted | Manifest written last, atomic rename; partial dir without manifest = invisible to UI |

---

## 8.2 WIREFRAMES

### Desktop — 1. Watch-folder idle / auto-start

```
┌ CHARACTER CAPTURE ─────────────────────────────────── 127.0.0.1:7640 ─┐
│ ● WATCHING  C:\...\character-capture\inbox        [Pause] [Settings]  │
├───────────────────────────────────────────────────────────────────────┤
│                                                                       │
│        Drop video files here — processing starts on its own.          │
│        Or  [ Choose file… ]  to run one manually.                     │
│                                                                       │
├─ ACTIVE ──────────────────────────────────────────────────────────────┤
│ ▶ ava_interview.mp4    ████████████░░░░░░  62%  tracking shot 4/7     │
│    subject: AVA (auto-picked, 41% screen time)  [Wrong person?]      │
│ ▶ gym_b-roll.mov       queued                                           │
├─ NEEDS YOU (1) ───────────────────────────────────────────────────────┤
│ ⚠ doppel.mov   two likely subjects — pick one            [TAG →]      │
├─ DONE (14) ───────────────────────────────────────────────────────────┤
│ ava_orbit_1  exported 12/20 sheet rows · gaps: rear, rear-3/4 L  [↗]  │
└───────────────────────────────────────────────────────────────────────┘
```

### Desktop — 2. Tagging (only appears on ambiguity or "Wrong person?")

```
┌ TAG THE SUBJECT ── doppel.mov ── shot 1/9 ── 00:00:04 ── PAUSED ────┐
│  ┌─────────────────────────────────────────┐  WHO IS THE SUBJECT?   │
│  │                                           │ ┌──────┐ ┌──────┐    │
│  │        ┌──────┐                           │ │ (1)  │ │ (2)  │    │
│  │        │  1   │         ┌──────┐          │ │ face │ │ face │    │
│  │        └──────┘         │  2   │          │ │ 46%▮ │ │ 43%▮ │    │
│  │                           └──────┘        │ │      │ │      │    │
│  │        (other people ghosted)             │ └──────┘ └──────┘    │
│  └─────────────────────────────────────────┘  TRACK ▸   TRACK ▸     │
│  [ Neither — jump +10s ]                    margin 3% → asking you  │
└──────────────────────────────────────────────────────────────────────┘
```

### Desktop — 3. Review / curation (the money screen)

```
┌ REVIEW ── ava_interview ── subject AVA (14 videos merged) ───────────┐
│ SHEET 12/24 rows filled ── ⚠ P1 GAPS: rear-3/4 L · full-body rear    │
├─ FACE YAW × PITCH ────────────────┬─ BODY COMPASS ──┬─ GAP CARDS ────┤
│ yaw→  R3/4L PRF.L 3/4L FRT 3/4R PRF.R R3/4R REAR │      N 12●      │ ▸ SHOOT  │
│ UP     ×     ×     ○2   ●3   ○1    ×     ×      │  NW ○3   NE ●9   │  rear-3/4 │
│ LEVEL  ×     ○1    ●4   ●6   ●3    ○1    ×      │ W ×       E ●11  │  L: tripod,│
│ DOWN   ×     ×     ○1   ●2   ○1    ×     ×      │  SW ×    SE ○3   │  135° yaw, │
│  ● = H3+Krea qualified  ○ = Krea-only  × = EMPTY │      S ○7        │  hold 3s…  │
├─ SCALE FILLED ─────────────────────┴────────────────┴───────────────┤
│ CU ●6  BUST ●8  HALF ●5  FULL ○2 (face<250px)  WIDE ×0              │
├─ SELECTED (20)  click = big view · drag = reorder · ✕ = drop        │
│ [1][2][3][4][5][6][7][8][9][10][11][12][13][14][15][16][17][18]…    │
├─ QUARANTINE (63 · mostly profile/rear, id 0.31–0.38)  [show all ▾]  │
│ [q][q][q][q][q] … click item → SWAP INTO ITS BIN (2 clicks)         │
├──────────────────────────────────────────────────────────────────────┤
│ [ shotlist.md ▾ ]   [ EXPORT H3 (9) ]   [ EXPORT KREA (20) ]  BOTH ▸│
└──────────────────────────────────────────────────────────────────────┘
```

### Mobile (monitor-class device; heavy curation stays on desktop)

```
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ ● CC ▸ inbox watching        │   │ TAG · doppel.mov             │
│                              │   │ ┌──────────────────────────┐ │
│ ACTIVE                       │   │ │   frame, 2 boxes         │ │
│ ▶ ava_interview  62%         │   │ └──────────────────────────┘ │
│   AVA auto ✓ [change]        │   │  (1) face 46%▮  [TRACK ▸]   │
│ ▶ gym_b-roll    queued       │   │  (2) face 43%▮  [TRACK ▸]   │
│                              │   │  [neither → +10s]           │
│ NEEDS YOU                    │   └──────────────────────────────┘
│ ⚠ doppel: pick subject [→]   │
└──────────────────────────────┘   ┌──────────────────────────────┐
┌──────────────────────────────┐   │ AVA · sheet 12/24           │
│ AVA coverage (merged)        │   │ FACE YAW strip              │
│  yaw: × × ○ ● ● ○ × ×        │   │ R3/4L…: ××○●●○××            │
│  body:  N12 NE9 E11 SE3      │   │ ▸ GAP: rear-3/4 L  [recipe] │
│         SW× W× S7            │   │ ▸ GAP: full-body rear       │
│  CU6 BUST8 HALF5 FULL2 WIDE0 │   │ ┌─┐┌─┐┌─┐┌─┐┌─┐ selected 20 │
│  [shotlist.md] [export ⋯]    │   │ └─┘└─┘└─┘└─┘└─┘  swipe →   │
└──────────────────────────────┘   │ ═══ [EXPORT BOTH] ═══       │
                                   └──────────────────────────────┘
```

**Click counts (main paths):**
- Auto happy path: drop file (**0**) → auto-run with auto-picked subject → review appears → **EXPORT BOTH = 1 click**. Total: **1 click** from drop to both datasets.
- Ambiguity path: drop (0) → TAG notification → person chip (**1**) → export (**1**) = **2 clicks**.
- Manual start: Choose-file (**2**) → same as above = **3 clicks**.
- Frame swap in review: quarantine item (**1**) → SWAP (**1**) = 2 clicks.

---

## 8.3 FLOWCHART

```mermaid
flowchart TD
    A[File dropped in inbox] --> B{Stable + unlocked?}
    B -- no --> B1[poll 1.5s x40] --> B
    B -- yes --> C[hash, hardlink, create session]
    C --> D[Preflight sharpness/res check]
    D --> E{Quality floor passed?}
    E -- no --> F[needs_input card:<br/>process anyway?]
    F -- Sean forces --> G
    F -- discard --> X0[failed:low_quality<br/>report written]
    E -- yes --> G[Shot segmentation]
    G --> H{Persons found in shot?}
    H -- none --> Z1[log empty shot<br/>next shot / end]
    H -- one/more --> I{Dominance margin >= 10% ?}
    I -- yes --> J[auto-pick subject<br/>+ 'wrong person?' chip]
    I -- no --> K[TAG SCREEN:<br/>Sean clicks one chip]
    J --> L
    K --> L[SAM3 track subject per shot]
    L --> M{Tracker lost > 2s?}
    M -- yes --> N{Gallery re-acquire<br/>within 5s?}
    N -- yes --> L
    N -- no --> O[close segment, log span,<br/>next shot]
    M -- no --> P
    O --> P[Embed + per-video<br/>identity calibration]
    P --> Q{ID vs tracker}
    Q -- agree --> T
    Q -- sporadic mismatch --> R[frame -> quarantine]
    Q -- ">=15% of shot" --> S[shot flagged blend_risk]
    S --> S2{">=2 flagged shots?"}
    S2 -- yes --> S3[BLOCK export,<br/>re-tag / review required]
    S2 -- no --> T
    R --> T[Quality + pose + binning]
    T --> U[Coverage + selection<br/>merged with subject history]
    U --> V{Sheet rows filled?}
    V -- no --> W[gap cards + shotlist.md<br/>banner on export]
    V -- yes --> X
    W --> X[EXPORT: H3 (<=9) + Krea (12-30)]
    X --> Y[coverage.md + manifest.json sha256]
```

Branch notes (what the UI shows, never silently): `no persons` → session completes with zero frames + shotlist says "no usable footage of subject"; `tracker lost` → untracked spans appear as a WIDE-bin gap card ("subject left frame / occluded — re-shoot rear walk-away"); `coverage incomplete` → **always** produces shotlist.md, export still allowed with red banner "8/24 rows — see gaps."

---

## 8.4 TESTS

### 8.4.1 Positive-control matrix — every absence claim has a must-pass twin

| Absence claim the app can make | Positive control (fails ⇒ the absence claim is a lie) |
|---|---|
| "REAR bin empty" | `orbit_sphere` fixture (360° GT): same pipeline must fill REAR ≥ N |
| "no second person in video" (solo → no calibration negatives) | `imposter_pair` fixture: 2 people → detector returns 2 chips, negatives ≥3 |
| "all frames too blurry" | `blur_gradient` fixture: sharp tail must pass the same gate |
| "no face detected" | `frontal_probe`: must detect ≥95% frames |
| "45° yaw goes to 3/4 bin, neighbors stay empty" | `orbit_sphere` at 2°/frame: every frame lands in exactly its GT bin, no neighbor spill (±23° tolerance test) |
| "no near-duplicates in export" | inject exact duplicate frame → dedup must collapse to 1 |
| "no face restoration happened" | roundtrip pixel-diff: exported crop vs source region ≤ jpeg q95 tolerance; import-scan asserts no restoration module on export path |

**Honesty invariant:** `coverage.json` is always recomputed from files on disk at render/export time. Test: delete a selected frame file → UI count drops and `missing_artifact` warning fires. Test: append fabricated `candidates.jsonl` rows claiming rear frames with no files → map shows 0, warning fires. **No interpolation anywhere:** bins are pure point measurements; single frame at yaw 100° lands in PROFILE_R alone.

### 8.4.2 Golden fixtures (named, buildable, no questions)

| Fixture | Construction | Proves |
|---|---|---|
| `orbit_sphere` | `tools/gen_sphere_orbit.py`: pyrender + bundled CC0 head mesh (fallback: textured sphere with painted asymmetric face) rendering 2°/frame ×180, GT yaw in filename | pose binning, REAR honesty, selection spread |
| `blur_gradient` | synthetic clip, seeded Gaussian blur ramp σ 0→6 | sharpness gate + preflight floors |
| `crosser` | two people walk and cross (Sean records 30s per spec in Slice 1; spec in `fixtures/README.md`) | **blend trap** — the mis-tracking killer |
| `imposter_pair` | two similar-looking people, separate clips | threshold calibration, `ambiguous_identity` path |
| `frontal_only` | 20s talking-head clip | narrow-band coverage → rear gap cards must fire |
| `corrupt_truncated` | head-truncated mp4 | failure/resume |
| `locked_copy` | open handle during watch test | Windows enqueue gating |

### 8.4.3 Test inventory

**Unit (.mjs + pytest):** bin-boundary math pinned to §8.1.3 constants; sheet priority ordering; export caps (seed 40 qualified frames → H3 dir has exactly 9 files, total ≤12 incl. clips; Krea in [12,30]); min-image-dims (512) enforcement; exposure-normalization is linear-only (assert gain/offset, no kernels); naming/manifest sha256; licence-gate regression on copied `lora.mjs`; calibration math (clamps, midpoint conflict); dedup logic.

**Integration:** full pipeline on each fixture; resume — `kill -9` worker at every stage marker ×N loop, assert no lost/duplicated candidates; watch: drop → `job.claim` → session appears ≤5s; duplicate drop dedupes; manual-run API parity with auto-run.

**Identity-lock proof (the hard one — avoid circularity):** gate with `buffalo_l`; **verify with a different FR model** — OpenCV zoo SFace (zero extra stack) — then assert: every exported frame SFace-cos ≥ τ₂ vs subject gallery, and ≤ τ₂−0.10 vs the `imposter_pair` other person. On `crosser`: person-B frames in export must be **zero**; run once with identity gate disabled to confirm the fixture actually traps (that disabled run failing is itself the positive control). Plus manual protocol: Sean blind-confirms 10 random exports per session during beta.

**Coverage honesty:** §8.4.1 matrix, automated.

**Downstream likeness (the only test of the actual bar):** fixed 5-prompt battery per subject, Sean scores 0–5 likeness, blind A/B vs a photo-trained control set. Run at Slice 1 (go/no-go) and after each profile ships.

---

## 8.5 SLICES

**S1 — Premise probe (prove/kill risk 1). Standalone script, no UI, no server.**
`pipeline/probe.py`: Sean records per spec (two 60s clips: one tripod multi-angle of a consenting subject, one casual) or reuses sample footage → sharpness distribution, % frames with face ≥512px per yaw bin, 20 hand-curated frames packaged for one manual Krea train + one H3 run + the blind likeness battery. **Accept:** report generated; likeness ≥4/5 → proceed; 3–3.5 → proceed but capture-director is primary mode; <3 → premise killed for casual video, pivot app to "coverage director + mining" with photos as the primary ingest (video optional). *Kill criteria stated up front.*

**S2 — Skeleton: server + watch + queue + worker stub + ingest/scene/sample/preflight + idle UI + job list.** Accept: drop → session → shots.json + extracted `frames/` ≤5s after file settles; `needs_input` card works; resume works; `node serve.mjs` from clean checkout works.

**S3 — Tag + track + identity gate.** Accept: on `crosser`, zero impostor frames in accept set (SFace-verified); auto-pick fires when margin ≥10%, tag screen when <10%; quarantine band populated on `imposter_pair`; blend-risk blocks export.

**S4 — Pose + coverage + selection + Krea export.** Accept: `orbit_sphere` bins exact; `frontal_only` emits rear gap cards; Krea export 20 images, dims ≥512, exposure-normalized, dedup'd, captions via `lora.mjs` licence gate; shotlist.md printable.

**S5 — H3 export profile.** Accept: exactly ≤9 stills (≤12 files), manifest warns `imageLimits: unverified`; "merged coverage across sessions" works (second video of same subject updates subject-level gaps).

**S6 — Review UI polish + gap-card recipes + quarantine swap.** Accept: click counts hit §8.2 numbers; swap updates coverage map live; map recomputes from disk (honesty test green).

**S7 — Clips export (flagged off).** Accept: ≤3 clips, 2–15s each, ≤15s total, subject-visible throughout (mask coverage >80% of clip), 12-file budget enforced with stills; A/B likeness run logged.

**S8 — Hardening + packaging.** Accept: uv.lock + model revision hashes committed; `cc doctor` validates env; kill-loop resume test ×50 green; consent gate blocks third-party subjects without typed confirmation; server refuses non-localhost binds.

---

## 8.6 THREE STRONGEST OBJECTIONS

**1. The premise is thinner than the packet admits — build the director first, the extractor second.** "Exactly like them" is bounded not by coverage but by *information per pixel on the best frames*. A 4K/60 phone clip at 1/250s has maybe 800–1500 usable pixels on the face in a bust shot; one phone photo has 3000+. Coverage fills bins; fidelity comes from the top decile. Casual video will frequently produce a *complete but mediocre* sheet — the app will "succeed" (24/24 rows) and still miss the bar. My alternative, which I'd argue for over the current emphasis: S1's kill line is real, and if it lands even at 3.5/5, the product's headline should be **"coverage director + archive miner"** — the shot list and the merged per-subject gap map *are* the app, extraction is the onboarding feature that justifies trusting the map. Twenty minutes of directed phone capture beats two hours of mining in every realistic case. Design accordingly (S4's shotlist is not "nice-to-have," it's the deliverable).

**2. The five-year mandate is being quietly violated, and pretending otherwise will rot the whole tool.** SAM 3 + onnxruntime + torch on Windows/Blackwell (sm_120 needs CUDA 12.8-era builds) is a maintenance treadmill [UNSURE how rough: several of these ecosystems lag new GPU archs by months]. The Node shell will indeed run in 2031; the worker will not, and if worker rot is allowed to infect the design (workarounds, unpinned wheels, "just reinstall X"), the *whole* app dies with it. My demand: the file-based boundary in §8.1.1 is load-bearing — the Node layer must never import, spawn cleverly around, or know anything about Python internals beyond "files appear in `library/`." ML deps live in `pipeline/` with uv.lock + revision-pinned models, and the ComfyUI-env subprocess fallback is implemented in S3 (one weekend), not deferred, because it's the difference between a bad week and a dead project when a wheel breaks.

**3. The identity gate cannot be solved by thresholds, and shipping it as if it can produces confident blends — the worst failure mode.** Risks 3 and 4 pull in opposite directions: tighten the gate, lose the 360° tail (the whole point); loosen it, blend two faces into a dataset that looks fine. Per-video calibration (§8.1.5) helps, but with a solo-subject video there are no negatives, and with lookalikes calibration *itself* becomes unreliable. What I'd insist on instead of "solved": (a) coverage cells carry an `idConfidence` field and rear/profile bins render visibly different when their evidence is quarantine-grade — the map must never present a shaky rear frame as equivalent to a frontal one; (b) blend-risk hard-blocks export rather than warning; (c) the second-model (SFace) verification runs on **every export**, not just tests — circular self-checks are how this failure mode ships; (d) quarantine is a first-class review surface, not a log. If that's too much ceremony, the honest fallback is dropping the "exactly" claim for rear coverage and saying so in the shot list — which loops back to objection 1: the director is where the bar actually gets met.

---

**[UNSURE] ledger (asserted nowhere as fact):** SAM 3 pip/Windows packaging & real-world occlusion performance; onnxruntime-GPU on sm_120; CR-FIQA-L installability (MagFace-norm proxy is the fallback); 6DRepNet360 and MEBOW maintenance status; H3 per-image resolution/size limits (unverified — config `null`, manifest warning); default threshold 0.38 and quarantine band 0.08 (calibrated per-video regardless); near-dup cosine 0.90; `node:sqlite` stability (avoided); Krea's exact training-side behavior on full-body images with small faces.
