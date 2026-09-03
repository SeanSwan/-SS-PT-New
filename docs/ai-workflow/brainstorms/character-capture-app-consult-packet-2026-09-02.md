---
decision: "Consult packet: design a video -> tagged-person -> 360 identity-dataset app. Same brief to Fable 5.1 (blueprint author) and GLM 5.3 / 5.3-flash (independent parallel view)."
status: open
supersedes: none
---

# CONSULT PACKET — "Character Capture" app

**You are being asked to design an application.** Same brief goes to three seats
independently. Do not assume the others' answers; disagree where you disagree.

Companion research (read if you have repo access; otherwise everything you need is inline):
`docs/ai-workflow/brainstorms/character-capture-app-research-2026-09-02.md`

---

## 1. The problem

Sean creates photorealistic AI characters in **MiniMax H3 (Hailuo 3.0)** and **Krea**.
Both need reference imagery of a real person. Hand-collecting good stills is the bottleneck.

**He wants an app that:**

1. Takes a **video**.
2. Lets him **tag a person** in it (face and body).
3. **Stays locked on that person** for the whole video.
4. Harvests **enough high-quality stills covering 360° of their face and body**.
5. Outputs a dataset so H3/Krea produce a character that looks **exactly** like them —
   face *and* body.

**Usability requirement (Sean's own words, and it is a hard requirement):** he must be able
to **drop video files into a folder** and have the app pick them up and **start working
immediately on its own** — with the option to start a run manually instead. No per-run CLI.

**The bar is "exactly like the person," not "resembles."** Design against that bar.

---

## 2. Hard external constraints (researched, cite-backed)

### MiniMax H3 — an *inference-time reference set*, not training
- **<=9 reference images**, **<=3 reference video clips** (2–15 s each, **<=15 s total**),
  <=3 audio clips (<=15 s total, cannot be sent without an image or video).
- **12 files maximum, total, per generation.**
- Output 5–15 s, 1440p short edge, fixed 24 fps.
- Identity holds when **the same reference set is reused** across generations; re-describing
  the character in the prompt does not hold identity.
- Per-image resolution/filesize limits are **NOT documented on the sources found** — treat
  as an open question; do not hard-code a guess.

### Krea — a *training set*
- Minimum 3; **10–30 recommended** ("improves ability to generalize").
- Avatar guidance: 10–20 at >=512x512, neutral background, front + 3/4 angles,
  smiles and neutral expressions, varied poses.
- Krea's docs say curate for **uniform lighting, colour balance and resolution**.

### Independent LoRA-field guidance
- Character LoRA production range **12–30**; below 12 there is "not sufficient angle and
  lighting coverage to generalize."
- **Dataset quality determines output quality more than any training parameter.**
- Overfit (won't generalize to new angles) is fixed by more *diverse* images / fewer steps /
  lower rank.

⚠️ **These two conflict and you must resolve it explicitly.** Krea says *uniform* lighting;
the LoRA field says *diverse* lighting. Uniformity buys fidelity, diversity buys flexibility.
Sean's bar is fidelity. State your call and your reasoning.

---

## 3. Environment (verified this session)

- **RTX 5090, 32 GB VRAM**; Python 3.12; Node 22.14; Windows 11.
- Existing sibling tool `~/Desktop/swan-taste-brain`: **Node server + vanilla HTML/CSS/JS,
  `dependencies: {}` on purpose, no build step, no framework** — "must still run in five
  years from a checkout and `node serve.mjs`." Tests are plain `.mjs` scripts.
- **Already built there:** `prompter/export-lora-dataset.mjs` + `prompter/lib/lora.mjs`
  (`datasetFor`, `captionFor`, `TOKEN_RE`, `TRAINING_NOTES`) with a **licence gate** and a
  regression suite. Existing `TRAINING_NOTES` are **style-LoRA** doctrine (Krea 2 RAW not
  Turbo, 1024px, rank 32, usable checkpoints 1000–2000 steps) — Sean's app is **identity**,
  so do not assume they transfer.
- ComfyUI 0.34.2 on port 8189, Krea 2 weights on disk. Proven identity mechanism there is
  `TextEncodeQwenImageEditPlus` + `ReferenceLatent` (reference into *conditioning*).
- This is a **local desktop tool**, a sibling of swan-taste-brain — **not** part of the
  SwanStudios production repo.

---

## 4. Candidate components (challenge these — they are candidates, not decisions)

| Stage | Candidate |
|---|---|
| Watch folder | Node `fs.watch` + debounce |
| Shot segmentation | PySceneDetect |
| Tag + track a person | **SAM 3** (`facebook/sam3`) — click-to-track + text prompts, persistent per-object IDs through occlusion. Fallback SAM 2 (weak on shot changes, crowds after occlusion, similar-looking people) |
| Identity lock | InsightFace / **ArcFace** 512-d, cosine; typical 1:1 threshold 0.30–0.45 at FMR 1e-4…1e-5, **recompute per population** |
| Head pose | **6DRepNet360** — full rotation range |
| Body orientation | **MEBOW** — head yaw != body yaw |
| Face quality | **CR-FIQA** — best-benchmarking FIQA |
| Cheap pre-filter | OpenCV Laplacian variance (**on the face crop**, not the frame) |
| Export | reuse `lib/lora.mjs` |

---

## 5. The risks you must design against

1. **Video frames may not be good enough for the "exactly like them" bar.** Video carries
   motion blur, inter-frame compression artifacts, sensor noise; there is a documented
   quality gap between video frames and photo datasets. **This threatens the premise.**
2. **Face restorers (GFPGAN/CodeFormer) hallucinate identity.** They invent plausible detail
   from a prior. On an identity dataset that is poisoning the well with a *confident* wrong face.
3. **A fixed ArcFace threshold will systematically reject profile and rear shots** — same-person
   cosine similarity degrades under large pose — i.e. it kills exactly the 360° coverage that
   is the point of the app.
4. **Mis-tracking onto a second person** teaches the model a blend of two faces. Worse than a
   missing frame.
5. **Coverage will usually be incomplete.** Casual video has a narrow yaw band. Silently
   returning 30 frontal frames is failure that looks like success.
6. **Face-gate vs body requirement pull against each other**: full-body frames are the ones
   where the face crop is smallest.
7. **Consent/PII** if this is ever pointed at clients rather than Sean.

---

## 6. The reframe I think is correct — agree or kill it

Ordinary video almost never contains a 360° orbit of a person. So the app probably cannot
be only an *extractor*. It likely must also be a **capture director**: measure coverage,
report the empty bins, and tell Sean **what to go shoot** to fill them
(the photogrammetry turntable industry **pauses at each angle** precisely because motion
causes blur — smooth orbits are the wrong way to shoot this).

**Tell me if this reframe is right, half-right, or wrong.** If it is right, the coverage map
and the re-shoot instruction are first-class deliverables, not a nice-to-have. If wrong, say
why and what replaces it.

Also under consideration: because H3 accepts **video clips** as references, the app arguably
should export **clips as well as stills**. Sean asked for photos. Is exporting clips a real
win or scope creep?

---

## 7. Competitive reality

Existing tools (LoRA Dataset Studio, DatasetForge, Frame Extractor, vid2train) already do
frame extraction, scene detection, sharpest-frame picking, dedup and captioning. **None found
does:** (a) tag and identity-lock one specific person, (b) a 360° coverage map with named
gaps, (c) dual export profiles for a <=9-file H3 reference set vs a 12–30 Krea training set.

Build effort should concentrate there. Say so if you disagree.

---

## 8. WHAT TO DELIVER

Produce all six. Be concrete and buildable — a worker-bot should execute it with **zero
further questions** (Rule 68 detail bar).

1. **BLUEPRINT** — architecture; every stage with its inputs, outputs, chosen model/library
   and *why that one*; the data model (what a "subject", a "session", a "candidate frame",
   a "coverage bin", an "export profile" each are); file/folder layout on disk; where state
   lives; failure and resume behaviour.
2. **WIREFRAMES** — desktop and mobile, as ASCII/markdown. Cover at minimum: the watch-folder
   idle/auto-start state, the tagging screen (how Sean picks the person), the review/curation
   screen, and the **coverage map** with its gap callouts. Sean's standing mandate is
   *fewest clicks, least time* — state the tap/click count for the main path.
3. **FLOWCHART + MERMAID** — happy path plus the branch points that matter: no face found,
   two candidate people, tracker loses the subject, identity check disagrees with the tracker,
   coverage incomplete, video too low quality to use.
4. **TESTS** — what proves each stage works, including the ones that are hard to test:
   how do you prove identity lock actually held? how do you prove the coverage map is honest
   about an empty bin rather than interpolating it? **Include a positive control for every
   absence claim** (a test that would fail if the check were broken). Name the golden fixtures
   needed.
5. **SLICES** — numbered, independently shippable, each with acceptance criteria. Slice 1
   should be the cheapest thing that *proves or kills the premise* (see risk 1).
6. **YOUR THREE STRONGEST OBJECTIONS** — where this design is most likely to fail in
   practice, and what you would do instead. Do not be agreeable. If you think the whole thing
   should be built differently, say that first and argue it.

**Flag anything you are unsure about as `[UNSURE]` rather than asserting it.** A confident
wrong number here costs real build time. If you do not know H3's per-image resolution limit,
say so — do not invent one.
