# Cinematic Site Generator — The Factory Adapter

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL for full cinematic page/site production (Fable concept → Codex/Claude build)
- **Registry:** `docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` §6 — "Cinematic site generator: T1 spec → T2 build."
- **Canon:** `../design.md` + `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md` (§B2 arc, §C patterns) + `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md`. This adapter sequences them into a factory line; it adds no visual rules.
- **Numeric-cap precedence:** any duration/parallax/LCP/loop/travel number echoed in this adapter is NON-NORMATIVE — `../cinematic-pages.md` §15.1 is the single canonical cap table; on any discrepancy, §15.1 wins and this file gets corrected.

---

## 1. Inspiration intake

- References (Awwwards pages, competitor sites, motion reels) are **inspiration only** — extract the *principle* (pacing, depth trick, arc shape), never the surface. **Never instruct any agent to clone another designer's work**, layout, or asset style; "make it like <site>" prompts are rewritten into principle language before entering the pipeline.
- Each intake reference gets one line in the concept doc: source, the single principle taken, and what was deliberately NOT taken.
- Anything that would import a banned pattern (design system §B bans, `../anti-patterns.md`) dies at intake.

## 2. Brand / story premise

- One paragraph before any section exists: who the page is for, the transformation it promises, why SwanStudios (trainer-led, first-party progress record, 26+ years experience — never "NASM-certified"; "NASM workshop-trained"/"NASM-protocol" only), and the single action the page exists to cause.
- If the premise is fuzzy or lives in Sean's head → `grill-me` (rule 64) first; unproven bet → `chromie` (rule 65). The factory does not run on guessed intent.

## 3. Visual worldbuilding

- Name the page's world in Crystalline Swan terms (frozen enchanted forest, deep-ocean vault, crystalline geode, aurora dark) — a coherent *place*, not a moodboard. All assets, dividers, and section atmospheres derive from this one world.
- Tokens only; no new colors without proposal. Typography roles per `../design.md` (Plus Jakarta Sans / Cormorant Garamond Italic / Fira Code / Sora).

## 4. Section sequencing — the B2 4-act arc (mandatory)

- Write the arc per design system §B2.3 before any section: Act 1 hook/awe → Act 2 capability/trust → Act 3 transformation/momentum → Act 4 conversion/belonging, each with its emotional target and its C1–C12 patterns.
- One signature moment, placed in Act 1. C10 narrative dividers between acts, not within. Acts progress in order; the Act 4 CTA is visible without hunting.

## 5. Scroll choreography

- IntersectionObserver for reveals; `requestAnimationFrame` for scroll-tied motion; no raw undebounced scroll listeners. Parallax multipliers 0.2–0.4, never above 0.6 (C2).
- GSAP only where scroll choreography genuinely benefits (pinned multi-step timelines) — never for a fade-in. Sticky sections release at their boundaries (C3).
- Scroll-scrubbed video uses the extracted-frames + `<canvas>` + rAF technique; frames are an asset-plan line item (§6), not an afterthought.

## 6. Video / image asset plan

- Every section's asset answers the four storyboarding questions (design system §D): emotional job → archetype → fallback chain (poster → gradient → removed) → motion-with-a-job.
- Produce Seedance briefs per `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md` templates, via the split skills: `seedance-swan-cinematic-video` (hero/card/icon loops, b-roll, brand film) and `seedance-swan-workout-video` (exercise demos). Briefs name Crystalline tokens in the palette field; loops 4–8s for headers, 10–20s scroll-scrubbed.
- No full-bleed stock photography (ban §B.8). Every asset is Swan-story-specific.

## 7. 3D / GSAP / Three.js usage

- **Progressive enhancement only.** Three.js/R3F for small surgical moments (hero accent, geode, orbit hub C8), always behind `<Suspense>` with a 2D fallback — never page scaffolding.
- **Perf budget per page:** one R3F scene max; lazy-load it; total JS for cinematic extras (GSAP + R3F + scene assets) stays a lazy chunk, out of the critical path.
- **Mobile fallbacks to static frames:** the tier ladder is mandatory in the same file — Full cinema / Lean cinema (still hero, CSS parallax only, no Three.js) / Reduced motion (static composition, tokens preserved), per design system §A.

## 8. Generated-video frames & stills

- **Generated-video frame usage:** best single frame of each Seedance loop is extracted as the tier-2 poster and the scroll-scrub source; posters ship as optimized stills (not video first-frames decoded at runtime).
- **Static image usage:** stills follow the same worldbuilding + token palette; letterform-embedded media (C4) prefers stills on tier 2.

## 9. Motion restraint & performance

- Every motion beat has a job — reveal, hierarchy cue, state transition, interaction reward (ban §B.9). Decorative motion is cut in the hostile pass, not defended.
- **LCP budget:** hero paints ≤2.5s on mid-tier mobile — poster image is the LCP element, video swaps in after; hero media preloaded, everything below Act 1 lazy.
- **Lazy chunks:** per-act code-splitting where sections are heavy; charts via `React.lazy()` + SafeChart; fonts subsetted + `font-display: swap`.

## 10. Accessibility on cinematic pages

- Full reduced-motion tier (CSS media query **and** framer `useReducedMotion`) that keeps the page complete, not gutted. Autoplay video: muted, `playsinline`, pausable; audio opt-in only.
- 4.5:1 text contrast over media (vignette/scrim guarantees it at every frame, not just the pretty one); 44px targets; keyboard path through every act; letterform/media moments carry text alternatives; no content conveyed by motion alone.

## 11. Copywriting

- Conversion copy (hero, pricing, CTA, ascension) routes through `copy-tournament`; the factory consumes the tournament winner, never first-draft hero copy on a conversion surface.
- Credentials rule (26+ years / NASM-protocol) and rule 9 language apply to every line. Copy length is designed with the composition — headlines sized for 64–120px display, not paragraphs squeezed into hero type.

## 12. First-frame / social-preview rule

- **The page's first painted frame must stand alone:** before any motion, video, or JS, the visible composition (poster + typography + CTA) is a complete, premium, on-brand image. If JS never runs, the page still sells.
- **og-image is designed, not screenshotted by accident:** a deliberate 1200×630 composition from the page's world — wordmark, signature visual, one line of copy — checked at social-card size for legibility.

## 13. QA hook

- Before ship: Browser Harness visual QA per `reviewers.md` §B — full viewport matrix, reduced-motion pass, console/network capture, QA receipt. Cinematic pages additionally verify: LCP on throttled mobile profile, tier-2/tier-3 rendering with JS or `save-data` constraints, and loop seams on all video assets.

## 14. Handoff prompt templates

**TO Fable (concept):**
```
FABLE CONCEPT REQUEST — <page/site>
Premise: <§2 paragraph> (brainstorm doc: <path, if grilled>)
Inspiration principles: <§1 lines — principles only, no clone instructions>
World candidates: <1–2 from §3>
Deliver: 2–3 directions per adapters/fable.md §2 (name, emotional job, B2 arc,
C-patterns, signature moment, responsive risks) + Seedance brief stubs per §6.
Constraints: design.md tokens only; bans in anti-patterns.md apply; T1 spec only — no code.
```

**TO Codex/Claude (build):**
```
BUILD ORDER — <page/site> — direction "<name>" (Sean-approved <date>)
Load: adapters/builders.md §1 order + this adapter + the direction doc <path>.
Arc: <act → sections → C-patterns → assets (Seedance brief/asset paths)>.
Perf: LCP ≤2.5s mobile; R3F ≤1 lazy scene; tier 1/2/3 in-file; per-act lazy chunks.
Copy: <copy-tournament winner path>; og-image + first-frame per §12.
Done means: builder receipt (builders.md §4) + Harness QA receipt (reviewers.md §B3)
+ closeout-evidence-lock. Deviations from the direction are PROPOSED, not shipped.
```

## 15. Deployment checklist (placeholder — gated on Sean, no auto-deploy)

Deploy is T4-adjacent (registry §12: push-to-main outside standing authorizations is manual-only). The factory ends at "build verified + receipts posted." Placeholder gates to be finalized with Sean: rule 42 backend audit if any backend touched · Tier-A green disclosed per rule 56 · QA receipts attached · Sean's explicit ship approval · post-deploy health check + cache-drift note (Render 2–5 min). **No agent auto-deploys a cinematic page.**

## Verification before done

- [ ] Premise + world + written B2 arc existed before any section was designed (§2–§4)
- [ ] No clone instructions anywhere in the pipeline; intake logged as principles (§1)
- [ ] Every asset has archetype + fallback chain + Seedance brief; no stock imagery (§6/§8)
- [ ] Tier 1/2/3 in-file; R3F budget respected; LCP + lazy-chunk budgets checked (§7/§9)
- [ ] Reduced-motion page is complete; contrast-over-media guaranteed per frame (§10)
- [ ] Conversion copy came from copy-tournament; credentials + rule 9 clean (§11)
- [ ] First frame and og-image stand alone (§12); Harness QA receipt posted (§13)
- [ ] Handoffs used §14 templates; deploy left gated on Sean (§15)
