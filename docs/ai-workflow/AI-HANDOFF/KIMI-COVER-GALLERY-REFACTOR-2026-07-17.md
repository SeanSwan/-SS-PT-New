# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** .ai-workflow/fusion/kimi-cover-gallery-refactor.md
**Seed:** (none)
**Tokens:** 1919 in / 13384 out · **Cost:** ~$0.2065 · **Wall:** 426.3s

---

# Hostile Design + Front-End Review — User Dashboard Cover + Gallery

**(a) VERDICT: SEND-BACK.** The surface as evidenced is a competent generic media grid bolted onto a progress product — it needs Core-Loop re-wiring, not polish. (Verdict applies to the implementation described and verified on `96ac6bd3d`; notes on the brief itself at the end.)

---

## (b) Design weaknesses, most-severe first

**1. Creative-portfolio IA on a progress product — the generic/template tell.**
The component is named `CreativeGallery`, needs a header comment ("Active UserDashboard V3 profile media showcase") to explain what it is, and ships the taxonomy **All · Dance · Music · Workout · Motivation · Wellness · Art** with kind "auto-detected by extension." That is a Behance-clone vocabulary. Zero references to PRs, form checks, before/after, coached moments, or streaks. This is what "engineer-built, not designed" actually looks like: the IA describes the *component's capabilities* instead of the *member's journey*. Nothing on this surface knows what product it's in.

**2. No achievement semantics → no signature moment.**
Crop + reposition on a cover is 2012 table stakes. Nowhere in the cover or grid does a PR, streak, or milestone read differently from an arbitrary phone video. The brand already owns the perfect language for this — the Crystallize — and it appears nowhere on the one surface where achievements live. The cover is set-once furniture; the grid is a camera roll with a filter rail. A member who hits a milestone and a member who dumps vacation footage get identical treatment. That's the missing signature moment, and it's structural, not a paint job.

**3. The upload path fails the gym-floor reality — the loop's money step is broken.**
Evidence: 100MB ceiling, dual client writes (`useSocialFeed.createPost` + `useProfile`), and feedback via "an upload-status line." On gym Wi-Fi or LTE, a 90MB video with a *line of text* for feedback = abandoned shares, and abandoned shares kill the loop at exactly the step the product monetizes (log → proof → **shareable milestone**). The dual-write is also a desync race: feed succeeds, profile invalidation fails, member's proof exists in one place and not the other. One mutation, server-side fan-out, chunked/resumable upload, optimistic in-grid tile with real progress.

**4. Lightbox + crop interaction integrity.**
A 95-line `CreativeGalleryModal` cannot contain a focus trap, focus return, Esc, arrow-key nav, scroll-lock, swipe gestures, video handling, and reduced-motion branching. That's arithmetic, not speculation. Crop/reposition controls have no described keyboard story. And the classic live bug to hunt: if the modal renders inside any ancestor that framer-motion transforms (page transitions do this), `position: fixed` resolves against that ancestor instead of the viewport — the lightbox drifts or clips. Portal to `body` or it isn't a modal.

**5. Flat, ragged visual system; no motion budget.**
No aspect-ratio policy is stated anywhere. Arbitrary-aspect media in a grid without `aspect-ratio` + `object-fit: cover` = ragged density and CLS as media streams in. Fitness media is inherently mixed (9:16 vertical video, 16:10 landscape) — without a uniform tile policy (4:5, cover-cropped) this reads as a dump. Depth: dark-first surfaces on obsidian die under black drop shadows (`0 8px 24px rgba(0,0,0,.5)` is invisible-to-muddy on near-black — the cheapest look in dark UI). Elevation must be luminance: hairline inner rim-light at `--elevation-1`, tokenized glow-lift (translateY −2px + glow) on hover. Motion: framer-motion is present with no stated budget — the two-speed law means transform/opacity only, no layout springs, no backdrop-blur over video on a gym phone.

**6. Theme/world fragility with retired-Galaxy adjacency.**
"Observatory" is a *sky metaphor*. A starfield banner is the single highest-risk carrier of retired **Galaxy-Swan (#0a0a1a / #00FFFF / #7851A9)** DNA in the codebase — and baked bitmaps cannot re-skin under the Appearance Studio world-swap. Any hardcoded hex or `rgba()` glow in `ObservatoryCoverHero.styles` or the gallery `.styles` breaks every non-default world. This fails the house's most important forward constraint.

**Weak CTA hierarchy:** the primary action is labeled "Upload" — it tells the member to *operate the component*, not to *prove a milestone*. The desired behavior and the button copy belong to two different products.

**Single weakest moment:** `CreativeGalleryEmptyState`, 27 lines. Every new member's first encounter with the proof layer of the product is a 27-line shrug. Highest-leverage lines in the entire surface, currently wasted. It should be a two-tap capture: "Crystallize your first PR," deep-linked from the progress log, with a ghosted record-shelf silhouette showing what this space becomes.

---

## (c) Implementation-fidelity attacks

**Styled-components / tokens:**
- CI grep gate: no raw `#`, no `rgba(` outside token files; `#0a0a1a|#00FFFF|#7851A9` rejected on sight — **including as `var()` fallbacks**. Fallbacks must be Crystalline ice-cyan/wing-purple values; literal `#00FFFF` as an "ice-cyan" fallback is the adjacency trap.
- Transient props (`$`-prefixed) everywhere; no styled-components created inside render; no per-component `localStorage` theme reads — one ThemeProvider source or the world-swap tears.
- Dual-Button Glow encoded as token-driven variants: primary (Share Milestone / Upload) = blue bg → purple glow; secondary = purple bg → cyan glow; the inversion must survive every world.

**Responsive (320 / 375 / 414 / 768 / 1024 / 1440 / 2560 / 3840):**
- 320–414: filter rail = horizontal snap-scroll, never wraps; grid 2-up 4:5; upload as full-width card above grid — **no FAB over the `UserDashboardTabsV3` tab bar** (elevation collision + thumb conflict); cover `clamp(160px, 30vw, 240px)`.
- 768: 3-up. 1024: 3-up + horizontal record shelf. 1440: 4-up. ≥2560: container capped ~1500px, tile size steps up, columns never exceed 5 — fluid-stretch at 3840 is how grids become parody.
- Crop persistence: store focal point + safe-crop region, re-derive per breakpoint aspect. Acceptance: same cover, all 8 widths, focal subject in frame at every one. A crop authored at 1440 that decapitates at 375 is a fail.
- Grid never mounts live `<video>`: poster frames, `preload="none"`, tap-to-load, `playsInline`. Ten decoding video elements on a gym phone is a battery crime. Reserve `aspect-ratio`, `content-visibility: auto` → CLS 0, filter-tap INP <200ms.

**44px:** chips, lightbox close/prev/next, crop drag handles (pseudo-element hit-expansion if the visual handle is smaller), card actions, upload CTA. No "dense desktop" exceptions.

**Keyboard / focus / reduced-motion:**
- Lightbox: portaled, `role="dialog" aria-modal`, inert background, focus trap, Esc, ←/→, focus returns to the triggering card; swipe is a transform-only spring; no audio autoplay.
- Crop: arrow-key nudge (Shift = coarse), announced values, focus ring that beats the glow noise — 2px offset outline in a contrast token, never another glow.
- Filters: radiogroup semantics or `aria-pressed`, roving tabindex.
- `useReducedMotion()` gates every animation; the crystallize glint collapses to an instant facet + 200ms opacity pulse; cover changes are opacity crossfades only; zero parallax.

**DOM validity:** no button-inside-button cards — overlay-link pattern; no interactive children inside the card's primary hit area; modal never nested under a transformed motion ancestor.

**File cap:** current split passes. The refactor's features must not push `CreativeGallery` past 300 — target decomposition proves it fits: `MilestoneGallery.container` / `RecordShelf` / `GalleryFilterRail` / `GalleryGrid` / `GalleryCard` / `CrystallizeOverlay` / `GalleryLightbox` / `UploadComposer` / `BeforeAfterCard` / `ShareCardExport` + `.styles/.types/.data`. Any data-viz on milestone cards (progress sparklines) is Victory-only.

---

## (d) The ONE highest-impact change

**Make the gallery milestone-native: every upload can bind to a loop event (logged workout, PR, streak, measurement — IDs only, zero PII), and executed milestones Crystallize into faceted record artifacts pinned to a Record Shelf above the grid and echoed in the cover.**

Why this is the one: it is simultaneously the premium fix and the brand fix — a Crystallize artifact cannot be mistaken for a template — and it subsumes half the weakness list by itself. Taxonomy becomes loop events (PRs · Form Checks · Before/After · Coached Moments · Milestones · Flexibility · General). The empty state becomes "crystallize your first PR." The cover becomes the latest artifact + streak stat. Share-out exports the artifact.

How, concretely: `media.milestoneRef?` on the model; Record Shelf = pinned artifact rail between header and filters; `CrystallizeOverlay` = pre-tessellated SVG facets with token-driven ice→wing-purple refraction gradients (gold reserved for the rare tier — gold stays rare), one 600ms transform-masked glint sweep on execution, reduced-motion instant; optics-not-creatures — facets and refraction only, any literal swan or creature asset dies in review. Everything else — reactions, compare slider — is subordinate and sequenced below.

---

## (e) What a design-savvy competitor out-builds here

1. **Before/after compare card** (drag + keyboard-operable slider). The most fitness-native media pattern that exists; it *is* progress proof. Ships first among all competitor features — if they ship it before us, our grid looks like a camera roll.
2. **Video-first fluency:** muted inline preview on scroll-into-view (data-saver and reduced-motion aware), scrub-on-hover ≥1024, 9:16-native tiles. Our static tap-to-lightbox grid reads 2016 next to it.
3. **Coached-moment layer:** coach tags/pins ("form check approved") — trust and belonging no generic gallery can copy, and exactly what a trainer-led competitor builds.
4. **One-tap branded share-out:** 9:16 story card, token frame, Crystallize facet watermark, Dual-Button Glow CTA, credentials rendered only as "26+ years / NASM-protocol." Without it, the Instagram surface area goes to whoever exports prettier.
5. **Living cover:** rotating user-curated artifacts with calm crossfade vs. our crop-once furniture.

Tie-break rule: anything touching loop steps 1–3 (log → proof → milestone) ships before anything touching step 4 (community) when values tie.

---

## 3-slice build order (per the brief)

- **Slice 1 — Loop wiring + pipeline.** `milestoneRef`, new taxonomy, single-mutation chunked upload with optimistic in-grid tile, aspect discipline + CLS fix, empty-state → first-proof capture. *Acceptance:* 90MB video on throttled 4G / 375px survives app backgrounding, shows in-grid progress, lands tagged to a PR, CLS 0, visible ≤1s after completion.
- **Slice 2 — Crystallize + a11y rebuild.** Facet spec implemented, Record Shelf, living cover, portaled lightbox (trap/gestures/focus-return), keyboard crop, 44px audit, reduced-motion pass. *Acceptance:* axe-core 0 violations; full keyboard path upload→tag→view→close; reduced-motion emulation shows opacity-only; contrast ≥4.5:1 including inactive chips; retired-trio grep gate green.
- **Slice 3 — Community + share-out + world gate.** Reactions, `BeforeAfterCard`, `ShareCardExport`, Appearance Studio world-swap snapshot suite. *Acceptance:* world toggle at 375 + 1440 re-skins cover/gallery with zero snapshot diffs outside token files; CI hex-grep rejects anything outside tokens, retired trio on sight. (Before/after ships first inside this slice — it's proof, not community.)

## On the brief itself

Four gaps will burn the builder: (1) "more and better features, be bold" with no effort budget collides with the 300-line cap and the calm law — add explicit non-goals per slice. (2) No performance budget — set cover LCP <2.5s on 4G, ≤1 decoded video in viewport, filter INP <200ms. (3) "Observatory" vs. the world system is unresolved — decide whether the sky is one swappable lens among N, built token-first, or it's a hardcoded starfield waiting to happen. (4) "Crystallize" has no visual spec — block Slice 2 on a facet-language spec or the builder invents literal crystals. And note: zero-PII governs the doc, not the feature — media of bodies needs visibility/report semantics specced, plus an event taxonomy (`upload_complete`, `milestone_share`, `crystallize_view`, `reaction`) or "addictive" is unfalsifiable.
