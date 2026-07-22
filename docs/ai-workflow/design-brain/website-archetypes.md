# Website Archetypes — The Generation Factory Codex

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (within Design Brain scope)
- **Consolidation note:** this ONE codex deliberately consolidates the 20 planned per-archetype docs into a single dense file. One file an agent reads in minutes beats 20 files nobody loads. If an archetype later needs depth this file can't hold, split THAT archetype out and leave a pointer here.
- **Authority chain:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` (§B2 arcs, §C patterns, generic-pattern bans) > `design.md` > this codex. Archetypes APPLY the system; they never override it. Tokens/components are cited by name from `components.md`. Operator tiers and the design boundary come from `HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` (T0–T4, §10).

---

## How to pick an archetype

1. **Name the job of the page in one sentence.** "Sell training packages" → #4/#10. "Prove we can build" → #6/#14. "Run the business" → #8/#18/#19.
2. **Marketing surface or working surface?** Marketing → B2.1 4-act arc (Hook → Proof → Momentum → Conversion). Working surface (dashboard, portal, assistant) → B2.2 4-phase arc (Orientation → Current state → Progress → Next best action). Every archetype below declares its arc; no page ships without one written down first.
3. **Archetypes compose.** A pricing page (#10) is usually Act 4 of a SaaS landing (#1) before it is a standalone page. An onboarding funnel (#11) begins where #1/#4 converts. A case study (#14) is Act 2 ammunition for #6. Waitlist (#13) is #1 with Acts 2–3 compressed. When composing, the HOST page's arc governs; the embedded archetype becomes an act/phase module and inherits the host's motion budget.
4. **Every archetype obeys the same grammar:** B2 arc + C1–C12 patterns + the source doc's bans — §B generic-pattern bans (no equal 4-up grids, no centered-heading-plus-two-buttons hero, no motion without a job) and the §C9/§C10 rules (no naked KPI rows, no bare `<hr>` dividers).

### Motion budgets (referenced throughout)

| Budget | Ceiling | Contents |
|---|---|---|
| **M0** | static | tokens, layout, zero animation (also = every archetype's reduced-motion tier) |
| **M1** | working-surface | scroll-in reveals, hover states, state transitions; no parallax, no pinning, no video heroes |
| **M2** | marketing | M1 + one C1 video hero OR C2 parallax + count-ups + one signature moment per page |
| **M3** | cinematic | M2 + pinned C3 scenes, scroll-scrubbed sequences, surgical R3F accent — governed by `cinematic-pages.md` |

All budgets ship the three performance tiers from the design system §A (full / lean / reduced). Chains inherit the max: one M3 section makes it an M3 page and pulls in the full `cinematic-pages.md` doctrine.

### Comparison matrix

| # | Archetype | Conversion goal | Arc | Hero pattern | Motion |
|---|---|---|---|---|---|
| 1 | Premium SaaS landing | trial / demo signup | Mkt 4-act | C1 video hero | M2 |
| 2 | Cinematic 3D scroll site | brand awe → one CTA | Mkt 4-act stretched | C4 letterform or C1+R3F | M3 |
| 2b | ↳ Scroll-bound macro journey (C13, creative-IS-the-page) | pure awe → one CTA | Mkt 4-act stretched | C13 scroll-scrubbed video | M3 |
| 3 | Luxury product site | purchase / inquiry | Mkt 4-act | C1 + C5 shelf | M2–M3 |
| 4 | Fitness/coaching site | consult booked / package bought | Mkt 4-act | C1 training-footage hero | M2 |
| 5 | Personal portfolio | contact / hire | Mkt 4-act | C4 letterform | M2 |
| 6 | Agency site | qualified lead / call | Mkt 4-act | C3 sticky showcase | M2 |
| 7 | AI app site | signup / waitlist | Mkt 4-act | C1 + live-demo panel | M2 |
| 8 | Internal operator dashboard | task speed, zero hunting | Dash 4-phase | Phase-1 orientation band | M1 |
| 9 | Client portal | workout logged / next action taken | Dash 4-phase | C9 momentum card | M1 |
| 10 | Pricing page | plan selected | Mkt Act-4 module | C5 tier shelf | M1 |
| 11 | Onboarding funnel | activation completed | Compressed act per step | single focused panel | M1 |
| 12 | E-commerce / product page | add-to-cart | Mkt 4-act | C5/C1 product stage | M2 |
| 13 | Waitlist page | email captured | Mkt 4-act compressed | C1 or C4 | M2 |
| 14 | Case study page | belief → pricing/contact CTA | Mkt 4-act | C2 parallax opening | M1–M2 |
| 15 | Docs / knowledge base | answer found fast | Orientation-first (dash-style) | search-first header | M0–M1 |
| 16 | Community / course landing | join / enroll | Mkt 4-act | C1 community-loop hero | M2 |
| 17 | Mobile app marketing site | store install | Mkt 4-act | device-frame C3 | M2 |
| 18 | Hermes command center (Sean-only) | operator decision speed | Dash 4-phase, Cyberforest mode | status-horizon band | M1 |
| 19 | Coach Command Center | client logged/reviewed in fewest taps | Dash 4-phase | roster + next-best-action | M1 |
| 20 | Swan Coach surface | proposal approved / action logged | Dash 4-phase, conversational | chat + proposal cards | M1 |

---

## 1. Premium SaaS landing page

- **Use when:** selling the SwanStudios platform (or any SaaS) to cold traffic; the page must earn trust and a signup in one scroll.
- **Feel:** dark-room-lit-by-glowing-objects; confident, product-forward, zero clip-art.
- **Arc:** Mkt 4-act. **Hero:** C1 video hero (product-in-motion footage, not stock office). **Motion:** M2.
- **Sections in order:** C1 hero (product truth + CTA pair) → C10 divider → Act 2: C3 sticky feature walk (3–5 features) + C6 flip cards for proof detail → C10 → Act 3: C9 media-anchored impact numbers + C2 parallax story beat → C10 → Act 4: embedded #10 pricing module + final GlowButton CTA + short FAQ.
- **Conversion goal:** trial/demo signup. **Trust:** real product screenshots/loops, named client outcomes (IDs/consented), security posture line, "26+ years training experience" where the founder story appears — never "NASM-certified" (say "NASM workshop-trained" / "NASM-protocol").
- **Mobile:** hero video → poster (lean tier); C3 collapses to stacked panels; CTA pair stacks full-width at 44px+.
- **A11y:** text over video needs the vignette layer to hold 4.5:1; focus order follows the arc; skip-to-pricing link.
- **Components:** `GlowButton` (Dual-Button Glow), `GlassPanel` (C12 base), `SheenCard` for feature/sell cards, `NarrativeDivider`, `ChartEnvironment` if a proof chart appears.
- **Anti-patterns:** centered-hero-two-buttons-blob; equal 4-up feature grid; testimonial-carousel-with-avatars template; pricing hidden behind a "contact us" wall.
- **Fable brief:** "SaaS landing for [product]. Audience: [who]. One-sentence promise: [X]. Give 2–3 concept directions: name each act's emotional beat, hero treatment, signature moment, and the Act-2 proof strategy. Palette stays Crystalline Swan."
- **Builder brief:** "Implement direction [n]. B2.1 arc written in-thread first. styled-components only, tokens from design.md, C1 hero with tier-2 poster + tier-3 static in the same file, pricing module reuses #10. Rule 26 receipt before touching any mounted route."
- **Harness QA:**
  - [ ] hero paints < 2.5s with poster-first
  - [ ] CTA visible without scroll at 375px
  - [ ] reduced-motion kills video + parallax
  - [ ] all CTAs ≥44px
  - [ ] Act-4 CTA reachable without scroll-back
- **Village questions:**
  - Does Act 2 prove capability with product truth or with adjectives?
  - Would a competitor's logo swap survive here (if yes, it's generic)?
  - Is the signup path ≤2 clicks from hero?

## 2. Cinematic 3D scroll website

- **Use when:** the page's job is awe — brand statement, launch moment, flagship story. The scroll IS the product.
- **Feel:** a film you scrub with your thumb; every viewport a composed frame.
- **Arc:** Mkt 4-act stretched over 8–14 viewport-heights. **Hero:** C4 embedded-media letterform or C1 + surgical R3F accent. **Motion:** M3 — the full `cinematic-pages.md` doctrine governs this archetype; this entry is the summary.
- **Sections in order:** per the cinematic doc: logline-driven scene list, pinned C3 scenes for Act 2, C2 parallax for Act 3, one — exactly one — signature moment, C10 video-cut or color-wash dividers between acts.
- **Conversion goal:** a single CTA, delivered at emotional peak (end of Act 3 / start of Act 4). One. Not a nav bar of ten.
- **Trust:** the craft is the trust signal; add one hard-proof line (clients, years, outcomes) in Act 2 so the beauty has a spine.
- **Mobile:** static-frame storyboard fallback — the story must read as a sequence of stills; no pinning under 768px unless proven 60fps on mid-tier devices.
- **A11y:** reduced-motion tier tells the SAME story in static frames (non-negotiable); focus visible against moving backgrounds; skip-scene affordance.
- **Components:** `GlassPanel`, `NarrativeDivider`, `GlowButton`; scene scaffolding per `cinematic-pages.md`; R3F only behind `<Suspense>` with 2D fallback.
- **Anti-patterns:** motion for motion's sake; >2 simultaneously animated properties per scene; 3D scaffolding where 2D tells it; seasick parallax (>0.4 multiplier).
- **Fable brief:** "Cinematic scroll page. Logline: [one sentence]. Mood words: [3–5]. Deconstructed inspiration principles: [list — principles, never a site to clone]. Deliver: scene list with vh-lengths, act mapping, signature-moment candidates (pick one), palette temperature arc."
- **Builder brief:** "Implement the approved scene list. GSAP/ScrollTrigger allowed for pins; rAF for scrubbing; three perf tiers in-file; asset briefs routed through SWAN-ASSET-STORYBOARDING.md before any media is assumed."
- **Harness QA:**
  - [ ] screenshot at each act boundary scroll position
  - [ ] fps trace on the pinned scene
  - [ ] reduced-motion renders full story statically
  - [ ] first painted frame sells the page alone
  - [ ] battery/CPU sanity on lean tier
- **Village questions:**
  - Does the story survive with zero motion?
  - Is the ONE signature moment actually singular?
  - What is the LCP with the hero asset cold?

### 2b. Variant — Scroll-Bound Macro Journey (C13, the creative IS the page)

The maximalist end of #2: the **whole page is one continuous macro-journey video and scroll drives its playhead** (C13 in `SWAN-CINEMATIC-DESIGN-SYSTEM.md`; the Kimi-K3-class scroll-film). The DOM barely moves; thin typographic beats + one CTA fade over the moving creative. This is the aesthetic tier **above** conventional app-UI reference (Mobbin governs dashboards/flows; this governs pure-awe hero surfaces).

- **Default answer is NO** (the risk is *premature* use). C13 only when a single flagship surface's *entire* job is awe with exactly one CTA — a launch/reveal, a brand-statement page — AND a §18 breadth pass + Seedance budget are signed off. One per site, at most. Never when the page must be read or offers multiple actions (that's #1/#2-standard). If your sitemap has >0 sections below the fold, you're building a C1/C3 Act-1 hook, not C13.
- **The governing idea:** *the creative is the heavy lifter* — it looks like everything is animating, but it's the video bound to scroll doing the work; almost nothing in the DOM moves. Effort goes into the macro-journey shot (§B2.4 grammar: inside → through → across → out, or a sanctioned variant) and the **scroll-physics feel layer**, not a pile of DOM animations.
- **Concept:** run the §18 breadth pass (8-12 radically different awe concepts, ≥3 non-macro → taste-cut to 2-3) → §B2.4 grammar for the chosen one; the creative must contain a brand-ownable object (abstract particles = rejected). **Production:** `cinematic-pages.md` §8 + **§8.1 scroll physics** (Seedance source → interpolate to 60fps → frame-extract → canvas + rAF, mapped through a damped target, never raw `scrollY`).
- **Mandatory C13 gates** (full list in SWAN-CINEMATIC-DESIGN-SYSTEM.md §C13): (1) **scroll-physics feel** — damped target (lerp ~0.085), ≤3-frame/tick clamp, native scroll (never hijack), bidirectional pre-buffer; "if you can't state your damping constant you haven't built it." (2) **≥60fps** smoothness. (3) **runway 400–800vh**, beats ~20/25/35/20, CTA at the exact final frame, hairline Ice-Wing progress indicator. (4) **mobile default = tier-2 autoplay** (scrub only if capable), `100dvh` not `vh`. (5) **a11y** — canvas `role="img"`+aria-label, beats are real DOM text, Arrow keys step beats, pause control ≥44px on any autoplay (WCAG 2.2.2), `prefers-reduced-motion` → tier-3 static no exceptions. (6) **contrast via persistent scrim** (holds every frame, not just the brightest). (7) **resolution ladder** 1280/1920/2560w (AVIF→WebP); above 2560w serve the tier-2 video. (8) first painted frame sells the page alone (§14). (9) Dual-Button Glow on the CTA, token-fallback colors, no hardcoded hex.
- **Tier 2 (also mobile default):** the journey as a normal autoplay loop (not scroll-bound), muted+playsinline, visible pause control; overlay beats still fade. **Tier 3:** the single strongest composed frame as a static hero + beat + CTA (the story survives as one poster).
- **Sound:** default silent (mute-first); optional user-initiated audio only, off by default, toggle ≥44px, persisted.
- **Anti-pattern:** (1) a conventional website (feature grids, testimonials) stacked below the journey — C1 in a costume; if you're adding sections under it you wanted #1/#2-standard. (2) a 30fps scrub or raw `frame = f(scrollY)` mapping called "cinematic" — reads as broken. (3) a scrubbed abstract-particle field with a logo at the end — a lava lamp with a CTA.
- **Fable brief:** "Scroll-bound macro-journey (C13) for [flagship surface]. Run the §18 breadth pass first — give 8-12 one-line macro-journeys (inside→through→across→out), ranked with why-each-could-win, for Sean's taste-cut. Then develop the chosen concept: four-beat shot, scroll-to-playhead map across 8-14vh, the single CTA's earned scroll-depth, tour-mode behavior, three perf tiers."
- **Builder brief:** "Implement approved C13 direction. Read cinematic-pages.md §8 + §14 first. Seedance source interpolated to 60fps; frame-extract → canvas + rAF (draw only on frame-index change); scroll→playhead map; fixed/sticky overlay beats; tour-mode button; three tiers in-file (scroll-bound → autoplay loop → static poster). Rule 26 receipt on the mounted route; §15 Harness capture set incl. a scrub-smoothness fps trace before claiming done."

## 3. Luxury product website

- **Use when:** a high-ticket object/offer (flagship package, premium tier, physical product) needs desire, not feature lists.
- **Feel:** deep-ocean vault; gold on sapphire; slow, deliberate, expensive.
- **Arc:** Mkt 4-act. **Hero:** C1 with macro product footage + Gilded Fern rim light; C5 shelf later for the lineup. **Motion:** M2, may earn M3 for one Act-1 moment.
- **Sections in order:** C1 macro hero → C10 crystalline divider → Act 2: C3 material/detail walk + C6 flip (front: beauty, back: specification) → Act 3: C5 editions shelf (the lineup as objects) + provenance/story C2 beat → Act 4: single luxury-variant `GlassPanel` offer card + inquiry CTA.
- **Conversion goal:** purchase or white-glove inquiry. **Trust:** materials/method specifics, guarantee terms, scarcity stated honestly (never fake counters).
- **Mobile:** shelf → swipeable single-card rail; macro footage → high-res poster; generous spacing preserved (luxury dies when cramped).
- **A11y:** Gilded Fern on dark passes contrast only at sufficient size — verify 4.5:1; hover-revealed detail must have tap equivalent.
- **Components:** `SheenCard` (full sell treatment allowed — this is a showcase surface), `GlassPanel` luxury variant (gold border), `GlowButton`, `NarrativeDivider` crystalline.
- **Anti-patterns:** discount-brand urgency banners; dense spec tables in Act 1; stock lifestyle photography; more than one gold-bordered surface per viewport (gold inflation cheapens).
- **Fable brief:** "Luxury page for [offer, price point]. Desire driver: [craft/scarcity/status/transformation]. 2–3 directions: hero macro subject, shelf treatment, the one luxury signature moment, gold-usage discipline."
- **Builder brief:** "Direction [n]. C12 luxury variant only where specified; SheenCard full treatment on sell cards only; reduced-motion keeps the vignette + composition. Seedance brief for macro hero via storyboarding doc."
- **Harness QA:**
  - [ ] gold-on-dark contrast measured
  - [ ] shelf swipe works by touch at 375px
  - [ ] no hover-only reveals
  - [ ] poster fallback present
  - [ ] single CTA focus in Act 4
- **Village questions:**
  - Does this feel expensive at 320px?
  - Is scarcity/pricing claim verifiable?
  - Where does desire peak, and is the CTA there?

## 4. Fitness / coaching website

- **Use when:** SwanStudios' own marketing front door, or any trainer-led coaching business surface. The wedge: trainer-led coaching + real progress proof.
- **Feel:** athletic power inside the frozen-forest luxury vault; real bodies doing real work, cinematically shot.
- **Arc:** Mkt 4-act. **Hero:** C1 with real training footage (Seedance/owned — never stock gym). **Motion:** M2.
- **Sections in order:** C1 hero (identity: "who you become here") → Act 2: coach credibility block + C6 method cards + REAL progress charts in `ChartEnvironment` (data-truth rule: real logs or clearly-labeled illustrative, never fake client data) → Act 3: C9 impact numbers with media anchors + transformation C2 story → Act 4: package shelf (#10 module) + booking CTA + location/logistics.
- **Conversion goal:** consult booked or package purchased. **Trust — credentials rule is HARD here:** "26+ years training experience", "NASM workshop-trained" / "NASM-protocol", cert badges (NCEP, 24 Hour Fitness Master Trainer, Gold's, LA Fitness) — NEVER "NASM-certified". No yoga/meditation language — "stretching"/"flexibility" only.
- **Mobile:** booking CTA sticky-visible; class/package cards stack without clipping; 44px everywhere (sweaty thumbs).
- **A11y:** motion-heavy training footage needs reduced-motion posters; charts get text summaries.
- **Components:** `GlowButton`, `SheenCard` for packages, `ChartEnvironment` + `SafeChart` + `chartTheme` for proof charts (Victory only), `NarrativeDivider`.
- **Anti-patterns:** before/after photos without consent framing; fake testimonial-count inflation; "transformation guaranteed" claims; burying price (this audience bounces on hidden pricing).
- **Fable brief:** "Coaching site for [audience — e.g., golf-athlete lead, all-sport reality]. Promise: [X]. Directions must include: hero footage concept, Act-2 proof strategy using real progress data, credential presentation obeying the credentials rule."
- **Builder brief:** "Direction [n]. Charts from real workout-log data or labeled placeholder flagged as a gap; credentials copy verbatim from the approved strings; packages module reuses #10; booking path verified end-to-end (rule 26)."
- **Harness QA:**
  - [ ] booking CTA ≤1 tap from any scroll depth on mobile
  - [ ] credential strings grep-clean of "NASM-certified" and yoga/meditation terms
  - [ ] charts render loading/empty/error
  - [ ] hero poster tier works
- **Village questions:**
  - Would a wealthy golf client feel this is for them?
  - Is every progress visual backed by real data truth?
  - Is the next action unmistakable at each act boundary?

## 5. Personal portfolio

- **Use when:** one human's work must sell them — Sean's dev/trainer identity, a trainer's public profile, a builder's showcase.
- **Feel:** editorial monograph; the person as protagonist; restrained, confident.
- **Arc:** Mkt 4-act. **Hero:** C4 letterform (the NAME with embedded work/footage) — the signature moment lives here. **Motion:** M2.
- **Sections in order:** C4 name hero → Act 2: selected work as C5 poster wall or C7 tilt gallery (3–6 pieces max, each with one-line role + outcome) → Act 3: story/approach beat (Cormorant italic editorial moment, C2 optional) → Act 4: contact panel + one CTA + links.
- **Conversion goal:** contact/hire. **Trust:** shipped-work specifics with outcomes; real credentials framed accurately (dev: Redwood Code Academy 2017 + MIT CS online — not "self-taught"); no logo-soup of tools.
- **Mobile:** letterform scales via `clamp()`; must stay legible at 320px or fall to solid letterform tier-3; gallery becomes vertical stack.
- **A11y:** embedded-media letterform needs an accessible name; gallery tilt has no informational job — safe to drop at M0.
- **Components:** `GlassPanel`, `GlowButton`, C4 letterform scaffold, `SheenCard` low-motion variant for work cards.
- **Anti-patterns:** skill-percentage bars; wall-of-everything galleries; third-person bio voice; template "Hi, I'm X 👋" hero.
- **Fable brief:** "Portfolio for [person, positioning]. The one thing a visitor must remember: [X]. Directions: letterform media concept, which 3–6 works make the cut and why, editorial voice sample."
- **Builder brief:** "Direction [n]. C4 with clip-path/mask + tier fallbacks in-file; work cards from a data array (no copy-paste sections); contact CTA is a real verified path."
- **Harness QA:**
  - [ ] letterform legible at 320/375/768
  - [ ] media-in-letterform lazy-loads
  - [ ] contact CTA works
  - [ ] reduced-motion shows solid letterform gracefully
- **Village questions:**
  - Does the page read in 15 seconds?
  - Is the curation ruthless enough?
  - Does the letterform serve the name or eat it?

## 6. Agency website

- **Use when:** a team sells outcomes-as-a-service (SwanStudios-as-studio, Sentinel-style client work, any services shop).
- **Feel:** "we make things like THIS" — the site is exhibit A; polished, kinetic, but grown-up.
- **Arc:** Mkt 4-act. **Hero:** C3 sticky showcase (client work cross-fading behind a fixed claim) or C1. **Motion:** M2.
- **Sections in order:** hero claim + showcase → Act 2: case-study rail (C5 shelf of #14 covers) + capability walk (C3) + process in 3–4 honest steps → Act 3: results C9 (media-anchored: shipped product loops) + team/values beat → Act 4: qualification-friendly lead form (short) + call CTA.
- **Conversion goal:** qualified lead / discovery call. **Trust:** named case studies with metrics, process transparency, real team (no stock faces).
- **Mobile:** case rail swipes; form ≤5 fields; sticky showcase falls to stacked cards.
- **A11y:** cross-fading backgrounds must not strand text below 4.5:1 at any frame; form errors announced.
- **Components:** `SheenCard` for case covers, `GlassPanel`, `GlowButton`, `NarrativeDivider`; case pages themselves are archetype #14.
- **Anti-patterns:** logo-wall-as-Act-2 (logos without stories prove nothing); "we're passionate about innovation" copy; portfolio grid of identical rectangles; 12-field contact forms.
- **Fable brief:** "Agency site for [services, ICP]. Flagship proof: [best 2–3 cases]. Directions: hero claim + showcase mechanics, case-rail treatment, how Act 3 differentiates from every other agency."
- **Builder brief:** "Direction [n]. Case covers link to #14 pages; showcase C3 with stacked-panel tier-2; lead form validates inline and posts to a verified endpoint (rule 26)."
- **Harness QA:**
  - [ ] form submit round-trip verified
  - [ ] case rail keyboard-navigable
  - [ ] showcase text contrast at every background frame
  - [ ] mobile form completable in <60s
- **Village questions:**
  - Could a rival paste their cases in unchanged (too generic)?
  - Does Act 2 prove or just claim?
  - Is the lead form qualifying or repelling?

## 7. AI app website

- **Use when:** marketing an AI-powered product (Swan Coach as a public capability, an AI tool launch). Danger zone: every AI site looks identical in 2026.
- **Feel:** intelligence you can SEE working — show the product thinking, not orbs and sparkle emojis.
- **Arc:** Mkt 4-act. **Hero:** C1 + a live-demo panel (real or faithfully-scripted product interaction as co-lead). **Motion:** M2.
- **Sections in order:** hero + demo panel → Act 2: capability walk (C3) where each capability shows an actual in/out exchange + honest-limits line + privacy/trust block (zero-PII posture is a FEATURE — state it) → Act 3: workflow-transformation story (before/after time saved, C9 with media) → Act 4: tier gating (`FrostedPaywall` / `CrystallineLockOverlay` semantics if tiered) + signup CTA.
- **Conversion goal:** signup/waitlist. **Trust:** real product transcripts, privacy posture ("client data as IDs only"), what it does NOT do, human-in-the-loop framing (proposals, approval gates).
- **Mobile:** demo panel becomes a scripted autoplay-on-scroll (poster fallback); exchanges readable at 320px.
- **A11y:** simulated typing effects respect reduced-motion (show final state instantly); demo content is real text, not images of text.
- **Components:** `GlassPanel`, `GlowButton`, chat/proposal-card patterns from `components.md` (same family as #20 so marketing matches product truth), `FrostedPaywall` for tier boundaries.
- **Anti-patterns:** floating gradient orbs; sparkles/✨ iconography; "powered by AI" as the value prop; fake typing animations over fake answers; overpromising autonomy the T-tier model forbids.
- **Fable brief:** "AI app page for [capability]. The demo moment that sells it: [X]. Directions: demo-panel mechanics, honesty/limits framing, how Act 2 avoids the generic-AI-site look."
- **Builder brief:** "Direction [n]. Demo content sourced from real product transcripts (scrubbed to IDs/roles); reuse #20 conversational components so marketing == product; tier gates reuse existing paywall components."
- **Harness QA:**
  - [ ] demo panel plays + falls back to poster
  - [ ] no PII in any demo string
  - [ ] reduced-motion shows complete demo state
  - [ ] signup path ≤2 clicks
  - [ ] lighthouse-class perf on demo section
- **Village questions:**
  - Does the demo show a REAL differentiated capability?
  - Is the privacy story load-bearing or decorative?
  - Would this page survive the "every AI landing page looks the same" screenshot lineup?

## 8. Internal operator dashboard

- **Use when:** staff/admin working surfaces — SwanStudios admin dashboard family. Users arrive with a goal; the page's job is speed and truth.
- **Feel:** mission console, dense but premium; C11 discipline everywhere; zero landing-page decoration.
- **Arc:** Dash 4-phase. **Hero:** none — Phase-1 orientation band (who am I, business health, what changed since last visit). **Motion:** M1.
- **Sections in order:** Phase 1 orientation band (identity + health indicators + alerts count) → Phase 2 current state (the real numbers/tables/sessions — largest surface area) → Phase 3 progress/insight (`ChartEnvironment` with narrative columns, deltas, annotations) → Phase 4 next best action (intervention queue: who's stale, what needs approval, one primary CTA).
- **Conversion goal:** operator completes the day's decisions without hunting; stale-client/exception visibility (admin priority per Product Core Loop).
- **Trust:** data truth — real logs only; empty states explain WHY (Cormorant italic line), never bare "no data"; timestamps on freshness-sensitive data.
- **Mobile:** tables → stacked fact cards; no hover-only actions; 44px icon buttons; phone-width check mandatory before completion.
- **A11y:** keyboard-first table nav; charts carry text deltas; alert colors paired with icons/labels (not color-only).
- **Components:** `ChartEnvironment` + `SafeChart` + `chartTheme` (Victory, lazy via `React.lazy`), `GlassPanel` obsidian variant, client/data-card low-motion `SheenCard` geometry, `GlowButton` for the Phase-4 CTA.
- **Anti-patterns:** SaaS-hero styling on a working surface; naked KPI rows (§B ban 3); cards-inside-cards; duplicated facts across cards; decorative metrics; Phase 4 missing (a dashboard that never answers "what now?").
- **Fable brief:** "Operator dashboard for [role]. Phase-1 question: [what health signal matters most]. Directions: orientation-band composition, Phase-2 density strategy, the Phase-4 intervention queue design."
- **Builder brief:** "Direction [n]. B2.2 phases written in-thread; real endpoints only (rule 26 receipt + rule 58 schema-drift check on every model touched); loading/empty/error states for every data region."
- **Harness QA:**
  - [ ] phone-width no-overlap sweep
  - [ ] loading/empty/error visible per region
  - [ ] chart lazy-boundaries hold (no eager gallery)
  - [ ] Phase-4 action executes round-trip
  - [ ] no hover-only controls
- **Village questions:**
  - Can the operator find the one client needing intervention in <10s?
  - Is anything decorative wearing a data costume?
  - Does every number trace to a real table?

## 9. Client portal

- **Use when:** the logged-in client/trainee surface — home, progress, workouts. The Product Core Loop lives here: log → diary → charts → next action → share.
- **Feel:** personal momentum machine; gaming-warm (Ice Wing XP accents) without being a casino.
- **Arc:** Dash 4-phase. **Hero:** C9 momentum card (streak, XP, level, next session) as Phase 1. **Motion:** M1 (earned micro-celebrations on milestones allowed).
- **Sections in order:** Phase 1 momentum/identity → Phase 2 today's truth (next workout, quick-log entry ≤2 taps away, recent diary) → Phase 3 progress proof (`ChartEnvironment` from REAL logs; streak/PR annotations) → Phase 4 next best action (start workout / book session / share milestone).
- **Conversion goal:** workout logged; progress reviewed; milestone shared. Logging is the sacred path — fewest taps wins.
- **Trust:** their own real data, always fresh; mock progress data is a flagged gap, never silently shipped.
- **Mobile:** THIS IS A MOBILE-FIRST SURFACE. Log flow one-thumb; Progress never buried below social/profile; sticky quick-log affordance.
- **A11y:** 44px targets; XP/rarity colors (Common=Swan Lavender … Legendary=gradient) never the sole signal; reduced-motion swaps celebration animation for static badge state.
- **Components:** `ChartEnvironment` + `SafeChart`, `GlowButton`, low-motion `SheenCard` data cards, `CrystallineLockOverlay` on tier-locked features, gamification header patterns from `components.md`.
- **Anti-patterns:** burying Progress; feed-noise above workout truth; celebration confetti on trivial events (devalues milestones); duplicate facts across momentum card and stats row.
- **Fable brief:** "Client portal home. Primary loop moment: [log/review/share]. Directions: Phase-1 momentum treatment, quick-log placement, how Phase 3 makes progress feel addictive without dark patterns."
- **Builder brief:** "Direction [n]. Log path tap-count measured before/after; charts from real workout logs (data-truth); tier gates via existing lock components; rule 26 receipt on the mounted home route."
- **Harness QA:**
  - [ ] log-workout ≤2 taps from load
  - [ ] 320/375/414px sweep
  - [ ] charts loading/empty/error
  - [ ] streak/XP render from real API
  - [ ] share action produces the expected artifact
- **Village questions:**
  - Does the home screen make today's workout unavoidable?
  - Is any progress visual mock data?
  - What brings this user back tomorrow?

## 10. Pricing page

- **Use when:** standalone /pricing or the Act-4 module inside #1/#4/#16. Composition note: build once, mount both places.
- **Feel:** calm clarity at the moment of money; luxury without pressure.
- **Arc:** Mkt Act-4 module (standalone version gets a compressed 4-act: brief value re-hook → tiers → proof → FAQ/CTA). **Hero:** C5 tier shelf — plans as objects, recommended tier physically forward. **Motion:** M1.
- **Sections in order:** one-line value re-anchor → C5 tier shelf (3–5 tiers; recommended visually elevated, not just badged) → per-tier `SheenCard` with price, cadence, what's-included truth → comparison expander (not a wall) → guarantee/terms plainly → FAQ → final CTA.
- **Conversion goal:** plan selected. **Trust:** real prices visible (SwanStudios: $175/session, packages at true totals — no fake strikethroughs), Guardian donation semantics stated honestly, cancellation terms upfront.
- **Mobile:** shelf → vertical stack with recommended tier FIRST; sticky selected-tier CTA.
- **A11y:** price differences readable by screen reader (full sentences, not grid-position implication); toggle (monthly/annual) keyboard-operable.
- **Components:** `SheenCard` (sell treatment allowed), `GlowButton` per tier obeying Dual-Button Glow, `GlassPanel` luxury variant on the flagship tier only, `FrostedPaywall` semantics for locked-feature previews.
- **Anti-patterns:** fake anchor pricing; 40-row comparison tables above the fold; "most popular" on the most expensive tier without data; hiding the free tier; countdown timers.
- **Fable brief:** "Pricing for [tiers + real prices]. Business intent: [which tier should win]. Directions: shelf composition, recommended-tier elevation, how the donation/Guardian mechanic reads honestly."
- **Builder brief:** "Direction [n]. Tier data from a single source array (matches backend storefront truth — verify against seeded packages, rule 58); checkout CTA path verified end-to-end incl. `/api/cart/add`."
- **Harness QA:**
  - [ ] every tier CTA reaches checkout
  - [ ] prices match backend seed data
  - [ ] mobile stack order correct
  - [ ] toggle states persist
  - [ ] no dead "contact sales" links
- **Village questions:**
  - Is the recommended tier the right business call?
  - Does anything here erode trust for a $2,800/month client?
  - Price-to-value story airtight?

## 11. Onboarding funnel

- **Use when:** post-conversion activation — account setup, role-specific first-run (trainer: first template + first client invite; trainee: first workout logged + first coach touch within 7 days).
- **Feel:** guided, generous, momentum-building; one decision per screen.
- **Arc:** compressed act PER STEP: micro-hook (why this step) → action → progress acknowledgment. Whole funnel = Act 3→4 of the parent surface. **Hero:** none — single focused `GlassPanel` per step. **Motion:** M1 (step transitions + progress indicator only).
- **Sections in order (per step):** progress indicator → step promise (one line) → the ONE input/action → skip/back affordances → forward CTA. Funnel order: identity → role fork → the role's activation action → first-win celebration → land on portal Phase 1.
- **Conversion goal:** activation completion — measured by the role-specific first win, not screens viewed.
- **Trust:** say why each datum is needed at ask-time; consent explicit for health-adjacent data (sensitive-by-design rule); skippable everything except essentials.
- **Mobile:** the primary funnel IS mobile; keyboard-type-aware inputs; one thumb; progress persists across abandonment.
- **A11y:** focus moves to step heading on transition; errors inline + announced; no time limits.
- **Components:** `GlassPanel`, `GlowButton`, form patterns from `components.md`, milestone badge on first win.
- **Anti-patterns:** 12-field first screen; asking for data the product won't use this week; forced tour before first win; celebration before anything was actually accomplished.
- **Fable brief:** "Onboarding for [role]. Activation definition: [first win]. Directions: step count + order, what gets deferred to later, the first-win moment design."
- **Builder brief:** "Direction [n]. Steps as a data-driven state machine (no page-per-step copies); resume-on-return; each write hits verified endpoints; consent copy exact."
- **Harness QA:**
  - [ ] full funnel completable on 375px
  - [ ] abandon-and-resume works
  - [ ] back doesn't lose data
  - [ ] first-win state lands on portal correctly
  - [ ] skip paths don't dead-end
- **Village questions:**
  - What's the minimum steps to the role's first win?
  - Which asks can move to post-activation?
  - Where will real users bail?

## 12. E-commerce / product page

- **Use when:** the storefront package detail / any buyable object page. Composes with #10 (pricing truth) and #3 (luxury treatment for flagship SKUs).
- **Feel:** product-as-protagonist on a lit stage; everything else supporting cast.
- **Arc:** Mkt 4-act compressed to one screen + supporting scroll. **Hero:** product stage — C1 loop or C5-style object presentation with C7 tilt on the product card. **Motion:** M2.
- **Sections in order:** stage (media + name + price + primary `GlowButton` add-to-cart, all above fold) → Act 2: what's-included truth + C6 flip for details/terms → Act 3: social/usage proof (real outcomes) + related items C5 rail → Act 4: sticky add-to-cart reprise + guarantee.
- **Conversion goal:** add-to-cart → checkout. **Trust:** total price honesty (sessions × rate math shown), included-vs-not clarity, refund/transfer terms.
- **Mobile:** sticky add-to-cart bar; gallery swipes; price never scrolls out of view.
- **A11y:** price + variant changes announced; gallery keyboard-navigable; 44px quantity/variant controls.
- **Components:** `SheenCard` full sell treatment on the stage, `GlowButton`, `GlassPanel`, cart interactions verified against the live cart API (the historical `/api/cart/add` 404 makes this archetype's QA non-optional).
- **Anti-patterns:** carousel-of-everything heroes; shipping/terms surprises at checkout; fake "3 people are viewing this"; related-items rail longer than the product story.
- **Fable brief:** "Product page for [SKU, price]. The desire angle: [X]. Directions: stage treatment, included-truth presentation, Act-3 proof choice."
- **Builder brief:** "Direction [n]. Product data from storefront model (schema-drift check, rule 58); add-to-cart round-trip verified in-session; sticky bar coexists with mobile nav."
- **Harness QA:**
  - [ ] add-to-cart 200-path verified + error state visible on failure
  - [ ] price math matches backend
  - [ ] sticky bar at 375px doesn't cover content
  - [ ] gallery poster fallbacks
- **Village questions:**
  - Is the full cost honest at first glance?
  - Does Act 2 answer the real pre-purchase objections?
  - Cart failure mode graceful?

## 13. Waitlist page

- **Use when:** pre-launch capture — a feature/product exists as promise only. Highest craft-per-square-inch archetype: one screen must do everything.
- **Feel:** invitation to something already inevitable; scarcity of access, not scarcity theater.
- **Arc:** Mkt 4-act compressed into 2–3 viewports: Act 1 hook + Act 2 micro-proof merge; Act 3 = "what you'll get"; Act 4 = the field. **Hero:** C1 (teaser loop) or C4 letterform. **Motion:** M2 with the budget spent almost entirely on the hero.
- **Sections in order:** hero with the promise + email field visible immediately → 3-beat "what's coming" (C6 or simple glass triptych — asymmetric, not equal-3-up) → who's-building-this trust line → field reprise + expectation ("we email once, at launch").
- **Conversion goal:** email captured. Secondary: share.
- **Trust:** real builder identity, honest timeline language, privacy one-liner at the field ("no spam — cadence promise").
- **Mobile:** field + CTA in first viewport; keyboard doesn't hide the submit.
- **A11y:** email field labeled, error announced, success state focus-managed; hero motion reduced-motion-safe.
- **Components:** `GlowButton`, `GlassPanel`, single input pattern from `components.md`; confirmation state designed (not an alert()).
- **Anti-patterns:** asking more than email; fake signup counters; "launching soon" with no substance about WHAT; three viewports of scroll before the field.
- **Fable brief:** "Waitlist for [thing]. The one-sentence promise: [X]. Directions: hero teaser concept, the 3 proof beats, success-state moment."
- **Builder brief:** "Direction [n]. Email endpoint verified + double-submit guarded; success state in-page; og:image/first-frame sells alone (cinematic first-frame rule)."
- **Harness QA:**
  - [ ] submit round-trip + duplicate handling
  - [ ] field visible with keyboard open at 375px
  - [ ] success state reachable + screenshot
  - [ ] social preview renders
- **Village questions:**
  - Would YOU give this page your email?
  - Is the promise specific enough to filter the right list?
  - What does day-1 of launch email these people?

## 14. Case study page

- **Use when:** proving one engagement/transformation in depth — agency work (#6's ammunition) or a client transformation story (consented, IDs/roles per privacy rules).
- **Feel:** documentary, not brochure; the reader should feel the before-state viscerally.
- **Arc:** Mkt 4-act as narrative: Act 1 = the stakes (before-state), Act 2 = the approach, Act 3 = the turn + results, Act 4 = "this could be you" CTA. **Hero:** C2 parallax opening (the before-world) or bold editorial title block. **Motion:** M1–M2.
- **Sections in order:** stakes hero → context block (client class, constraints — anonymized per rule 8) → approach walk (numbered, honest, including what didn't work) → results: C9 with REAL metrics + `ChartEnvironment` before/after where data exists → pull-quote (Cormorant italic) → CTA to #10/#6 contact.
- **Conversion goal:** belief transfer → pricing/contact click. **Trust:** specific numbers with timeframes, methodology honesty, consent framing on any client story.
- **Mobile:** long-read comfort — 16–18px body, generous line-height, images full-bleed-to-gutter.
- **A11y:** charts carry text conclusions; pull-quotes are real `<blockquote>`; reading order linear.
- **Components:** `ChartEnvironment`, `GlassPanel`, `NarrativeDivider` typographic variant, `GlowButton` final CTA.
- **Anti-patterns:** results without timeframe; adjectives where numbers should be; PII leakage in "anonymized" stories; burying the outcome below 5 viewports of process.
- **Fable brief:** "Case study: [engagement, one-line outcome]. The dramatic arc: [before → turn → after]. Directions: stakes-hero concept, which 2–3 metrics carry the proof, pull-quote candidates."
- **Builder brief:** "Direction [n]. Metrics from real data (or explicitly labeled ranges); privacy scrub verified (IDs/roles only); template-izable structure — next case study is data, not new code."
- **Harness QA:**
  - [ ] privacy grep (no names/PII)
  - [ ] charts render with real data
  - [ ] reading flow at 375px
  - [ ] CTA click-through verified
  - [ ] print/reader-mode sane
- **Village questions:**
  - Does the before-state create tension?
  - Would the metrics survive skeptical due diligence?
  - Is consent documented for the story?

## 15. Documentation / knowledge-base site

- **Use when:** product docs, help center, internal runbooks surfaced to users. The anti-cinematic archetype: speed of answer IS the design.
- **Feel:** quiet precision; the Fira Code archetype; dark-first library.
- **Arc:** orientation-first (dash-style): Phase 1 = search + top intents; Phase 2 = the answer; Phase 3 = related/deeper; Phase 4 = "did this help" + escalation path. **Hero:** search-first header — search field IS the hero. **Motion:** M0–M1 (affordance transitions only).
- **Sections in order:** search + 4–6 top-intent links (asymmetric weighting by usage, not equal grid) → category tree (left rail desktop / collapsible mobile) → article layout: title, updated-date, TOC, body, code blocks (Fira Code), callouts → footer: helpful?-widget + support escalation.
- **Conversion goal:** answer found fast; deflection from support with satisfaction, not frustration.
- **Trust:** updated-timestamps on every article; honest "this doesn't cover X yet"; versioned accuracy.
- **Mobile:** search sticky; TOC collapses; code blocks scroll horizontally in-container (never page-wide overflow).
- **A11y:** the flagship a11y archetype — full keyboard nav, landmark structure, skip links, heading hierarchy strict, contrast everywhere; this page family should pass audits with zero findings.
- **Components:** `GlassPanel` obsidian variant, search pattern + callout/code-block patterns from `components.md`; NO `SheenCard` sell treatment anywhere.
- **Anti-patterns:** marketing motion in docs; centered narrow-column article text at desktop widths wasting the rail; screenshot-only answers; dead-end 404s without search.
- **Fable brief:** "Docs surface for [product area]. Top 6 user intents: [list]. Directions: search-header composition, category IA, article-template density."
- **Builder brief:** "Direction [n]. Article layout as one template component; search verified against real content index; code blocks with copy buttons; 404 routes to search."
- **Harness QA:**
  - [ ] search returns results
  - [ ] keyboard-only journey to an answer
  - [ ] code block overflow contained at 320px
  - [ ] heading-structure audit
  - [ ] helpful-widget posts
- **Village questions:**
  - Time-to-answer for the top intent?
  - Does IA match how users ask (not how the org is structured)?
  - Stale-content strategy?

## 16. Community / course landing page

- **Use when:** selling belonging + curriculum — SwanStudios community tier, challenges, cohorts, a course. Wedge rule: community reinforces coaching (adherence/retention), never generic-social noise.
- **Feel:** warm belonging inside the vault — people-forward, but premium (no cork-board clutter).
- **Arc:** Mkt 4-act. **Hero:** C1 with community-in-motion loop (real members/sessions, consented). **Motion:** M2.
- **Sections in order:** hero (identity: "your people") → Act 2: what happens inside (C3 walk: challenges, cohorts, events, badges — REAL screenshots) + host credibility (credentials rule applies) → Act 3: member transformation stories (mini-#14s) + rhythm calendar ("what a week looks like") → Act 4: join CTA + tier context (#10 module) + guarantee.
- **Conversion goal:** join/enroll. **Trust:** real member activity (never fabricated engagement), host credentials accurate, clear cadence expectations.
- **Mobile:** event/rhythm calendar → vertical agenda; join CTA sticky.
- **A11y:** member imagery has meaningful alt; badge rarity colors not sole differentiator.
- **Components:** `SheenCard` for challenge/cohort cards, `GlowButton`, `GlassPanel`, badge/rarity patterns from `components.md` (Common=Swan Lavender → Legendary=gradient).
- **Anti-patterns:** fake member counts; "join 10,000+ others" without truth; generic-social-feed screenshots as proof; FOMO countdowns; yoga/meditation language in wellness copy (stretching/flexibility only).
- **Fable brief:** "Community landing for [offer]. The belonging promise: [X]. The weekly reason-to-return: [Y]. Directions: hero loop concept, inside-look strategy, how Act 3 proves retention not just joining."
- **Builder brief:** "Direction [n]. Inside-look media from real product surfaces (scrubbed); join path verified through checkout/tier grant; calendar from real event data where live."
- **Harness QA:**
  - [ ] join → correct tier grant verified
  - [ ] no fabricated numbers in copy
  - [ ] hero poster tier
  - [ ] calendar renders empty-state honestly
  - [ ] 375px sweep
- **Village questions:**
  - What's the week-2 retention hook shown on the page?
  - Is every social proof element real?
  - Does this strengthen coaching or drift toward generic social?

## 17. Mobile app marketing site

- **Use when:** driving App Store / Google Play installs (the Victory-native roadmap surface). The product screen is the protagonist.
- **Feel:** the app in your hand — device-framed truth, thumb-scale reality.
- **Arc:** Mkt 4-act. **Hero:** device-frame C3 — phone frame sticky while app screens cross-fade through the core loop (log → chart → share). **Motion:** M2.
- **Sections in order:** hero device + store badges above fold → Act 2: core-loop walk (each C3 panel = one loop step with REAL app screens) → Act 3: outcomes C9 + ratings/reviews (real) → Act 4: store badges reprise + QR at desktop widths + SMS-link option.
- **Conversion goal:** store install. **Trust:** real screenshots (current build, not concept art), real ratings, platform availability honesty.
- **Mobile (the irony rule):** most visitors are ON the target device — the store badge is the hero CTA, one tap, instantly visible; don't make a phone user watch a desktop-oriented device-frame ballet.
- **A11y:** app screens are images — pair every panel with real text describing the step; badges have accessible names.
- **Components:** device-frame pattern from `components.md`, `GlowButton`, `GlassPanel`, C9 counters.
- **Anti-patterns:** concept-art screens that oversell; auto-playing app video with sound; desktop-first composition for a mobile-intent audience; fake review counts.
- **Fable brief:** "App marketing site for [app]. Core-loop moment that sells: [X]. Directions: device-frame choreography, which 3–4 screens make the walk, desktop-vs-mobile CTA strategy."
- **Builder brief:** "Direction [n]. Screens exported from the real app at correct DPR; C3 with stacked tier-2; store links/QR verified; on-device visitors get badge-first layout."
- **Harness QA:**
  - [ ] store badges resolve
  - [ ] mobile visitor sees CTA in first viewport
  - [ ] device-frame degrades to stacked screens
  - [ ] screen images sharp at 2x/3x DPR
  - [ ] QR scannable from a 1440p screenshot
- **Village questions:**
  - Do the screens shown match the shipped app?
  - Is the mobile-visitor path one tap?
  - What convinces at the decisive moment — screens or numbers?

## 18. Hermes Agentic OS command center (Cyberforest mode — Sean-only)

- **Use when:** Sean's private operator surface — approval queue, kill switches, receipts, agent status. NOT a product surface; governed by the Operator Bridge (T0–T4, §10 design boundary).
- **Feel:** Crystalline Cyberforest — the same token system in operator dress: darker, denser, bioluminescent-circuit accents; a night-forest ops room. Operator aesthetics NEVER leak into client-facing UI.
- **Arc:** Dash 4-phase. **Hero:** status-horizon band — runtime health, active agents, pending approvals count, master kill-switch state, all in one glance. **Motion:** M1 hard cap (an ops surface must never animate away trust; status changes pulse once, then rest).
- **Sections in order:** Phase 1 status horizon → Phase 2 approval queue (each entry: actor · command · tier · target · expiry; T3/T4 visually loud — Wing Purple for T3, Danger red + two-step confirm for T4 (badge ladder per design.md §15)) → Phase 3 receipts stream (append-only, filterable) + agent activity → Phase 4 next decision (oldest pending approval or "all clear").
- **Conversion goal:** operator decision speed — approve/deny with full context in minimum taps; kill switch reachable in ≤2 interactions from anywhere.
- **Trust:** receipts are the truth surface ("no receipt → it didn't happen correctly"); kill switches first-class panel, never buried; ambiguity rounds UP visually (uncertain tier renders as the higher tier).
- **Mobile:** Telegram is the mobile lane — this surface optimizes desktop/1440p+; still no hover-only controls (product rules apply to operator UI too: 44px, dark-first, reduced-motion, 4.5:1).
- **A11y:** tier distinctions never color-only (T-badge text always); approval actions keyboard-operable; focus trap on T4 two-step confirm.
- **Components:** `GlassPanel` obsidian variant, `GlowButton` (T4 confirm gets the two-step pattern from `components.md`), receipt/queue-row patterns; Cyberforest accent tokens per `design.md` — proposed tokens go through the token-proposal process, never hardcoded.
- **Anti-patterns:** marketing polish that obscures state; auto-refresh that moves a row as Sean reaches to click it; celebratory animation on destructive actions; any affordance implying an unregistered command is runnable (unregistered = blocked, not T0).
- **Fable brief:** "Hermes command center [panel]. The operator question it answers: [X]. Directions: status-horizon composition, tier-visual language, T4 confirm choreography. Cyberforest mode, M1 cap."
- **Builder brief:** "Direction [n]. Every action wired to the registry tier (no improvised tiers); kill-switch state fail-closed in UI (unknown = shown as OFF/blocked); receipts append-only; no direct DB reads — API layer only."
- **Harness QA (supervised, T0 read-only per Bridge §6):**
  - [ ] tier badges match registry entries
  - [ ] T4 requires two distinct interactions
  - [ ] kill-switch panel reachable ≤2 clicks
  - [ ] stale `Updated:` timestamps visibly flagged
  - [ ] no PII in any rendered receipt
- **Village questions:**
  - Can a tired Sean at 1am mis-approve a T4?
  - Does the UI ever imply more authority than the registry grants?
  - What does the surface look like when the daemon is down?

## 19. Coach Command Center (trainer product surface)

- **Use when:** the trainer's daily working surface — client roster, live-session logging, PLAUD review, proposal approvals. Product surface: multi-tenant, role-scoped via app auth (T2 within the signed-in trainer's scope — this is product authorization, not Hermes authority).
- **Feel:** the trainer's clipboard elevated to a cockpit — fast, glove-friendly, gym-floor real.
- **Arc:** Dash 4-phase. **Hero:** roster + next-best-action band — today's sessions, who needs attention, one-tap start-session. **Motion:** M1.
- **Sections in order:** Phase 1 today band (sessions, alerts: stale clients, pending PLAUD drafts) → Phase 2 live tools (find client ≤2 taps → start session → dictate/manual log → save) → Phase 3 client progress review (`ChartEnvironment` from real logs, plan-adjustment affordances) → Phase 4 queue (approve workout-log drafts, respond, plan next).
- **Conversion goal:** client workout logged/reviewed in fewest taps; the coaching loop (log → history → charts → plan adjustment) friction-free. Live-session flow is the sacred path.
- **Trust:** drafts vs committed logs visually distinct (T1 proposal vs saved truth); PLAUD-parsed artifacts arrive ONLY through approval-gated review (redaction-first per Bridge §6); credentials copy anywhere on-surface obeys the credentials rule.
- **Mobile:** gym-floor mobile is primary for live tools — one-thumb logging, big targets, interruptible flows that survive lock-screen; desktop for review/planning phases.
- **A11y:** dictation flows have full manual equivalents; timer/set counters readable at arm's length; no hover-dependent controls.
- **Components:** low-motion `SheenCard` client cards (geometry + chrome, no pointer-tracking), `GlowButton`, `ChartEnvironment` + `SafeChart`, approval-gate/draft-badge patterns from `components.md`, `GlassPanel`.
- **Anti-patterns:** burying start-session below analytics; duplicate client facts across roster card and detail; requiring desktop for anything live-session; auto-committing drafts without trainer approval.
- **Fable brief:** "Coach Command Center [slice]. The live-session moment: [X]. Directions: today-band composition, log-flow tap choreography (count the taps), draft-vs-truth visual language."
- **Builder brief:** "Direction [n]. Role scoping via app auth verified (rule 26 + trainer-role path); log write path end-to-end tested; PLAUD drafts render only post-redaction; tap counts measured before/after."
- **Harness QA:**
  - [ ] find-client→start-session→log→save ≤N taps (state N)
  - [ ] draft badge distinct from committed at a glance
  - [ ] 375px + 414px live-tool sweep
  - [ ] chart loading/empty/error
  - [ ] role isolation (trainer A cannot render trainer B's client)
- **Village questions:**
  - Can a trainer log a set mid-conversation without looking twice?
  - Is the draft/committed boundary abuse-proof?
  - What breaks when connectivity drops mid-session?

## 20. Swan Coach product surface (client-facing assistant)

- **Use when:** the in-app coaching assistant clients talk to — chat, workout-log drafts, proposals. Public product feature, governed by subscription tiers + approval gates (T1 ceiling: drafts/proposals; writes only through approval-gated endpoints). Never raw Hermes; never marketed as "AI" first — it's "Swan Coach".
- **Feel:** a knowledgeable coach in the room — warm precision, glass-panel calm; assistant presence without mascot cuteness.
- **Arc:** Dash 4-phase, conversational: Phase 1 = greeting with context ("since last time…"), Phase 2 = the conversation + capability affordances, Phase 3 = proposal cards (drafted workout logs, plan suggestions) with clear DRAFT labeling, Phase 4 = approve/edit/dismiss actions. **Hero:** chat surface + suggestion chips. **Motion:** M1 (message entrance, typing indicator honest to actual latency, reduced-motion shows instant final state).
- **Sections in order:** context greeting → conversation stream (user right / coach left, `GlassPanel` bubbles) → inline proposal cards (structured: exercises, sets, reps — editable before approval) → capability chips (what Coach can do at the user's tier) → tier boundary via `FrostedPaywall`/`CrystallineLockOverlay` when a locked capability is invoked.
- **Conversion goal:** proposal approved / action logged through the assistant; secondary: tier upgrade at genuine capability boundaries (never nagware).
- **Trust:** every write is a visible proposal the user approves (T1 → approval-gated endpoint); zero-PII posture (IDs client-side mapped); honest failure states ("I can't do that on your plan" / "that didn't save — retry"); no fake confidence.
- **Mobile:** chat is inherently mobile-first; input above keyboard; proposal cards approve-able one-thumb; 44px chips.
- **A11y:** stream is a proper log (aria-live polite); proposal cards fully keyboard-operable; typing indicator not the only progress signal; no yoga/meditation language in any Coach copy — stretching/flexibility.
- **Components:** chat bubble + proposal-card + suggestion-chip patterns from `components.md`, `GlowButton` on approve (Dual-Button Glow), `FrostedPaywall`, `CrystallineLockOverlay`, `GlassPanel`.
- **Anti-patterns:** sparkle-emoji AI branding; fake typing theater; silent writes without approval; burying the edit affordance on proposals; tier-gating mid-conversation without a graceful path back.
- **Fable brief:** "Swan Coach [surface/slice]. The assist moment: [X, e.g., post-workout log draft]. Directions: proposal-card anatomy, tier-boundary choreography, how trust is visible in the UI."
- **Builder brief:** "Direction [n]. All writes through approval-gated product endpoints (verify the command-lane registry — 20 live commands as of v14); tier gates reuse existing paywall components; conversation state survives refresh; rule 26 receipt on the mounted Coach route."
- **Harness QA:**
  - [ ] proposal → approve → verified backend write → rendered confirmation
  - [ ] locked capability shows the gate gracefully
  - [ ] refresh mid-conversation preserves stream
  - [ ] keyboard-open input visible at 375px
  - [ ] PII grep on rendered payloads
- **Village questions:**
  - Is the approval gate legible to a non-technical client?
  - Does the tier boundary feel like a door or a wall?
  - What happens on a hallucinated/unregistered command (must render as "can't do that", never a fake success)?

---

## Closing rules

1. **Arc before pixels.** No archetype ships without its B2 arc (acts or phases) written in the task thread first — `swan-design-router` enforces it.
2. **Composition inherits.** Embedded archetypes take the host's arc position and motion budget; chains inherit the max budget AND the max command tier.
3. **This codex applies the system.** Any conflict with `SWAN-CINEMATIC-DESIGN-SYSTEM.md` or `design.md` is a bug in THIS file — fix here, not there.
4. **Maintenance:** a new page type that doesn't map to these 20 → propose a new entry (matrix row + section) rather than freelancing; a repeated deviation inside an archetype → update that section in the same pass as the work that revealed it.
