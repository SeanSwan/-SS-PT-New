import { createSwanManifest } from '../manifestFactory';

export const QUIET_MERIDIAN_MANIFEST = createSwanManifest({
  id: 'quiet-meridian',
  name: 'Quiet Meridian',
  description: 'A calm, editorial single-current layout with restrained depth.',
  emotionalJob: 'calm clarity',
  layoutSignature: 'single-meridian-column',
  navigationRenderer: 'quiet-rail-navigation',
  shellRenderer: 'calm-column-shell',
  recipe: 'quiet-recipe',
  profileOffsets: [0, 2, 4],
});
