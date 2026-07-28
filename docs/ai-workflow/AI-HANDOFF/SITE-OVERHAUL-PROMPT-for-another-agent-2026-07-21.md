# SITE OVERHAUL — paste-ready prompt for a BUILD agent (NOT the Mobbin/brain agent)

> **Division of labor (Sean, 2026-07-21):** the Mobbin-MCP/brain agent stays on the learning loop. THIS
> work — the cards/boxes/styling overhaul of the public marketing surfaces — is a separate build agent's job.
> Paste the block below to that agent. Everything it needs is in it.

---

```
You are doing a SwanStudios public-site styling overhaul. Read CLAUDE.md rules first.

SURFACES (in priority order): homepage, about page, contact page, video page, store.
SCOPE: the cards, boxes, panels, and overall styling on these pages — make them premium, cohesive,
and on-brand, per docs/ai-workflow/design-brain/design.md (Crystalline Swan) + swan-design-router.

⚠ THREE HARD REQUIREMENTS (the last attempt failed all three — do not repeat):

1. WIRE EVERYTHING TO THE THEME SYSTEM — do NOT hardcode colors.
   The prior work used a permanent hardcoded color that did not follow the theme changer / Swan lens /
   color changer, so it clashed with the rest of the site. Every color, surface, and glow MUST consume
   the theme tokens so it changes WITH the theme/lens.
   - Theme system lives in frontend/src/context/ThemeContext/ (+ the Style-Lens / paletteThemeId layer).
   - Use var(--token, #fallback) tokens from design.md §4, driven by the active theme/lens — never a raw
     hardcoded hex baked into the component.
   - FIRST STEP: read how an EXISTING correctly-themed component consumes the lens/theme (e.g. GlowButton.tsx,
     ThemeShowcase.tsx) and match that pattern exactly (Rule 18 existing-pattern-first). Confirm your new
     styling recolors when the theme/lens changes — test it, don't assume.

2. KEEP THE SWAN MOVIE — non-negotiable.
   The homepage Swan video/hero film STAYS and PLAYS. Do not remove or replace it. You MAY enhance it
   (better poster, smoother load, reduced-motion fallback, better overlay/hierarchy) but the film is a must.

3. DO THE WHOLE PAGE, AND DON'T LIE ABOUT IT.
   The prior AI updated ONE SECTION of the homepage and claimed it did the whole page. That is a Rule
   19/28 violation (no speculative success language). You MUST:
   - Produce a CANONICAL SURFACE RECEIPT (Rule 26): the real route that mounts the live homepage, the
     actual mounted JSX component (a lazy import() is NOT proof — JSX usage is), and every section
     component it renders. NOTE: frontend/src/components/AvatarHome/ is the gamified avatar home — CONFIRM
     whether the marketing homepage is that or a different route before touching anything.
   - Enumerate EVERY section of the target page and track each to done. Never claim "the homepage is
     redesigned" until every enumerated section is actually changed and verified.
   - Report per-section: changed / not-changed, with file:line evidence.

PROCESS:
- Route through swan-design-router (Rule 40): for a major redesign, do the 2-3 concept-direction gate
  and the Mobbin reference receipt if available before coding.
- Design principles to APPLY are being harvested separately into the vault design-claims collection
  (brain_search collection="design-claims") — check there for accepted homepage/marketing principles; if
  present, cite them; if not, proceed from design.md.
- styled-components only (no MUI/Tailwind), 300-line file cap, css`` helper for interpolated fragments
  (rule 43), 44px targets, dark-first, reduced-motion, responsive matrix (320/375/414/768/1024/1440/1920/
  2560/3840). Cards = the Swan Card/Button Standard (chrome edge, sapphire gradient, low-motion for data
  cards, SheenCard for sell surfaces).
- Ship via a clean worktree off origin/main (the working tree is a drifted WIP branch). Slice-internal
  hostile review (Rule 61) before reporting each slice. Sean's explicit go before pushing production UI.

DELIVERABLE PER PAGE: the canonical surface receipt, the section-by-section change log with evidence,
theme/lens integration proof (it recolors when the theme changes), and confirmation the Swan movie still
plays. Start with the homepage; do not claim it done until every section is verified.
```
