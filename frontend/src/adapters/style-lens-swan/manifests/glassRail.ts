import { createSwanManifest } from '../manifestFactory';

export const GLASS_RAIL_MANIFEST = createSwanManifest({
  id: 'glass-rail', name: 'Glass Rail',
  description: 'A translucent navigation spine keeps tools present without crowding the work.',
  emotionalJob: 'effortless access', layoutSignature: 'floating-glass-spine',
  navigationRenderer: 'glass-spine-navigation', shellRenderer: 'glass-rail-shell',
  recipe: 'glass-rail-recipe', profileOffsets: [7, 10, 1],
});