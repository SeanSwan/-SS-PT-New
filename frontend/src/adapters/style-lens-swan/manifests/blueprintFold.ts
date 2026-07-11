import { createSwanManifest } from '../manifestFactory';

export const BLUEPRINT_FOLD_MANIFEST = createSwanManifest({
  id: 'blueprint-fold',
  name: 'Blueprint Fold',
  description: 'Measured planes, drafting lines, and fold-aware information zones.',
  emotionalJob: 'technical confidence',
  layoutSignature: 'folded-drafting-plane',
  navigationRenderer: 'blueprint-tabs-navigation',
  shellRenderer: 'folded-grid-shell',
  recipe: 'blueprint-recipe',
  profileOffsets: [1, 3, 5],
});
