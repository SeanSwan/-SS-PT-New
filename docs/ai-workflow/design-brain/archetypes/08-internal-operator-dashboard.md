<!-- GENERATED from website-archetypes.md @ cd50724f40cf — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

## 8. Internal operator dashboard

- **Use when:** staff/admin working surfaces — SwanStudios admin dashboard family. Users arrive with a goal; the page's job is speed and truth.
- **Feel:** mission console, dense but premium; C11 discipline everywhere; zero landing-page decoration.
- **Arc:** Dash 4-phase. **Hero:** none — Phase-1 orientation band (who am I, business health, what changed since last visit). **Motion:** M1.
- **Sections in order:** Phase 1 orientation band (identity + health indicators + alerts count) → Phase 2 current state (the real numbers/tables/sessions — largest surface area) → Phase 3 progress/insight (`ChartEnvironment` with narrative columns, deltas, annotations) → Phase 4 next best action (intervention queue: who's stale, what needs approval, one primary CTA).
- **Conversion goal:** operator completes the day's decisions without hunting; stale-client/exception visibility (admin priority per Product Core Loop).
- **Trust:** data truth — real logs only; empty states explain WHY (Cormorant italic line), never bare "no data"; timestamps on freshness-sensitive data.
- **Mobile:** tables → stacked fact cards; no hover-only actions; 44px icon buttons; phone-width check mandatory before completion.
- **A11y:** keyboard-first table nav; charts carry text deltas; alert colors paired with icons/labels (not color-only).
- **Components:** `ChartEnvironment` + `SafeChart` + `chartTheme` (Victory, lazy via `React.lazy`), `GlassPanel` obsidian variant, client/data-card low-motion `SheenCard` geometry, `GlowButton` for the Phase-4 CTA.
- **Anti-patterns:** SaaS-hero styling on a working surface; naked KPI rows (§B ban 3); cards-inside-cards; duplicated facts across cards; decorative metrics; Phase 4 missing (a dashboard that never answers "what now?").
- **Fable brief:** "Operator dashboard for [role]. Phase-1 question: [what health signal matters most]. Directions: orientation-band composition, Phase-2 density strategy, the Phase-4 intervention queue design."
- **Builder brief:** "Direction [n]. B2.2 phases written in-thread; real endpoints only (rule 26 receipt + rule 58 schema-drift check on every model touched); loading/empty/error states for every data region."
- **Harness QA:**
  - [ ] phone-width no-overlap sweep
  - [ ] loading/empty/error visible per region
  - [ ] chart lazy-boundaries hold (no eager gallery)
  - [ ] Phase-4 action executes round-trip
  - [ ] no hover-only controls
- **Village questions:**
  - Can the operator find the one client needing intervention in <10s?
  - Is anything decorative wearing a data costume?
  - Does every number trace to a real table?
