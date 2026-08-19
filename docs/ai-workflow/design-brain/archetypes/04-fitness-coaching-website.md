<!-- GENERATED from website-archetypes.md @ cd50724f40cf — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

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
