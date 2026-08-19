<!-- GENERATED from website-archetypes.md @ cd50724f40cf — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

## 6. Agency website

- **Use when:** a team sells outcomes-as-a-service (SwanStudios-as-studio, Sentinel-style client work, any services shop).
- **Feel:** "we make things like THIS" — the site is exhibit A; polished, kinetic, but grown-up.
- **Arc:** Mkt 4-act. **Hero:** C3 sticky showcase (client work cross-fading behind a fixed claim) or C1. **Motion:** M2.
- **Sections in order:** hero claim + showcase → Act 2: case-study rail (C5 shelf of #14 covers) + capability walk (C3) + process in 3–4 honest steps → Act 3: results C9 (media-anchored: shipped product loops) + team/values beat → Act 4: qualification-friendly lead form (short) + call CTA.
- **Conversion goal:** qualified lead / discovery call. **Trust:** named case studies with metrics, process transparency, real team (no stock faces).
- **Mobile:** case rail swipes; form ≤5 fields; sticky showcase falls to stacked cards.
- **A11y:** cross-fading backgrounds must not strand text below 4.5:1 at any frame; form errors announced.
- **Components:** `SheenCard` for case covers, `GlassPanel`, `GlowButton`, `NarrativeDivider`; case pages themselves are archetype #14.
- **Anti-patterns:** logo-wall-as-Act-2 (logos without stories prove nothing); "we're passionate about innovation" copy; portfolio grid of identical rectangles; 12-field contact forms.
- **Fable brief:** "Agency site for [services, ICP]. Flagship proof: [best 2–3 cases]. Directions: hero claim + showcase mechanics, case-rail treatment, how Act 3 differentiates from every other agency."
- **Builder brief:** "Direction [n]. Case covers link to #14 pages; showcase C3 with stacked-panel tier-2; lead form validates inline and posts to a verified endpoint (rule 26)."
- **Harness QA:**
  - [ ] form submit round-trip verified
  - [ ] case rail keyboard-navigable
  - [ ] showcase text contrast at every background frame
  - [ ] mobile form completable in <60s
- **Village questions:**
  - Could a rival paste their cases in unchanged (too generic)?
  - Does Act 2 prove or just claim?
  - Is the lead form qualifying or repelling?
