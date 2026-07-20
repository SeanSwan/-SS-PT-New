/**
 * ATMOSPHERE ASSET CATALOG — FUSION F0 (BLUEPRINT-lens-world-fusion 03 §2).
 * Curated, in-repo, Law-A atmosphere assets: CSS gradients + inline SVG
 * data-URIs ONLY (never remote URLs). Recipes reference these by assetId;
 * LensPlanFrame stacks them as STATIC background layers (firewall H1:
 * product surfaces never animate atmosphere). Opacity discipline lives on
 * the RECIPE layer (0.01–0.12) — these strings use color-mix percentages
 * tuned so a recipe's opacity multiplies a restrained base, not a loud one.
 * Inspiration fields cite design-brain/worlds.md worlds (provenance only).
 */
import type { AtmosphereLayerKind } from '../../../core/style-lens-os/v2/recipeV2';

export interface AtmosphereAsset {
  id: string;
  kind: AtmosphereLayerKind;
  /** CSS background-image value. Gradient string or inline SVG data-URI. */
  css: string;
  /** worlds.md provenance — which world's soul this distills. */
  inspiration?: string;
}

const svg = (body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'>${body}</svg>`,
  )}")`;

export const ATMOSPHERE_ASSET_CATALOG: Readonly<Record<string, AtmosphereAsset>> =
  Object.freeze({
    'aurora-band': {
      id: 'aurora-band',
      kind: 'gradient',
      css: 'radial-gradient(120% 55% at 50% 0%, color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent) 55%, transparent 82%)',
      inspiration: 'world.natural-sublime.glacier-cathedral (aurora band)',
    },
    'ridge-mist': {
      id: 'ridge-mist',
      kind: 'gradient',
      css: 'linear-gradient(180deg, transparent 30%, color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent) 62%, transparent 92%)',
      inspiration: 'world.natural-sublime.evergreen-dominion (ridge mist banks)',
    },
    'ice-shaft': {
      id: 'ice-shaft',
      kind: 'gradient',
      css: 'linear-gradient(115deg, transparent 38%, color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent) 50%, transparent 62%)',
      inspiration: 'world.natural-sublime.glacier-cathedral (crevasse light shaft)',
    },
    'tide-lines': {
      id: 'tide-lines',
      kind: 'gradient',
      css: 'repeating-linear-gradient(178deg, transparent 0px, transparent 34px, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent) 35px, transparent 37px)',
      inspiration: 'world.cosmic.exo-eden adjacency — tidal shoreline strata',
    },
    'orbit-rings': {
      id: 'orbit-rings',
      kind: 'pattern',
      css: 'repeating-radial-gradient(circle at 78% 18%, transparent 0px, transparent 56px, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent) 57px, transparent 60px)',
      inspiration: 'world.cosmic.webb-deep-field (coordinate rings, restrained)',
    },
    'frost-weave': {
      id: 'frost-weave',
      kind: 'pattern',
      css: svg(
        `<path d='M0 40h80M40 0v80' stroke='%23E0ECF4' stroke-opacity='0.5' stroke-width='0.6'/><path d='M0 0l80 80M80 0L0 80' stroke='%2360C0F0' stroke-opacity='0.35' stroke-width='0.4'/>`,
      ),
      inspiration: 'Crystalline Swan frozen-forest weave (house DNA)',
    },
    'deep-field': {
      id: 'deep-field',
      kind: 'pattern',
      css: svg(
        `<circle cx='12' cy='18' r='0.9' fill='%23E0ECF4' fill-opacity='0.65'/><circle cx='52' cy='9' r='0.6' fill='%2360C0F0' fill-opacity='0.6'/><circle cx='70' cy='44' r='0.8' fill='%23E0ECF4' fill-opacity='0.5'/><circle cx='30' cy='62' r='0.5' fill='%238B5CF6' fill-opacity='0.55'/><circle cx='62' cy='73' r='0.7' fill='%23E0ECF4' fill-opacity='0.4'/>`,
      ),
      inspiration: 'world.cosmic.webb-deep-field (sparse star field, no glitter)',
    },
    'grain-03': {
      id: 'grain-03',
      kind: 'grain',
      css: svg(
        `<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='80' height='80' filter='url(%23g)' opacity='0.5'/>`,
      ),
      inspiration: 'worlds.md universal 2-3% film grain discipline',
    },
  });
