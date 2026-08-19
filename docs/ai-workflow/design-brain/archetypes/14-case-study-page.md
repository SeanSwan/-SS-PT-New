<!-- GENERATED from website-archetypes.md @ cd50724f40cf — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

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
