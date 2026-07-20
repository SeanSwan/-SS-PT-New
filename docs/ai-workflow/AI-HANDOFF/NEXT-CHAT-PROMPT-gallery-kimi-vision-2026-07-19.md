# NEXT-CHAT PROMPT — GALLERY redesign in KIMI's vision (Gemini-analyzed) — 2026-07-19

> Paste this whole file to a fresh agent. It is the dedicated handoff for the ONE remaining design-overhaul
> surface: the billing-critical Gallery. **Build in KIMI's vision, not the builder's** — Kimi (the design
> architect) owns every design decision; you (the builder) make none. Use **Gemini** to analyze the code.

---

## 0. THE MANDATE (Sean, 2026-07-19)
Redesign `frontend/src/pages/GalleryPage.tsx` (2219 lines) — SwanStudios' photography gallery — and **make it
better, filling every missing gap**. Two hard rules from Sean:
1. **This is Kimi's vision, NOT Opus's.** Kimi authored the design blueprints; the builder implements them
   VERBATIM and makes zero design decisions. Where the blueprint is ambiguous → re-consult Kimi
   (`consult-kimi.mjs --effort medium`), never improvise. (Opus improvising taste is exactly what to avoid.)
2. **Use Gemini to analyze the gallery.** The 2219-line monolith must be mapped before it's touched — run
   Gemini code-analysis (`scripts/consult-gemini.mjs --review --file <packet>`, or the Gemini CLI) over
   GalleryPage.tsx + the `pages/gallery/*` modules to produce a structural map: every money/credit/VIP/
   referral/donation flow, the email gate, the justified-grid math, the lightbox, the watermark, the states.
   That map is the substrate the Kimi vision binds to.

## 1. READ FIRST (in order)
- **The design law + canon (adopted 2026-07-19, follow verbatim):** `.claude/skills/swan-design-router/SKILL.md`
  (11 LAWs + the proven gate/flag reversibility scaffold + the 6 refinements) and
  `docs/ai-workflow/design-brain/design.md` (Crystalline Canon).
- **The Gallery vision (Kimi):** `docs/ai-workflow/AI-HANDOFF/KIMI-PHOTOGRAPHY-BLUEPRINT-2026-07-17.md`
  (SHIP-WITH-CHANGES; THE change: make the **REVEAL** the hero, gate-as-setup, photos-first IA, rename off
  "Cosmic Gate"; a full ~19-file decomposition map) + `KIMI-COVER-GALLERY-BLUEPRINT-2026-07-17.md`.
- **The program state + recipe:** `docs/ai-workflow/AI-HANDOFF/SWAN-DESIGN-OVERHAUL-PROGRAM-TRACKER-2026-07-18.md`
  (7 surfaces shipped on this exact pattern; the CORRECTION note that #8 Cover + #9 Photography are THIS file)
  and `NEXT-CHAT-PROMPT-design-overhaul-2026-07-18.md` (the proven per-surface recipe + gotchas).
- Verify branch freshness FIRST: worktree `C:/tmp/ss-build-swan-lens`, branch `claude/build-swan-lens`,
  main at handoff; `git fetch origin main && git rev-list --left-right --count origin/main...HEAD`
  (merge origin/main --no-edit if behind — the Living Worlds + logger-handoff lanes push docs/backend).

## 2. WHY THIS SURFACE IS DIFFERENT — billing-critical + needs new backend
`GalleryPage.tsx` runs the enhancement-CREDIT PURCHASE system (`/api/gallery/credits`), VIP conversion modal
(`gallery/VIPConversionModal.tsx`), checkout-return feedback, referral modal, support actions, donations, and
downloads — all money/identity, all truth-tested (`pages/gallery/*.truth.test.ts`). **CLAUDE.md: billing gets
NO bypass.**
- **BIND-ONLY money path (like Store):** reuse the credit/VIP/referral/donation/checkout logic verbatim
  (reimplement fetch/state in the vNext from the existing pure helpers + the SAME API paths; never edit the
  shipped logic or its truth tests). The redesign is VISUAL + IA only.
- **NEW BACKEND (additive) — scope with Sean BEFORE building:** the Kimi blueprint flags the load-bearing
  technical catch — a justified grid needs intrinsic aspect ratios BEFORE load + renditions
  (thumb ~600w / preview ~1600w / full) with `srcset/sizes`, `loading="lazy"`, `decoding="async"`, LQIP
  placeholders, `fetchpriority="high"` on row one. If the photos model lacks width/height + rendition URLs,
  you must add them (nullable columns + a rendition step) or you violate Rule 1 (no mocked ratios). Same flag
  covers the baked-watermark variant + OG-image serving. **Present the backend slice to Sean, get his scope,
  then build additively (new nullable columns / new endpoint; no destructive migration).**

## 3. THE KIMI VISION — the gaps to fill (from KIMI-PHOTOGRAPHY, build verbatim)
- **Reveal, not gate.** The Crystallize REVEAL is the hero; the email gate is its *setup* (email = an unlock
  achievement, not a tax). Photos-first IA. Rename off "Cosmic Gate" (codenames leak into flags/classes/analytics).
- **Optics-not-creatures de-Galaxy** (not a palette swap): kill starfields/nebula/neon-glow/glassmorphism;
  Crystalline idiom = refraction, facets, caustics, frost, sapphire depth. Audit disguised channel forms.
- **One primary per surface** (Dual-Button Glow): Gate → "View the gallery" is the ONLY primary; Grid → photos
  are the CTA, download icon-only secondary; Lightbox → Download primary; Donate → TIMED post-download
  gratitude peak, never persistent chrome; Credits → post-gate only (resolve credits-identity ambiguity —
  credits only after an email-identified session, or move to the client portal).
- **Real form** (`<form onSubmit>`, `type=email`, `inputmode/autocomplete=email`, per-event
  `autocomplete=current-password`, `aria-invalid`+`aria-describedby` at AA) — never a `div onClick` fake form.
- **Justified grid extremes:** last row at target height, left-aligned, never stretched >1.3×; container cap;
  320px no sliver tiles; 2560/3840 no billboard rows. Extract `useJustifiedRows.ts` as pure, unit-testable math.
- **Lightbox:** portal to `document.body` (fixed-position inside transformed ancestors clips); focus trap +
  focus return to the originating tile; Esc cleanup (no stale closures); swipe via Pointer Events
  (`touch-action: pan-y`, 48px/0.25px-ms threshold); `100dvh`/`svh` not `100vh`.
- **Reduced-motion in JS** (SKILL LAW 5 refinement): disable framer entrances in JS, not just CSS. Transform/
  opacity only; ban animating box-shadow/filter/background-position/top-left-width-height.
- **The ~19-file decomposition (Kimi's split, all <300 lines):** `GalleryPage.tsx` shell+flag · `gallery.api.ts`
  · `gallery.types.ts` · `useGalleryEvents/useEventPhotos/useEventAccess.ts` · `EventCard` · `AccessGate` ·
  `CrystallizeReveal` · `JustifiedGrid`+`useJustifiedRows` · `GridTile` · `Lightbox`+`LightboxToolbar`+
  `useLightboxNav`+`useFocusTrap`+`useSwipe` · `WatermarkSigil` · `DonatePanel`.

## 4. THE PROVEN SCAFFOLD (reuse from the 7 shipped surfaces — SKILL LAW 9)
`GalleryGate.tsx` = `React.lazy(GalleryVNext)` + ErrorBoundary + rAF-retry world-contract probe (poll for
`.gallery-vnext-shell`, require `--world-accent` + `[data-style-lens-shell]`; exhaustion → fail closed to the
current GalleryPage) → children (the untouched current GalleryPage). Flag hook `useGalleryVNextFlag`: runtime
`/api/config/public-flags.galleryVNext` WINS (absolute kill), override/env only when runtime absent, non-200/
failed fetch → env. Add `galleryVNext` to `publicConfigRoutes.mjs`. `gallery-vnext/gallery.tokens.ts` = the ONLY
`--world-*`/`--lens-*` + hex site (ZERO hex ideal; gold only per allowlist). Seam = ONE `GatedGalleryPage`
wrapper at the `GalleryPage` binding in `main-routes.tsx` (gates both `/gallery` routes). Flag OFF → current
GalleryPage live.

## 5. THE FLOW (per the recipe)
Gemini-analyze the monolith → Kimi direction (reveal-not-gate, verbatim; re-consult on any ambiguity) →
present the NEW-BACKEND rendition slice to Sean + get scope → build the ~19-file decomposition VERBATIM
(money-path bind-only, flag-gated, reversible) → hostile-review to dry → triangle (Codex + Gemini; Gemini is a
design AUTHOR not the gate, Rule 46) → Rule 42 backend audit → **gate the production push with Sean**. Record:
tracker → SHIPPED, Hermes memo, run the money/credit/VIP/referral/donation truth tests (they must stay green).

**Do NOT auto-start the build** — Gemini-analyze + get Sean's scope on the new backend rendition slice first.

---

## 6. WHAT'S AFTER THE GALLERY (so nothing gets dropped)
The Gallery is the LAST surface of the design-overhaul program — but it is NOT the end of the queue. The full
downstream roadmap (Kimi-overhauled, in Kimi's vision) lives at
**`SWAN-WHATS-NEXT-MASTER-ROADMAP-2026-07-19.md`**. Headline order after the Gallery:
1. **FIRST LIGHT (Activation)** — Lane-A lens wiring → activation gate → staged flag-on. *The one next build*:
   it turns on the 8 shipped-but-dark surfaces. (Kimi dissolved the "Unified World" program into this + a
   World-Pack content track.)
2. **PRISM CAPTURE** — email-only speed-to-lead epic (Sean's #1 money focus); zero Lane-A dependency, may run
   parallel to activation.
3. **Swan Guide build** → **Cortex Phase 1 "The Rulebook" (Progression Engine v0)** → **World-Pack v1.5**.
Read the master roadmap for the full 3-wave plan, the batched Sean Decision Pack, and the marketing + Cortex
build specs.
