import { createSwanManifest } from '../manifestFactory';

export const CANDY_GLASS_ARCADE_MANIFEST = createSwanManifest({
  id: 'candy-glass-arcade',
  name: 'Candy Glass Arcade',
  description: 'Playful glass depth, bold action docks, and crisp reward feedback.',
  emotionalJob: 'joyful momentum',
  layoutSignature: 'glass-arcade-action-dock',
  navigationRenderer: 'arcade-dock-navigation',
  shellRenderer: 'arcade-shell',
  recipe: 'arcade-recipe',
  profileOffsets: [4, 6, 8],
  ambient: true,
});
