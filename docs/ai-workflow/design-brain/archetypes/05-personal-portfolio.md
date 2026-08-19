<!-- GENERATED from website-archetypes.md @ cd50724f40cf — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

## 5. Personal portfolio

- **Use when:** one human's work must sell them — Sean's dev/trainer identity, a trainer's public profile, a builder's showcase.
- **Feel:** editorial monograph; the person as protagonist; restrained, confident.
- **Arc:** Mkt 4-act. **Hero:** C4 letterform (the NAME with embedded work/footage) — the signature moment lives here. **Motion:** M2.
- **Sections in order:** C4 name hero → Act 2: selected work as C5 poster wall or C7 tilt gallery (3–6 pieces max, each with one-line role + outcome) → Act 3: story/approach beat (Cormorant italic editorial moment, C2 optional) → Act 4: contact panel + one CTA + links.
- **Conversion goal:** contact/hire. **Trust:** shipped-work specifics with outcomes; real credentials framed accurately (dev: Redwood Code Academy 2017 + MIT CS online — not "self-taught"); no logo-soup of tools.
- **Mobile:** letterform scales via `clamp()`; must stay legible at 320px or fall to solid letterform tier-3; gallery becomes vertical stack.
- **A11y:** embedded-media letterform needs an accessible name; gallery tilt has no informational job — safe to drop at M0.
- **Components:** `GlassPanel`, `GlowButton`, C4 letterform scaffold, `SheenCard` low-motion variant for work cards.
- **Anti-patterns:** skill-percentage bars; wall-of-everything galleries; third-person bio voice; template "Hi, I'm X 👋" hero.
- **Fable brief:** "Portfolio for [person, positioning]. The one thing a visitor must remember: [X]. Directions: letterform media concept, which 3–6 works make the cut and why, editorial voice sample."
- **Builder brief:** "Direction [n]. C4 with clip-path/mask + tier fallbacks in-file; work cards from a data array (no copy-paste sections); contact CTA is a real verified path."
- **Harness QA:**
  - [ ] letterform legible at 320/375/768
  - [ ] media-in-letterform lazy-loads
  - [ ] contact CTA works
  - [ ] reduced-motion shows solid letterform gracefully
- **Village questions:**
  - Does the page read in 15 seconds?
  - Is the curation ruthless enough?
  - Does the letterform serve the name or eat it?
