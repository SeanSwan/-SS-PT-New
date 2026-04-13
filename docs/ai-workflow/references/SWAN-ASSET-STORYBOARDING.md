---
title: Swan Asset Storyboarding & Seedance 2.0 Integration
owner: Claude Opus 4.6 (CEO)
last_modified: 2026-04-12
status: active — asset direction source of truth for Swan visual work
companion_to: SWAN-CINEMATIC-DESIGN-SYSTEM.md
loaded_by: .claude/skills/swan-design-router/SKILL.md
---

# Swan Asset Storyboarding & Seedance 2.0 Integration

**Purpose:** the asset-direction source of truth. Defines what kind of media belongs in which section of every Swan surface, how the asset should move (or not), what the tier-2/tier-3 fallbacks look like, and the Seedance 2.0 prompt templates for generating each asset type on demand.

**Why this is a companion doc, not a sixth skill.** Sean's strict-model rule requires exactly one default-exposed design brain (`swan-design-router`). Adding `swan-asset-storyboard` as a sixth skill would double the default-exposed design surface area. This doc is loaded by the router as a reference, same pattern as `SWAN-CINEMATIC-DESIGN-SYSTEM.md`, which keeps the default count at 1.

---

## A. Asset archetypes Swan uses

### A1. Video loop (4-8 seconds)
- Autoplay, muted, loop, `playsinline`
- Use for: cinematic hero headers (C1), letterform-embedded media (C4)
- File constraint: MP4, H.264 or VP9, <2 MB for 4s loops, <4 MB for 8s loops
- Posters: every `<video>` needs a `poster="..."` attribute with a Seedance-generated still

### A2. Scroll-scrubbed video sequence (10-20 seconds)
- Video plays tied to scroll position, not real time
- Use for: sticky foreground / changing background (C3), parallax story sections (C2)
- File constraint: MP4 with seek-friendly keyframes every 0.5s, <8 MB
- Advanced: extract frames to an image sequence and scrub a `<canvas>` — smoother on iOS

### A3. Still image, high-resolution hero
- Use for: tier-2 fallback of any video section, dense editorial spreads, parallax backgrounds
- File constraint: WebP or AVIF, 1920-3840px wide, <400 KB at tier 1 quality
- Always paired with a noise overlay (2-5% opacity) to reduce plastic-gradient feel

### A4. Image carousel embedded in a section
- 3-7 still images rotating or crossfading
- Use for: editions / shelf / poster wall (C5), orbiting media nodes (C8)
- Timing: 4-6s per slide on auto-rotate, pause on hover

### A5. Illustration / abstract motif
- Use for: narrative section dividers (C10), subtle background art, conceptual surfaces where realism would over-explain
- Style range: liquid blends, marble/granite textures, botanical line art, crystalline geometric motifs
- Do not use: vector flat illustration, corporate-style mascots, stock icon packs

### A6. Short 3D moment (React Three Fiber)
- Use for: clustered/orbiting media nodes (C8), product showcase rotations, hero accent geodes
- Maximum one R3F moment per page — never two
- Always with a 2D `<Suspense>` fallback

### A7. Letterform-embedded media
- The letterform itself is the frame (C4)
- Media inside can be video loop, carousel, or scroll-scrubbed sequence
- Typography must remain legible — the word reads first, the media second

### A8. Victory chart as narrative element
- Charts are assets too. Treat them with the same rigor as images.
- Every chart sits inside a "chart environment" (C11) with narrative headline, insight, and CTA
- Use `chartTheme` from `frontend/src/components/Charts/chartTheme.ts`
- Empty states get a Cormorant Garamond Italic line, not a generic "no data" label

---

## B. Emotional jobs each section can do

Before picking an asset, name the job. These are the 8 emotional jobs Swan sections run:

| Job | Feeling | Matching asset archetype |
|---|---|---|
| **Awe** | "this is bigger than I expected" | full-bleed video, cosmic imagery, aerial landscape, clustered 3D |
| **Trust** | "these people know what they're doing" | portrait stills, tool-of-the-craft detail, credentials in real environment |
| **Momentum** | "I want to keep scrolling" | scroll-scrubbed sequence, parallax story, rhythmic shelf |
| **Calm** | "I can breathe here" | slow ocean loop, botanical macro, warm glacier still |
| **Aspiration** | "I want to become that" | aspirational athlete portrait, transformation sequence, editorial slow-mo |
| **Celebration** | "something happened" | confetti motion, gold rim light burst, counter-up KPI block |
| **Intimacy** | "this is for me" | close-up macro, tactile texture, personal log card |
| **Curiosity** | "what is that?" | embedded-media letterform, partial reveal, orbiting nodes |

Every Swan section picks one primary job and at most one secondary job. Two sections in a row should not do the same job — rhythm requires contrast.

---

## C. Per-section asset rules (matched to pattern library in SWAN-CINEMATIC-DESIGN-SYSTEM.md section C)

### C1. Cinematic Hero with Video Header
- **Primary asset:** 4-6s Seedance video loop (A1)
- **Emotional job:** Awe or Aspiration
- **Motion:** looping, with a deliberate "breathing" cadence — subtle zoom or parallax within the video itself
- **Tier 2 fallback:** high-resolution still (A3) with the same composition
- **Tier 3 fallback:** gradient background + strong typography, no media
- **Anti-pattern:** generic stock people-in-gym footage, corporate B-roll

### C2. Parallax Story Section
- **Primary asset:** high-resolution still (A3) as background, foreground is typography + smaller media accent
- **Emotional job:** Momentum
- **Motion:** background moves at 0.2-0.4x scroll speed
- **Tier 2 fallback:** same still with CSS `background-attachment: fixed`
- **Tier 3 fallback:** static still, no parallax

### C3. Sticky Foreground / Changing Background Panels
- **Primary asset:** 3-5 distinct still images OR short loops (A3 or A1), one per panel
- **Emotional job:** Curiosity, Momentum
- **Motion:** background cross-fades as user scrolls past thresholds
- **Tier 2 fallback:** remove sticky, ship as a vertical stack
- **Tier 3 fallback:** simple vertical feature list with one still per feature

### C4. Embedded-Media Wordmark / Letterform
- **Primary asset:** 3-5s Seedance video loop (A1) clipped to the letterform shape
- **Emotional job:** Curiosity, Awe, Intimacy
- **Motion:** loops inside the letter
- **Tier 2 fallback:** image carousel (A4) clipped to the letterform
- **Tier 3 fallback:** solid letterform with a gradient fill — no media

### C5. Shelf / Editions / Poster Wall
- **Primary asset:** 6-12 still cover stills (A3), each distinct
- **Emotional job:** Curiosity, Aspiration
- **Motion:** cards tilt on hover, selected card expands with `layoutId`
- **Tier 2 fallback:** horizontal scroll of flat cards
- **Tier 3 fallback:** vertical list

### C6. Flippable Detail Card
- **Primary asset:** front still + back still (A3 × 2) OR back content can be text-only
- **Emotional job:** Curiosity, Trust
- **Motion:** flip on hover or click
- **Tier 2 fallback:** cross-fade instead of flip
- **Tier 3 fallback:** static card

### C7. Hover Tilt / Depth Card
- **Primary asset:** still image inside (A3)
- **Emotional job:** Intimacy, Curiosity
- **Motion:** 3D tilt toward cursor
- **Tier 2 fallback:** scale-up on hover
- **Tier 3 fallback:** static

### C8. Clustered / Orbiting Media Nodes
- **Primary asset:** 5-9 small stills or short loops (A4), one per node
- **Emotional job:** Curiosity, Awe
- **Motion:** orbital paths, click to bring forward
- **Tier 2 fallback:** 2D floating cards (Framer), no R3F
- **Tier 3 fallback:** static grid

### C9. Media-First KPI / Counter Block
- **Primary asset:** one still (A3) OR short loop (A1) per KPI
- **Emotional job:** Celebration, Trust
- **Motion:** asset breathes subtly, numbers count up on scroll-in
- **Tier 2 fallback:** stills only, no video
- **Tier 3 fallback:** numbers and labels only, no media (rule-34-safe "appears reduced based on device capability")

### C10. Narrative Section Divider
- **Primary asset:** illustration (A5) OR typographic flourish (no asset)
- **Emotional job:** Momentum (as a rhythm beat)
- **Motion:** reveal on scroll-in
- **Tier 2 fallback:** simpler fade divider
- **Tier 3 fallback:** extra vertical space between sections

### C11. Premium Dashboard Chart Environment
- **Primary asset:** Victory chart (A8) + optional sparkline lead-in + optional annotation layer
- **Emotional job:** Trust, Momentum
- **Motion:** chart reveal on in-view, data point hover glow
- **Tier 2 fallback:** chart + headline, no narrative column
- **Tier 3 fallback:** chart + title only

---

## D. Asset direction by theme

### D1. Nature / beauty / atmosphere (Sean's primary taste)
- Birds in flight, flowers close-up macro, geodes cracked open, marble texture, granite veins, waterfalls, river currents, botanical gardens, Caribbean beaches, glaciers, ice caves, blue water, evergreen forests, mountains at dawn
- Palette notes: usually cyan/sapphire friendly out of the box, occasionally add gold rim light for luxury surfaces
- Good fit for: hero headers (C1), parallax stories (C2), calm emotional-job sections

### D2. Cosmic / scientific
- James Webb telescope imagery, galaxies, nebulae, black holes, star fields, aurora, solar surface
- Palette notes: cosmic tones align naturally with Ice Wing + Wing Purple
- Good fit for: hero headers (C1), signature wordmark moments (C4), clustered nodes (C8)

### D3. Underwater / aquatic
- Colorful fish, jellyfish, coral, whales, underwater caves, refracted sun through water, electric animals
- Palette notes: deep-ocean aligns with Midnight Sapphire + Royal Depth
- Good fit for: parallax stories (C2), section dividers (C10), calm sections

### D4. Urban / architectural
- Skylines at blue hour, clean metropolitan city shots, modernist architecture, interior glass-and-steel spaces, bridges at night
- Palette notes: city lights naturally align with Ice Wing + Wing Purple glow
- Good fit for: editorial moments, trust sections, testimonial backgrounds

### D5. Abstract / artistic
- Liquid blends, color fields, marble swirls, ink in water, editorial abstract photography
- Palette notes: Seedance can steer palette directly — specify Swan tokens
- Good fit for: section dividers (C10), background layers, narrative transitions

### D6. Fitness / training (Swan's core product domain)
- Aspirational athlete portraits, slow-motion movement capture, anatomy overlay shots, equipment detail close-ups, outdoor training environments
- Palette notes: cold tones for discipline/focus, warm tones for community/celebration
- Good fit for: cinematic hero (C1), KPI blocks (C9), trainer profile flip cards (C6)
- **Rule 9:** use "stretching"/"flexibility" not "yoga"/"meditation"

### D7. Creative expression (singing, dancing, art)
- Stage lighting, motion blur, performer portraits, instrument close-ups, colorful bokeh
- Good fit for: content studio surfaces, client expression pages, challenge categories

### D8. Gaming / achievement
- Trophy/badge still-life, particle-effect celebrations, gradient XP bar close-ups, physical object rewards (Gilded Fern medal, Wing Purple gem)
- Good fit for: gamification surfaces, level-up celebrations (C9 with Celebration job)
- **Use Ice Wing** for gaming accent (rule from CLAUDE.md palette), NOT Arctic Cyan (that's data-only)

---

## E. Seedance 2.0 prompt templates

Every Swan design task that needs a custom asset should produce a Seedance brief as part of the design output. The template below is the minimum structure. Vertical-specific variants follow.

### E1. Master brief template

```
[Scene / subject]:
[Style]:         cinematic realism | editorial abstract | liquid-blend | botanical macro | cosmic imagery | underwater | city | architectural | anatomical | performance-capture
[Palette]:       Crystalline Swan — sapphire + cyan rim | obsidian + gold rim | cyan + purple glow | frost + glacier blue | deep ocean + jellyfish accent | cosmic nebula + wing purple
[Motion]:        4s loop | 8s loop | 20s scroll-scrubbed | single pan | static still | breathing zoom
[Duration]:      [seconds, if video]
[Aspect ratio]:  21:9 | 16:9 | 9:16 | 1:1 | 4:5
[Output type]:   MP4 H.264 | WebP | AVIF
[Fallback still description]: [what the tier-2 poster frame looks like]
[Emotional job]: awe | trust | momentum | calm | aspiration | celebration | intimacy | curiosity
[Section type]:  [C1 hero | C2 parallax | C4 letterform | C5 shelf | C8 nodes | C9 KPI | ...]
[Negative prompts]: no Tailwind UI, no stock corporate, no AI-hand artifacts, no text overlays, no watermarks
```

### E2. Vertical-specific brief variants

**Fitness / training brief template**
```
Scene: [athlete doing specific movement] in [environment]
Style: cinematic realism, low-key lighting, rim light from [direction]
Palette: Crystalline Swan — cold sapphire base, cyan rim light, subtle gold accent on equipment
Motion: 6s loop, breathing zoom at 1.02x
Aspect: 21:9
Emotional job: aspiration
Section type: C1 cinematic hero
Fallback still: single frame at mid-motion peak
Negative: no gym stock, no logo t-shirts, no phone-in-hand, no selfie angle
```

**Singing / dancing / creative expression brief template**
```
Scene: [performer/subject] mid-expression in [stage or environment]
Style: editorial concert photography, shallow depth of field, motion blur on peripheral
Palette: Crystalline Swan — obsidian base, wing purple stage light, ice wing highlight
Motion: 4s loop, subtle performer sway
Aspect: 16:9
Emotional job: celebration or intimacy
Section type: C1 or C4
Fallback still: single frame at emotional peak
Negative: no crowd, no phone screens, no corporate event look
```

**Gaming / achievement brief template**
```
Scene: [reward object — trophy, gem, medal, badge] on [surface — obsidian marble, liquid mirror, glass shelf]
Style: product photography, macro, ray-traced reflections
Palette: Crystalline Swan — graphite surface, wing purple glow, ice wing specular, gilded fern rim
Motion: 6s loop, slow orbital rotation
Aspect: 1:1
Emotional job: celebration
Section type: C9 KPI celebration anchor
Fallback still: hero shot at 3/4 rotation
Negative: no plastic trophy look, no cartoonish render, no tacky bling
```

**Nature / beauty / atmosphere brief template**
```
Scene: [natural subject — waterfall, geode, botanical garden, glacier cave, jellyfish bloom] in [specific environment and time-of-day]
Style: cinematic nature documentary, natural light, long lens compression
Palette: Crystalline Swan — let the natural scene's native palette come forward, then grade toward cyan/sapphire in post
Motion: 8s loop, slow natural movement (water flowing, wind on leaves, slow drift)
Aspect: 21:9
Emotional job: awe or calm
Section type: C1, C2, or C10
Fallback still: hero frame with strongest composition
Negative: no stock Shutterstock look, no oversaturation, no HDR plastic
```

**Cosmic / scientific brief template**
```
Scene: [cosmic subject — nebula, galaxy arm, star cluster, black hole accretion disk, aurora from space]
Style: James Webb-inspired, scientific realism, long exposure
Palette: Crystalline Swan — deep obsidian void, ice wing stellar highlights, wing purple cosmic dust, gilded fern rare accent
Motion: 20s scroll-scrubbed slow pan
Aspect: 21:9
Emotional job: awe
Section type: C1 or C4 (letterform-embedded works beautifully with cosmic)
Fallback still: hero frame
Negative: no sci-fi cliché, no Star Wars laser effects, no synthwave
```

**Underwater brief template**
```
Scene: [underwater subject — jellyfish bloom, coral reef, school of fish, sun refracted through water surface] at [depth / time]
Style: cinematic underwater, caustic light, particulate in beam
Palette: Crystalline Swan — midnight sapphire deep water, cyan caustics, occasional wing purple bioluminescence
Motion: 8s loop, slow natural drift
Aspect: 16:9 or 9:16 for mobile-first surfaces
Emotional job: calm or curiosity
Section type: C2 parallax story, C10 divider
Fallback still: hero frame
Negative: no aquarium tank look, no scuba diver in frame, no dive computer
```

**Urban / architectural brief template**
```
Scene: [city or structure — skyline at blue hour, modernist lobby, bridge at night, rooftop with view] in [specific city or style]
Style: editorial architecture, long exposure for motion, clean lines
Palette: Crystalline Swan — graphite surfaces, ice wing streetlights, wing purple signage glow
Motion: 6s loop, subtle traffic or wind on flag
Aspect: 21:9
Emotional job: trust or aspiration
Section type: C1 hero, C6 testimonial flip card background
Fallback still: hero frame
Negative: no crowded tourist scene, no Instagram-tourist angle, no filter stack
```

**Abstract / liquid-blend brief template**
```
Scene: [abstract subject — ink in water, marble swirl, liquid mercury, color field]
Style: editorial abstract, macro, high-shutter for crisp edges
Palette: Crystalline Swan — specify exact tokens: "sapphire #002060 base, cyan #60C0F0 flowing through, wing purple #8B5CF6 accent on edges"
Motion: 6s loop, slow flow
Aspect: 16:9 or 9:16
Emotional job: curiosity or awe
Section type: C10 divider, C4 letterform fill, background layer
Fallback still: hero frame
Negative: no generic gradient background, no glassmorphism cliché, no cheap VFX
```

### E3. Prompt hygiene rules

- **Always name Crystalline Swan tokens explicitly** — do not assume the generator knows "cyan blue" means Ice Wing `#60C0F0`. Name the hex.
- **Always specify motion duration and loop vs scroll-scrubbed** — generators default to 3s pan if you don't.
- **Always describe the fallback still frame** — you need both video and poster from the same brief.
- **Always include negative prompts** — stock-looking output is the default failure mode.
- **Never use "vibrant" "dynamic" "stunning" without specifying what they mean** — fluff adjectives get fluff results. Specify palette, light direction, focal length, time of day.
- **Test one prompt, iterate 3 times, keep the best** — do not accept the first generation.

### E4. Brand-lock reminder

Seedance does not know about retired Galaxy-Swan tokens. Every brief must remind the generator (via negative prompt) to avoid:
- `#0a0a1a` pure-black background (use Obsidian `#0A0A0F` instead)
- `#00FFFF` pure cyan (use Ice Wing `#60C0F0`)
- `#7851A9` old purple (use Wing Purple `#8B5CF6`)

If a generated asset shows any of these retired tones prominently, reject and regenerate.

---

## F. Asset lifecycle

### F1. Intake
- Seedance generates 3-5 variants per brief
- Sean (or Claude in a guided session) picks the winner
- Winner goes to `frontend/public/assets/generated/{category}/` with a descriptive filename
- Descriptor filename format: `{section-type}_{subject}_{variant}_{date}.{ext}` — e.g., `hero_jellyfish-bloom_v3_2026-04-12.mp4`

### F2. Optimization
- Video → `ffmpeg` pass: H.264 baseline profile, faststart flag, target bitrate by resolution, keyframes every 0.5s for scroll-scrubbing
- Image → WebP or AVIF, multiple sizes via responsive `<picture>` source set
- 3D model → Draco compression, gltf-pipeline optimization

### F3. Integration
- Asset URL goes into a central config, NOT hardcoded in component JSX
- `frontend/src/config/videoAssets.ts` pattern (see `docs/ai-workflow/references/R2-VIDEO-MIGRATION.md`)
- Components import the config, never the file path

### F4. R2 hosting
- Large assets go to Cloudflare R2 per `R2-VIDEO-MIGRATION.md`
- Git repo stores thumbnail/poster only, never the full video binary (1.3GB git bloat incident already happened; do not repeat)

### F5. Fallback provisioning
- For every tier-1 video asset, generate and store a tier-2 still (the poster frame) at the same time
- For every tier-2 still, the tier-3 fallback is a CSS gradient defined in the component itself, not another asset

---

## G. Quality gate before shipping any asset

Before a Seedance asset lands in production, it must pass:

1. **Palette check** — does the asset actually use Crystalline Swan tones, or did it drift?
2. **Emotional-job check** — does it do the job the section needs, or did it land somewhere adjacent?
3. **Motion check** — does the motion support the story, or is it busy/distracting?
4. **Performance check** — file size under budget, loads in <2s on 3G, decodes cleanly on Safari
5. **Fallback check** — tier-2 poster exists and looks intentional
6. **Accessibility check** — no flashing >3Hz, no seizure-risk strobing, `prefers-reduced-motion` path verified
7. **Brand-lock check** — no retired Galaxy-Swan tones, no generic stock aesthetic
8. **Rule-9 check** — no yoga/meditation framing; use stretching/flexibility

If any gate fails, iterate the Seedance brief — do not ship around the failure.

---

## H. How this document is consumed

`.claude/skills/swan-design-router/SKILL.md` loads this document alongside `SWAN-CINEMATIC-DESIGN-SYSTEM.md`. Every default Swan design task that needs an asset produces a Seedance brief derived from this document's templates. Asset questions are not handled by a separate skill — they are part of the unified design flow through the router.

When a legacy aesthetic skill (e.g., `minimalist-ui`) is explicitly invoked and its asset guidance conflicts with this document, this document wins. The aesthetic skill's asset preferences apply only to surface-specific overrides that do not contradict Swan's brand-lock.
