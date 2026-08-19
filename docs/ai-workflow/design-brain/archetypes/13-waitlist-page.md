<!-- GENERATED from website-archetypes.md @ 4fb0805d87dd — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

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
