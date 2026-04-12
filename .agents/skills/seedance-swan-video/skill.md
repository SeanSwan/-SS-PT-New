---
name: seedance-swan-video
description: Generate cinematic, shot-by-shot Seedance 2.0 video prompts optimized for SwanStudios content — exercise demonstrations with anatomy overlays, seamless website hero loops, and premium brand films. Outputs structured four-section prompts covering shot timeline, effects inventory, density map, and energy arc.
---

# Seedance 2.0 Video Prompt Builder — SwanStudios Edition

## When to Use This Skill

Invoke when the user needs a Seedance 2.0 video prompt for any of these three output types:

1. **WEBSITE HERO LOOP** — Background video that plays on an endless, seamless loop on a web page (scroll-sync or autoplay)
2. **EXERCISE DEMO** — Short-form exercise demonstration with clear form breakdown, compatible with anatomy overlay post-production
3. **BRAND FILM** — Promotional or marketing video with cinematic energy arc

Ask the user which type they need if not specified.

---

## Seedance 2.0 Technical Constraints (Know Before Prompting)

- **First + last frame control:** Set the same image as both first and last frame to guarantee a seamless loop
- **Reference video:** Seedance 2.0 accepts a reference video to follow motion/structure — use for exercise form reference
- **Reference images:** Up to multiple style/location/talent reference images — more detail = more control
- **Audio:** Disable for website hero backgrounds. Enable only for standalone brand films
- **Duration:** 5s for micro-demos, 10s sweet spot for loops and exercise demos, 15–20s for brand films, 30s+ for full ads
- **Resolution:** 720p for prototypes (25 credits/sec), 1080p for final delivery
- **Character consistency:** Include detailed talent description + reference image for consistent appearance across shots
- **Camera vocabulary Seedance understands:** slow push-in, dolly, parallax depth shift, orbital, overhead crane, rack focus, shallow depth of field, anamorphic lens flare, motion blur smear, speed ramp

---

## SwanStudios Brand Context (Embedded)

Apply these principles to all SwanStudios content:

- **Aesthetic:** Dark-first luxury. Deep blacks, Obsidian `#0A0A0F`, Sapphire surfaces `#002060`. Ice Wing `#60C0F0` accent glow. Gilded Fern `#C6A84B` luxury detail.
- **Feel:** Enchanted Apex — frozen elegance meets athletic precision. NOT generic fitness stock
- **Lighting:** Dramatic side or rim lighting that reveals musculature. Deep shadow to background. Crystal-clear foreground
- **Talent:** Sean Swan — 26-year master trainer, athletic build, commanding but approachable. Always in premium-branded attire
- **Movement:** Controlled, deliberate, perfect biomechanical form. No reckless speed ramps on exercise form shots
- **NO yoga/meditation language or imagery.** Use "functional movement," "strength pattern," "athletic conditioning"

---

## Input Expectations

Gather from user before generating:

| Input | Required | Default if missing |
|-------|----------|--------------------|
| Exercise / subject | Yes | Ask |
| Output type (hero/demo/brand) | Yes | Ask |
| Duration | No | 10s for loops/demos, 20s for brand films |
| Camera angles | No | Choose cinematically appropriate |
| Anatomy focus (for demos) | No | Full-body unless specified |
| Brand tone (inspiring/technical/aggressive) | No | Inspiring + precise |
| Reference image provided? | No | Proceed without |

If brief is too vague, ask **one focused question only**. Do not over-interrogate.

---

## Output Structure

Output ALL FOUR sections in this exact order. Never skip a section.

---

### SECTION 1: SHOT-BY-SHOT EFFECTS TIMELINE

Each shot block:

```
SHOT [N] ([start]–[end]s) — [Shot Name]
- EFFECT: [Primary effect] + [stacked effects if any]
- [Visual description — what the viewer sees]
- [Camera behavior — angle, motion, lens]
- [Speed/timing — be specific: "approximately 20–25% speed" not "slow motion"]
- [Transition into next shot]
```

**Shot-writing rules:**

- Each shot: 1–4 seconds unless the brief demands a hold
- Name effects precisely: "speed ramp (deceleration)" not "speed ramp"
- Stacked effects: list all three if three things happen simultaneously
- Transitions are creative moments — name them: "bloom cut," "whip pan exit," "motion-blur dissolve"
- Use visual result language, not editing tool language: "the frame scales inward rapidly" not "keyframe the scale in Premiere"
- Mark the signature effect: `★ SIGNATURE VISUAL EFFECT`
- For **exercise demos:** note the NASM phase at each shot — Eccentric, Isometric, Concentric
- For **anatomy overlays:** mark shots where the overlay should activate: `[OVERLAY: muscle group active]`
- For **website loops:** ensure shot 1 visual = shot N visual for seamless stitch

**Exercise demo camera grammar (standard positions):**
- **Sagittal view (side):** Shows flexion/extension, spinal alignment, depth of squat/hinge
- **Frontal view (front):** Shows symmetry, knee tracking, shoulder alignment  
- **Posterior view (rear):** Shows glute activation, back posture, lat engagement
- **Close-up detail:** Joint position, grip, foot placement, muscle belly contraction
- **Overhead (crane):** Full-body pattern visibility for compound movements

---

### SECTION 2: MASTER EFFECTS INVENTORY

Numbered list of every distinct effect across the full prompt:

```
[N]. [Effect name]
   - Used [X]x — Shots [list]
   - Role: [one-line description]
```

Group by category: Speed manipulation / Camera movement / Digital effects / Transitions / Compositing / Lighting FX / Overlay markers

---

### SECTION 3: EFFECTS DENSITY MAP

Segment the timeline into 3–6 second chunks. Rate each:

- **HIGH DENSITY** — 4+ stacked effects or rapid-fire sequence
- **MEDIUM DENSITY** — 2–3 effects
- **LOW DENSITY** — 1 effect or clean footage (often the most impactful moment)

Format:
```
[start]–[end]s = [DENSITY] ([effects] — [count] effects in [duration])
```

**Density principle:** A LOW DENSITY shot after HIGH DENSITY hits hardest. Build contrast deliberately.

---

### SECTION 4: ENERGY ARC

Describe the overall energy narrative. Use three acts minimum; adapt count to duration:

- **Act 1 — Hook:** How the first 2–3 seconds grab attention before the viewer can look away
- **Act 2 — Build:** The signature moment(s), contrast beats, information delivery
- **Act 3 — Resolution:** How energy lands intentionally — not where the effects budget runs out

For exercise demos, map acts to the exercise's own tension arc:
- Act 1: Setup + approach (what are we doing, why does it matter)
- Act 2: Execution (the movement itself, peak tension, key form points)  
- Act 3: Control + reset (eccentric control, what to notice, loop back or cut)

---

## Duration Calibration

| Duration | Shots | Effects density | Signature moments |
|----------|-------|-----------------|-------------------|
| 5–10s | 4–7 | Lean, punchy | 1 |
| 10–20s | 8–14 | Contrast and build | 1–2 |
| 20–30s | 12–20 | Full three-act arc | 2–3 |
| 30s+ | Scale accordingly | Maintain contrast — never fill every second | 3+ |

---

## Website Scroll-Sync Output Variant

If the user wants **scroll-activated video** (frame advances with scroll, like Apple product pages):

After the standard four sections, add:

### SECTION 5: SCROLL-SYNC FRAME MAP (optional)

```
Frame extraction target: [N] frames at [fps] for [duration]s video
Scroll trigger: [enter viewport / % scroll / element pin]
Frame-to-scroll mapping: [linear / ease-in-out / cinematic-eased]
Hold frames: [frames to hold at key story moments]
Loop behavior: [reverse on scroll-back / clamp at end / seamless loop]
```

Implementation note for Claude Code: use `<canvas>` element + `requestAnimationFrame`, extract frames via `<video>` frame-seek on scroll event. For 10s at 24fps = 240 frames = pre-extracted sprite or canvas-seek pattern.

---

## Creative Principles

1. **Contrast drives impact.** A slow-motion shot after a speed ramp hits harder than two speed ramps back-to-back.
2. **Signature moments matter.** Every video needs one hero effect that makes it memorable. Call it out with ★.
3. **Transitions are shots.** Whip pan, bloom flash, motion-blur smear — these are creative moments, not connectors.
4. **Specificity over vagueness.** "The frame rotates clockwise approximately 15–20°" beats "the camera tilts."
5. **Energy must resolve.** The final moments must feel intentional.
6. **Form is sacred on exercise content.** Never sacrifice biomechanical clarity for cinematic effect. If in doubt, hold longer on the form shot, not shorter.
7. **SwanStudios is premium, not hype.** No cheesy motivational text flying across screen. Let the movement speak.

---

## Example Workflow

**User:** "I want a 10-second seamless loop for the hero section of the SwanStudios homepage. Subject: Sean doing a single-arm cable row showing lat engagement. Dark gym, dramatic lighting."

**You do:**
1. Identify output type: WEBSITE HERO LOOP
2. First + last frame = same position (neutral standing, cable in hand)
3. Generate 4-section prompt with 5–7 shots
4. Note anatomy overlay marker at peak contraction
5. Section 5 scroll-sync is optional — ask if they want it

**Tone of output:** Director's shot notes. Technical. No hype adjectives. Describe what happens and let the visuals speak.

---

## Anatomy Overlay Integration Notes

When shots are marked `[OVERLAY: muscle group active]`, the post-production workflow is:

1. Seedance generates the base video
2. A separate anatomy layer is composited over the video frame-by-frame (Capcut Pro, DaVinci, or AI overlay tool)
3. The overlay shows: primary mover highlighted in `#60C0F0` Ice Wing, secondary stabilizers in `#C6A84B` Gilded Fern, joints tracked in white
4. Audio narration (ElevenLabs Sean voice clone): calls out the muscle activation in real-time

Mark shots generously for overlay — it's easier to remove overlays in post than to add them to shots not marked.
