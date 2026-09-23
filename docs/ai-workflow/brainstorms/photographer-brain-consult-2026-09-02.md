---
decision: "Design a 'professional photographer brain' — an automated color-grade + retouch decision system, distilled from top working photographers, that drives Topaz AI and a grading stack without producing plastic AI-looking results"
status: open
supersedes: none
---

# CONSULT PACKET — The Professional Photographer Brain

You are being consulted as a senior technical architect **and** a working master
retoucher/colorist. Answer as both. Do not be agreeable. If a part of this is
not achievable at the quality bar stated, say so plainly and say where the real
ceiling is.

---

## 1. What is being asked for

Sean is a working professional (26+ years in personal training, runs a
production SaaS, shoots his own brand/client/portrait/landscape photography).
He wants to build an application that **acts as an ultra-professional
photographer** at the editing stage — not a filter, not a preset pack, not an
"auto-enhance" button.

The stated goal, compressed:

- Automatically **color grade** a photo the way a top professional would grade
  *that specific* photo.
- **Enhance / clean / clarify** — remove noise ("fuzz"), recover detail,
  sharpen appropriately, using **Topaz AI** products (Photo AI / DeNoise /
  Sharpen / Gigapixel) as the pixel-level engine.
- **Retouch** — reduce bags under the eyes, blemishes, skin distraction.
- **And the hard constraint that overrides all of the above:** everything must
  stay **natural, realistic, and professional**. Not plastic. Not over-smoothed.
  Not the AI-skin look. Not the HDR-clarity look. Not the crushed teal-and-orange
  look. The output must survive being looked at by another professional
  photographer.
- The intelligence layer should have **"the brain of a professional
  photographer"** — the taste and judgement — and that brain should be
  **distilled from the top photographers/retouchers on YouTube**, who publish
  hours of their actual reasoning while editing.

The core insight to react to: **running Topaz is trivial. Deciding what this
image needs, how much of it, and when to stop, is the entire product.**

---

## 2. What already exists (real, verified — do not design around fantasy)

- **Hardware:** Windows desktop with an RTX 5090. Local ComfyUI already running
  (port 8189) and already wired into an existing in-house generation tool.
- **Existing "taste brain" precedent:** Sean already built a working *visual
  taste* system for image generation — a per-profile memory of kept/rejected
  images, pairwise preference judging, never-show-twice logic, and a generator
  loop (Generate → queue into his own captured ComfyUI graph → Judge → feed
  back). The architecture of "learn one person's taste from their own
  accept/reject decisions" is **already proven in this codebase**. Any proposal
  should say whether the photographer brain reuses that pattern or needs a
  different one, and why.
- **Stack:** Node.js + Express + PostgreSQL backend, React 18 + TypeScript +
  styled-components frontend. Comfortable with Python for CV/image work.
- **YouTube mining is a real, available capability, not a hypothetical.** There
  is a working tool surface that can: search YouTube, list a channel's videos,
  pull full transcripts, and locate specific moments inside a video. So
  "distill the top photographers from YouTube" is executable **today** — a
  corpus of transcripts can be built programmatically this week.
- **Topaz:** licensed desktop apps. Assume CLI/batch automation is available
  where Topaz exposes it, and that where it does not, a headless-UI automation
  or an equivalent open model may be substituted — say which you would do.
- **Budget posture:** strong preference for local/free inference (the 5090)
  over per-image cloud API cost. A cloud VLM call per image is acceptable ONLY
  if you justify the cost-per-image and it cannot be done locally.

---

## 3. The questions you must answer

Answer every numbered section. Be specific and technical. Name real
measurements, real parameter ranges, real model names, real failure modes.

### Q1 — Honest feasibility
Is a genuinely professional-grade automated grade+retouch brain achievable, or
is the honest answer "80% of the way, with a human on the last 20%"? Where
exactly is the ceiling? Name the specific decisions a machine currently
**cannot** make well, and the ones it can already make better than an average
working pro.

### Q2 — The decision architecture
Design the brain. For ONE incoming image, what is the pipeline from pixels to
a finished edit? Be concrete about the layers:

- **Perception / measurement:** what does the system actually measure off the
  image before deciding anything? (Give the real list: histogram statistics,
  clipped-highlight and crushed-shadow percentages, per-channel balance,
  skin-tone location in a perceptual space, face/eye/iris detection, per-region
  luminance ratios, subject-vs-background separation, blur/noise estimation,
  ISO and camera metadata, scene classification, colour-cast estimation…)
- **Diagnosis:** how those measurements become *statements about the image*
  ("underexposed by 0.7 stops on the subject's face", "green cast from
  fluorescent bounce", "subject 1.3 stops darker than the background",
  "shadow noise consistent with ISO 6400", "hotspots on the forehead").
- **Prescription:** how a diagnosis becomes an ordered edit plan with
  parameters, and in what ORDER operations must run (this order matters
  enormously — state it and justify it).
- **Execution:** which tool does what (Topaz vs. raw developer vs. curves/HSL
  vs. local dodge & burn vs. frequency separation vs. inpainting).
- **Self-critique:** how does the system look at its own output and decide it
  went too far? What is the stopping rule?

### Q3 — The naturalness guardrails (THE most important section)
This is where these systems always fail. Answer in detail:

- What are the **measurable signatures** of an over-processed image? Give
  metrics that can actually be computed — skin texture frequency energy loss,
  local contrast overshoot / halo detection at edges, unnatural chroma
  clustering in skin, loss of pore-scale high-frequency detail, eye-white
  luminance exceeding a threshold, the "everything is equally sharp" tell,
  gradient reversal artifacts around the jaw and hair.
- What are the **hard caps** a pro would never exceed? (e.g. maximum acceptable
  skin smoothing, maximum eye-bag reduction before the person stops looking
  like themselves, the sharpening radius/amount ceiling per output size, the
  saturation ceiling on skin.)
- How do you **keep identity**? Removing eye bags is the single most dangerous
  operation in this list: taken too far it changes who the person is and reads
  instantly as fake. What is the correct technique and what is the correct
  ceiling? (Reduce vs. remove. Preserve the tear-trough shading that gives the
  face structure. Keep pore texture.)
- Propose a **"would another photographer notice?" verifier** — a concrete
  automated check that runs after the edit and rejects or dials back the result.

### Q4 — Distilling the photographers (the corpus problem)
This is the part Sean specifically asked about. Be concrete:

- **Who?** Name actual top photographers/retouchers/colorists whose YouTube
  output is worth mining, and say what each one is the authority ON (portrait
  retouching, colour theory, natural light, commercial beauty, landscape
  grading, cinematic colour, skin tones on darker skin, wedding/event volume
  workflow). Name real channels/people, and be honest where you are unsure of
  a name.
- **What do you extract?** Transcripts are people talking while dragging
  sliders. How do you convert "I'm just going to bring the shadows up a touch
  here because I want to keep the mood" into an executable rule? Propose the
  extraction schema — the structured record pulled out of each teaching moment
  (condition → action → magnitude → rationale → constraint → the thing they
  warn against).
- **How do you resolve disagreement?** Photographers contradict each other, and
  taste is genre-dependent. How does the brain hold conflicting expert opinions
  without averaging them into mush? (Averaging expert taste produces the exact
  mediocre look Sean is trying to avoid — address this directly.)
- **Grounding problem:** transcripts have no pixels attached. A rule mined from
  speech is untested. How do you validate a mined rule against real images
  before it is allowed to influence output?
- Is the mined corpus better used as (a) a rule base, (b) retrieval context for
  a VLM at decision time, (c) training data for a small local model, or (d)
  something else? Pick one primary and defend it.

### Q5 — Local model / tooling recommendation
Given a 5090 and an existing ComfyUI install, what is the actual recommended
stack? Be specific about models and libraries:

- Vision model for image understanding/diagnosis (local VLM vs cloud).
- Face/landmark/segmentation for masking (skin, eyes, tear-trough, hair, sky,
  subject vs background).
- The raw development / grading engine (what actually applies the curves — a
  Python pipeline over the raw, a LUT, darktable/RawTherapee CLI, something
  else).
- Where Topaz genuinely wins over an open alternative, and where it does not.
- What is realistically automatable in Topaz vs. what needs a substitute.

### Q6 — Personalisation
A brain that edits like "the average top photographer" is not the goal — it
should converge on **Sean's** look while staying inside professional bounds.
How does per-user taste get learned, given the existing kept/rejected +
pairwise-judging pattern already proven in his codebase? How many decisions
before it is actually personalised? How do you avoid the taste loop collapsing
into a narrow rut?

### Q7 — Build order
Give numbered, independently shippable slices, smallest first, each with a
concrete "this is done when…" test. The first slice must produce something
visibly useful within days, not months. Say which slice is the riskiest and
should be de-risked with a spike before anything else is built.

### Q8 — Three ways this fails
Name the three most likely ways this project ends up abandoned or producing
worse results than Lightroom's auto button. Be brutal. For each, name the early
warning sign that would show up in the first month.

---

## 4. Output format (follow exactly)

    ## VERDICT
    (2-4 sentences: is this real, what is the honest ceiling, what is the single
    biggest risk)

    ## Q1 FEASIBILITY
    ## Q2 DECISION ARCHITECTURE
       ### Measurement layer
       ### Diagnosis layer
       ### Prescription layer (with operation ORDER and why)
       ### Execution layer
       ### Self-critique / stopping rule
    ## Q3 NATURALNESS GUARDRAILS
       ### Measurable over-processing signatures
       ### Hard caps table (operation | safe range | never exceed | why)
       ### Identity preservation / eye-bag doctrine
       ### The "would a pro notice" verifier
    ## Q4 DISTILLING THE PHOTOGRAPHERS
       ### Who (named, with their authority domain)
       ### Extraction schema
       ### Handling expert disagreement
       ### Grounding mined rules against real pixels
       ### Primary use of the corpus (pick one, defend)
    ## Q5 STACK RECOMMENDATION
    ## Q6 PERSONALISATION
    ## Q7 BUILD ORDER (numbered slices with done-tests)
    ## Q8 THREE WAYS THIS FAILS
    ## WHAT I WOULD CHANGE ABOUT THE PLAN AS BRIEFED
    (the part Sean did not ask about but should have)

Be dense. Prefer tables and specific numbers over prose. Do not pad. If you do
not know something, mark it `[UNSURE]` rather than inventing a confident answer
— an invented channel name or an invented parameter range is worse than a gap.
