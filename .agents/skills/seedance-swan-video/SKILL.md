---
name: seedance-swan-video
version: 2.0.0
changelog: "v2.0 — AI Village 15-brain consensus pass (2026-04-12): Quick Invocation Formula, mobile input format, strict Galaxy-Swan ban, typography mapping, compound clarification protocol, scroll-sync fix, camera vocab grouping"
description: Generate cinematic, shot-by-shot Seedance 2.0 video prompts optimized for SwanStudios content — exercise demonstrations with anatomy overlays, seamless website hero loops, and premium brand films. Outputs structured four-section prompts covering shot timeline, effects inventory, density map, and energy arc.
---

# Seedance 2.0 Video Prompt Builder — SwanStudios Edition

## ⚡ Quick Invocation Formula

Use this pattern every time:

`"Generate a [DURATION] [OUTPUT TYPE] for [EXERCISE/SUBJECT]."`

*Example: "Generate a 10s Website Hero Loop for Sean doing a single-arm cable row."*

---

## When to Use This Skill

Invoke when the user needs a Seedance 2.0 video prompt for any of these three output types:

1. **WEBSITE HERO LOOP** — Background video that plays on an endless, seamless loop on a web page (scroll-sync or autoplay)
2. **EXERCISE DEMO** — Short-form exercise demonstration with clear form breakdown, compatible with anatomy overlay post-production
3. **BRAND FILM** — Promotional or marketing video with cinematic energy arc

Ask the user which type they need if not specified.

---

## Seedance 2.0 Technical Constraints

- **First + last frame control:** Set the same image as both first and last frame to guarantee a seamless loop
- **Reference video:** Accepts a reference video to follow motion/structure — use for exercise form reference
- **Reference images:** Up to multiple style/location/talent reference images — more detail = more control
- **Audio:** Disable for website hero backgrounds. Enable only for standalone brand films
- **Duration:** 5s for micro-demos, 10s sweet spot for loops and exercise demos, 15–20s for brand films, 30s+ for full ads
- **Resolution:** 720p for prototypes (25 credits/sec), 1080p for final delivery
- **Character consistency:** Include detailed talent description + reference image for consistent appearance across shots
- **Camera vocabulary Seedance understands:**
  - *Motion:* slow push-in, dolly, orbital, overhead crane
  - *Lens/Focus:* rack focus, shallow depth of field, parallax depth shift
  - *Stylized FX:* anamorphic lens flare (horizontal light streaks), motion blur smear, speed ramp

---

## SwanStudios Brand Context (Embedded)

> **Palette source of truth:** `frontend/src/styles/theme/tokens.ts` — `enchantedApexTokens`. All hex values in this skill must match that file.

Apply these principles to all SwanStudios content:

- **Aesthetic (Crystalline Swan — Enchanted Apex theme):**
  - Primary dark backgrounds: Obsidian Black `#0A0A0F`, Carbon `#141419`, Graphite `#1A1A24`
  - Surface: Midnight Sapphire `#002060`, Royal Depth `#003080` (elevated cards)
  - Text: Frost White `#E0ECF4`
  - Accent glow: Ice Wing `#60C0F0` (gaming/XP/UI), Arctic Cyan `#50A0F0` (interactive elements)
  - Luxury accent: Gilded Fern `#C6A84B` (gold borders, luxury detail)
  - Tertiary: Swan Lavender `#4070C0`, Wing Purple `#8B5CF6` (glow/focus rings)
  - 🚫 **STRICT BAN — NEVER USE:** `#0a0a1a` (retired bg), `#00FFFF` (retired cyan), `#7851A9` (retired purple) — these are the **retired Galaxy-Swan palette**. Using them in any prompt, overlay, or color call breaks brand integrity.

- **Feel:** Enchanted Apex — frozen elegance meets athletic precision. Dark luxury, NOT generic fitness stock
- **Lighting:** Dramatic side or rim lighting that reveals musculature. Deep shadow to background. Crystal-clear foreground
- **Talent:** Sean Swan — 26-year master trainer, athletic build, commanding but approachable. Always in premium-branded attire
- **Movement:** Controlled, deliberate, perfect biomechanical form. No reckless speed ramps on exercise form shots
- **NO yoga/meditation language or imagery.** Use "functional movement," "strength pattern," "athletic conditioning"

---

## Input Expectations

**Clarification Protocol:**
If BOTH required inputs (Subject + Output Type) are missing, ask ONE compound question:
*"To generate this, I need to know: what is the exercise/subject, and is this a Website Hero Loop, Exercise Demo, or Brand Film?"*
Do not proceed until these blocking requirements are met. Do not interrogate beyond that.

### Required Inputs (BLOCKING — Ask if missing)
- **Exercise / Subject:** (e.g., "Single-arm cable row" or "SwanStudios homepage brand moment")
- **Output Type:** (Website Hero Loop, Exercise Demo, or Brand Film)

### Optional Inputs (Use Defaults if missing)
- **Duration:** Default to 10s for loops/demos, 20s for brand films
- **Camera Angles:** Default to cinematically appropriate (Sagittal/Frontal/Transverse)
- **Anatomy Focus:** Default to full-body unless specified
- **Brand Tone:** Default to Inspiring + Precise
- **Reference image provided?** Proceed without if not given

---

## Output Structure

Output ALL FOUR sections in this exact order. Never skip a section.

### Output Formatting (For Frontend Rendering)
- Use `###` for shot titles — maps to Plus Jakarta Sans in `<MarkdownRenderer />`
- Use `*italics*` for dramatic visual descriptions — maps to Cormorant Garamond Italic
- Use `` `inline code` `` for technical specs: hex codes, timing data, camera settings — maps to Fira Code

---

### SECTION 1: SHOT-BY-SHOT EFFECTS TIMELINE

Each shot block:

```
### SHOT [N] ([start]–[end]s) — [Shot Name]
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
- Use visual result language: "the frame scales inward rapidly" not "keyframe the scale in Premiere"
- Mark the signature effect: `★ SIGNATURE VISUAL EFFECT`
- For **exercise demos:** note the NASM phase at each shot — Eccentric, Isometric, Concentric. For exercises without a clear isometric hold (e.g. ballistic movements, plyo), use "Transition" or "Load" instead of forcing the three-phase model
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

**Implementation note for Claude Code:** Use `<video>` element with `video.currentTime` set on scroll event — NOT `requestAnimationFrame` frame extraction. Pin the video element, listen to `window.scroll`, map scroll position to `video.currentTime = (scrollProgress * video.duration)`. This is GPU-efficient and works with Seedance's native output without frame extraction.

---

## Creative Principles

1. **Contrast drives impact.** A slow-motion shot after a speed ramp hits harder than two speed ramps back-to-back.
2. **Signature moments matter.** Every video needs one hero effect that makes it memorable. Mark it with ★.
3. **Transitions are shots.** Whip pan, bloom flash, motion-blur smear — creative moments, not connectors.
4. **Specificity over vagueness.** "The frame rotates clockwise approximately `15–20°`" beats "the camera tilts."
5. **Energy must resolve.** The final moments must feel intentional.
6. **Form is sacred on exercise content.** Never sacrifice biomechanical clarity for cinematic effect. If in doubt, hold longer on the form shot, not shorter.
7. **SwanStudios is premium, not hype.** No cheesy motivational text flying across screen. Let the movement speak.

---

## Anatomy Overlay Integration Notes

When shots are marked `[OVERLAY: muscle group active]`, the post-production workflow is:

1. Seedance generates the base video
2. A separate anatomy layer is composited over the video (Capcut Pro, DaVinci, or AI overlay tool)
3. The overlay shows:
   - Primary mover highlighted in Ice Wing `#60C0F0`
   - Secondary stabilizers in Gilded Fern `#C6A84B`
   - Joint tracking in Frost White `#E0ECF4`
4. Audio narration (ElevenLabs Sean voice clone): calls out the muscle activation in real-time

Mark shots generously for overlay — easier to remove in post than to add to unmarked shots.

---

## Example Workflow

**User:** *"Generate a 10s Website Hero Loop for Sean doing a single-arm cable row showing lat engagement. Dark gym, dramatic lighting."*

**You do:**
1. Identify output type: WEBSITE HERO LOOP
2. Set first + last frame = same position (neutral standing, cable in hand) for seamless stitch
3. Generate 4-section prompt with 5–7 shots
4. Mark anatomy overlay at peak contraction: `[OVERLAY: Latissimus Dorsi — primary mover]`
5. Ask if Section 5 scroll-sync is needed, or default to autoplay loop

*Tone of output: Director's shot notes. Technical. No hype adjectives. Describe what happens and let the visuals speak.*
