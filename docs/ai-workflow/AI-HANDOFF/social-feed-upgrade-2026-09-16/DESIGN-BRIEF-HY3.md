# Design Brief — HY3 seat (design inspiration + overall judgment)

You are the design seat on the SwanStudios panel. Three other seats (GLM 5.3, Fable 5, GPT-5.1)
plus Kimi K3 covered product strategy; the full packet is CONSULT-PACKET.md in this folder — read
it for product context. Your job is narrower: **design the three new visual components and judge
the blueprint's design decisions.** Be concrete at the token/pixel level. SwanStudios is a
production personal-training SaaS; the dashboard is the product's front door.

## House design language (non-negotiable context)

- Theme "Enchanted Apex: Crystalline Swan": dark-first. Base `var(--bg-base, #030712)`; surfaces
  `var(--bg-surface, #0A0A0F)` / cards `#141419` / modals `#1A1A24`; sapphire `#002060` buttons,
  deep-sapphire gradient section backdrops; Ice Wing cyan `#60C0F0` accents/XP; Wing Purple
  `#8B5CF6` glow accent (reserved: AI-coach surfaces); Gilded Fern gold `#C6A84B` (reserved: earned
  luxury/rarity); Frost White `#E0ECF4` text; Arctic Cyan `#50A0F0` data-only.
- Cards: chrome-edge treatment (thin light border + inner sheen line), pill metrics, 44px+ controls,
  clear focus states. Storefront/showcase cards may use animated sheen; client/data cards stay
  low-motion: no pointer tracking, no hover-only actions, no heavy animation loops.
- WCAG 4.5:1 minimum; every interactive element ≥44px; `prefers-reduced-motion` must degrade to
  static; fonts: Plus Jakarta Sans headings, Sora UI, Fira Code data, Cormorant Garamond italic drama.
- Phone width 414px is a hard checkpoint. No MUI; styled-components + CSS custom properties only.

## The three components to design (from MEGA-BLUEPRINT.md §5)

1. **Swan Spotlight rail card + rail slot** (Home right rail; max 3 items; ice-cyan chrome; NOT
   gold/purple; no likes/comments/shares; per-item dismiss + global mute; content: hero image,
   headline ≤80, dek ≤200, source chip, "Curated by Swan" stamp, curator note ≤140 optional).
   Deliver: card anatomy (zones, sizes), type scale, edge/chrome treatment, empty/dismissed/muted
   states, enter/exit motion budget, 414px full-width variant, and what the rail slot shows when
   only 1 item is live.
2. **Coach Signal banner** (gold-framed recognition strip rendered on a regular feed PostCard when
   a coach signals it; carries coach display name + ≤120-char note; must not collide with
   PostCard's existing zones — the file is at its 300-line ceiling so the banner is an extracted
   component). Deliver: banner anatomy, gold usage that reads "earned recognition" not "ad",
   one attention animation (GPU-safe, reduced-motion static), and the coach-side one-tap control
   treatment in the CoachDock "cheer" panel.
3. **Proof Card** (shareable chrome-edge card generated from a real workout log: member display
   name, workout name, duration, total volume, sets, streak day, XP; one-tap "Post to feed" /
   native share; Victory mini-chart allowed for sets; own-stats only). Deliver: composition/grid,
   data hierarchy (what's biggest), how it stays legible as a shared image outside the app
   (light/dark contexts), and the in-app vs shared-image rendering split.

## Judgment questions (answer each, briefly)

1. Blueprint says Spotlight renders in the right rail slot and NEVER interleaves between proof
   posts. Right call for a coaching-first dashboard — or does one interleaved daily card earn its
   place? Defend a position.
2. Blueprint bans comments/likes on Spotlight entirely. Too strict, right, or not strict enough?
3. Dismissal UX: per-card × with localStorage, mute in settings after repeated dismissal
   ("no guilt, no dark patterns"). What's the single best pattern you've seen for optional
   editorial content in a product feed?
4. Motion: the house allows animated sheen on showcase cards but keeps data cards low-motion.
   Which of the three components (if any) earns motion, and what is its budget (ms, properties)?
5. Any risk that a gold Coach Signal banner + gold ProofCard accents visually compete? How to keep
   the hierarchy: coach recognition > proof > spotlight > ordinary posts?

## Output contract

```
## Component 1: Swan Spotlight (recommended spec)  — token-level CSS/component sketch
## Component 1 alt (one alternative worth considering)
## Component 2: Coach Signal (recommended + alt)
## Component 3: Proof Card (recommended + alt)
## Judgment answers (1-5, one short paragraph each)
## One design idea the blueprint missed (max 1, concrete)
```
