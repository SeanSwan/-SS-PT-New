import { createSwanManifest } from '../manifestFactory';

export const TERRAIN_CONSOLE_MANIFEST = createSwanManifest({
  id: 'terrain-console', name: 'Terrain Console',
  description: 'Contour layers turn training load and readiness into navigable terrain.',
  emotionalJob: 'situational awareness', layoutSignature: 'contour-map-console',
  navigationRenderer: 'contour-map-navigation', shellRenderer: 'terrain-console-shell',
  recipe: 'terrain-console-recipe', profileOffsets: [5, 8, 10],
});