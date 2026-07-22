---
title: Swan Cinematic Design System
owner: Claude Opus 4.6 (CEO)
last_modified: 2026-04-12
status: active — source of truth for Swan visual work
supersedes: AI-Village-Documentation/design/CINEMATIC-WEB-DESIGN-SYSTEM.md (legacy, Tailwind/Galaxy-Swan era)
loaded_by: .claude/skills/swan-design-router/SKILL.md
companions: SWAN-ASSET-STORYBOARDING.md
---

# Swan Cinematic Design System

**Purpose:** the Swan-specific visual operating system. Defines the stack, the visual grammar, the layout and interaction pattern library, the asset direction rules, and the Seedance 2.0 prompt integration for all SS-PT design work.

**Scope:** marketing surfaces, client/trainer/admin dashboards, storefront, content studio, and every public-facing surface of sswanstudios.com. This is not a marketing-only document — the same story-first grammar scales into dashboards.

**Anti-scope:** generic AI layouts, Tailwind class-thinking, Galaxy-Swan tokens, lifeless 4-up KPI grids, centered-heading-plus-two-buttons hero template.

---

## A. Stack truth

### Composition foundation
- **styled-components-first.** Every new component uses `styled.div\`\`` (or appropriate element). No Tailwind classes in new code, no `className="flex gap-4 p-6"` in JSX. Use `css` helper for shared fragments, `css\`\`` for keyframes interpolation (this is a repeat-offender hardening rule — see `docs/ai-workflow/references/BUILD-HARDENING.md`).
- **CSS Grid** is the primary layout tool. Flexbox for row/column cases and intra-component alignment. Not the other way around. Grid is where the asymmetry lives.
- **CSS custom properties with dark-theme fallbacks** (`var(--token, #fallback)`), per CLAUDE.md rule 6. Every color, every spacing scale, every blur radius has a token.

### Motion and interaction tools
- **Framer Motion** for component-level enter/exit, hover, tap, layout transitions, presence choreography. This is the default.
- **CSS transforms + will-change + GPU hints** for 60fps scroll-linked effects where Framer would be heavy.
- **IntersectionObserver** for scroll-in reveals. Do not scroll-listen without debouncing.
- **requestAnimationFrame** for scroll-tied parallax and scroll-scrubbed video.
- **GSAP** allowed only when scroll choreography genuinely benefits — long scrollTrigger sequences, pinned sections with multi-step timelines, text scramble effects. Do not pull GSAP for a simple fade-in.
- **Three.js / React Three Fiber** only for small surgical moments: hero accent, product showcase cube, geode rotation, nebula field. Never as default page scaffolding. Always behind `<Suspense>` with a graceful 2D fallback.

### Performance tiers
Every cinematic surface ships with three tiers:

| Tier | Conditions | What you get |
|---|---|---|
| **Full cinema** | desktop, normal mobile (>=4GB RAM, not `prefers-reduced-motion`), network >= 3G | video headers, parallax, Three.js accents, Framer layout tweens, full motion |
| **Lean cinema** | low-power mobile, slow network, `save-data: on` | still hero image instead of video, CSS parallax only, no Three.js, reduced motion duration |
| **Reduced motion** | `prefers-reduced-motion: reduce` | all motion disabled, no scroll-linked effects, static composition, tokens preserved |

Use `useMediaQuery('(prefers-reduced-motion: reduce)')` or the styled-components `@media (prefers-reduced-motion: reduce)` query. Never ship a tier-1 experience without a tier-2 and tier-3 fallback in the same file.

### Stack bans (repeat from CLAUDE.md for local clarity)
- No Material-UI (rule 1)
- No Tailwind
- No Recharts in new work — Victory only (rule 10)
- No Galaxy-Swan tokens (`#0a0a1a`, `#00FFFF`, `#7851A9`) — retired
- No yoga/meditation language — "stretching"/"flexibility" (rule 9)

---

## B. Swan visual grammar

### Palette (Crystalline Swan — active)

| Token | Hex | Role |
|---|---|---|
| Midnight Sapphire | `#002060` | Primary — buttons bg |
| Royal Depth | `#003080` | Surface — elevated cards |
| Ice Wing | `#60C0F0` | Cyan glow — gaming accents, XP bars |
| Arctic Cyan | `#50A0F0` | Data only — charts, NOT buttons/glow |
| Gilded Fern | `#C6A84B` | Luxury accent — gold |
| Frost White | `#E0ECF4` | Text primary |
| Swan Lavender | `#4070C0` | Tertiary |
| Wing Purple | `#8B5CF6` | Glow accent — purple buttons, focus rings |
| Obsidian Black | `#0A0A0F` | Deep dark — primary dark bg |
| Carbon | `#141419` | Card dark |
| Graphite | `#1A1A24` | Surface dark — modals, drawers |

### Dual-Button Glow rule (mandatory)
- **Blue bg → Purple glow** (Midnight Sapphire / Royal Depth button → Wing Purple outer glow + focus ring)
- **Purple bg → Cyan glow** (Wing Purple button → Ice Wing outer glow + focus ring)

Any library suggestion that conflicts with this rule is **rejected**, not adapted. (This is the LILA BAN conflict with `design-taste-frontend` — that skill is quarantined from default because it forbids purple glows.)

### Typography
- **Plus Jakarta Sans** — headings, UI labels, primary text
- **Cormorant Garamond Italic** — drama, editorial quotes, hero serif moments, section dividers with typographic flourishes
- **Fira Code** — data, KPI values, code, monospaced stat labels
- **Sora** — UI, gaming-adjacent elements, button labels in gamified surfaces
- **Never** Inter, Roboto, Arial, Helvetica as hero/display faces. They're fine for tiny system text if absolutely necessary, but not for anything the user *sees as design*.

### Atmospheric rules
- **Dark-first by default.** Default theme is `crystalline-dark`. Every component must render with `var(--bg-base, #030712)` fallback or similar dark tokens.
- **Colorful within dark.** Dark-first does not mean monochrome. Layer saturated Crystalline Swan accents on top of obsidian/carbon backgrounds. Think "dark room lit by glowing objects," not "grayscale minimalism."
- **Glass.** `backdrop-filter: blur(20px-40px)` + `background: rgba(0, 32, 96, 0.6)` on sapphire surfaces, `rgba(20, 20, 25, 0.7)` on obsidian surfaces. Always paired with a subtle border.
- **Electric borders.** `border: 1px solid rgba(96, 192, 240, 0.25)` baseline; hover to `rgba(96, 192, 240, 0.5)`. Gold variant for luxury surfaces: `rgba(198, 168, 75, 0.3)`.
- **Depth layering.** Three z-stacks minimum per hero surface: background (parallax media), midground (glass cards), foreground (typography + CTA). Shadow discipline: soft cyan or purple tinted shadows, never flat gray.
- **Subtle blur as a depth cue,** not as a "glassmorphism" novelty. Blur the parallax background behind sticky foreground. Do not blur everything equally.
- **Texture and grain.** 2-5% opacity noise overlay on large dark surfaces reduces the "plastic AI gradient" look. Implement as a 200x200 `<svg>` noise pattern in a pseudo-element.

### Composition rules — asymmetry and editorial rhythm
- **Grid must break.** If your `grid-template-columns` is `repeat(4, 1fr)` with equal gaps, you are building a template, not a composition. Use `grid-template-columns: minmax(200px, 2fr) minmax(400px, 5fr) minmax(180px, 1fr)` or similar. Weight columns unequally.
- **Negative space is a component.** The empty column is often the strongest element. Do not apologize for whitespace by filling it with decoration.
- **Vertical rhythm via modular scale,** not arbitrary pixel values. Use the scale: `4px, 8px, 12px, 16px, 24px, 32px, 48px, 72px, 108px, 160px, 240px`. Section gaps are 160-240px on desktop, 72-108px on mobile.
- **Editorial hierarchy.** The biggest thing on screen is the biggest idea. Headlines hit 64-120px on desktop. Stat numbers hit 96-160px. Body text sits at 16-18px. Do not uniform-size everything.
- **One signature moment per section.** Every section needs one visual that is *memorable* — a video loop, a rotating asset, a scroll-linked parallax, a flippable card stack. A section without a signature moment is filler.

### Explicit bans on generic AI patterns
This is where the system enforces anti-template discipline. **Do not ship any of these as the first option:**

1. **No equal 4-up box grids as default.** Four cards in a `grid-template-columns: repeat(4, 1fr)` with identical framing is the most tired AI pattern. If you need four things, try 2+1+1 asymmetry, or a shelf/editions pattern (section C), or a rotated stack.
2. **No empty hero with centered heading + 2 buttons + abstract blob.** This is the 2022 Vercel template. Swan heroes always have a media surface (video, parallax image, letterform-embedded media) as co-lead with the text, not decoration behind it.
3. **No isolated KPI number rows without a media or story anchor.** A row of 4 numbers in cards is lifeless. Every KPI block in Swan has a representative media surface above, beside, or beneath the numbers — an asset that makes the number feel like something happened.
4. **No generic chart cards with identical framing.** Every chart ships inside a narrative — a headline explaining what it shows, a sparkline lead-in, an annotation on the moment that matters. Chart as decoration fails.
5. **No Tailwind class-thinking in styled-components tasks.** Don't write `` styled.div`display: flex; gap: 1rem; padding: 1.5rem;` `` when you could write a grid composition with real visual rhythm. Tailwind trains the eye for utility stacks; Swan requires composition stacks.
6. **No centered everything.** Center-aligned hero → center-aligned section → center-aligned CTA = template cadence. Break the cadence with left-aligned editorial moments.
7. **No "card, card, card."** If three sequential sections all use the same card archetype, one of them is wrong.
8. **No full-bleed stock photography.** If you need a background image, use Seedance-generated assets that match the page's specific story, not a stock beach.
9. **No motion for motion's sake.** Every motion beat has a job — reveal information, cue hierarchy, transition state, reward interaction. Decorative motion that doesn't communicate is noise.
10. **No glassmorphism as a gimmick.** Glass is a depth tool. If removing the blur would not change what the user understands, the blur was decoration. Strip it.

---

## B2. Page-level narrative arc (MANDATORY)

Every major Swan surface must be designed as a **story top-to-bottom**, not as a stack of unrelated sections. Before picking any section pattern from C1-C12, name the page's story arc. This is the "what is this page trying to make the user feel, in order" decision, and it governs which patterns land in which order.

Two arc templates: one for marketing/landing surfaces, one for dashboard surfaces. Every page must fit one of them before implementation starts.

### B2.1 Marketing / landing-page arc (4 acts)

Every homepage, About, Services, package detail, storefront, landing page, content page, or any outward-facing surface follows this arc:

| Act | Name | Emotional target | What the user must feel | Typical section patterns |
|---|---|---|---|---|
| **Act 1** | Hook / awe / identity | awe, curiosity | "this is different; I want to keep looking" | C1 cinematic hero + video header, C4 embedded-media wordmark/letterform |
| **Act 2** | Capability / trust / proof | trust, curiosity | "these people actually know what they're doing" | C3 sticky foreground / changing background, C6 flippable detail card, C8 clustered/orbiting media nodes, C11 premium chart environment for proof |
| **Act 3** | Transformation / momentum / participation | momentum, aspiration | "I can see myself doing this; I want to start" | C2 parallax story section, C5 shelf/editions/poster wall (lineup of paths), C9 media-first KPI/counter block (impact) |
| **Act 4** | Conversion / belonging / next action | celebration, intimacy | "this is for me; here is what happens next" | C1 secondary CTA beat, C7 hover tilt card for final offer, C10 narrative divider into contact or checkout |

**Rules:**
- Each act runs one or more sections. Acts are not single sections.
- Acts must progress in order. Act 2 before Act 1 is incoherent.
- Each act gets one primary emotional target; sections inside the act may touch secondary targets but must not contradict the primary.
- C10 narrative section dividers live **between acts**, not within them. The transition from Act 2 to Act 3 is a story beat, not a margin.
- If a page has only one signature moment (see rule in section B), put it in Act 1 — the hook.
- The conversion CTA in Act 4 must be visible before the user has to hunt for it. Do not require a scroll-back.

**Anti-pattern:** a page built as "hero → features grid → stats row → pricing → contact form." That's a template, not an arc. Each of those slots maps to an act, but without naming the acts first the design drifts back to generic defaults.

### B2.2 Dashboard-surface arc (4 phases)

Dashboards are not marketing pages, but Swan dashboards still get story structure. The arc is different — users arrive with a goal, not with curiosity — but the discipline is the same.

| Phase | Name | User's question | What the phase must answer | Typical section patterns |
|---|---|---|---|---|
| **Phase 1** | Orientation | "where am I, who am I, what am I looking at?" | identity cues (user name, role, tier), momentum indicators (streak, XP, level), greeting state | C9 media-first momentum card, gamification header |
| **Phase 2** | Current state | "what is true right now?" | the real numbers, the real chart, the real list of sessions/workouts/clients | C11 premium chart environment, data tables, real-time status |
| **Phase 3** | Progress / insight | "how am I doing; what has changed?" | trends, deltas, annotations, sparklines, before/after comparisons | C11 with narrative column, C9 KPI blocks with media anchors, Victory charts with annotation layer |
| **Phase 4** | Next best action | "what should I do next?" | clear CTAs, recommended actions, the single thing the user should do if they only do one thing | C7 hover-tilt action cards, prominent CTAs, guided-next-step surfaces |

**Rules:**
- Phase 1 comes first. A dashboard that doesn't tell the user where they are and how they're doing *first* fails its job. Orientation is the welcome beat.
- Phase 2 is the biggest surface-area section in most Swan dashboards — the real data. It gets the most screen real estate.
- Phase 3 is where "trust, but verify" lives. Charts without insight columns are Phase 2, not Phase 3. A chart becomes Phase 3 the moment it has an annotation or a narrative telling the user what it means.
- Phase 4 must exist. Every Swan dashboard ends with an answer to "what now?" — even if the answer is "rest, you earned it."
- If the dashboard is role-specific (admin vs trainer vs client), all four phases still apply but their *content* differs. Admin's Phase 1 is business health; client's Phase 1 is personal momentum.

**Anti-pattern:** a dashboard that opens with a KPI row and has no sense of "who this user is" — that's a data dump, not a dashboard. Phase 1 is not optional.

**Anti-pattern:** a dashboard that ends with "sign out" as its only Phase 4. Every Swan dashboard ends with forward motion, not an exit.

### B2.3 How to use these arcs in practice

Before opening any styled-components file for a new page or redesign:

1. Name the surface (marketing vs dashboard).
2. Write the arc template in the task thread (4 acts or 4 phases).
3. For each act/phase, name: emotional target, primary section pattern(s) from C1-C12, signature moment (if Act 1 or Phase 1), asset archetype.
4. Confirm acts progress in order.
5. **Only then** start implementation.

`swan-design-router` enforces this. No implementation without the arc written down first.

---

## B2.4 The Extreme Macro-Journey concept grammar (the awe engine)

Most Swan pages that "feel generic" fail at Act 1 — the hook is a nice hero, not an *awe* hook. This section is the repeatable grammar for manufacturing awe on demand. It is the single most important addition to the Swan taste ceiling: it is the aesthetic tier that lives **above** conventional app-UI reference (Mobbin and the like govern dashboards, forms, and flows; this grammar governs hero/landing/showcase/brand surfaces — the surfaces whose job is to make a stranger stop breathing for a second).

### The formula

A macro-journey Act-1 hook is **one continuous camera move that travels through scale**, following this four-beat shape:

1. **START INSIDE something small.** Never open on a wide establishing shot. Open *inside* a single object at extreme macro scale — inside one bubble, on the wall of one dissolving capsule, on the hexagonal lattice of a single ice crystal, inside a single droplet, between two fibers of muscle tissue. The viewer does not yet know where they are. That disorientation is the hook.
2. **PUSH THROUGH a membrane / boundary.** The camera moves *forward* and passes through a surface — through the bubble's skin into liquid, through the capsule wall into a cloud of powder, through the crystal's surface into its molecular interior. The "push-through" is the beat that says *this is a journey, not a photograph.*
3. **TRAVEL through a field.** Between boundaries, the camera drifts through a populated space — rising carbonation threads, floating granules each catching light, orbiting particles, a lattice of light. This is where the scroll *earns* its length: the field is what the user scrubs through.
4. **BREAK a surface / ARRIVE.** The journey resolves by breaking OUT — breaking the meniscus and surface tension of a glass, condensing onto skin, cresting a horizon, arriving at the product or the wordmark. The arrival is the payoff and, usually, where the first CTA becomes earned.

**The through-line: `inside → through → across → out`.** Every strong macro-journey is a legible change of scale and a legible forward motion. If a viewer can't tell they moved *forward* and *through scale*, it isn't a journey — it's a pan.

### Worked concept seeds (the shape, not a menu to copy)

| Seed | Start inside | Push through | Travel across | Break out / arrive |
|---|---|---|---|---|
| Frozen-forest vault | inside a single snowflake's arm | through the ice surface | across a lattice of suspended frost particles | crest into the vault interior + wordmark |
| Living muscle | between two muscle fibers at cellular scale | through the fascia sheath | across a field of firing motor units (light pulses) | out to the athlete mid-rep, form perfect |
| Deep-ocean luxury | inside a single bioluminescent bubble | through the bubble skin into dark water | across drifting light-plankton | break the surface into the storefront |
| Crystalline geode | inside one facet's internal fracture | through the crystal wall | across a cavern of slow-rotating shards | out to the product on a pedestal of light |

These seeds are illustrative of the *shape*. The correct move is to generate your own against the page's mood words (§ cinematic-pages.md §1) and Swan verticals (fitness, deep-ocean, frozen-forest, cosmic) — never to clone one of these four.

### Sanctioned variants (the grammar is not a monoculture)

`inside → through → across → out` is the **default** awe grammar, but it only covers *ingress* (traveling in and arriving out). Two more shapes are sanctioned so every Swan hero doesn't open the same way:

- **Reverse journey** — `out → across → through → in`. Open on the athlete / the landscape / the finished product, then push *into* the body, the crystal, the material. Use when the brand moment is **intimacy**, not arrival — "come closer" rather than "behold."
- **Orbit** — `around → tightening spiral → in`. Circle a subject, spiraling closer. Use for **product-as-monument** — the piece treated as an object worth orbiting.
- Non-macro awe hooks (a time-lapse metamorphosis, a human-scale transformation) remain legal via the §18 breadth pass. Macro is the *default* awe grammar, not the only one. (See the generic-killer rule below: a portfolio where every hook is a macro "start-inside-an-object" is itself generic at the site level.)

### Rules for using the grammar

- **Scope — where the grammar lives vs. where C13 lives (read this, it resolves the two scopes).** The four beats **power the Act-1 hook of any page tier** — rendered via C1 (video hero) or C3 (sticky) inside a normal full 4-act page, where the hook produces the signature moment and Acts 2-4 follow as usual. **C13 (§C13) is the rare *whole-page* deployment** where the journey IS all four acts and the arrival carries the only CTA. Decision rule: if your sitemap has **>0 sections below the fold**, you are building an Act-1 hook (C1/C3), NOT C13. C13 is only when the journey is the entire page.
- **Scale change must be real.** "A cool video" is not a macro-journey. The camera must demonstrably move through scale (micro→macro or the reverse), passing at least one membrane. One membrane minimum; two is the sweet spot; three starts to feel like a screensaver.
- **The arrival must land on brand meaning.** The journey resolves at something that *matters* — the product, the wordmark, the transformed user, the storefront threshold. A journey that arrives nowhere is decoration (§B ban 9).
- **The creative must contain a brand-ownable object.** The journey must travel through or arrive at something that could not appear in any other brand's film — swan anatomy, wing geometry, Crystalline refraction, the frozen-forest vault, real training/muscle detail. A scrubbed abstract-particle field with a logo at the end is a lava lamp with a CTA — generic, and rejected at review. Awe with no brand ownership fails.
- **Assets:** this is exactly the raw material `cinematic-pages.md` §8 (scroll-scrubbed sequence) and the Seedance cinematic skill are built to produce. The grammar is the *concept*; those docs are the *production*. Write the four beats into the Seedance brief as the shot description.
- **When NOT to use it:** working surfaces (dashboards, portals, operator tools). A macro-journey on an admin dashboard is theater where the user wants speed. Restrict this grammar to marketing/showcase/brand Act-1 hooks — the surfaces whose job is awe, not task-completion.

**Generic-killer rule (site-level):** if two consecutive Swan surfaces open at the same scale with the same beat structure, the second is generic *regardless of subject* — "inside a bubble" then "inside a crystal" is the same hook twice. Vary the awe grammar (ingress vs reverse vs orbit vs non-macro), not just the object. The macro-journey is a tool against generic heroes; over-applied identically, it becomes the new generic.

**Ideation output requirement:** when a net-new marketing/showcase surface enters the router's ideation gate, at least one of the 2-3 concept directions must open with an Extreme Macro-Journey hook, and its four beats (inside/through/across/out, or a sanctioned variant) must be named explicitly. Awe is not left to chance.

---

## C. Layout and interaction pattern library

Each pattern below has: **name**, **what it is**, **when to use**, **mandatory tier-2/tier-3 fallbacks**, **anti-pattern to avoid**.

### C1. Cinematic Hero with Video Header

**What it is.** Full-bleed video plays in the background (autoplay, muted, loop, `playsinline`). Typography and CTA sit on top inside a glass foreground panel. Subtle vignette at edges. Optional audio toggle in the top-right.

**When to use.** Homepage, About, Services, any top-of-funnel marketing surface where the page needs to declare a mood in the first second.

**How to build.**
- `<video>` element at z-index 0 with `object-fit: cover; width: 100%; height: 100%;`
- Glass foreground at z-index 2 with `backdrop-filter: blur(12px)` and a `rgba(0, 32, 96, 0.35)` background
- Dark radial gradient vignette at z-index 1 between them
- Typography: 72-120px headline in Plus Jakarta Sans, with a Cormorant Garamond Italic subheading line
- CTA pair uses Dual-Button Glow

**Tier 2.** Video → static poster image, still with vignette + glass foreground.
**Tier 3.** Remove video entirely, use static poster, no blur, no parallax.

**Anti-pattern.** Muted autoplay video that's just stock footage of "people in an office." The video must be Swan-brand-specific and emotionally on-story.

### C2. Parallax Story Section

**What it is.** Scroll-tied parallax where the background image moves slower than the foreground content. Creates depth and gives a sense that the page is a physical space.

**When to use.** Mid-page story beats where the user is committed but the page needs to keep earning attention. Around the 60-70% scroll mark.

**How to build.**
- `requestAnimationFrame` tied to `window.scrollY`, not `onScroll` listener
- Background image is `position: fixed` during the scroll window, with `translateY(calc(scrollY * 0.3))` applied
- Foreground content uses normal flow at full speed
- When the section scrolls past, the `fixed` background releases (IntersectionObserver)

**Tier 2.** CSS-only parallax using `background-attachment: fixed` (jittery on some iOS, acceptable fallback).
**Tier 3.** Static background, no parallax.

**Anti-pattern.** Parallax that moves so much the user feels seasick. Keep speed multiplier at 0.2-0.4, never above 0.6.

### C3. Sticky Foreground / Changing Background Panels

**What it is.** A sticky foreground element (e.g., a headline or a product name) stays fixed on screen while the background section changes as the user scrolls. Classic Apple product page pattern.

**When to use.** Explaining 3-5 features of one product or surface. The feature list is the foreground, the visual proof is the background.

**How to build.**
- Outer section is `min-height: 500vh` (one viewport per panel)
- Foreground element is `position: sticky; top: 0` inside it
- Background swaps via IntersectionObserver thresholds at 0.25, 0.5, 0.75
- Use Framer Motion `<AnimatePresence mode="wait">` to cross-fade background children

**Tier 2.** Remove the sticky foreground, ship as a vertical stack of panels each with their own media.
**Tier 3.** Simple vertical feature list, no sticky, no cross-fade.

**Anti-pattern.** Sticky that doesn't release when its parent section ends. Always respect section boundaries.

### C4. Embedded-Media Wordmark / Letterform

**What it is.** Large typography (e.g., "SWAN STUDIOS" at 200-400px) where one or more letters is hollowed out and contains rotating or scroll-scrubbed media. The letterform itself is the frame for a video or carousel.

**When to use.** Signature hero moments. Brand statement pages. About pages. Anywhere the brand wants to say "we are unlike the default template."

**How to build.**
- SVG text with `clip-path` or `mask-image` cutting out one letter
- Inside the clipped region: `<video>` or `<img>` carousel, same size as the letter
- The rest of the letters stay solid Frost White or Gilded Fern
- Optional: all letters hollowed, each with a different media, synchronized rotation

**Tier 2.** Replace video with still image carousel, still clipped inside letterform.
**Tier 3.** Solid letterform, no media, with subtle gradient fill.

**Anti-pattern.** A letterform so dense it becomes illegible. The word must read first, the media second.

### C5. Shelf / Editions / Poster Wall / Album Rack

**What it is.** A horizontal row of "cards" that feel like physical objects — vinyl records in a rack, posters on a wall, Shopify Editions covers on a shelf. Cards tilt, overlap slightly, have subtle edge highlights that imply physical depth. Clicking one brings it forward in 3D space.

**When to use.** Storefront packages, content library, feature lineups, past work galleries, challenge catalogs.

**How to build.**
- `display: flex` horizontal with `gap: -24px` (negative to overlap)
- Each card has a slight `transform: rotate(-2deg to 2deg)` baseline
- Hover: `transform: translateY(-12px) rotate(0deg) scale(1.05)` with a soft cyan shadow
- Click: Framer `layoutId` expand to center of viewport with adjacent cards pushing aside
- Each card has depth: gradient edge highlight + subtle bottom shadow

**Tier 2.** Flat horizontal scroll of cards, no tilt, hover → slight lift only.
**Tier 3.** Vertical list of cards, no scroll, no motion.

**Anti-pattern.** Flat equal-sized rectangles in a grid with no tilt, no overlap, no lighting. That's a template, not a shelf.

### C6. Flippable Detail Card

**What it is.** Card that flips 180° on hover or click to reveal back content. Back has different information or a different visual archetype than the front.

**When to use.** Feature cards where there's a "summary" side and a "proof" side. Trainer profile cards (front = photo + name, back = certifications + stats). Exercise cards (front = name + muscle group, back = set/rep detail).

**How to build.**
- Wrapper has `perspective: 1200px`
- Inner has `transform-style: preserve-3d` and `transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)`
- Front face: `backface-visibility: hidden`
- Back face: `backface-visibility: hidden; transform: rotateY(180deg)`
- Hover or click toggles `transform: rotateY(180deg)` on inner

**Tier 2.** Replace flip with cross-fade.
**Tier 3.** Static card, no flip.

**Anti-pattern.** Flip on the entire card when only a subsection would benefit. Over-application makes the page feel like a card game.

### C7. Hover Tilt / Depth Card

**What it is.** Card tilts in 3D space toward the cursor as the user hovers. Subtle — 6-10 degrees max. Creates a sense the card is "alive" and reacting.

**When to use.** Gallery grids, feature cards, storefront packages, any surface where a hover is the expected next interaction.

**How to build.**
- `onMouseMove` computes cursor position relative to card center
- `transform: perspective(1000px) rotateX(<value>deg) rotateY(<value>deg)` with values derived from cursor offset
- Use `useSpring` from Framer Motion for smoothing
- Add a subtle gradient highlight that follows the cursor via `background: radial-gradient(circle at <x>% <y>%, ...)`

**Tier 2.** Static card with a 2% scale-up on hover.
**Tier 3.** No hover effect.

**Anti-pattern.** Tilt so aggressive the card looks broken. 6-10 degrees is the ceiling.

### C8. Clustered / Orbiting Media Nodes

**What it is.** A central hub with multiple media nodes floating around it in 3D space, slowly orbiting. Each node is a small video or image. Clicking a node brings it to center.

**When to use.** Feature discovery hubs, skill trees, content universe overviews, "what can Swan do?" explainer sections.

**How to build.**
- React Three Fiber scene with a central `<group>` and child meshes on orbital paths
- Each child uses `<Html>` inside to render a 2D glass-card media surface
- Orbit paths are computed in `useFrame` with sine/cosine
- Click uses `raycaster` to bring selected node to center

**Tier 2.** Replace R3F with Framer Motion 2D floating cards, animated positions on a CSS transform plane.
**Tier 3.** Static grid of nodes, no orbit.

**Anti-pattern.** R3F for something that a 2D Framer composition could handle. Reach for R3F only when the 3D is the point.

### C9. Media-First KPI / Counter Block

**What it is.** A row of numbers — clients trained, sessions logged, pounds lost — where each number has a representative visual anchor (a still image, a small video loop, a Victory sparkline) above or beside it. Numbers count up on scroll-in.

**When to use.** Impact sections. About pages. Trainer landing pages. Any surface where "we did X many of this" needs to feel substantive.

**How to build.**
- Layout is 3-5 columns of equal width, but each column is vertical: media on top (height ~240px), number below (96-160px in Fira Code), label beneath (12px in Sora uppercase letter-spaced)
- Numbers use `useInView` from Framer + a `useMotionValue` counting from 0 to target over 2s
- Media above each number is either a 6-second loop or a Swan-brand still

**Tier 2.** Still image above each number, no scroll-linked count — just display.
**Tier 3.** Numbers and labels only, no media.

**Anti-pattern.** A row of numbers in identical bordered boxes with no media. That's the AI-template KPI row. If it looks like a generic admin dashboard header, it's wrong.

### C10. Narrative Section Divider

**What it is.** The transition between two sections is *itself* a design element. Not a horizontal line, not a margin — a composed moment. Options include: typographic flourish (oversized Cormorant Garamond Italic phrase), parallax reveal, color wash shift, crystalline geometric motif, video cut.

**When to use.** Between any two major sections. Every section boundary on a marketing page gets a divider beat.

**How to build.**
- Dedicated `<Divider variant="...">` component with variants: `typographic`, `parallax-fade`, `color-wash`, `crystalline`, `video-cut`
- Each variant is 120-240px tall
- Uses IntersectionObserver to trigger its reveal animation once

**Tier 2.** Simpler fade divider — gradient from previous section color to next section color.
**Tier 3.** `margin-top: 120px` — sections separate themselves via space alone.

**Anti-pattern.** A `<hr>` or a thin horizontal line. This is a premium site, not a Wikipedia article.

### C11. Premium Dashboard Chart Environment

**What it is.** Dashboards are not marketing pages, but Swan dashboards still get the cinematic treatment. Charts sit inside "chart environments" — each chart has a narrative headline, a sparkline lead-in, an annotation layer for key moments, and a footer with next-action CTA.

**When to use.** Every Victory chart in admin/client/trainer dashboards. (Rule 10: Victory only.)

**How to build.**
- Chart is 60-70% of the environment card's width
- Left or right 30-40% is a narrative column: headline, key insight in italic, delta with Gilded Fern or Wing Purple color, CTA like "View detail →"
- Chart uses the `chartTheme` from `frontend/src/components/Charts/chartTheme.ts` with Crystalline Swan tokens
- Subtle cyan glow on hover over data points
- Empty state: a Cormorant Garamond Italic line explaining why the chart is empty, not a "no data" label

**Tier 2.** Chart + simple headline, no narrative column.
**Tier 3.** Chart + minimal title.

**Anti-pattern.** A bordered box with a chart inside and a title above. That's the admin template that haunts every AI-built dashboard. Avoid.

### C12. Subtle Electric / Glass Panel System

**What it is.** The underlying surface treatment for every card, modal, drawer, and content container in Swan. Not a visible pattern by itself — the consistent treatment that makes everything feel from the same design system.

**Base recipe.**
```
background: linear-gradient(135deg, rgba(0, 32, 96, 0.65), rgba(0, 48, 128, 0.55));
backdrop-filter: blur(24px) saturate(140%);
border: 1px solid rgba(96, 192, 240, 0.2);
box-shadow:
  0 1px 0 rgba(96, 192, 240, 0.08) inset,
  0 20px 60px rgba(0, 16, 40, 0.4),
  0 0 120px rgba(139, 92, 246, 0.06);
border-radius: 20px;
```

Variant: luxury (gold border)
```
border: 1px solid rgba(198, 168, 75, 0.35);
box-shadow:
  0 0 40px rgba(198, 168, 75, 0.12),
  0 20px 60px rgba(0, 16, 40, 0.4);
```

Variant: obsidian (dark card on dark surface)
```
background: linear-gradient(135deg, rgba(20, 20, 25, 0.85), rgba(26, 26, 36, 0.75));
border: 1px solid rgba(96, 192, 240, 0.1);
```

Use one of these three baselines on every content card. Do not invent a fourth.

### C13. Scroll-Bound Macro Journey (the creative IS the page)

**What it is.** The whole page is one continuous macro-journey video (§B2.4), and **scroll position drives the video's playhead** — scroll down and the camera pushes forward through the journey; scroll up and it reverses. The DOM barely moves: thin typographic beats and a single CTA fade in and out over the moving creative at chosen scroll depths. This is the inversion of C1. In C1 the video is a *background behind* a glass foreground panel; in C13 **the video is the experience and the UI is a whisper on top of it.** This is the pattern behind the Kimi-K3-class scroll-film sites — and the aesthetic tier that sits above conventional app-UI reference.

**The governing idea (say it out loud before building):** *the creative is the heavy lifter.* The site looks like a lot is happening, but almost nothing in the DOM is animating — it is the video, bound to scroll, doing the work. Design effort goes into the creative (the macro-journey shot) and the smoothness of the scrub, not into a pile of DOM animations.

**When to use.** Flagship brand statements, launch/reveal moments, a single hero showcase surface where awe is the entire job and there is exactly one CTA. This is a *maximalist* choice — one such page per site, at most. Never for a page that must convey a lot of information or offer many actions.

**When NOT to use (hard).** Any dashboard, portal, operator tool, pricing page, or content-dense marketing page. If the page has more than one primary action or needs to be read (not felt), C13 is the wrong pattern — use C1 (video as accent) instead.

**How to build.** This is the full craft in `docs/ai-workflow/design-brain/cinematic-pages.md` §8 (scroll-scrubbed frame sequences) — read it before building. In short:
- Concept from the Extreme Macro-Journey grammar (§B2.4): inside → through → across → out (or a sanctioned variant).
- Generate the source video (Seedance cinematic skill / the pipeline in cinematic-pages.md), then interpolate to 60fps so the scrub is not choppy (30fps scrubbing shows every frame and reads as janky — smoothness is a quality gate, not a nicety).
- Extract frames → paint via `<canvas>` + `requestAnimationFrame`, drawing only when the computed frame index changes; map frame index to scroll progress **through the scroll-physics layer below, never raw**.
- **Decode ahead of the playhead:** `createImageBitmap` + preload the next ±10 frames in the scroll direction so `drawImage` never blocks on decode (a decode stall reads as a freeze). Frames never block first paint.
- A **grain overlay on the canvas** (2-5% noise, §B texture rule) hides AI-interpolation shimmer between generated frames — without it the interpolation "swims."
- A **tour / autoplay mode** ("watch it" / flow-tour button, C13 companion control) plays the journey start-to-finish on its own for users who don't want to scroll — this is both an engagement affordance and an accessibility one.
- Typography beats and the single CTA are `position: fixed`/`sticky` overlays that fade in at scroll thresholds; they never compete with the creative for motion. Give each beat **1-2% counter-parallax drift** (moves slightly against the journey) so the DOM doesn't feel dead-glued over a moving world.

**Scroll physics — the feel layer (the entire difference between magical and broken).** This is the single most important part of C13; a build that skips it ships the "damaged video" feel no matter how good the asset is.
- **Never bind frame index directly to `scrollY`.** Bind it to a **damped target**: each rAF tick, `current += (target - current) * 0.085` (lerp `0.07–0.12`; lower = more cinematic lag, higher = more responsive). The damping is where the cinematic feel lives.
- **Clamp per-tick frame delta to ≤3 frames** so a momentum fling reads as a fast-forward, not a teleport through 20 frames.
- **Native scroll only — never hijack `wheel`/`touch` events.** Smoothing lives in the *mapping*, not by intercepting input. Hijacked scroll is the #1 way these pages feel broken and trap users.
- **Reverse travel must be as smooth as forward** — pre-buffer frames in both directions; scrolling up must not stutter.
- **Beat thresholds land on narrative moments, not even splits.** The beat-2 text appears exactly at the membrane break, arrival text exactly at the arrival frame — not at mechanical 25% marks. Even splits are the generic smell.
- Rule of thumb: **if you can't state your damping constant and your frame-delta clamp, you haven't built C13** — you've bound a video to a scrollbar.

**Scroll runway (pacing).** C13 runway is **400–800vh** of scroll travel (4–8 viewport heights), distributed across the four beats roughly **20 / 25 / 35 / 20** (the "across" field is the longest — it's what the user scrubs). The single CTA arrives at **exactly the final frame** — not 90%, not 110%. Ship a hairline progress indicator (1–2px, `var(--ice-wing, #60C0F0)`) so the user can feel the journey's length. (The §5 8–14vh scene caps govern per-scene flowing pages, NOT a whole-page scrub — this runway rule is C13's own.)

**Tiers — and mobile is a different product.**
- **Mobile default is Tier 2 (autoplay loop), NOT scrub.** Touch-scrub without damping is unusable and iOS chrome-collapse shifts the viewport mid-scene. Promote a phone to scrub only if ALL hold: no `saveData`, `navigator.hardwareConcurrency ≥ 6`, and the DPR-adjusted frame payload stays ≤2MB. State the chosen tier per breakpoint in the scene ledger. Say it plainly: **touch scrub is the exception, autoplay is the rule.**
- All pinned / scroll-driven scenes use **`100dvh`, never `vh`** (with `invalidateOnRefresh` / recompute on viewport-height change), or the mobile address-bar collapse visibly re-lays-out the scene.
- **Tier 2 (lean / mobile default).** The macro-journey plays as a normal autoplaying looped `<video>` (not scroll-bound), muted + `playsinline`; scroll just moves the page past it. Overlay beats still fade in. Ships with a visible pause control (WCAG 2.2.2).
- **Tier 3 (reduced motion).** `prefers-reduced-motion: reduce` → the single strongest composed frame as a static hero + beat + CTA, **no exceptions** (never a slower autoplay). Tour mode remains available but strictly user-initiated. The story survives as one poster (§ cinematic-pages.md §10, §14).

**Resolution ladder (or the flagship upscales soft on the exact monitors Sean uses).** 60–120 frames at ≤4–6MB works at ~1440w but is NOT sharp at 2560w/3840w — a soft-upscaled 4K hero is the opposite of premium. Ship a ladder: **1280w / 1920w / 2560w** frame sets (AVIF first, WebP fallback); **above a 2560w viewport, serve the Tier-2 `<video>`** (hardware-decoded, scales cleaner than upscaled frames) instead of the frame sequence. The byte budget applies per served set; the ledger records which set each breakpoint gets.

**Quality gates specific to C13.**
- **Scrub-feel is mandatory (not just fps).** Damping + ≤3-frame clamp + bidirectional pre-buffer present, or it reads as broken. "Choppy on scroll" AND "teleporting on fling" both = not done.
- **Smoothness ≥60fps** — interpolate the source or raise frame density (cinematic-pages.md §8 economics).
- **Tour mode is mandatory,** not optional — a scroll-only experience excludes users who can't or won't scroll-scrub. Tour mode and any autoplay loop ship with a **visible pause control, ≥44px, keyboard-focusable, focus ring `var(--wing-purple, #8B5CF6)`** (WCAG 2.2.2).
- **Canvas accessibility:** the canvas carries `role="img"` + an `aria-label` narrating the journey ("Camera travels through a crystalline geode, arriving at the SwanStudios wordmark"). Typographic beats are **real DOM text, never baked into the video** — so screen readers and keyboard reach them. With the scene region focused, **ArrowDown/ArrowUp step the playhead between beats** (the reason beats are DOM, not pixels).
- **Contrast holds at EVERY frame, not the brightest.** Text beats sit on a persistent scrim — `linear-gradient(180deg, transparent, var(--obsidian, #0A0A0F) 78%)`, or a radial behind the CTA cluster — so luminance can't drown the text as the video moves. Sample-check at the three brightest beats, not one. (Supersedes the naïve "4.5:1 at the brightest frame" test.)
- **House rules do not exempt C13:** the single CTA obeys Dual-Button Glow (blue bg → purple glow / purple bg → cyan glow); every overlay control is ≥44px; all beat/scrim/indicator colors are `var(--token, #fallback)` with Crystalline fallbacks; no hardcoded hex, no Galaxy-Swan, no Tailwind/MUI.
- **The first painted frame must sell the page alone** (cinematic-pages.md §14) — before any scroll, the hero frame + beat + CTA is judged as a standalone poster.
- Remaining cinematic hard caps (cinematic-pages.md §15.1) apply: LCP ≤2.5s poster-first, sequence payload ≤4–6MB desktop / ≤2MB mobile per served set.

**Default answer is NO.** C13 is the maximalist, highest-risk pattern; the risk is *premature* use, not over-use. C13 requires a completed §18 breadth pass AND Seedance-budget sign-off — absent either, the answer is C1 (video-as-accent). Scarcity is what keeps it premium.

**Sound (optional, mute-first).** Default silent (autoplay policy + taste both demand it); silence is never a defect, bad autoplay audio is. Doctrine claims the option: an optional user-initiated audio layer, off by default, toggle ≥44px, choice persisted; if scored, score to the beats (membrane break = sub-bass thump, arrival = resolve).

**Anti-pattern.** (1) A scroll-bound video with a full conventional website stacked below it — that's C1 wearing a costume; C13's whole point is that the creative *is* the page (if you're adding feature grids/testimonials under the journey, you wanted C1 / archetype #1). (2) Shipping the scrub at 30fps, or with raw `frame = f(scrollY)` mapping, and calling the jank "cinematic" — it reads as broken, not filmic. (3) A scrubbed abstract-particle field with a logo at the end — a lava lamp with a CTA; the creative must contain a brand-ownable object (§B2.4).

---

## D. Asset storyboarding rules (short version — full rules in SWAN-ASSET-STORYBOARDING.md)

For every section you design, answer four questions before choosing an asset:

1. **What emotional job does this section do?** (awe, trust, momentum, calm, aspiration, celebration, intimacy)
2. **What asset archetype serves that job?** (video, still, sequence, carousel, 3D, illustration, letterform-embedded media)
3. **What is the fallback if the full asset won't load?** (poster image → solid gradient → removed)
4. **Does the asset move? If yes, how, and why?** (loop, scroll-scrubbed, scroll-tied parallax, tilted on hover, orbiting in 3D)

Full per-section asset rules + Seedance 2.0 prompt templates are in `SWAN-ASSET-STORYBOARDING.md`. That doc is the asset-direction source of truth. `swan-design-router` loads it alongside this one.

---

## E. Seedance 2.0 integration (short version)

Sean can generate custom images and videos on demand via Seedance 2.0. Every Swan design task that needs a hero, background, section anchor, KPI visual, or letterform-embedded media should produce a **Seedance brief** as part of the design output, not just CSS.

**Minimum Seedance brief fields:**
- Scene / subject
- Style (cinematic realism, editorial abstract, liquid-blend, botanical macro, cosmic imagery, underwater, city, architectural, etc.)
- Palette (must name Crystalline Swan tokens — "sapphire + cyan + gold rim light" etc.)
- Motion (loop, scroll-scrubbed, single pan, static still)
- Duration (for video: 4-8s loops preferred for headers, 10-20s for scroll-scrubbed sequences)
- Aspect ratio (16:9, 21:9, 9:16, 1:1, 4:5 based on surface)
- Fallback still frame description (for tier-2 rendering)

**Canonical brief templates for each section type, including per-vertical variants (fitness, singing/dancing, gaming, nature, cosmic, underwater, urban), live in `SWAN-ASSET-STORYBOARDING.md`.** This doc keeps the templates concise; the companion doc has the full library.

---

## F. How this system is consumed

`.claude/skills/swan-design-router/SKILL.md` is the only default-exposed design skill. It loads this document and `SWAN-ASSET-STORYBOARDING.md` as its two primary references. Every default Swan UI task flows through the router, which means every design decision gets checked against this document's stack truth, visual grammar, pattern library, and Seedance integration — not against generic Tailwind/shadcn reference material.

When this document and a quarantined aesthetic skill (e.g., `minimalist-ui`, `design-taste-frontend`) disagree, this document wins. The aesthetic skills are available only by explicit user invocation.

---

## G. Maintenance rules

- New pattern discovered in production work → add to section C with name + when-to-use + fallback tiers
- New Seedance template that consistently produces brand-aligned output → add to `SWAN-ASSET-STORYBOARDING.md`
- New anti-pattern observed in the wild → add to section B "explicit bans" list
- Palette token change → update section B *and* root `CLAUDE.md` active palette section in the same pass
- Breaking change to the system → note in `ACTIVE-INDEX.md` and require a surface audit (rule 26) on every page this system steers

---

## H. Supersession

This document **supersedes** the legacy `AI-Village-Documentation/design/CINEMATIC-WEB-DESIGN-SYSTEM.md`. That file assumes Tailwind + GSAP + Lucide + Galaxy-Swan framing and is treated as legacy inspiration only. If the legacy file contradicts this one on any point, this one wins. The legacy file should be relocated to `docs/ai-workflow/archive/design/` in a future hygiene pass.
