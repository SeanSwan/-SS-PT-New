import { createSwanManifest } from '../manifestFactory';

export const SPLIT_HORIZON_MANIFEST = createSwanManifest({
  id: 'split-horizon',
  name: 'Split Horizon',
  description: 'A decisive split plane separates live work from insight and next action.',
  emotionalJob: 'focused comparison',
  layoutSignature: 'split-plane-with-horizon-dock',
  navigationRenderer: 'horizon-dock-navigation',
  shellRenderer: 'split-horizon-shell',
  recipe: 'split-horizon-recipe',
  profileOffsets: [7, 10, 1],
});