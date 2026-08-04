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

- **Route every asset through `SWAN-ASSET-STORYBOARDING.md`** (emotional job → archetype → fallback → motion, its four questions) and generate briefs via the unified `seedance-swan-video` skill, selecting cinematic mode for hero/brand/b-roll/icon motion or workout mode for exercise/training footage.
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

- **Contrast against moving backgrounds:** text over media sits on a vignette/scrim layer that guarantees 4.5:1 at the media's brightest frame — audit against the brightest frame, not the average.
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
| Scrub sequence frames | 60–120 per scene | §8 |
| Sequence payload | ≤4–6MB desktop / ≤2MB mobile | §8 |
| LCP | ≤2.5s (poster/first-frame path) | §11 |
| R3F canvases | ≤1, DPR ≤2, <3ms/frame | §7 |
| Text-over-media contrast | 4.5:1 at brightest frame | §12 |
| M4 extended caps + product prohibition | `experience-mode.md` §§2–5; live M4 never embeds on product/Hermes surfaces | licensed exception |

A build that exceeds any cap either cuts scope in the scene ledger or gets Sean's explicit written exception in the task thread — never a silent overage.

**M4 loss-matrix pointer:** an eligible M4 experience must also prove B3 failure → B2, B2 failure → B1/B0, context/device loss, Full/Lean/Still, and JavaScript-disabled semantic poster behavior per `experience-mode.md`. Canvas/video may not own unique copy, navigation, CTA, legal text, or form state.

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
