# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** .ai-workflow/fusion/kimi-video.md
**Seed:** (none)
**Tokens:** 1405 in / 9498 out · **Cost:** ~$0.1467 · **Wall:** 302.5s

---

# K3 — HOSTILE DESIGN + FRONT-END REVIEW: Video Library Refactor Brief

## (a) VERDICT

**SEND-BACK.** Engineering governance is elite (real-data law, additive-only, flag reversibility, de-Galaxy ban extended into fallbacks — all correct), but the design core is empty: this brief mandates a cinematic brand surface while making **zero cinematic decisions** — no signature moment, no CTA hierarchy, no performance budget, and the revenue surface (the gate) gets one clause. "Premium, alive" is a vibe, not a spec. Fix the five items in (b) and resubmit.

---

## (b) DESIGN WEAKNESSES — most severe first

**1. Missing signature moment — the fatal one.**
The brief names the brand ("Enchanted Apex: Crystalline Swan") but never *designs* it. The confirmed stack is stock ui-kit primitives — `ParallaxHero` + `ScrollReveal` — which every other marketing page already uses. Result: SwanStudios template page #7, now with thumbnails. Worse, the brief bans the failure mode ("optics-not-creatures") without prescribing the success mode — and then leaves the single most on-brand metaphor in the entire product untouched: **video is literally light passing through glass.** Refraction IS the video library's native signature, and it's sitting on the table. "The Crystallize" is invoked but never mapped to a video behavior. A brief whose entire value is visual cannot outsource the visual idea.

**2. Weak hierarchy / unresolved CTA — the funnel has no spine.**
This page has two jobs (browse free value → convert to member) and the brief never names the primary CTA. The Dual-Button Glow rule defines *styling* but nothing assigns *which action* gets blue-bg→purple-glow (primary) vs purple-bg→cyan-glow (secondary). On a funnel page, that's existential. Every card, the hero, and the gate will each invent their own hierarchy — which violates the brief's own "zero decisions left to the builder" law.

**3. Template-feel compounding: stock icons + probable YouTube thumbnail leak.**
`FolderOpen, Search, Video` are stock lucide glyphs; play affordances are unspecified (so: default triangles). And nothing mandates a poster art pipeline — if posters are YouTube-sourced thumbnails, you're injecting red/white YouTube chrome and random saturation into a midnight-sapphire/ice-cyan/wing-purple system. That's where "luxury" dies first, and the brief is silent.

**4. No performance budget — "cinematic" becomes jank, and jank is the opposite of premium.**
"Full cinematic alive/scroll-story/parallax" + "poster-first (battery)" are both stated and never reconciled. Missing: LCP target (≤2.5s on 375/4G), INP target (≤200ms), poster weight cap (≤120KB grid / ≤300KB hero), max concurrent parallax layers (≤3), `will-change` discipline, 4K fill-rate plan (uncapped blur radii at 3840 = GPU death), and the iOS `background-attachment: fixed` parallax trap is not forbidden. Without numbers, "alive" on a 320px device = dropped frames = cheap.

**5. Flat, depthless surfaces risk + no spacing rhythm.**
"Obsidian surfaces + glow" without an elevation spec = dark rectangles with 1px borders and muddy blur shadows — the dark-SaaS-template look. The brief never defines the surface ladder (obsidian base → sapphire raised → glass overlay), facet-edge treatment, or a spacing scale. Dark luxury lives on rhythm: no 8px scale, no section cadence (96/128px desktop, 64/80px mobile) means the builder ships cramped template spacing.

**6. Dead/noisy motion.**
`ScrollReveal` on every card in a 24-item grid = reveal fatigue — noise, not cinema. The brief says reduced-motion is "honored" but never *designs* the reduced experience; amputation is not honoring.

**7. Unreadable mobile density, unspecified.**
Folder chips + search + filters + cards at 320px under the 44px law, with no layout pattern named (snap chip rail with edge fade? bottom-sheet filters?). The gated VideoWatch on a phone — where the upsell panel lives, how controls clear iOS chrome — gets zero words.

**8. Dark-mode contrast vectors unassigned.**
Ice-cyan-on-sapphire small text and gold at body sizes are both likely 4.5:1 failures; a glow halo is not a focus ring (needs 2px solid, 3:1 against adjacent). The brief assigns no role-safe color pairings, so contrast becomes builder luck.

---

## (c) IMPLEMENTATION-FIDELITY ATTACKS

**styled-components correctness**
- The brief never ships the Crystalline fallback values — so every `var(--token, #???)` fallback becomes a builder decision. Violates its own zero-decisions law *and* risks Galaxy contamination by improvisation. Supply the full fallback table; CI-grep for `#0a0a1a` / `#00FFFF` / `#7851A9` (fail-closed).
- Mandate transient props (`$active`, `$locked`) — otherwise DOM attribute-leak warnings; keyframes at module scope, never per-render; shared glow/facet mixins via `css` helper; no parallel theme-object source of truth.
- Posters must be `<img alt>` with `srcset`/`sizes` and `aspect-ratio: 16/9` — **not** CSS `background-image` (loses alt text, loses responsive loading, invites CLS).

**Responsive (320/375/414/768/1024/1440/2560/3840)**
- No container strategy: at 2560/3840 the grid must clamp (max ~1520px) or you get 8 columns of 200px cards; hero media needs 2x/3x srcsets; blur radii must be capped at 4K.
- `100vh` on iOS crops the hero — spec `100dvh`. Parallax wrapper needs `overflow-x: clip` (classic 100vw scrollbar bug). Watch-page controls must respect `env(safe-area-inset-*)`.
- Brief lists the breakpoints but assigns no per-breakpoint layout — that's the whole job.

**Touch / keyboard / motion a11y**
- Folder chips, search input, play affordances, card hit areas: ≥44×44px, with `::before` hit-expansion where visuals are smaller. Brief repeats "44px" but never applies it to the filter row — the exact place it will break.
- `:focus-visible` ring spec required (2px, role-safe color); folder rail needs roving-tabindex arrow-key nav; if the watch page ships custom controls, a keyboard map (space/k, arrows, f) is mandatory — currently unmentioned.
- Reduced-motion must kill: parallax, sweeps, hover-previews, all autoplay — replaced with a *designed* static state (facet edge + instant fade), not a stripped one. Also gate previews behind `Save-Data`/touch — brief is silent.

**Nested interactive / invalid DOM**
- The classic video-card bug is unaddressed: `<a>` wrapping `<button>` = invalid HTML + screen-reader hell. Spec: card = one link; play triangle is an `aria-hidden` decorative span; any secondary action (save/queue) is a *sibling*, never a child.
- Max live `<video>` elements: 1 (watch page) + optional 1 hover-preview via IntersectionObserver, `muted`, `playsInline`, `preload="none"`. The brief says "poster-first" — good — but never caps hover previews.

**File discipline**
- V3 is 279 lines *before* adding hero, gate, funnel, and motion. "Extract" with no extraction map = the builder draws boundaries. Demand the map: orchestrator ≤150 lines + `LibraryHero`, `VideoFacetCard`, `FolderRail`, `GatePanel`, `useVideoLibrary`, `usePlaybackProgress`, motion module — each ≤300.
- Three live versions (V2/V3/V4-flag) = decay. Require a V2 kill-date and telemetry gate. Flag must be stable per deploy (build-time env), not per-user — SEO churn on a public funnel page otherwise.
- Copy compliance: category/folder names and coach overlays must obey house language — "stretching/flexibility" (never yoga/meditation), "26+ years / NASM-protocol" (never NASM-certified). Nobody owns this in the brief.

---

## (d) THE ONE HIGHEST-IMPACT CHANGE

**Build the Refraction System — make "light through crystal" the library's signature, and wire The Crystallize to the funnel.**

One reusable primitive, four applications:

1. **`<RefractionSweep />`** — a styled-component: `::after` rotated linear-gradient (ice-cyan → transparent → wing-purple), animated with `transform: translateX(-120%)→120%) skewX(-18deg)` + opacity only. GPU-safe. Reduced-motion = static facet edge, no sweep.
2. **Hero "Screening Room":** the featured poster sits in a faceted crystal frame (1px facet border, inner cyan glow, not a drop shadow); one scroll-linked light sweep passes across it per session. That's the moment.
3. **Card hover:** 400ms sweep + `translateY(-8px)` + facet edge brightens. Restraint everywhere else — this is the *only* grid motion.
4. **Crystallize = completion + conversion:** finishing a free video crystallizes its card (faceted border + shard badge, real state from the watch-progress endpoint); when all free videos crystallize, the gate panel itself crystallizes open — frosted-facet locked cards, one shimmering unlock CTA (blue bg → purple glow, the page's single primary).

This kills template-feel at the root, creates instant hierarchy (featured vs grid vs locked), and turns the brand's achievement motif into the revenue mechanic. No competitor template ships this, because it's *yours*.

---

## (e) WHAT A DESIGN-SAVVY COMPETITOR OUT-BUILDS HERE

- **Hover scrub-previews** (muted 8s loops, poster crossfade, one-at-a-time, gated on hover-capable + no reduced-motion + no Save-Data). Their grid breathes; yours is a spreadsheet of rectangles.
- **Continue-Watching rail with progress rings** bound to the watch-progress endpoint — product, not blog. The brief flags the endpoint but never designs the surface.
- **The 90-second crystallizing preview:** free users watch 90s, then the picture frosted-freezes into the unlock panel. MasterClass-grade desire engineering vs your one-clause gate.
- **Re-graded poster pipeline on R2** — consistent 16:9, cyan/sapphire duotone grade. No YouTube red leaking into Crystalline Swan.
- **Perceived speed:** route-prefetch on card hover/focus, INP <200ms. Premium is 50% how it *responds*.
- **Editorial curation** — "Start here," "Coach's picks," duration filters with display-type section headers. Curation reads as luxury; a flat grid reads as CMS output.

**Bottom line:** the brief's scaffolding is the best I've reviewed from this pipeline — and it would still ship a generic dark template, because it governs everything except the design. Add the Refraction System, name the CTA spine, budget the motion, art-direct the posters, design the gate. Then build.
