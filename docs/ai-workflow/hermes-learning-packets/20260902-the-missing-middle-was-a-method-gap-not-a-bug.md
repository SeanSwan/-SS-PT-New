---
date: 2026-09-02
originating_model: claude-fable-5
title: The worst defect was a method gap two code reviews could not see
models_used:
  - model: claude-fable-5
    role: third-pass hostile reviewer + builder
    did: attacked the method/model/assumption lanes the GLM passes skipped; found the avatar-pipeline gap; researched, built, and proved workflow 05
    cost: subscription
  - model: glm-5.3 / glm-5.3-flash
    role: prior two review passes (this workstream)
    did: found 11 real code/doc defects between them - but neither questioned whether the PIPELINE could reach its goal
    cost: subscription
skills_touched:
  - id: instrument-check
    change: reinforced
    failure: I had earlier asserted "Krea 2 image-reference mode" without running it - it was STYLE reference, not identity
  - id: web-research-before-asserting-novelty
    change: reinforced
    failure: the fix was a documented community-standard technique on nodes already installed; research found it in one pass
---

# The worst defect was a method gap two code reviews could not see

Two hostile code reviews (GLM 5.3 + Flash) found 11 real defects between them — installer bugs,
note arithmetic, dead code, wrong recipes. Every one was a flaw in *a thing that existed*. None
of them asked the question that mattered most: **can this pipeline actually reach its goal?** The
avatar pipeline was "grind 30 stills → train a LoRA," and it could not work — the grinder invents
a new face per seed (30 different people), and when it holds a face every shot is the identical
pose. There was no step that produces a *varied set of one face*, which is the only thing a
character LoRA can train on. A code review grades the code in front of it; it does not notice a
missing stage, because a missing stage has no code to review. That gap only surfaces when a
reviewer re-derives the end-to-end goal from scratch and asks where each required input comes from.

The fix was not novel and not expensive: the Qwen-Image-Edit reference technique
(`TextEncodeQwenImageEditPlus` + `ReferenceLatent`) is the community-standard way to hold a face,
and both nodes were already present in the install — zero downloads. One web-research pass found
it; one live render proved it (same face, new scene, 30s). The lesson compounds: **when the goal
is unmet, attack the method before the code, and check the field before assuming you must build
something new.**

## Who did what
- **claude-fable-5**: ran the third pass, found the method gap, did the research, built + proved
  workflow 05. Also the model that made the original unverified "image-reference mode" claim now
  being corrected — the gap was partly mine to begin with.
- **glm-5.3 / glm-5.3-flash**: 11 real code defects between them, all verified and fixed earlier
  this workstream. Genuinely useful — but both were scoped to the artifacts they were handed and
  neither questioned the pipeline's reachability. That is the structural limit of a code review,
  not a failing of those models.

## Skills created or changed
No new skill. Two reinforced by live hits: validate the instrument before asserting a capability
exists (my "image-reference mode" claim), and research the field before building (the fix was
already standard practice on installed nodes).

## Mistakes I made
- Asserted "Krea 2 image-reference mode" in an earlier turn as though I'd verified it. The shipped
  Krea template is a STYLE reference (copies aesthetics), not identity. Caught by my own third pass;
  corrected by building the real identity path and proving it.
- Built the grinder and wrote the "curate 15-30" step without noticing those two steps cannot
  connect — the grinder's output is not a curatable single-identity set. I shipped a pipeline with
  a hole in the middle and only found it when a real dataset was needed.

## Error -> fix -> repeat ledger
- **Unverified capability asserted as fact** — recurred this workstream (also the cfg-recipe and
  "auto-swaps" claims in prior turns). Each caught by execution, never by re-reading. The
  correction that sticks is procedural: a claim that a mode/feature exists is not sayable until a
  render or an /object_info check has produced it. First occurrence this session that was caught by
  *the same author's later pass* rather than an external reviewer.
- **Pipeline-reachability never checked** — first occurrence logged. A code review cannot catch a
  missing stage; only re-deriving the goal input-by-input can. New standing check for multi-stage
  builds: list each required input and name the step that produces it before declaring the pipeline
  designed.

## External-model calibration
- **glm-5.3 / glm-5.3-flash**: excellent at defect-in-existing-code; structurally blind to
  missing-stage/goal-reachability. Route code-correctness passes to them; keep a goal-reachability
  pass (re-derive the pipeline end to end) as a separate, non-delegable step.
