import { createSwanManifest } from '../manifestFactory';

export const CARBON_ATELIER_MANIFEST = createSwanManifest({
  id: 'carbon-atelier', name: 'Carbon Atelier',
  description: 'A precision workshop pairs tactile tool rails with a generous working canvas.',
  emotionalJob: 'crafted control',
  layoutSignature: 'atelier-canvas-and-tool-rail',
  navigationRenderer: 'atelier-toolrail-navigation',
  shellRenderer: 'carbon-atelier-shell',
  recipe: 'carbon-atelier-recipe',
  profileOffsets: [1, 4, 6],
});