<!-- GENERATED from website-archetypes.md @ cd50724f40cf — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

## 17. Mobile app marketing site

- **Use when:** driving App Store / Google Play installs (the Victory-native roadmap surface). The product screen is the protagonist.
- **Feel:** the app in your hand — device-framed truth, thumb-scale reality.
- **Arc:** Mkt 4-act. **Hero:** device-frame C3 — phone frame sticky while app screens cross-fade through the core loop (log → chart → share). **Motion:** M2.
- **Sections in order:** hero device + store badges above fold → Act 2: core-loop walk (each C3 panel = one loop step with REAL app screens) → Act 3: outcomes C9 + ratings/reviews (real) → Act 4: store badges reprise + QR at desktop widths + SMS-link option.
- **Conversion goal:** store install. **Trust:** real screenshots (current build, not concept art), real ratings, platform availability honesty.
- **Mobile (the irony rule):** most visitors are ON the target device — the store badge is the hero CTA, one tap, instantly visible; don't make a phone user watch a desktop-oriented device-frame ballet.
- **A11y:** app screens are images — pair every panel with real text describing the step; badges have accessible names.
- **Components:** device-frame pattern from `components.md`, `GlowButton`, `GlassPanel`, C9 counters.
- **Anti-patterns:** concept-art screens that oversell; auto-playing app video with sound; desktop-first composition for a mobile-intent audience; fake review counts.
- **Fable brief:** "App marketing site for [app]. Core-loop moment that sells: [X]. Directions: device-frame choreography, which 3–4 screens make the walk, desktop-vs-mobile CTA strategy."
- **Builder brief:** "Direction [n]. Screens exported from the real app at correct DPR; C3 with stacked tier-2; store links/QR verified; on-device visitors get badge-first layout."
- **Harness QA:**
  - [ ] store badges resolve
  - [ ] mobile visitor sees CTA in first viewport
  - [ ] device-frame degrades to stacked screens
  - [ ] screen images sharp at 2x/3x DPR
  - [ ] QR scannable from a 1440p screenshot
- **Village questions:**
  - Do the screens shown match the shipped app?
  - Is the mobile-visitor path one tap?
  - What convinces at the decisive moment — screens or numbers?
