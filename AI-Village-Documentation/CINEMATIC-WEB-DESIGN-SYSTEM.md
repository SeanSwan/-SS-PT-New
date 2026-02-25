# 🎬 CINEMATIC WEB DESIGN SYSTEM v1.0
## Universal Design Protocol for Claude Code + Skills Integration

**Purpose:** Drop this file into ANY project to produce cinematic, pixel-perfect, production-grade web interfaces. Works standalone or alongside the AI Village Master Onboarding Prompt.

**Compatible With:** Claude Code, Claude Desktop, any AI with file access
**Stack:** React 19 + Tailwind CSS v3.4+ + GSAP 3 (ScrollTrigger) + Lucide React
**Last Updated:** 2026-02-21

---

## 🔑 CORE PHILOSOPHY

> "Do not build a website; build a digital instrument. Every scroll should feel intentional, every animation should feel weighted and professional. Eradicate all generic AI patterns."

This system treats web design the way a cinematographer treats a film — every frame is composed, every transition is motivated, every element earns its place. The result should feel like a private members' club built by a creative technologist, not a template downloaded from the internet.

**The Three Laws:**
1. **No AI Slop** — If it looks like "an AI made this," it failed. No purple gradients on white. No default Inter/Roboto (exception: Inter is permitted ONLY when explicitly selected via a preset, e.g. Preset B). No cookie-cutter hero sections. No orb spam.
2. **Weighted Motion** — Every animation has physical weight. Elements don't just "fade in" — they arrive with purpose, easing, and stagger timing that feels organic.
3. **Texture Over Flatness** — Screens are not flat canvases. They have grain, depth, glass, shadow, and atmospheric layers that create dimension.

---

## ⚙️ SKILLS INTEGRATION (MANDATORY FIRST STEP)

Claude Code has access to **two skill ecosystems** — both must be leveraged.

### Skill Ecosystem 1: Claude Hosted Skills (`/mnt/skills/`)
Available in Claude Desktop/Web. Read with `view` tool before any relevant task.

| Skill | Path | Trigger |
|-------|------|---------|
| **Frontend Design** | `/mnt/skills/public/frontend-design/SKILL.md` | ANY UI/frontend work |
| **Theme Factory** | `/mnt/skills/examples/theme-factory/SKILL.md` | Theme creation, color/font systems |
| **Web Artifacts Builder** | `/mnt/skills/examples/web-artifacts-builder/SKILL.md` | Complex React artifacts |
| **Brand Guidelines** | `/mnt/skills/examples/brand-guidelines/SKILL.md` | Brand consistency checks |
| **Docs (docx)** | `/mnt/skills/public/docx/SKILL.md` | Word documents |
| **Spreadsheets (xlsx)** | `/mnt/skills/public/xlsx/SKILL.md` | Excel files |
| **Presentations (pptx)** | `/mnt/skills/public/pptx/SKILL.md` | PowerPoint decks |
| **PDFs** | `/mnt/skills/public/pdf/SKILL.md` | PDF creation/editing |

### Skill Ecosystem 2: Skills.sh / Project Skills (`.agents/skills/`)
Installed via `skills.sh` into the VS Code project. Claude Code reads these from the project workspace.

| # | Skill | Source | When to Use |
|---|-------|--------|-------------|
| 1 | **webapp-testing** | anthropics/skills | After building any web component — run automated tests |
| 2 | **web-design-guidelines** | vercel-labs/agent-skills | BEFORE any UI work — Vercel's design standards (pairs with cinematic system) |
| 3 | **verification-before-completion** | obra/superpowers | BEFORE marking any task "done" — verify all claims and outputs |
| 4 | **systematic-debugging** | obra/superpowers | When hitting bugs — structured root-cause analysis |
| 5 | **requesting-code-review** | obra/superpowers | Before committing — structured review request format |
| 6 | **test-driven-development** | obra/superpowers | Write tests FIRST, then implement — TDD workflow |
| 7 | **agent-browser** | vercel-labs/agent-browser | When needing to visually verify rendered pages |
| 8 | **audit-website** | squirrelscan/skills | Security/accessibility/performance audits on completed pages |
| 9 | **frontend-design** | pre-installed | Core design thinking framework (anti-AI-slop) |
| 10 | **ui-ux-pro-max** | pre-installed | Advanced UI/UX patterns, interaction design, accessibility |

### Skills Reading Order (by task category — read RELEVANT skills, not all 10)

```
FRONTEND/UI TASKS:
  Before coding:  frontend-design → ui-ux-pro-max → web-design-guidelines → Preset selection
  During build:   test-driven-development → systematic-debugging (if bugs)
  Before done:    webapp-testing → audit-website → verification-before-completion → requesting-code-review

BACKEND TASKS:
  Before coding:  test-driven-development
  During build:   systematic-debugging (if bugs)
  Before done:    verification-before-completion → requesting-code-review

BUG FIXES:
  Start with:     systematic-debugging
  Before done:    verification-before-completion

VISUAL VERIFICATION:
  As needed:      agent-browser (render check)
```

### Full Application Build Stack
```
npm create vite@latest [project-name] -- --template react
cd [project-name]
npm install tailwindcss @tailwindcss/vite gsap lucide-react
```
- Single `App.jsx` for <600 lines, split into `components/` for larger builds
- For React artifacts (.jsx): single file, Tailwind core utilities, available libs (lucide-react, recharts, d3, Three.js, etc.)

---

## 🎨 AESTHETIC PRESETS (Choose One Per Project)

Each preset ships a complete design system: palette, typography, image mood, identity label, and hero copy pattern. The AI selects or the user picks.

### Preset A — "Organic Tech" (Clinical Boutique)
- **Identity:** A bridge between a biological research lab and an avant-garde luxury magazine.
- **Palette:** Moss `#2E4036` (Primary), Clay `#CC5833` (Accent), Cream `#F2F0E9` (Background), Charcoal `#1A1A1A` (Text/Dark)
- **Typography:** Headings: "Plus Jakarta Sans" + "Outfit" (tight tracking, -0.02em). Drama: "Cormorant Garamond" Italic. Data/Mono: "IBM Plex Mono".
- **Image Mood:** dark forest, organic textures, moss, ferns, laboratory glassware
- **Hero Pattern:** "[Concept noun] is the" (Bold Sans) / "[Power word]." (Massive Serif Italic)

### Preset B — "Midnight Luxe" (Dark Editorial)
- **Identity:** A private members' club meets a high-end watchmaker's atelier.
- **Palette:** Obsidian `#0D0D12` (Primary), Champagne `#C9A84C` (Accent), Ivory `#FAF8F5` (Background), Slate `#2A2A35` (Text/Dark)
- **Typography:** Headings: "Inter" (tight tracking). Drama: "Playfair Display" Italic. Data/Mono: "JetBrains Mono".
- **Image Mood:** dark marble, gold accents, architectural shadows, luxury interiors
- **Hero Pattern:** "[Aspirational noun] meets" (Bold Sans) / "[Precision word]." (Massive Serif Italic)

### Preset C — "Brutalist Signal" (Raw Precision)
- **Identity:** A control room for the future — no decoration, pure information density.
- **Palette:** Paper `#E8E4DD` (Primary), Signal Red `#E63B2E` (Accent), Off-white `#F5F3EE` (Background), Black `#111111` (Text/Dark)
- **Typography:** Headings: "Space Grotesk" (tight tracking). Drama: "DM Serif Display" Italic. Data/Mono: "Space Mono".
- **Image Mood:** concrete, brutalist architecture, raw materials, industrial
- **Hero Pattern:** "[Direct verb] the" (Bold Sans) / "[System noun]." (Massive Serif Italic)

### Preset D — "Vapor Clinic" (Neon Biotech)
- **Identity:** A genome sequencing lab inside a Tokyo nightclub.
- **Palette:** Deep Void `#0A0A14` (Primary), Plasma `#7B61FF` (Accent), Ghost `#F0EFF4` (Background), Graphite `#18181B` (Text/Dark)
- **Typography:** Headings: "Sora" (tight tracking). Drama: "Instrument Serif" Italic. Data/Mono: "Fira Code".
- **Image Mood:** bioluminescence, dark water, neon reflections, microscopy
- **Hero Pattern:** "[Tech noun] beyond" (Bold Sans) / "[Boundary word]." (Massive Serif Italic)

### Preset E — "Galaxy Swan" (SwanStudios Signature) ⭐
- **Identity:** Cosmic elegance meets elite athletic performance. A constellation map for human transformation.
- **Palette:** Deep Space `#0a0a1a` (Primary), Cosmic Cyan `#00d4ff` (Accent), Swan White `#f0f0ff` (Background), Nebula Purple `#7b2ff2` (Secondary Accent), Starfield `#1a1a2e` (Surface)
- **Typography:** Headings: "Sora" or "Plus Jakarta Sans" (tight tracking). Drama: "Cormorant Garamond" Italic. Data/Mono: "Fira Code".
- **Image Mood:** galaxies, nebulae, constellations, aurora borealis, swan silhouettes, cosmic landscapes
- **Hero Pattern:** "[Transformation noun] beyond" (Bold Sans) / "[Cosmic word]." (Massive Serif Italic)
- **Special Rules:** Glass surfaces (backdrop-blur-xl), cosmic gradients, swan motifs (wing dividers, crest, constellation), cyan reserved for primary CTAs, AA/AAA contrast with visible focus rings
- **Note:** This preset inherits Galaxy-Swan theme standards from SwanStudios. Use for all SwanStudios properties.

### Preset F — "Enchanted Apex" (Nature + Luxury + Gaming) 🎮🌿✨
- **Identity:** An enchanted forest throne room where ancient nature meets elite commerce and competitive gaming — think a luxury wellness brand built inside an RPG world map. Bioluminescent flora illuminate gold-leaf UI elements while achievement badges pulse like rare loot drops.
- **Palette:** Forest Throne `#0B1A0F` (Primary), Gilded Fern `#C6A84B` (Accent), Biolume Green `#39FF6B` (Gaming Accent), Ivory Parchment `#FAF5E8` (Background), Ancient Bark `#2A1F14` (Surface), Mist `#E8F0E8` (Secondary BG)
- **Typography:** Headings: "Plus Jakarta Sans" (tight tracking, -0.02em). Drama: "Cormorant Garamond" Italic (luxury serif). Data/Mono: "Fira Code". UI/Gaming: "Sora" (clean, modern, game-UI feel).
- **Image Mood:** enchanted forests, bioluminescent plants, gold-leaf textures, luxury dark wood, moss-covered stone, aurora light, fantasy architecture, achievement crests, mystical fog
- **Hero Pattern:** "[Nature noun] meets" (Bold Sans) / "[Power word]." (Massive Serif Italic, gilded accent)
- **Special Rules:**
  - **Nature Layer:** Subtle animated particle effects (floating pollen/fireflies at 0.03 opacity), organic flowing gradients (deep forest greens to midnight), moss/vine SVG dividers between sections
  - **Luxury Layer:** Gold accent borders (`border-[#C6A84B]/20`), glass surfaces with warm tint (`backdrop-blur-xl bg-[#FAF5E8]/5`), premium spacing (generous padding, breathing room), serif drama font for manifesto/philosophy sections
  - **Gaming Layer:** Achievement-style cards with rarity borders (Common=silver, Rare=gold, Epic=biolume green, Legendary=animated gradient), XP-bar style progress indicators, subtle level-up micro-animations (`scale(1.05)` pulse on completion events), monospace data readouts for stats/metrics
  - **Combined Effect:** Backgrounds use deep forest-dark with subtle bioluminescent glow spots. CTAs use gilded borders with biolume green hover states. Cards feel like inventory items from a luxury RPG. Typography mixes serif elegance with sans-serif precision.
- **Use For:** SwanStudios (primary brand theme), fitness/wellness platforms, nature-luxury hybrids, gamified business apps, premium SaaS with achievement systems

### Preset F-Alt — "Enchanted Apex: Crystalline Swan" ⭐ SWANSTUDIOS BRAND-MATCHED
- **Identity:** Same Nature + Luxury + Gaming fusion, but palette derived directly from the SwanStudios low-poly crystalline swan logo. Frozen enchanted forest meets deep-ocean luxury vault meets competitive arena. Ice crystals replace forest moss; aurora light replaces fireflies; the swan's geometric facets inspire angular glass surfaces.
- **Palette:**
  - Midnight Sapphire `#002060` (Primary — logo deep navy)
  - Royal Depth `#003080` (Surface — logo circle background)
  - Ice Wing `#60C0F0` (Gaming Accent — logo wing highlight)
  - Arctic Cyan `#50A0F0` (Secondary Accent — logo bright feathers)
  - Gilded Fern `#C6A84B` (Luxury Accent — gold contrast against blues)
  - Frost White `#E0ECF4` (Background — derived from logo head highlight)
  - Swan Lavender `#4070C0` (Tertiary — logo mid-body purple-blue)
- **Typography:** Same as Preset F — Headings: "Plus Jakarta Sans" (tight tracking). Drama: "Cormorant Garamond" Italic. Data/Mono: "Fira Code". UI/Gaming: "Sora".
- **Image Mood:** frozen forests, ice caves, crystalline formations, aurora borealis, deep ocean, sapphire gemstones, snow-covered luxury architecture, geometric wildlife, low-poly landscapes
- **Hero Pattern:** "[Nature noun] meets" (Bold Sans) / "[Power word]." (Massive Serif Italic, gilded accent, ice-blue glow behind)
- **Special Rules:**
  - **Nature Layer (Crystalline):** Floating ice crystal particles (subtle geometric shapes at 0.03 opacity instead of pollen), aurora gradient flows (sapphire `#002060` → cyan `#60C0F0` → lavender `#4070C0`), crystalline SVG dividers (geometric frost patterns instead of moss/vines)
  - **Luxury Layer:** Gold borders on sapphire glass (`border-[#C6A84B]/20` on `bg-[#002060]/60 backdrop-blur-xl`), premium spacing, serif drama font with frost-white text on deep navy surfaces
  - **Gaming Layer:** Rarity system recolored: Common=Swan Lavender `#4070C0`, Rare=Gilded Fern `#C6A84B`, Epic=Ice Wing `#60C0F0`, Legendary=animated gradient (sapphire→cyan→gold). XP bars use arctic cyan fill on midnight sapphire track. Level-up animations have a crystalline shatter effect.
  - **Logo Integration:** The low-poly swan logo uses these exact hex values — every UI element will feel native to the brand mark. Nav logo renders cleanly on `#002060` backgrounds. Accent glows match wing highlights perfectly.
- **Use For:** SwanStudios (brand-exact match), any project where the swan logo appears

### Preset G — "Custom" (User-Defined)
- User provides their own palette, typography, and identity
- AI maps provided values into the same token structure as presets A-F
- All component architecture and animation rules still apply

---

## 🏗️ FIXED DESIGN SYSTEM (APPLIES TO ALL PRESETS — NEVER CHANGE)

These rules make the output premium regardless of which preset is selected.

### Visual Texture Layer
```css
/* Global noise overlay — eliminates flat digital gradients */
.noise-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: 0.05;
}
/* Use inline SVG <feTurbulence> filter for the noise texture */
```
- Implement via an inline SVG `<feTurbulence>` filter at **0.05 opacity**
- `rounded-[2rem]` to `rounded-[3rem]` radius system for ALL containers
- **No sharp corners anywhere** (except intentional brutalist elements in Preset C)

### Micro-Interaction Standards
- **Buttons — "Magnetic Feel":** `scale(1.03)` on hover with `cubic-bezier(0.25, 0.46, 0.45, 0.94)` easing. Use `overflow-hidden` with a sliding background `<span>` layer for color transitions.
- **Links & Interactive Elements:** `translateY(-1px)` lift on hover
- **Cards:** Subtle `translateY(-4px)` + shadow increase on hover
- **Focus States:** Visible focus rings (accent color, 2px offset) for accessibility

### Animation Lifecycle (GSAP)
```javascript
// MANDATORY: Use gsap.context() in useEffect, return ctx.revert() in cleanup
useEffect(() => {
  const ctx = gsap.context(() => {
    // animations here
  }, containerRef);
  return () => ctx.revert();
}, []);
```
- **Default Easing:** `power3.out` for entrances, `power2.inOut` for morphs/transitions
- **Stagger Timing:** `0.08` for text elements, `0.15` for cards/containers
- **Scroll Triggers:** Use GSAP ScrollTrigger with `start: "top 80%"` as default trigger point
- **Parallax:** Subtle only — `speed: 0.5` max. Never distracting.

### Responsive Breakpoints
```
Mobile:  320px - 767px   (stack everything, reduce font sizes 30%)
Tablet:  768px - 1023px  (2-column where appropriate)
Desktop: 1024px - 1439px (full layout)
Large:   1440px+         (max-width container, centered)
4K:      2560px+         (scale proportionally, increase whitespace)
```
- **Mobile-first:** All CSS starts at mobile, scales up via `min-width` media queries
- **Touch targets:** Minimum 44x44px on mobile
- **Font scaling:** Use `clamp()` for fluid typography

---

## 🧩 COMPONENT ARCHITECTURE (Adapt Content/Colors Per Preset — NEVER Change Structure)

### A. NAVBAR — "The Floating Island"
A `fixed` pill-shaped container, horizontally centered, `top-4`.
- **Morphing Logic:** Transparent with light text at hero top. Transitions to `bg-[background]/60 backdrop-blur-xl` with primary text and subtle `border` when scrolled past hero. Use `IntersectionObserver` or GSAP ScrollTrigger.
- **Contains:** Logo (brand name as styled text), 3-4 nav links, CTA button (accent color)
- **Mobile:** Collapse to hamburger menu with full-screen overlay

### B. HERO SECTION — "The Opening Shot"
- `100dvh` height. Full-bleed background image (Unsplash, matching preset's `imageMood`) with heavy **primary-to-black gradient overlay** (`bg-gradient-to-t`).
- **Layout:** Content pushed to **bottom-left third** using flex + generous padding
- **Typography:** Large scale contrast following preset's hero pattern. First part in bold sans heading font. Second part in massive serif italic drama font (3-5x size difference).
- **Animation:** GSAP staggered `fade-up` (y: 40 → 0, opacity: 0 → 1) for all text + CTA
- **CTA Button:** Below headline, accent color, magnetic hover effect

### C. FEATURES — "Interactive Functional Artifacts"
Three cards from user's value propositions. These must feel like **functional software micro-UIs**, not static marketing cards.

**Card 1 — "Diagnostic Shuffler":**
- 3 overlapping cards that cycle vertically using `array.unshift(array.pop())` every 3 seconds
- Spring-bounce transition: `cubic-bezier(0.34, 1.56, 0.64, 1)`
- Labels derived from first value prop (generate 3 sub-labels)

**Card 2 — "Telemetry Typewriter":**
- Monospace live-text feed typing messages character-by-character
- Blinking accent-colored cursor
- "Live Feed" label with pulsing dot indicator
- Content derived from second value prop

**Card 3 — "Cursor Protocol Scheduler":**
- Weekly grid (S M T W T F S)
- Animated SVG cursor enters, moves to day cell, clicks (visual `scale(0.95)` press), activates day (accent highlight), moves to "Save" button, fades out
- Labels from third value prop

**All Cards:** `bg-[background]` surface, subtle border, `rounded-[2rem]`, drop shadow, heading (sans bold) + brief descriptor text.

**Enchanted Apex (Preset F) Card Variants:**
When using Preset F, feature cards gain additional gaming-luxury-nature styling:
- Card borders use rarity system: subtle gilded glow (`box-shadow: 0 0 20px rgba(198, 168, 75, 0.15)`)
- Each card has a small "rarity badge" in the corner (Common/Rare/Epic tier label in mono font)
- Typewriter card uses biolume green (`#39FF6B`) cursor instead of standard accent
- Shuffler cards have a subtle nature-particle background (floating dots at 0.02 opacity)
- Scheduler cursor leaves a faint golden trail path

### D. PHILOSOPHY — "The Manifesto"
- Full-width, dark color background
- Parallaxing organic texture image (Unsplash) at low opacity behind text
- **Typography Pattern:**
  - "Most [industry] focuses on: [common approach]." — neutral, smaller text
  - "We focus on: [differentiated approach]." — massive drama serif italic, accent-colored keyword
- **Animation:** GSAP word-by-word or line-by-line fade-up triggered by ScrollTrigger

### E. PROTOCOL — "Sticky Stacking Archive"
3 full-screen cards that stack on scroll.
- **Stacking:** GSAP ScrollTrigger with `pin: true`. New card enters → card underneath scales to `0.9`, blurs `20px`, fades to `0.5`.
- **Each card gets a unique canvas/SVG animation:**
  1. Slowly rotating geometric motif (double-helix, concentric circles, or gear teeth)
  2. Scanning horizontal laser-line across a grid of dots/cells
  3. Pulsing waveform (EKG-style SVG path using `stroke-dashoffset`)
- **Card Content:** Step number (monospace), title (heading font), 2-line description. Derived from brand purpose.

### F. MEMBERSHIP / PRICING
- Three-tier pricing grid: "Essential", "Performance", "Enterprise" (adapt to brand)
- **Middle card pops:** Primary-colored background, accent CTA, slightly larger scale or `ring` border
- **Fallback:** If pricing doesn't apply, convert to "Get Started" section with single large CTA

### G. FOOTER
- Deep dark-colored background, `rounded-t-[4rem]`
- Grid layout: Brand name + tagline, navigation columns, legal links
- **"System Operational" indicator:** Pulsing green dot + monospace "All systems operational" label

---

## 🚀 BUILD SEQUENCE (After Receiving User Answers)

1. **Read Skills:** `/mnt/skills/public/frontend-design/SKILL.md` (mandatory)
2. **Map Preset:** Selected preset → full design tokens (palette, fonts, image mood, identity)
3. **Generate Hero Copy:** Brand name + purpose + preset's hero line pattern
4. **Map Features:** 3 value props → 3 Feature card patterns (Shuffler, Typewriter, Scheduler)
5. **Generate Philosophy:** Contrast statements from brand purpose
6. **Generate Protocol:** Steps from brand's process/methodology
7. **Scaffold Project:**
   ```bash
   npm create vite@latest [project-name] -- --template react
   cd [project-name]
   npm install tailwindcss @tailwindcss/vite gsap lucide-react
   ```
8. **Write All Files:** App.jsx (or split components/), index.css (Tailwind + noise + custom utilities), index.html (Google Fonts links)
9. **Verify:** Every animation wired, every interaction works, every image loads, responsive at all breakpoints

---

## 🎯 INTAKE QUESTIONS (Ask These Before Building)

When a user requests a website or landing page, ask exactly these 4 questions in a single call:

1. **"What's the brand name and one-line purpose?"** — Free text. Example: "SwanStudios — Elite personal training powered by AI-driven programming."
2. **"Pick an aesthetic direction"** — Single-select from Presets A through G (or describe custom)
3. **"What are your 3 key value propositions?"** — Brief phrases. These become the Features section cards.
4. **"What should visitors do?"** — The primary CTA. Example: "Book a consultation", "Start free trial", "Join the waitlist"

Then build. Do not ask follow-ups. Do not over-discuss. **Build.**

---

## 🔒 TECHNICAL REQUIREMENTS (NEVER CHANGE)

- **Stack:** React 19, Tailwind CSS v3.4+, GSAP 3 (with ScrollTrigger), Lucide React for icons
- **Fonts:** Load via Google Fonts `<link>` tags in `index.html` based on selected preset
- **Images:** Use real Unsplash URLs matching preset's `imageMood`. **Never use placeholder URLs.**
- **File Structure:** Single `App.jsx` for <600 lines. Split into `components/` directory for larger builds.
- **No Placeholders:** Every card, label, animation must be fully implemented and functional
- **Responsive:** Mobile-first. Stack cards vertically on mobile. Reduce hero font sizes. Collapse navbar.
- **Performance:** Lazy load images below fold. Use `will-change` sparingly. Debounce scroll handlers.
- **Accessibility:** Semantic HTML, ARIA labels on interactive elements, `prefers-reduced-motion` media query to disable animations for users who request it.

---

## 📐 QUALITY CHECKLIST (Before Marking Design Complete)

### Visual Quality Gate
- [ ] Noise texture overlay present and subtle (0.05 opacity)
- [ ] All containers use rounded-[2rem]+ radius (no sharp corners)
- [ ] Buttons have magnetic hover effect (scale + cubic-bezier)
- [ ] GSAP animations use context() with cleanup
- [ ] Hero section is 100dvh with gradient overlay
- [ ] Feature cards are interactive micro-UIs (not static)
- [ ] Philosophy section has contrasting typography (sans vs serif)
- [ ] Protocol cards stack on scroll with blur/scale transitions
- [ ] Navbar morphs on scroll (transparent → blurred pill)
- [ ] Footer has "System Operational" indicator
- [ ] Responsive at 320px, 768px, 1024px, 1440px, 2560px
- [ ] No AI slop (no default Inter/Roboto unless preset-selected, no purple-on-white, no generic patterns)
- [ ] Real Unsplash images (not placeholders)
- [ ] Google Fonts loaded for selected preset
- [ ] All animations respect `prefers-reduced-motion`
- [ ] If Preset F (Enchanted Apex): nature particles, gilded borders, rarity badges present
- [ ] If Preset F-Alt (Crystalline Swan): ice crystal particles, sapphire glass, aurora gradients, logo-matched `#002060`/`#60C0F0`/`#C6A84B`

### Skills.sh Verification Gate (Claude Code in VS Code)
- [ ] `web-design-guidelines` skill consulted before design decisions
- [ ] `ui-ux-pro-max` skill patterns applied for interaction design
- [ ] `webapp-testing` skill run — automated tests pass
- [ ] `audit-website` skill run — security/a11y/performance audit clean
- [ ] `verification-before-completion` skill run — all claims verified
- [ ] `requesting-code-review` skill used — review request formatted for 5-Brain handoff
- [ ] `test-driven-development` compliance — tests exist for interactive components

---

**END OF CINEMATIC WEB DESIGN SYSTEM v1.0**