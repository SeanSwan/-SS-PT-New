# Cinematic Pages — The Scroll-Film Doctrine

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (within Design Brain scope)
- **Scope:** the craft behind archetype #2 (cinematic 3D scroll site) in `website-archetypes.md`, AND any M3 cinematic act embedded inside another archetype (a luxury hero, a SaaS Act-1 moment). One M3 section on a page pulls this whole doctrine in.
- **Authority chain:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` (§A stack + tiers, §B grammar + bans, §B2 arcs, §C patterns) > `design.md` > this doc. Assets route through `SWAN-ASSET-STORYBOARDING.md` + the two Seedance skills. This doc APPLIES the system to the scroll-film problem; it overrides nothing.

---

## 1. Inspiration intake protocol

- **Mood words first.** Every cinematic brief starts with 3–5 mood words (e.g., "glacial, patient, bioluminescent, vast"). Mood words are the contract — every later decision (palette temperature, scene length, easing) is checked against them.
- **References are DECONSTRUCTED, never cloned.** When Sean supplies a reference site/film/frame, extract *principles*, not surfaces: what is the pacing trick? where does the eye rest? what is the depth model? how does it earn the scroll? Write the extracted principles into the brief; then close the reference and design from the principles + Swan grammar.
- **Forbidden framing:** "make it like [designer/site X]" never appears in a brief or an implementation prompt. The correct form: "reference X taught us [principle]; we apply that principle with Swan tokens and our own story." Inspiration language must never instruct reproducing another designer's work.
- **Deconstruction output (required fields):** pacing principle · depth principle · one transition principle · one restraint the reference exercised · what the reference does that Swan must NOT do.

### 1.1 The Extreme Macro-Journey grammar (Act-1 awe engine)

The single most reliable way to make a cinematic hook produce *awe* instead of *nice* is the **Extreme Macro-Journey grammar**, now canonical in `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §B2.4. Read it there — it is the source of truth. In brief, the Act-1 hook is one continuous camera move through scale following `inside → through → across → out`:

1. **START INSIDE** something small at extreme macro scale (one bubble, one capsule wall, one ice crystal, between two muscle fibers). The disorientation is the hook.
2. **PUSH THROUGH** a membrane/boundary — the beat that makes it a journey, not a photo.
3. **TRAVEL ACROSS** a populated field (the part the scroll scrubs through).
4. **BREAK OUT / ARRIVE** at brand meaning (product, wordmark, transformed user, storefront threshold) — where the CTA becomes earned.

Write the four beats verbatim into the Seedance shot description (§6) — this grammar is the *concept*; §8 is the *production*. The scene ledger's Act-1 row names which beat maps to which vh of scroll. A "cinematic hero" brief that does not resolve to a legible change of scale + forward motion through at least one membrane is not a macro-journey — it is a pan, and it will read as generic. One membrane minimum, two ideal, three = screensaver.

## 2. Brand/story premise — the logline

- Every cinematic page gets a **one-sentence movie logline** before any scene is sketched: *"A [protagonist/user] discovers [world/capability] and leaves wanting [the CTA action]."*
- The logline names: protagonist (always the visitor, not the brand), the transformation, the single conversion action.
- Test: if two scenes can't be justified by the logline, cut one. If the logline can't be written, the page isn't ready for cinematic treatment — build it as a standard archetype instead.

## 3. Visual worldbuilding

- **Atmosphere layers (minimum three z-stacks per scene, per §B):** background world (media/parallax), midground objects (glass panels, product), foreground voice (typography + CTA). Add a fourth *particle/grain* layer (2–5% noise, ice-crystal particles at ~0.03 opacity) on hero scenes only.
- **Palette temperature arc across scroll.** The page's color temperature moves with the story: e.g., Act 1 cold (Obsidian + Ice Wing), Act 2 deepening (Midnight Sapphire/Royal Depth dominance), Act 3 warming (Gilded Fern accents rising), Act 4 intimate (Graphite surfaces, warm gold + Wing Purple CTA glow). Write the arc as four temperature keyframes in the brief. All colors remain Crystalline Swan tokens — temperature is achieved by *ratio and lighting*, never new hexes.
- **Light source discipline:** each scene declares where its light comes from (rim, glow object, horizon). Consistent light direction inside an act; light shifts happen AT act boundaries as story beats.

## 4. Section sequencing against the B2 4-act arc

- The scene list maps 1:1 onto B2.1: **Act 1 Hook/awe → Act 2 Capability/proof → Act 3 Transformation/momentum → Act 4 Conversion/belonging.** Acts progress in order; each act = one or more scenes.
- **C10 dividers live between acts** — on cinematic pages these are the "cuts": video-cut, color-wash (the temperature keyframe change), or crystalline motif. Within an act, scenes flow; between acts, scenes CUT.
- Act emotional targets are single: one primary emotion per act; a scene may not contradict its act's target.
- CTA appears at the Act 3→4 boundary (emotional peak) and again at page end. Never earlier than the story earns it, never requiring scroll-back.

## 5. Scroll choreography

- **Scene lengths in viewport-heights (vh):** hook scene 1–2vh of scroll; pinned explanation scenes 3–5vh (one vh per sub-beat, per C3); flowing story scenes 1–1.5vh; conversion scene ≤1vh. Total page: 8–14vh of scroll travel. Longer = fatigue, not cinema.
- **Pinned vs flowing:** pin (position: sticky / ScrollTrigger pin) only when the foreground must persist while the background narrates (C3). Maximum 2 pinned scenes per page. Everything else flows.
- **Choreography restraint (hard caps):**
  - Max **2 simultaneously animated properties** per element; max **3 concurrently animating elements** per viewport.
  - Animate only `transform` and `opacity` on scroll-linked work (compositor-only). Layout properties never animate with scroll.
  - Parallax multipliers 0.2–0.4, never above 0.6 (§C2).
  - **One page-level signature moment** — the single beat someone would screenshot/describe; when present it belongs in Act 1 (§B2 guidance). Each section still carries its own quieter memorable visual per system §B ("a section without a signature moment is filler") — the page-level signature is simply the loudest of them. Two competing page-level moments = zero. Candidates: C4 letterform reveal, a scroll-scrubbed hero sequence, one R3F object.
- Scroll input is read via `requestAnimationFrame` + passive listeners or IntersectionObserver thresholds — never raw undebounced `onScroll` work (§A).

### 5.1 Scene ledger (required pre-build artifact)

Before implementation, the approved direction is written as a **scene ledger** — one row per scene. This is the cinematic equivalent of the B2 arc-in-thread requirement; `swan-design-router` treats a missing ledger as a missing arc.

| Field | What it pins down |
|---|---|
| Scene name | short handle used in code, QA receipts, and asset briefs |
| Act | 1–4 (B2.1 mapping) |
| Scroll length | vh of travel (per §5 length rules) |
| Pinned / flowing | pin only if C3-justified; max 2 pins per page |
| Emotional target | the act's primary emotion this scene serves |
| Animated properties | the ≤2 properties per element that move, named explicitly |
| Assets | Seedance brief handle(s) + poster/fallback still |
| Copy job | headline + ≤2 support lines, act-level job (§13) |
| Static frame | which composed frame represents this scene at M0/reduced tier |

Ledger rules:
- A scene with an empty "static frame" cell is not designed yet — the reduced-motion story (§10) is authored in this ledger, not retrofitted.
- The signature moment is marked on exactly one row.
- Total vh across rows must land in the 8–14vh page budget; if it doesn't, cut scenes here, not in code review.

### 5.2 Worked example (illustrative shape, not a spec)

A SwanStudios brand-film page, logline: *"A committed athlete steps into a frozen-forest vault and leaves wanting to book their first session."*

| Scene | Act | vh | Mode | Signature | Assets |
|---|---|---|---|---|---|
| ice-threshold (C4 letterform reveal) | 1 | 2 | flowing | ★ | hero loop 6s + poster |
| the-method (C3 capability walk, 3 beats) | 2 | 3 | pinned | — | 3 UI-truth stills |
| proof-in-numbers (C9 anchored counters) | 2 | 1 | flowing | — | 2 anchor loops |
| becoming (C2 parallax transformation) | 3 | 1.5 | flowing | — | 1 parallax still |
| the-invitation (CTA, calm) | 4 | 1 | flowing | — | gradient + grain only |

Total: 8.5vh · 1 pin · 1 signature moment · temperature arc cold → sapphire → gold-rising → intimate. Every scene has a named static frame before any motion code is written.

## 6. Video/image asset plan

- **Route every asset through `SWAN-ASSET-STORYBOARDING.md`** (emotional job → archetype → fallback → motion, its four questions) and generate briefs via the two Seedance skills: `seedance-swan-cinematic-video` for hero loops/brand film/b-roll/icon motion; `seedance-swan-workout-video` for any exercise/training footage.
- **Asset archetypes per act (default casting):**
  - Act 1: one hero video loop (4–8s, seamless) OR a scroll-scrubbed sequence (10–20s source) — the signature moment's raw material.
  - Act 2: stills + short UI-truth loops (product proof), letterform-embedded media if C4 is in play.
  - Act 3: one parallax still (C2) + KPI anchor loops/stills (C9).
  - Act 4: calm — a single still or pure gradient + grain; the CTA needs quiet.
- Every video asset ships with: poster frame (tier-2), and a described fallback still in the Seedance brief (system §E). No asset enters the build without its brief on record.

## 7. 3D / GSAP / Three.js usage rules

- **Progressive enhancement, always.** The page must be complete without 3D; R3F is a surgical accent (hero object, geode, particle field) behind `<Suspense>` with a 2D fallback — never page scaffolding (§A).
- **GSAP earns its import** only for long ScrollTrigger sequences, pins, or multi-step timelines; a fade-in is Framer/IO territory. One GSAP context per page, killed on unmount.
- **Perf/battery budget:**
  - one R3F canvas per page maximum
  - target <3ms/frame GPU on mid-tier hardware
  - `frameloop="demand"` when the scene is idle or off-screen
  - DPR clamped to ≤2 regardless of device
- **Device-class gates (system §A tiers):**
  - Full cinema (desktop / capable mobile, no reduced-motion) → everything in the ledger
  - Lean cinema (low-power, save-data, slow network) → no R3F, no pins, CSS-only parallax, posters for video
  - Reduced motion → §10 below
- **Mobile static-frame fallback:** below 768px (or on lean tier), pinned/3D scenes render as composed static frames — art-directed stills in story order, not a broken half-animation. The ledger's static-frame column is the source of those frames.

## 8. Generated-video frame usage (scroll-scrubbed sequences)

- **Pipeline:** extract frames from the (Seedance-generated) video → map frame index to scroll progress within the scene's vh-range → paint via `<canvas>` + `requestAnimationFrame` (draw only when the computed frame index changes).
- **Frame economics:** 60–120 frames per scene is the sweet spot; WebP frames sized to display resolution ×DPR (≤2); target total sequence payload ≤4–6MB desktop, ≤2MB mobile (or fall back to poster on lean tier).
- **Preload strategy:** first frame is part of the LCP-critical path (inline/priority); the rest lazy-load when the scene is one viewport away (IntersectionObserver `rootMargin: '100%'`); decode ahead of scroll direction; never block first paint on a frame set.
- **Fallbacks:** tier-2 = poster frame + subtle CSS parallax; tier-3 = poster frame static. The scrub is enhancement, the poster is the contract.

### 8.1 Scroll physics — the feel layer (magical vs. broken)

The frame pipeline above is *what to paint*; this is *how scroll becomes time*, and it is the entire perceptual difference between "I'm flying through a crystal" and "this video is glitching as I scroll." Canonical spec lives in `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §C13 ("Scroll physics"); implementers building any scroll-scrubbed sequence (C13 whole-page OR a C1/C3 Act-1 hook) apply it:

- **Never bind frame index directly to `scrollY`.** Bind to a **damped target**: each rAF tick, `current += (target - current) * 0.085` (lerp `0.07–0.12`; lower = more cinematic lag). The damping is the cinematic feel.
- **Clamp per-tick frame delta to ≤3 frames** — a momentum fling reads as fast-forward, not a teleport.
- **Native scroll only — never hijack `wheel`/`touch`.** Smoothing lives in the mapping, not by intercepting input (hijacked scroll traps users and feels broken).
- **Bidirectional pre-buffer** — reverse travel must be as smooth as forward; `createImageBitmap`-decode the next ±10 frames in the scroll direction so `drawImage` never stalls on decode.
- **Grain overlay on the canvas** (2–5% noise) hides AI-interpolation shimmer between generated frames.
- **Beat thresholds land on narrative moments** (membrane break, arrival), **not even 25% splits** — even splits are the generic smell.
- **Runway (whole-page C13):** 400–800vh total, beats ~20/25/35/20, CTA at exactly the final frame, hairline `var(--ice-wing, #60C0F0)` progress indicator. (The §5 8–14vh caps are for per-scene flowing pages, not a whole-page scrub.)
- **Mobile:** touch-scrub is the exception; default to the tier-2 autoplay loop unless the device is capable (no `saveData`, `hardwareConcurrency ≥ 6`, payload ≤2MB). Use `100dvh` not `vh` so iOS chrome-collapse doesn't re-layout the scene. Record the per-breakpoint tier in the scene ledger (§5.1).
- **Resolution ladder:** 1280w / 1920w / 2560w frame sets (AVIF→WebP); above a 2560w viewport serve the tier-2 `<video>` (hardware-decoded scales cleaner than upscaled frames) rather than a soft-upscaled sequence. **The ≤4–6MB desktop / ≤2MB mobile payload is PER SERVED SET** (each device fetches one), not a total across the ladder.
- **Frame budget for a whole-page C13 (NOT the §8 per-scene 60–120):** a C13 journey is one continuous shot across the 400–800vh runway, so budget it by total delivered frames per resolution set — **~180–360 frames** for the whole journey (≈ 1 frame / 2–3vh; denser through "across", sparser at the arrival). Smoothness comes from the damping + ≤3-frame clamp, not brute frame count; more frames buys travel *sharpness*, not scrub smoothness. (Canonical: §C13 "Frame budget".)
- Gate: **if you can't state your damping constant and frame-delta clamp, you haven't built the scrub** — you've bound a video to a scrollbar.

## 9. Static image usage

- Stills are not the budget option — they are the *composition* option. Use a still whenever motion has no narrative job (§B ban 9): parallax backgrounds, KPI anchors, Act-4 calm, all lean-tier renders.
- Requirements: art-directed crops per breakpoint (`<picture>`/`srcset`), on-brand Seedance-generated (never stock, §B ban 8), grain overlay on large dark stills to kill the plastic-gradient look, explicit `width`/`height` to prevent CLS.

## 10. Motion restraint + reduced-motion narrative fallback

- **The story must survive with zero motion.** The reduced-motion tier is not a degraded page — it is the same four-act story told in static frames: same scene order, same copy, same palette temperature arc, same composed frames (each scene's most legible frame becomes its still).
- `prefers-reduced-motion: reduce` disables: scroll-scrubbing, parallax, pins-with-animation, count-ups (render final values), video autoplay (posters), R3F (2D fallback). It preserves: layout, tokens, dividers-as-composition, all content, all CTAs.
- Authoring rule: design the static storyboard FIRST, then add motion to it — motion added to a working story stays restrained; story bolted onto motion never does.

## 11. Performance rules

- **LCP ≤2.5s** on the hero (poster/first-frame paints first; video/sequence upgrades after). No cinematic asset may be the LCP blocker.
- **Chunking:** GSAP, R3F, and frame-sequence machinery load in lazy chunks behind route- or viewport-level boundaries — never in the entry bundle. Charts stay `React.lazy` + SafeChart per house rules.
- **Lazy boundaries per act:** Act 1 assets eager (poster-first), Act 2+ assets load one viewport ahead. Below-fold scenes must not delay above-fold interactivity.
- Poster frames for every video; `preload="none"` on below-fold video; `content-visibility: auto` on far-below-fold scenes; no layout thrash from scroll handlers (transform/opacity only, §5).

## 12. Accessibility on cinematic pages

- **Contrast against moving backgrounds (universal — applies to C13, C1/C3 scrubs, AND autoplay video, not just whole-page journeys):** text over ANY moving media sits on a **persistent scrim/vignette layer so contrast holds at EVERY frame, not just the brightest** — because the background moves, a single-frame 4.5:1 check is insufficient (text that passes on frame 1 can drown on frame 50). Only a truly *static* background may rely on a single 4.5:1 check. A per-scene scrub is a moving background. Sample-check at the three brightest beats, never one.
- **Focus visibility:** focus rings (Wing Purple per Dual-Button Glow) must remain visible over every scene background; test keyboard traversal at multiple scroll positions, including mid-pin.
- **No keyboard traps:** keyboard users are never trapped in a pinned scene — pins must not hijack keyboard scroll; tab order stays linear through the act sequence.
- **Skip affordance** ("skip intro" / skip-to-CTA link) on any scene >2vh, visible on focus even if visually quiet otherwise.
- **Autoplaying media:** muted, `playsinline`, pausable; no flashing above 3Hz.
- **Dynamic text effects:** count-ups, scramble/typewriter effects have static equivalents and never gate comprehension — a screen reader announces the final value, not the animation frames.

## 13. Copywriting rules

- **Act-level copy jobs:** Act 1 = identity claim (≤8 words, display scale); Act 2 = proof statements (specifics, numbers, capability verbs); Act 3 = transformation language (second person, present tense — "you," becoming); Act 4 = invitation + next step (imperative, low-pressure, one action).
- Copy is scored against the mood words (§1) — a "glacial, patient" page doesn't shout "BLAZING FAST!!".
- **Conversion-critical copy (hero claim, CTA, pricing/ascension language) routes through the `copy-tournament` skill** — variants → judge panel → merged winner — before it's locked into the build. Credentials rule and no-yoga/meditation language apply to every string.
- Less copy per scene than feels safe: cinematic scenes carry 1 headline + ≤2 supporting lines. Paragraphs belong to standard archetypes.

## 14. First-frame / social-preview rule

- **The first painted frame must sell the page alone.** Whatever paints before any motion begins — the hero poster + headline + CTA — is judged as a standalone poster. If the static first frame is weak, the page is weak; motion may not rescue it.
- **`og:image` gets the same treatment:** a composed still (usually the signature moment's best frame + wordmark), designed, not screenshotted-by-accident. Verify the preview renders correctly at share-card crops (1200×630 class).
- This is also the QA cheapest test: screenshot at scroll=0 with JS disabled-equivalent (reduced tier) — would you click it?

## 15. Browser Harness visual QA hooks

Supervised, read-only (Operator Bridge §6: navigate/scroll/read/screenshot/console/network; T0 default). Required capture set per cinematic page:

1. Screenshot at **scroll = 0** (first-frame rule check) and at **each act boundary** scroll position (4-act pages → 5 captures minimum), at 320px, 375px, 414px, 768px, 1440px, 2560×1440 (full matrix reference: `qa-gates.md` Gate 1).
2. Same capture set with **reduced-motion emulated** — verify the static storyboard tells the full story.
3. Console capture across a full slow scroll — zero errors, no dropped-frame warnings spam.
4. Network capture — verify lazy boundaries (Act 2+ assets don't load at scroll=0) and total payload against §8/§11 budgets.
5. Screenshot the signature moment mid-beat; screenshot every text-over-media scene at its brightest frame for contrast audit.
6. Output: QA receipt per `qa-gates.md` (captures + budgets measured + failures listed).

## 15.1 Hard caps at a glance (QA cross-reference)

| Cap | Value | Source |
|---|---|---|
| Total scroll travel | 8–14vh | §5 |
| Pinned scenes per page | ≤2 | §5 |
| Page-level signature moments | exactly 1 (the loudest beat, Act 1); per-section memorable visuals still required by system §B | §5 / system §B |
| Animated properties per element | ≤2 (transform/opacity only) | §5 |
| Concurrently animating elements per viewport | ≤3 | §5 |
| Parallax multiplier | 0.2–0.4 (hard ceiling 0.6) | §5 / system §C2 |
| Hero loop duration | 4–8s seamless | §6 |
| Scrub sequence frames (per-scene page) | 60–120 per scene | §8 |
| Sequence payload | ≤4–6MB desktop / ≤2MB mobile **per served resolution set** | §8 / §8.1 |
| LCP | ≤2.5s (poster/first-frame path) | §11 |
| R3F canvases | ≤1, DPR ≤2, <3ms/frame | §7 |
| Text-over-media contrast — **static** background | 4.5:1 (single check is enough — the bg doesn't move) | §12 |
| Text-over-media contrast — **any moving** background (C13, C1/C3 scrubs, autoplay video) | **persistent scrim required so contrast holds at EVERY frame, not just the brightest** — a per-scene scrub is still a moving background | §12 / §C13 |

**C13 whole-page scroll-scrub exceptions** (a C13 page is one continuous shot, not a scene stack — these OVERRIDE the per-scene rows above for C13; canonical §C13):

| Cap (C13 only) | Value | Source |
|---|---|---|
| Scroll runway | 400–800vh total, beats ~20/25/35/20, CTA at exact final frame | §C13 / §8.1 |
| Frame budget | ~180–360 frames total per served set (≈1 frame / 2–3vh) — NOT 60–120/scene | §C13 / §8.1 |
| Scrub feel | damped target (lerp 0.085), ≤3-frame/tick clamp, native scroll, bidirectional pre-buffer | §C13 / §8.1 |
| Smoothness | ≥60fps scrub (met by damping + clamp, not brute frame count) | §C13 |
| Mobile | tier-2 autoplay default (scrub only if capable); `100dvh` not `vh` | §C13 / §8.1 |
| Resolution ladder | 1280/1920/2560w (AVIF→WebP); >2560w → serve tier-2 video | §C13 / §8.1 |
| Text-over-media contrast | (governed by the universal "moving background" row above — persistent scrim, every frame) | §12 / §C13 |
| Deploy gate | default answer NO; requires §18 breadth pass + Seedance budget sign-off | §C13 |

A build that exceeds any cap either cuts scope in the scene ledger or gets Sean's explicit written exception in the task thread — never a silent overage.

## 16. Handoff prompt templates

**TO Fable (direction):**
> Cinematic page: [surface]. Logline: [one sentence]. Mood words: [3–5]. Deconstructed principles from intake: [list — principles only, no clone instruction]. Constraints: Swan tokens only, B2.1 arc, one signature moment, M3 budget, three perf tiers. Deliver 2–3 directions, each with: scene list (vh lengths, pinned/flowing), act mapping + emotional targets, palette temperature keyframes, signature-moment candidate, asset archetype casting per act, and what you'd CUT if the budget halves.

**TO Codex/Claude (implementation):**
> Implement approved direction [n] for [surface]. Read first: design.md, SWAN-CINEMATIC-DESIGN-SYSTEM.md §A/§B2/§C, this doc, the approved scene list. Rules: styled-components only (css`` helper for shared fragments — rule 43); rAF + IO for scroll (no raw onScroll); GSAP only for the listed pins; transform/opacity only; three tiers in the same files; posters before video; Seedance briefs filed for every asset before assuming media; rule 26 receipt on the mounted route; Harness capture set (§15) before claiming done. Slice it: static storyboard first, then motion pass, then perf pass.

## 17. Deployment checklist (placeholder — gated on Sean)

Deployment of any cinematic page is **explicitly gated on Sean's approval — no auto-deploy.** The checklist below is a placeholder to be finalized with the first shipped cinematic page:

- [ ] §15 Harness QA receipt complete (all captures, budgets, reduced-motion storyboard verified)
- [ ] copy-tournament winner locked for conversion copy; credentials/yoga-language grep clean
- [ ] LCP ≤2.5s verified on lean tier; payload budgets met
- [ ] Rule 26 canonical surface receipt + rule 42 backend audit (if any backend touched)
- [ ] og:image + first-frame approved by Sean as standalone posters
- [ ] **Sean's explicit "ship it"** recorded — then normal main-branch deploy flow (rules 46/50), never a bypass

## 18. Concept ideation — breadth first, taste second

The reason AI-built sites feel generic is almost never execution — it is that the *concept* was the first idea, not the best idea. Humans are slow at generating ideas and fast at judging them; AI is the reverse. The correct division of labor:

**Generate wide, then let taste pick.** Before committing a cinematic concept, generate **8-12 radically different macro-journey concepts** for the surface — not variations of one idea, but genuinely different worlds (different object to start inside, different membrane, different arrival). Each concept is one or two sentences in the `inside → through → across → out` shape. Then Sean's taste (or the router presenting to Sean) selects the 2-3 worth turning into full concept directions. Ideas are cheap for the model to produce; the expensive, human-only step is the taste that picks which one an audience will feel.

**Rules for the breadth pass:**
- **Radically different, not palette-swaps.** "Whiskey bubble" and "champagne bubble" are the same concept. "Inside a bubble" vs "inside a dissolving capsule" vs "between two muscle fibers" vs "inside a snowflake" are different concepts. If two concepts share the same object-to-start-inside, they count as one.
- **At least 3 of the 8–12 must be NON-macro awe hooks** (or vary the grammar via the §B2.4 sanctioned variants — reverse journey, orbit, time-lapse metamorphosis, human-scale transformation). A field of 12 concepts that are all "start inside an object" macro-journeys is *breadth theater* — it's one concept twelve times, and it quietly makes the macro-journey the new template. Genuine breadth spans awe *strategies*, not just subjects.
- **Every concept resolves to Swan brand meaning.** Breadth is over *worlds*, not over *whether it's on-brand*. Each of the 8-12 must arrive somewhere that matters to SwanStudios (training, transformation, the storefront, the vault, the athlete). A concept that arrives at a generic "product on a pedestal" with no Swan meaning is filler, cut it.
- **Score against mood words (§1), not novelty for its own sake.** The winner is the one whose journey best serves the page's mood contract and logline — not the weirdest one. Zany ≠ good; *on-story and unforgettable* = good.
- **Taste is the human's job.** The model presents the field ranked with a one-line "why this could win" per concept; Sean picks. Do not have the model silently pick the concept it likes — surface the field so the human's taste is the selector (this is the whole point of the division of labor).
- **This is the front of the ideation gate,** not a replacement for it. The breadth pass produces the raw field; the router's 2-3 concept-direction gate (`swan-design-router`) then develops the chosen 2-3 into full directions with scene ledgers. Breadth → taste-cut to 2-3 → full directions → Sean steers → build.

**Where this runs.** For any net-new cinematic/showcase surface, the breadth pass happens at the *start* of the router's ideation gate: 8-12 one-line concepts → Sean (or router-recommended) taste-cut → the surviving 2-3 become the full concept directions the gate requires. For a surface Sean has already handed a concept, skip the breadth pass and develop his concept directly — breadth is for when the concept space is still open.
