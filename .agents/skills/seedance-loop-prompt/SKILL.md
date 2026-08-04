---
name: seedance-loop-prompt
version: 2.0.0
changelog: "v2.0 — AI Village 15-brain consensus pass (2026-04-12): reference fallback, output self-check, partial analysis protocol, scene grouping, DRY cleanup, structured output tokens, duration refinements"
description: Build cinematic, shot-by-shot video prompts from a creative brief. Every output follows a structured effects breakdown format designed to give Seedance 2.0 maximum detail on camera work, effects, transitions, pacing, and energy arc.
---

# Video Prompt Builder for Seedance 2.0

Build cinematic, shot-by-shot video prompts from a creative brief. Every output follows a structured effects breakdown format designed to give Seedance 2.0 maximum detail on camera work, effects, transitions, pacing, and energy arc.

---

## How This Skill Works

1. The user provides a creative brief — as simple as "a runner in a stadium for a Nike-style ad" or as detailed as a full storyboard. They may include a reference image, reference video, mood, brand context, specific effects, or duration target.
2. Read `references/effects-breakdown-reference.txt` to calibrate the level of detail expected.
   - If that file is **missing or unreadable**: proceed using the structural guidelines in this document as the sole calibration source. State this to the user before generating. Do NOT hallucinate file contents.
   - If it exists but appears **truncated** (fewer than 10 effect categories): treat as missing and state it.
   - Path is relative to the skill root: `.agents/skills/seedance-loop-prompt/`
3. Generate a complete video prompt structured into the four mandatory sections below.

---

## Input Expectations

The user's brief can include any combination of: subject/talent, setting, mood/tone/energy level, brand context, specific effects or camera moves, duration target, reference ads or films, colour palette.

**Clarification protocol:**
If the brief is too vague to build a full prompt (e.g. "make something cool"), output exactly:

```
[CLARIFICATION_REQUIRED]: {Your single focused question here}
```

You MAY include a `### SECTION 0: PARTIAL ANALYSIS` header with any high-confidence recommendations before stopping — the caller can use this as a starting point.
Do NOT ask multiple questions. Make creative decisions where the user hasn't specified.

---

## Output Structure

ALWAYS output ALL FOUR sections in this exact order. Never skip a section.

Before returning output, run the self-check below. If any item fails, regenerate that section before responding. Do NOT return partial output.

**Output Self-Check:**
- [ ] Section 1 is present and contains ≥ 4 shots
- [ ] Section 2 references every effect named in Section 1
- [ ] Section 3 covers the full timeline with no timestamp gaps
- [ ] Section 4 maps to the act structure and has a clear resolution

---

### Section 1: SHOT-BY-SHOT EFFECTS TIMELINE

Start this section with the header: `### SECTION 1: TIMELINE`

For films with 10+ shots, group into scenes for scalability:

```
#### SCENE [X] | [Scene Description]

##### SHOT [N] | [timestamp]
- EFFECT: [Primary effect name] + [secondary effects if stacked]
- [Detailed description of what's happening visually]
- [Camera behaviour — angle, movement, lens if relevant]
- [Speed/timing — use percentages: "approximately 20–25% speed" not "slow motion"]
- [Transition to next shot — name it: "whip pan exit", "bloom cut", "motion-blur dissolve"]
```

For films under 10 shots, scenes are optional — list shots directly.

**Shot-writing rules:**
- Shots are 1–4 seconds. In high-density segments, shots may compress to 1–2 seconds.
- Name effects precisely: "speed ramp (deceleration)" not "speed ramp"
- Stacked effects: list all of them explicitly, even if three happen simultaneously
- Use visual result language: "the frame scales inward rapidly" not "apply a keyframe in Premiere"
- Mark the hero effect: `★ SIGNATURE VISUAL EFFECT`
- Describe motion blur, light behaviour, and atmospheric effects where relevant

---

### Section 2: MASTER EFFECTS INVENTORY

Start with: `### SECTION 2: EFFECTS INVENTORY`

A numbered list of every distinct effect across the full prompt:

```
[N]. [Effect name]
   - Used [X]x — Shots [list]
   - Role: [one-line description of its job in the edit]
```

Group by category: Speed manipulation / Camera movement / Digital effects / Transitions / Compositing / Optical effects / Atmospheric.

Every effect named in Section 1 must appear here. If it doesn't, regenerate Section 2.

---

### Section 3: EFFECTS DENSITY MAP

Start with: `### SECTION 3: DENSITY MAP`

Segment the full timeline into 3–6 second chunks. Rate each:

- **HIGH DENSITY** — 4+ stacked effects or rapid-fire sequence
- **MEDIUM DENSITY** — 2–3 effects
- **LOW DENSITY** — 1 effect or clean footage

Format:
```
[timestamp range] = [DENSITY LEVEL] ([brief list of effects] — [count] effects in [duration])
```

The map must cover the entire timeline with no gaps. A LOW DENSITY moment after HIGH DENSITY hits hardest — design contrast deliberately.

---

### Section 4: ENERGY ARC

Start with: `### SECTION 4: ENERGY ARC`

Describe the overall energy narrative:

- **Act 1:** Opening energy — how the video grabs attention in the first 2–3 seconds
- **Act 2:** Development — signature moments, contrast beats, information delivery
- **Act 3:** Resolution — how energy lands intentionally

Adapt act count to duration: 5-second clips may need only two beats; 30-second films may need four. Every video must resolve — the final moments cannot feel like the effects budget ran out.

---

## Creative Principles

1. **Contrast drives impact.** Alternate high-density and low-density moments. A slow-motion shot after a speed ramp hits harder than two speed ramps back-to-back.
2. **Signature moments matter.** Every video needs at least one hero effect that makes it memorable. Mark it with ★ and call it out in the Energy Arc.
3. **Transitions are shots.** A whip pan, bloom flash, or motion-blur smear is a creative moment — not a throwaway connector.
4. **Specificity over vagueness.** "The frame rotates clockwise by approximately 15–20°" beats "the camera tilts." "Approximately 20–25% speed" beats "slow motion."
5. **Energy must resolve.** The final moments must feel intentional.
6. **One question maximum.** If you need clarification, ask one focused question and wait. Do not spiral into interrogation.

## Tone and Style

- Write in a direct, technical tone — like a director's shot notes, not a marketing brief
- Use bullet points within each shot block for clarity
- No hype language ("stunning", "breathtaking") — describe what happens and let the visuals speak
- Be concise but complete — every detail must earn its place

---

## Duration Calibration

| Duration | Shots | Density strategy | Signature moments |
|----------|-------|-----------------|-------------------|
| 5–10s | 4–7 | Lean and punchy, 1–2s shots in high-density segments | 1 |
| 10–20s | 8–14 | Room for contrast and build | 1–2 |
| 20–30s | 12–20 | Full three-act arc | 2–3 |
| 30s+ | Scale accordingly | Maintain density contrast — never fill every second | 3+ |

If the user doesn't specify duration, default to **15–20 seconds** (sweet spot for AI video generation).

---

## Example Workflow

**User says:** "I want a dramatic brand film for a trail running shoe. Mountain setting, golden hour, single runner. Make it feel epic but not over-the-top. About 15 seconds."

**You do:**
1. Check `references/effects-breakdown-reference.txt` — state if unavailable
2. Generate 8–12 shots across 3 scenes (Approach / Peak / Resolution)
3. Produce all four sections in order
4. Run self-check before responding: ≥4 shots ✓, all effects in inventory ✓, density map has no gaps ✓, arc resolves ✓
5. Present in plain text — no preamble, no closing commentary
