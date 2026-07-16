# Cinematic Homepage — Asset Manifest

> **Status:** No external assets used yet. All visuals are CSS-generated (gradients, SVG noise, particles).

## Policy
- All images must be royalty-free from Unsplash/Pexels matching preset mood
- Track: URL, author, license, where used
- Optimized formats (WebP/AVIF), lazy loading below fold

## Current Assets

| Asset | Source | Author | License | Used In |
|-------|--------|--------|---------|---------|
| Logo.png | Existing | SwanStudios | Proprietary | CinematicNavbar, CinematicFooter |

## CSS-Generated Visuals (no external assets)

| Visual | Technique | File |
|--------|-----------|------|
| Noise overlay | Inline SVG `<feTurbulence>` | `cinematic-shared.ts` (NoiseOverlay) |
| Hero gradient | CSS radial-gradient animation | `CinematicHero.tsx` (GradientOverlay) |
| Floating particles | CSS keyframe animation | `CinematicHero.tsx` (ParticleField) |
| Section dividers | CSS radial-gradient + border-line | `cinematic-shared.ts` (CinematicDivider) |
| Card glass surfaces | CSS backdrop-filter blur | `cinematic-shared.ts` (GlassCard) |
| Button shimmer | CSS background-position animation | `cinematic-shared.ts` (MagneticButton) |

## Future Assets (Phase 5 — after approval)
- Trainer profile photos (Sean Swan, Jasmine Hearon)
- Program background images (3 cards)
- Hero background image/video (variant-specific)

All future assets will be sourced from royalty-free libraries or the client's existing asset collection.
