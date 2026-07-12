import { createSwanManifest } from '../manifestFactory';

export const SIGNAL_GARDEN_MANIFEST = createSwanManifest({
  id: 'signal-garden',
  name: 'Signal Garden',
  description: 'Branching progress paths turn current state into a legible growth system.',
  emotionalJob: 'organic progress',
  layoutSignature: 'branching-signal-paths-and-growth-rail',
  navigationRenderer: 'garden-branch-navigation',
  shellRenderer: 'signal-garden-shell',
  recipe: 'signal-garden-recipe',
  profileOffsets: [6, 9, 0],
});