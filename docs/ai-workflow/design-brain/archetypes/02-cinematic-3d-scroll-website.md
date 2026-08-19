<!-- GENERATED from website-archetypes.md @ cd50724f40cf — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

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
