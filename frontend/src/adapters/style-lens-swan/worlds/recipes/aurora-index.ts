/**
 * WORLD RECIPE — aurora-index (atmospheric · DEFAULT athlete world) · Swan World Engine
 * ====================================================================================
 * DNA: polar night; the sky is a slow curtain of ionized silk. Impossible optical
 * phenomenon: light that falls UPWARD from the horizon. Signature motion: a curtain-fold
 * sweep across the vault ceiling, frost glitter trailing. Surface fit: athlete dashboard.
 * Structural codeword (distinct ≥3 axes from every world): aurora-airy display /
 * signal-grotesk body / lightwell surface / gallery-tiles collection / pill-cluster action /
 * spark-ribbon chart / editorial-column template. Law A: chrome stays Crystalline Swan;
 * the world paints only the setting via --world-* (contrast measured at Slice 8).
 */
import type { RecipeV2 } from '../../../../core/style-lens-os/v2/recipeV2';
import { RECIPE_SHARED } from '../recipeShared';

export const AURORA_INDEX_RECIPE: RecipeV2 = {
  ...RECIPE_SHARED,
  id: 'swan.aurora-index.v2',
  tokens: {
    'world-title-font': "400 clamp(30px, 4vw, 60px)/1.15 'Plus Jakarta Sans', sans-serif",
    'world-letter-spacing': '0.04em',
    'world-panel-radius': '20px',
    'world-row-radius': '16px',
    'world-dial-radius': '50%',
    'world-accent': 'var(--ice-wing, #60c0f0)',
    'world-action': 'var(--wing-purple, #8b5cf6)',
    'world-panel': 'color-mix(in srgb, #0d2340 78%, transparent)',
    'world-row-columns': 'repeat(auto-fit, minmax(220px, 1fr))',
  },
  composition: {
    'desktop-enhanced': { template: 'editorial-column' },
    tablet: { template: 'editorial-column' },
    'mobile-minimal': { template: 'editorial-column' },
  },
  components: {
    'text.display': { variant: 'aurora-airy' },
    'text.body': { variant: 'signal-grotesk' },
    'surface.card': { variant: 'lightwell' },
    'collection.exercise': { variant: 'gallery-tiles' },
    'action.primary': { variant: 'pill-cluster' },
    'chart.progress': { variant: 'spark-ribbon', familiarity: 'expressive' },
  },
};
