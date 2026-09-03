---
decision: "Research base for a video -> tagged-person -> 360 identity-dataset app feeding MiniMax H3 and Krea. Findings only; the blueprint is Fable's."
status: open
supersedes: none
---

# Character Capture App — Research Base (pre-blueprint)

**Date:** 2026-09-02 · **Author:** Opus 5 (research pass only — no blueprint, no code)
**Consumers:** Fable 5.1 (blueprint author), GLM 5.3 + GLM 5.3-flash (parallel independent view)

> Everything below is tagged. `[VERIFIED]` = I read the source this session.
> `[RESEARCH]` = sourced from a cited page, not independently reproduced.
> `[UNVERIFIED]` = I could not confirm it; treat as an open question, not a fact.

---

## 1. The ask, restated precisely

Sean builds characters in **MiniMax H3 (Hailuo 3.0)** and **Krea**. Both need reference
imagery of a real person. Hand-collecting 15–30 good stills is the bottleneck.

**The app:** point it at a video → **tag one person in it** → it tracks that person and
harvests enough high-quality, *identity-locked*, angle-diverse stills of **face and body**
to make a character that looks **exactly** like them.

**Added mid-session (Sean):** the app must be near-zero-friction —
**drop video files into a watched folder and it starts on its own**, with a manual
"start it myself" override. No CLI ceremony per run.

Two things follow that are not obvious from the ask, and both change the design:

1. **"360°" is a coverage *target*, not a property of the footage.** Ordinary video
   almost never contains a full orbit of a person. So the app cannot merely *extract* —
   it must **measure coverage, report the holes, and tell Sean what to go shoot**.
   That reframes it from a scraper into a *capture director*. This is the single
   biggest design consequence in this document.
2. **The two targets want different artifacts** (§3). One dataset does not serve both.

---

## 2. Environment ground truth `[VERIFIED]`

| Fact | Value |
|---|---|
| GPU | **RTX 5090, 32,607 MiB VRAM**, driver 610.62 |
| Python | 3.12.0rc3 (on PATH) |
| Node | v22.14.0 |
| Existing local tool | `~/Desktop/swan-taste-brain` — Node server + vanilla HTML/CSS/JS, **`dependencies: {}` by deliberate design**, no build step, no framework |
| Existing LoRA export | `swan-taste-brain/prompter/export-lora-dataset.mjs` (99 lines) + `prompter/lib/lora.mjs` (102 lines) — `datasetFor`, `captionFor`, `TOKEN_RE`, `TRAINING_NOTES`, with a **licence gate** (reference photographs must never reach a training folder) and a regression suite `test-lora.mjs` |
| Existing training doctrine | `TRAINING_NOTES` — Krea 2 **RAW not Turbo**, 1024px, linear rank 32, 3000 steps but "usable checkpoints land 1000–2000", cache text embeddings, sampling disabled, style LoRA needs strength 1.5–2.5. **32GB trains at 1024 with no offloading.** |
| ComfyUI | 0.34.2 on port **8189**; Krea 2 turbo weights on disk |
| Proven identity mechanism | `TextEncodeQwenImageEditPlus` + `ReferenceLatent` — reference image into *conditioning*, not style transfer (see learning packet `20260902-style-reference-copies-aesthetics-identity-needs-edit-conditioning.md`) |

**Two reuse consequences:**
- The export/caption/hygiene half is **partly built already**. The novel half is
  video → identity-locked, coverage-mapped frame harvest.
- `TRAINING_NOTES` is **style-LoRA** doctrine. Sean's app is **identity**. Do not assume
  the numbers transfer — identity LoRAs are a different regime. `[UNVERIFIED]`

**Placement:** this is a local desktop tool, not SwanStudios production. It belongs as a
sibling of `swan-taste-brain` / `Swan-Prompt-Studio`, **not inside SS-PT.**

---

## 3. Target-model constraints — the two outputs diverge

### MiniMax H3 (Hailuo 3.0) `[RESEARCH]`

| Constraint | Value |
|---|---|
| Reference **images** | **up to 9** |
| Reference **video clips** | **up to 3**, 2–15 s each, **<=15 s total** |
| Reference **audio** | up to 3, <=15 s total; **cannot be sent alone** — must travel with >=1 image or video |
| **Total files** | **12 max** per generation |
| Output | 5–15 s, 1440p ("2K") short edge, fixed 24 fps; 21:9 ~= 2976x1248 |
| Aspect ratios | 21:9, 16:9, 4:3, 1:1, 3:4, 9:16 |
| Identity guidance | "Face, styling, motion, and voice carry across shots **when the same reference set is supplied to each generation**" — reuse one set; do not re-describe the character in the prompt and expect identity to hold |
| Image resolution / filesize limits | **not stated on the source page** `[UNVERIFIED]` — must be confirmed against MiniMax's own API docs before the exporter hard-codes anything |

**H3 is inference-time reference, not training.** The job is to pick the **9 most
informative, least redundant** images — a *set-selection* problem (maximize coverage
subject to a hard budget), not a "collect as many as possible" problem.

**H3 also natively accepts video clips.** Sean asked for photos; H3 wants up to 3 short
clips too. The app should export **clips as well as stills** — motion and voice carry
identity that no still can. This is an amplification of the original ask, not a
substitute for it.

### Krea `[RESEARCH]`

| Constraint | Value |
|---|---|
| Minimum | **3 images** |
| Recommended | **10–30** — "larger datasets (10-30) improve the model's ability to generalize" |
| Community guidance for avatars | 10–20 at >=512x512, neutral background, **front and 3/4 angles**, smiles + neutral expressions |
| Character-specific | "various poses and expressions"; "balance variety and consistency" |
| Curation | "consistent dataset with uniform lighting, color balance, and resolution" |
| Output | a style code applied to Flux / Edit / Enhancer |
| Resolution minimum, training time, banned content | **not documented** `[UNVERIFIED]` |

⚠️ **A tension the blueprint must resolve, not paper over.** Krea's own docs say
*"uniform lighting, color balance and resolution."* The LoRA field says the opposite —
*lighting diversity is what makes a model generalize* (§4). These are different goals:
uniformity buys **fidelity**, diversity buys **flexibility**. For "must look **exactly**
like this person" — Sean's stated bar — fidelity likely wins, and the app should probably
ship **lighting-uniform by default with a diversity slider**, not the reverse. Flagged
for Fable to decide. `[UNVERIFIED]`

### Independent LoRA-field guidance `[RESEARCH]`

- Production range for a character LoRA: **12–30 images**. Below 12, "not sufficient
  angle and lighting coverage to generalize."
- "The training dataset is the most consequential decision… dataset quality determines
  output quality **at a higher rate than any parameter** in the training config."
- Overfitting = reproduces training images, fails on new angles. Fixed by fewer steps,
  **more diverse images**, or lower rank. Best prevention: cover the needed angle and
  lighting range **before** training.

**Net:** one extraction pass, **three export profiles** —
`h3-reference` (<=9 stills + <=3 clips <=15 s, total <=12), `krea-train` (12–30, uniformity-biased),
`archive` (everything that passed the gate, for re-cuts).

---

## 4. What makes a *good* identity dataset — the scoring axes

The app's real intelligence is a **per-frame score** and a **set-level coverage map**.

**Per-frame gates (reject outright):**

- **Sharpness** — variance of the Laplacian; below threshold ⇒ blurry `[RESEARCH]`.
  Must be computed **on the face crop**, not the whole frame — a sharp background with a
  motion-blurred face passes a naive whole-frame check.
- **Face pixel size** — a face crop smaller than the target training resolution is
  upscaled garbage. Hard floor.
- **Exposure** — clipped highlights / crushed shadows destroy the features being learned.
- **Occlusion** — hand, mic, hair, another person crossing.
- **Identity** — ArcFace cosine to the tagged reference (below).

**Per-frame scores (rank, don't reject):**

- **Face Image Quality Assessment (FIQA)** — a purpose-built field. **CR-FIQA** benchmarks
  best (lowest AUC in almost all settings), ahead of FaceQAN, MagFace, SER-FIQ `[RESEARCH]`.
  FIQA predicts *utility for recognition*, which is much closer to "will this teach the
  model this face" than any generic sharpness metric.

**Set-level coverage (the differentiator):**

- **Head pose** — yaw/pitch/roll. **6DRepNet360** handles the *full* rotation range,
  unlike older models restricted to narrow angles; beats WHENet-V by 3% on BIWI `[RESEARCH]`.
  Full range matters precisely because Sean wants profile and rear views.
- **Body orientation** — a separate problem from head pose. **MEBOW** (Monocular
  Estimation of Body Orientation in the Wild) is the named in-the-wild work; coarse
  schemes bin 0–360° as frontal / frontal-left / frontal-right / left / right / rear
  `[RESEARCH]`. Head yaw != body yaw — a person can look over their shoulder. Sean asked
  for the **body** to match too, so body orientation must be binned independently.
- **Framing mix** — close-up / medium / full-body. Sean's "their body needs to look
  exactly the way their body looks" means full-body frames are mandatory, and those are
  exactly the frames where the *face* crop is smallest. **The face gate and the body
  requirement pull against each other** — likely needs per-framing-class thresholds
  rather than one global floor.
- **Expression spread**, **lighting spread** (subject to the §3 tension).
- **Redundancy kill** — near-duplicate rejection on embedding distance. Video at 30 fps
  yields hundreds of near-identical frames; without this the "30 images" are 30 copies of
  one pose, which is the worst possible dataset.

---

## 5. Candidate stack per stage

| Stage | Candidate | Note |
|---|---|---|
| Ingest / watch folder | Node `fs.watch` + debounce | Matches Sean's "drop it in and it goes". `swan-taste-brain` already has a `--watch` precedent (`capture-workflow.mjs --watch`) |
| Shot segmentation | PySceneDetect | Standard; note it does scene *boundaries*, **not** sharpness `[RESEARCH]` |
| **Tag + track a person** | **SAM 3** (`facebook/sam3`) | Click-to-track **and** text-prompted ("person"); streaming memory; **unique per-object ID maintained across frames, through occlusion**; multi-object (demo shows 8); bfloat16 `[RESEARCH]`. This is the closest thing to Sean's exact ask that exists. |
| Fallback | SAM 2 | Single click → masklet propagation; one extra click recovers a lost object. Known weaknesses: **shot changes, crowded scenes after long occlusion, visually similar nearby people** `[RESEARCH]` — i.e. exactly the "two people in one video" case |
| **Identity lock** | InsightFace / **ArcFace**, 512-d embedding | Cosine similarity; typical 1:1 threshold **0.30–0.45** at FMR 1e-4…1e-5, **but recompute for your population** and pick the threshold on a validation split, never the test set `[RESEARCH]` |
| Head pose | **6DRepNet360** (`sixdrepnet` on PyPI) | Full-range yaw/pitch/roll `[RESEARCH]` |
| Body orientation | **MEBOW** | `[RESEARCH]`, integration effort unverified |
| Face quality | **CR-FIQA** | Best-benchmarking FIQA `[RESEARCH]` |
| Sharpness | OpenCV Laplacian variance | Cheap pre-filter before the expensive models |
| Export / caption / licence gate | **reuse `swan-taste-brain/prompter/lib/lora.mjs`** | Already written and regression-tested `[VERIFIED]` |
| UI | Node server + vanilla JS, zero deps | Matches the house pattern `[VERIFIED]` |
| CV worker | Python 3.12 subprocess | Mirrors the Photographer Brain call: "Node → Python worker" |

**Ordering note:** run cheap gates first (Laplacian, face size) and expensive models
(SAM 3, CR-FIQA, 6DRepNet) only on survivors. A 10-minute 30 fps video is ~18,000 frames;
running SAM 3 + FIQA on all of them is the difference between minutes and hours.

---

## 6. Risks — ranked, hostile

**R1 — Video frames may not be good enough, and this threatens the premise.** `[RESEARCH]`
"The visual quality of publicly available video training datasets is **much lower** than
their image counterparts"; video frames carry **motion blur, compression artifacts,
sensor noise, overexposure**. There is a documented **quality domain gap** between
high-quality image training sets and video data. Sean's bar is *"looks exactly like the
person."* A dataset of 8-bit, inter-frame-compressed, rolling-shutter 1080p crops may
simply not clear that bar however well curated.
→ **Mitigation, and it is the app's core value:** ruthless gating (keep 20 of 18,000),
a hard face-pixel floor, prefer I-frames, and — critically — **shoot-to-spec guidance**
so the source footage is good in the first place. 4K/6K source, high shutter speed,
and **pausing at each angle** rather than orbiting smoothly: the photogrammetry turntable
industry pauses at every angle *specifically because* motion causes blur `[RESEARCH]`.
→ **This risk must be tested first, before any UI is built** (§8).

**R2 — Face "restoration" will silently destroy identity.** GFPGAN/CodeFormer
**hallucinate** plausible detail from a learned prior. CodeFormer preserves identity best
(highest IDS) and has a fidelity parameter, GFPGAN carries an identity-preserving loss but
can inject artifacts from heavily corrupted inputs `[RESEARCH]`. But "best-preserving" is
not "preserving" — for a dataset whose entire purpose is *this exact face*, running a
generative restorer is poisoning the well with a *confident* wrong face.
→ **Default: OFF.** If offered at all, opt-in, flagged in the manifest, never on the
`h3-reference` profile, and any restored frame must pass an ArcFace check **against the
un-restored original** — not merely against the reference.

**R3 — The identity threshold is a population-specific number.** A 0.35 cosine copied
from a blog is a guess. Same-person cosine collapses under large pose (the reason
"identity consistency across large face poses" is an active research topic `[RESEARCH]`) —
so a fixed threshold will **systematically reject exactly the profile and rear shots the
360° goal needs**. Naive tuning produces a dataset of nothing but frontal faces that
*looks* clean and is useless.
→ Threshold likely must be **pose-conditioned**, and calibrated on a Sean-labeled set.

**R4 — Two similar-looking people, or the subject leaving and re-entering.** SAM 2's
documented weak spots are shot changes, crowded scenes after occlusion, and visually
similar nearby objects `[RESEARCH]`. SAM 3's persistent IDs help but are not a proof.
→ ArcFace must act as an **independent second opinion on every kept frame**, not just at
tag time. Tracker says "same person" + ArcFace says "different face" ⇒ drop and warn.
A mis-tracked frame is worse than a missing one: it teaches the model a *blend* of two people.

**R5 — Coverage will usually be incomplete, and the honest output is a gap report.**
Casual video contains a narrow yaw band. If the app silently returns 30 frontal frames,
it has failed while appearing to succeed.
→ The coverage map must be a **first-class deliverable**, and "you have no rear-view
frames; shoot a 20-second orbit pausing at 45° increments" is a legitimate, valuable
result. **An empty bin must be reported, never interpolated.**

**R6 — Consent and likeness.** The app industrializes "make a photoreal synthetic double
of a specific real person." For Sean, that is fine. For **clients** it is a written-consent
matter, and datasets of real people are PII under Rule 8.
→ Datasets stay local, never sent to an LLM; a consent field per subject; and this is a
policy question for Sean before any client-facing use, not an engineering one.

**R7 — Scope collision with work in flight.** Another session is holding
`PHOTOGRAPHER-BRAIN-*` right now (SWA-233), and `export-lora-dataset.mjs` already exists.
→ Reuse, don't re-implement. Check the lane ledger before building the export half.

---

## 7. Competitive landscape — what already exists `[RESEARCH]`

| Tool | Does | Does **not** |
|---|---|---|
| **LoRA Dataset Studio** (self-hosted) | Full lifecycle: build/scrape/triage, curate, caption, watermark-clean, train on 5 families or full Krea 2, rank checkpoints. Dedup "compares every shot to every other, groups near-identical takes, keeps the sharpest" | Tag/track a *specific person*; identity lock; coverage map |
| **DatasetForge** | Desktop, no Python; auto-caption, crop, dedup | Same gaps |
| **Frame Extractor** / Civitai extractor | Scene detection + **sharpest frame per scene**, GPU accel | Same gaps |
| **vid2train** | Video → image dataset | Same gaps |

**The commodity parts are solved:** frame extraction, sharpness ranking, dedup, captioning.
**Nobody found does the three things Sean actually asked for:**

1. **Tag one specific person** and hold identity on them through the video.
2. A **360° coverage map** with named gaps and a re-shoot instruction.
3. **Dual export profiles** for a <=9-file inference reference set vs a 12–30 training set.

That is the defensible core, and it is where the build effort should go. Everything
else should be borrowed or reused. *(Landscape from one search pass — not exhaustive.
An adjacent tool may already do #1; worth one more sweep before committing. `[UNVERIFIED]`)*

---

## 8. What I recommend is settled before a line of UI is written

**Spike R1 first.** Take one real video of a known person, extract the best ~20 frames by
hand-tuned gates, run them through Krea and H3, and look at the result. If video-sourced
frames cannot clear the "exactly like them" bar, the whole app changes shape — it becomes
a *shoot director + stills-capture assistant* rather than a video harvester. **That answer
is cheap to get and it determines the architecture.** Everything in §5 is wasted effort
if R1 fails, and no amount of blueprint quality substitutes for rendering one test.

---

## 9. Open questions for Sean

1. **Whose faces?** Only Sean/consenting adults, or clients too? (Changes consent, storage, PII posture.)
2. **Source footage** — existing casual video, or will he shoot to spec? If he'll shoot, the shoot-guide is worth more than the extractor.
3. **Body coverage bar** — is full-body 360° a hard requirement, or is face-360 + a few full-body shots enough? (Full-body 360 from casual video is very unlikely to exist.)
4. **Clips as well as stills?** H3 takes 3 clips of 2–15 s. Export them?
5. **Krea target** — Krea *training* (a real LoRA) or Krea 2 *edit-conditioning* (the mechanism already proven on disk)? These need different datasets and the packet should not assume.
6. **Priority** — this is a side tool. Does it outrank the SwanStudios production stack right now?

---

## 10. Sources

- [MiniMax H3 specs and input limits — Morphic](https://morphic.com/resources/models/minimax-h3)
- [How to use MiniMax H3: references, editing, audio — Morphic](https://morphic.com/resources/how-to/minimax-h3-guide)
- [Krea Documentation — Training](https://www.krea.ai/docs/features/training)
- [Krea AI Train Consistent Avatars tutorial — selfielab](https://selfielab.me/blog/krea-ai-train-consistent-avatars-step-by-step-tutorial-20260219)
- [LoRA Training for Character Consistency — AXIS AI Studios](https://www.axisaistudios.com/blog/how-to-use-lora-training-for-character-consistency-in-vertical-drama)
- [SAM 3 for Video: Concept-Aware Segmentation and Object Tracking — PyImageSearch](https://pyimagesearch.com/2026/03/02/sam-3-for-video-concept-aware-segmentation-and-object-tracking/)
- [SAM 2: Segment Anything in Images and Videos — arXiv](https://arxiv.org/html/2408.00714v1)
- [Meta Segment Anything Model 2](https://ai.meta.com/sam2/)
- [Choosing a Face Recognition Model and Threshold — InsightFace](https://www.insightface.ai/guides/choose-face-recognition-model-and-evaluate)
- [ArcFace paper — InsightFace](https://www.insightface.ai/research/arcface)
- [CR-FIQA — CVPR 2023](https://openaccess.thecvf.com/content/CVPR2023/papers/Boutros_CR-FIQA_Face_Image_Quality_Assessment_by_Learning_Sample_Relative_Classifiability_CVPR_2023_paper.pdf)
- [CLIB-FIQA — CVPR 2024](https://openaccess.thecvf.com/content/CVPR2024/papers/Ou_CLIB-FIQA_Face_Image_Quality_Assessment_with_Confidence_Calibration_CVPR_2024_paper.pdf)
- [6DRepNet — GitHub](https://github.com/thohemp/6DRepNet)
- [Towards Robust and Unconstrained Full Range of Rotation Head Pose Estimation (6DRepNet360)](https://arxiv.org/pdf/2309.07654)
- [MEBOW: Monocular Estimation of Body Orientation In the Wild](https://arxiv.org/pdf/2011.13688)
- [Collaborative Face Experts Fusion: Identity Consistency Across Large Face Poses](https://arxiv.org/pdf/2508.09476)
- [CodeFormer — Blind Face Restoration with Codebook Lookup Transformer](https://arxiv.org/pdf/2206.11253)
- [Deep Face Restoration: A Survey](https://arxiv.org/pdf/2211.02831)
- [AnimateDiff (video-vs-image data quality gap)](https://arxiv.org/pdf/2307.04725)
- [Blur detection with OpenCV — PyImageSearch](https://pyimagesearch.com/2015/09/07/blur-detection-with-opencv/)
- [PySceneDetect Python API](https://www.scenedetect.com/api/)
- [Photogrammetry & 3D Modeling turntables — Iconasys](https://www.iconasys.com/applications/photogrammetry-3d-models/)
- [LoRA Dataset Studio — GitHub](https://github.com/perfectgf/lora-dataset-studio)
- [Frame Extractor — GitHub](https://github.com/Tranchillo/Frame_Extractor)
- [vid2train — GitHub](https://github.com/RichKMLS/vid2train)
