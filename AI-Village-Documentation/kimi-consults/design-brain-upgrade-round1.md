# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWAN-DESIGN-BRAIN-AESTHETIC-UPGRADE-MASTER-2026-07-18.md
**Seed:** (none)
**Tokens:** 4557 in / 16000 out · **Cost:** ~$0.2537 · **Wall:** 550.8s

---

# THE WORLD & ATMOSPHERE SYSTEM — Authored Spec
**Kimi K3 · Final Design Authority, Design-Brain Aesthetic Workstream · 2026-07-18**

Direction received. I'm not annotating the plan — I'm closing its open questions with decisions. What follows is how I build it. Claude implements this, not a remix of it.

---

## 0. The Doctrine (read this first — everything descends from it)

The three pillars in the plan are a mood board until someone names the physics that makes them one system. Here are the physics:

**Two worlds beneath one glass.**

- **The Epic** — NatGeo/Spotlight-grade atmosphere — is the world *above*: vast, sublime, aspiration. Cosmos, ridgelines, glaciers, falls.
- **The Miniature** — tilt-shift living micro-worlds — is the world *below*: intimate, inhabited, the daily work. Tiny people, real lives, training.
- **Crystalline Swan** is the *glass between*: the obsidian dark room whose glowing objects are the instrument panel through which you read both worlds.

**The fusion law — opposite physics per register:**
- **Epic recedes.** It is dimmed, graded, blurred into the obsidian ground. It is weather behind the room.
- **Miniature projects.** A diorama is a *lit object* in the dark room — crisp, framed, edge-glowing like a jewel. It sits at content depth, never behind text.

**The signature moment — the Scale-Reveal.** The system can translate between registers: the daily (Miniature) *opens into* the sublime (Epic). A milestone fires: the tiny runner's lit lap-loop eases through a depth-of-field pull and crossfades into a real dawn summit. *Your reps become the mountain.* That is the soul mechanic, it is ownable, and no competitor has it. Reduced-motion: instant swap with a single ≤200ms opacity settle on a gold seam. No exceptions.

**The provenance law — Epic is captured, Miniature is built.** Epic imagery is *real photography* wherever possible — NASA/ESA public-domain for cosmos, licensed professional photography for terrestrial — graded into our tokens. Miniature worlds are *generated* — they don't exist to be photographed, and generation gives us zero-PII control over every tiny face. This is also the cost/quality optimum.

**The translation law.** NatGeo/Spotlight is a *fidelity bar*, never a composition source. No asset may be recognizable as a specific known photograph, app screen, or wallpaper. Every brief must pass the Translation Test: regenerable from the brief alone, with zero dependence on a reference image.

---

## 1. The World & Atmosphere System — refined pillars

### Pillar A → **The Epic register** (Atmosphere)
Six named archetypes. Each is a *universal narrative slot* wearing Crystalline Swan subject matter (that split is the portability mechanism — see §3).

| ID | Universal slot | Swan canon | Narrative job | Seam |
|---|---|---|---|---|
| **Zenith** | Aspiration | Nebulae, JWST fields, aurora, star fields | Peak moments, Legendary rarity, marketing hero apex, Reveal endpoint | wing-purple |
| **Ascent** | Journey | Dawn ridgelines, snow peaks, aerial high country | Onboarding, programs, long arcs, Reveal endpoint | gold |
| **Depth** | Focus | Glaciers, ice caves, frozen lakes, blue-ice macro | Recovery, deload, focus modes, trainer tool headers | ice |
| **Flow** | Continuity | Waterfalls, rivers, Caribbean shallows from above | Streak ambience, mobility, community feed headers | ice |
| **Flora** | Growth | Botanical macro, dew, unfurling fronds | Beginner phases, nutrition, habit-building, "start here" empty states | gold |
| **Terra** | Grounding | Aerial US/Canada — CA coast, TX plains, NY distance, FL wetlands, MT sky, Seattle sound | Challenges, locale proof, gym-operator/B2B pages | gold |

**Composition rules (all Epic):** horizon/focal mass placed to leave a declared negative-space zone for UI; time of day biased dawn/blue-hour (harmonizes with gold and ice); never midday harshness; luminance capped — Epic is graded *toward the ground tone*, never brighter than content.

### Pillar B → **The Miniature register** (Living micro-worlds)
Six named worlds. "The Sims, but photoreal" — tilt-shift DOF, isometric peer-in framing, macro detail, lit like dollhouse rooms at blue hour.

| ID | Universal slot | The world | Primary surface |
|---|---|---|---|
| **The Block** | Community | One perfect tiny city block: gym with glowing windows, a runner on the corner, a cyclist, two elders stretching in the pocket park | Community surfaces, marketing mid-page, share-card base |
| **The Box** | Craft | Cutaway gym interior, roofless dollhouse view: coaching pairs, lifters, chalk dust in light shafts | Trainer dashboard, program surfaces, empty states |
| **The Track** | Consistency | A lit loop track through a tiny night park; one runner mid-stride; laps marked in gold light | **The streak visual** — see below |
| **The Homestead** | Everyday | Tiny garage-gym/living-room scene: kettlebell, mat, kid playing nearby, dog asleep | At-home programs, Swan Coach empty state |
| **The Vista** | Milestone | Tiny hiker on a miniature summit ridge at first light — the *bridge* between registers | Level-ups, milestone celebrations, the Reveal's Miniature anchor |
| **The Seasons** | Time | The same Block corner across four seasons (one asset family) | Long-term timelines, annual recaps — "your year in training" as a four-diorama strip |

**The streak translation (Mobbin principle 2, made ours):** Tonal's dot-grid becomes *lit lap-marks around The Track*. Consistency is a tiny person running a glowing loop — one gold mark per day. This is the single most ownable gamification visual in the fitness category. Static under reduced-motion; the marks alone carry the meaning (never motion-dependent).

**Diversity spec (hard rule, all Miniature briefs):** any scene with ≥5 figures shows ≥3 visibly distinct presentations across skin tone, age (child→elder), body type, ability (a wheelchair athlete where the scene allows), gender. Diversity spreads *across* scenes too — no single "diversity figure" tokenism. All faces non-identifiable (tilt-shift DOF enforces this naturally). Zero real member likenesses. Zero PII.

### Pillar C → **The Fusion layer** (tokens, never forked)
1. **The Grade, not the pixel.** No raw image ever touches the UI. Every Epic asset passes **GR-1 (Depth Grade)**: obsidian scrim stack + corner vignette + `saturate(.82) brightness(.9)` bias toward sapphire. Every Miniature passes **GR-2 (Diorama Grade)**: 1px token seam at ~45% + outer token-colored glow + inner top sheen — it reads as a *light source*.
2. **Z-stack (fixed):** `z0 obsidian ground → z1 Epic atmosphere (blur 2px, scrim'd) → z2 ground-fade seam → z3 glass content → z4 diorama insets → z5 glow/focus`. Nothing photographic above z2 except framed dioramas. Text never below z3. **Text never sits on a Miniature** — labels live in UI beside/below the frame.
3. **Contrast floor:** composite (image + scrim) under any text zone measures ≥4.5:1. Scrim opacity floors per slot guarantee it; QA measures the *composite*, not the raw image.
4. **Token extension, not fork.** The world layer adds exactly **6 semantic tokens**, defined in `design.md` as compositions of existing primitives, every use `var(--token, #fallback)`. Inline hex in a world component = QA fail. Galaxy-Swan hexes (`#0a0a1a`, pure `#00FFFF`, `#7851A9`) are banned in assets *and* prompts (negative-prompt block enforces).

```css
/* World Layer — canonical extension to design.md (all derived from primitives) */
--world-scrim-deep:   linear-gradient(180deg, var(--swan-obsidian-950,#030509)E6 0%, var(--swan-obsidian-900,#050810)B3 45%, var(--swan-obsidian-950,#030509)F2 100%);
--world-scrim-soft:   linear-gradient(180deg, transparent, var(--swan-obsidian-950,#030509)CC);
--world-vignette:     radial-gradient(120% 100% at 50% 40%, transparent 55%, var(--swan-obsidian-950,#030509)D9 100%);
--world-seam-ice:     color-mix(in srgb, var(--swan-ice-400,#7FD4FF) 45%, transparent);
--world-seam-gold:    color-mix(in srgb, var(--swan-gold-400,#E8C468) 45%, transparent);
--world-diorama-glow: 0 0 24px color-mix(in srgb, var(--swan-ice-400,#7FD4FF) 18%, transparent);
```

**Guardrails as components** (styled-components, no MUI/Tailwind):

```tsx
<AtmosphereLayer archetype="zenith" slot="hero" />   // enforces GR-1, scrim floors, srcset, fallback tier
<DioramaFrame world="track" alt={briefAlt} />        // enforces GR-2, ratio lock, decorative-awareness
useWorldTier()  // resolves 'motion' | 'still' | 'synthetic' | 'ground'
```

**Fallback ladder (every asset declares all applicable tiers):**

| Tier | What | When |
|---|---|---|
| L0 | Motion world (Seedance loop ≤6s, muted, ≤2.5MB, poster required, paused offscreen) | Only slotted surfaces; `no-preference` motion AND no save-data AND ≥4g AND in-viewport |
| L1 | Graded still (AVIF→WebP; hero ≤160KB @1920w; diorama ≤120KB; srcset 768/1280/1920; dimensions locked) | Default |
| L2 | Synthetic atmosphere — pure CSS token-gradient recipe per archetype (~0KB, inline in the component) | Reduced-motion, save-data, slow connection. **Must still feel designed — it is a look, not a punishment.** |
| L3 | Ground state (flat obsidian + seam + one glow accent) | Error/emergency path |

**A11y gates:** worlds behind content are `aria-hidden` with empty alt; content-bearing dioramas get brief-authored alt in the pattern *"[world], [who/activity], [time of day], [mood]"* (no brand adjectives). Reduced-motion: L0→L1, Reveal→instant swap, **no scroll-parallax anywhere in v1** — I am killing that entire risk class; depth comes from grade and blur, not motion. Celebration sparkles: ≤24 GPU-transformed elements, under flash thresholds, never color-only meaning (rarity = icon + label + shape, color secondary). Interactive affordances (share) are standard ≥44px buttons with the gold focus ring. World layers never take focus.

**Perf gates:** total world imagery ≤350KB/route (L0 video excluded — enhancement-only); LCP hero `fetchpriority=high`, everything else lazy + async-decode; aspect-ratio always set (zero CLS); filter layers ≤2, backdrop-filter ≤3 per viewport.

---

## 2. File structure — the new brain content

**Five new files:**

**`design-brain/world-atmosphere.md`** — the system (the *how*):
`§1 Two-World Doctrine · §2 Fusion Physics (Epic recedes / Miniature projects) · §3 Grades GR-1/GR-2 + seam recipes · §4 Z-stack · §5 Luminance & contrast floors per slot · §6 Token extension (the 6 tokens) · §7 Fallback ladder L0–L3 + synthetic L2 recipes per archetype · §8 Scale-Reveal spec (timing ≤1200ms, reduced-motion variant, celebration budget) · §9 A11y gates · §10 Perf budgets · §11 Component primitives · §12 Translation Test & provenance law`

**`design-brain/world-archetypes.md`** — the catalog (the *what*): one full entry per archetype above (12 total) — ID, universal slot, narrative job, subject canon, composition spec, grade+seam, L0 motion behavior, surfaces allowed/banned, diversity spec (Miniature), alt pattern, surface-mapping matrix (marketing/auth/client/trainer/admin/community/coach).

**`design-brain/world-briefs.md`** — generation briefs (the *make*):

```markdown
# Generation Brief — {WA-ID}
- ID: WA-{EPIC|MINI}-{archetype}-{surface}-{nn}        # e.g. WA-MINI-TRACK-STREAKCARD-01
- Register / Archetype / Universal slot
- Surface + slot: {route · component · zone}
- Narrative job: {one sentence — what the user FEELS here}
- Canvas: {ratios/px} · Negative-space zone reserved for UI: {where}
- Composition: {horizon · focal depth · lighting · time of day}
- Canon ref: world-archetypes.md §{anchor}
- Grade / seam: {GR-1|GR-2} · {ice|gold|wing}
- Token harmony: dominant hues inside {token family} · BANNED: Galaxy-Swan hexes
- Diversity spec (Miniature): {figure count · spread · abilities · faces non-identifiable}
- L0 motion (optional): {3-beat loop ≤6s} · Poster frame: {which}
- Fallbacks: L1 crops {list} · L2 synthetic recipe {name, world-atmosphere §7}
- Alt: {draft per pattern} or {decorative — aria-hidden}
- Budgets: {KB caps · viewport set}
- Provenance: {tool+model+date | NASA/ESA credit | license} → asset manifest
- QA: world-gate v1 — grade pass · composite ≥4.5:1 · hex scan · PII scan · Translation Test
- Standard negative block: no text, no logos, no watermarks, no real brands,
  no identifiable faces, no #00FFFF, no #0a0a1a, no HDR halos, no lens dirt
```

**`design-brain/portability.md`** — the engine/identity split (see §3).
**`design-brain/adapters/world-generator.md`** — the callable agent guide; **absorbs the 2026-07-17 Living World Generator wholesale** (archetypes → world-archetypes.md, prompt logic → here). The two 2026-07-17 master prompts move to `AI-HANDOFF/_archive/` with SUPERSEDED banners. Absorbed, not forked — as the plan correctly demanded.

**Amendments to existing files** (ledger in §4). `design.html` gains a World Layer gallery: grade swatches, z-stack diagram, L2 synthetic recipes rendered live, fallback-ladder demo.

---

## 3. The brand-agnostic engine

**The Two-Layer Law.** The brain is written so every world rule appears twice-once: first the **universal law** (brand-neutral prose), then
